#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  link,
  lstat,
  open,
  readFile,
  rename,
  unlink,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_RELATIVE_PATH = 'fixtures/registry.json';
const ENGLISH_FIXTURE_ID = 'english-20k-v1';
const ENGLISH_FIXTURE_FILE = 'en-20000.txt';
const ENGLISH_FIXTURE_SHA256 = '4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b';
const MAX_CHUNK_CHARACTERS = 250;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-v[1-9][0-9]*$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const FILE_PATTERN = /^[a-z0-9][a-z0-9._-]*\.(?:txt|json)$/;
const POLICY = 'Deterministic grapheme-aligned chunks; target 220 UTF-16 code units, favor whitespace and Unicode punctuation pause points, and never exceed 250. Every chunk contains non-whitespace text; all source whitespace is preserved.';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

function fail(message) {
  throw new Error(message);
}

function canonicalLanguageTag(value) {
  if (typeof value !== 'string' || !value.trim()) fail('A BCP 47 language tag is required.');
  let canonical;
  try {
    [canonical] = Intl.getCanonicalLocales(value);
  } catch {
    fail(`Invalid BCP 47 language tag: ${value}`);
  }
  if (!canonical || !LANGUAGE_PATTERN.test(canonical)) {
    fail(`Language tag ${value} is valid BCP 47, but is outside the language-tag subset supported by the current fixture registry.`);
  }
  return canonical;
}

function validateId(id) {
  if (typeof id !== 'string' || id.length > 64 || !ID_PATTERN.test(id)) {
    fail('Fixture ID must be a safe, lowercase, versioned ID such as story-uk-v1.');
  }
  return id;
}

function smokeIdFor(id) {
  const match = /-v([1-9][0-9]*)$/.exec(id);
  return `${id.slice(0, match.index)}-smoke-v${match[1]}`;
}

function validateRegistry(registry) {
  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.fixtures) || registry.fixtures.length === 0) {
    fail('Invalid benchmark fixture registry.');
  }
  const ids = new Set();
  const smokeIds = new Set();
  const allNames = new Set();
  const filenames = new Set();
  for (const fixture of registry.fixtures) {
    if (!fixture || typeof fixture.id !== 'string' || !ID_PATTERN.test(fixture.id) || ids.has(fixture.id) ||
        typeof fixture.language !== 'string' || !LANGUAGE_PATTERN.test(fixture.language) ||
        typeof fixture.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(fixture.sha256) ||
        !Number.isSafeInteger(fixture.characters) || fixture.characters < 1 ||
        !Number.isSafeInteger(fixture.unicodeCodePoints) || fixture.unicodeCodePoints < 1 ||
        !Number.isSafeInteger(fixture.utf8Bytes) || fixture.utf8Bytes < 1 ||
        !Number.isSafeInteger(fixture.chunks) || fixture.chunks < 1 ||
        typeof fixture.smokeId !== 'string' || smokeIds.has(fixture.smokeId)) {
      fail('Invalid or duplicate entry in benchmark fixture registry.');
    }
    if (canonicalLanguageTag(fixture.language) !== fixture.language) {
      fail(`Fixture language must use canonical BCP 47 casing: ${fixture.language}`);
    }
    for (const field of ['articleFile', 'chunksFile', 'metadataFile']) {
      const name = fixture[field];
      if (typeof name !== 'string' || !FILE_PATTERN.test(name) || filenames.has(name)) {
        fail(`Invalid or duplicate fixture filename in registry: ${String(name)}`);
      }
      filenames.add(name);
    }
    ids.add(fixture.id);
    smokeIds.add(fixture.smokeId);
    if (allNames.has(fixture.id) || allNames.has(fixture.smokeId) || fixture.id === fixture.smokeId) {
      fail(`Fixture ID and smoke ID namespaces collide: ${fixture.id} / ${fixture.smokeId}`);
    }
    allNames.add(fixture.id);
    allNames.add(fixture.smokeId);
  }
  if (!ids.has(registry.defaultFixtureId)) fail('Default benchmark fixture is not registered.');
  for (const defaults of [registry.modelDefaults ?? {}, registry.modelRequiredFixtures ?? {}]) {
    if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) fail('Invalid model fixture defaults.');
    for (const [modelId, fixtureId] of Object.entries(defaults)) {
      if (!/^[a-z0-9][a-z0-9.-]*$/.test(modelId) || !ids.has(fixtureId)) {
        fail(`Invalid benchmark fixture default for model ${modelId}.`);
      }
    }
  }
  return registry;
}

async function readRegularFile(path, description) {
  const info = await lstat(path).catch(error => {
    if (error.code === 'ENOENT') fail(`${description} does not exist: ${path}`);
    throw error;
  });
  if (!info.isFile() || info.isSymbolicLink()) fail(`${description} must be a regular, non-symlink file: ${path}`);
  return readFile(path);
}

function decodeSourceText(bytes, description) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`${description} must be UTF-8 without a byte-order mark.`);
  }
  if (bytes.includes(0x0d)) fail(`${description} contains CR or CRLF. Save it as UTF-8 with LF line endings before hashing.`);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${description} is not valid UTF-8.`);
  }
  if (!text.length) fail(`${description} is empty.`);
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail(`${description} does not round-trip as canonical UTF-8.`);
  return text;
}

function digestText(text) {
  return sha256(Buffer.from(text, 'utf8'));
}

function makeChunks(text) {
  if (!/[^\s]/u.test(text)) fail('Translation text must contain at least one non-whitespace character.');
  if (typeof Intl.Segmenter !== 'function') fail('This Node runtime needs Intl.Segmenter for deterministic grapheme-safe fixture chunks.');
  const segments = [...new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(text)];
  const count = segments.length;
  const offsets = new Array(count + 1).fill(0);
  const contentPrefix = new Uint32Array(count + 1);
  const whitespace = new Uint8Array(count);
  const punctuation = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    const value = segments[index].segment;
    offsets[index + 1] = offsets[index] + value.length;
    whitespace[index] = /^\s+$/u.test(value) ? 1 : 0;
    punctuation[index] = /[\p{P}]$/u.test(value) ? 1 : 0;
    contentPrefix[index + 1] = contentPrefix[index] + (whitespace[index] ? 0 : 1);
  }

  // Dynamic programming chooses boundaries across the complete text. Besides
  // preferring normal pause points, this guarantees every <=250-unit span has
  // spoken text, even when the article begins or ends with whitespace.
  const costs = new Float64Array(count + 1);
  costs.fill(Infinity);
  costs[count] = 0;
  const chunkCounts = new Uint32Array(count + 1);
  const next = new Int32Array(count);
  next.fill(-1);
  for (let startIndex = count - 1; startIndex >= 0; startIndex--) {
    for (let endIndex = startIndex + 1; endIndex <= count; endIndex++) {
      const characters = offsets[endIndex] - offsets[startIndex];
      if (characters > MAX_CHUNK_CHARACTERS) break;
      if (contentPrefix[endIndex] === contentPrefix[startIndex] || !Number.isFinite(costs[endIndex])) continue;

      const final = endIndex === count;
      const beforeWhitespace = !final && whitespace[endIndex] === 1;
      const naturalPenalty = final ? 0 : beforeWhitespace ? 0 : punctuation[endIndex - 1] ? 2 : 16;
      const trailingWhitespacePenalty = !final && whitespace[endIndex - 1] ? 24 : 0;
      const lengthPenalty = final ? 0 : Math.abs(characters - 220);
      const candidateCost = costs[endIndex] + naturalPenalty + trailingWhitespacePenalty + lengthPenalty;
      const candidateChunks = chunkCounts[endIndex] + 1;
      if (candidateCost < costs[startIndex] ||
          (candidateCost === costs[startIndex] && (chunkCounts[startIndex] === 0 || candidateChunks < chunkCounts[startIndex]))) {
        costs[startIndex] = candidateCost;
        chunkCounts[startIndex] = candidateChunks;
        next[startIndex] = endIndex;
      }
    }
  }
  if (next[0] < 0) fail('Text cannot be divided into <=250-character speakable chunks while preserving all whitespace.');

  const chunks = [];
  for (let startIndex = 0; startIndex < count;) {
    const endIndex = next[startIndex];
    if (endIndex <= startIndex) fail('Could not construct a speakable fixture chunk.');
    const start = offsets[startIndex];
    const end = offsets[endIndex];
    const chunkText = text.slice(start, end);
    chunks.push({
      id: chunks.length,
      start,
      end,
      characters: chunkText.length,
      sha256: digestText(chunkText),
    });
    startIndex = endIndex;
  }
  return chunks;
}

async function readRegistry(root) {
  const file = join(root, REGISTRY_RELATIVE_PATH);
  const bytes = await readRegularFile(file, 'Fixture registry');
  let registry;
  try {
    registry = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('Fixture registry is not valid JSON.');
  }
  validateRegistry(registry);
  return { file, bytes, registry };
}

async function verifyEnglishSource(root, registry) {
  const source = registry.fixtures.find(fixture => fixture.id === ENGLISH_FIXTURE_ID);
  if (!source || source.language !== 'en' || source.articleFile !== ENGLISH_FIXTURE_FILE || source.sha256 !== ENGLISH_FIXTURE_SHA256) {
    fail('Canonical English source registration does not match the expected english-20k-v1 identity.');
  }
  const bytes = await readRegularFile(join(root, 'fixtures', ENGLISH_FIXTURE_FILE), 'Canonical English source');
  if (sha256(bytes) !== ENGLISH_FIXTURE_SHA256) fail('Canonical English source file SHA-256 does not match its pinned identity.');
  const text = decodeSourceText(bytes, 'Canonical English source');
  if (text.length !== source.characters || Array.from(text).length !== source.unicodeCodePoints || bytes.length !== source.utf8Bytes) {
    fail('Canonical English source counts do not match the registry.');
  }
  return { source, sha256: ENGLISH_FIXTURE_SHA256 };
}

function safeFixturePath(root, filename) {
  if (typeof filename !== 'string' || !FILE_PATTERN.test(filename) || basename(filename) !== filename) {
    fail(`Unsafe fixture filename: ${String(filename)}`);
  }
  return join(root, 'fixtures', filename);
}

async function checkOneFixture(root, fixture, canonicalSourceSha) {
  const articlePath = safeFixturePath(root, fixture.articleFile);
  const chunksPath = safeFixturePath(root, fixture.chunksFile);
  const metadataPath = safeFixturePath(root, fixture.metadataFile);
  const articleBytes = await readRegularFile(articlePath, `Fixture ${fixture.id} text`);
  const article = decodeSourceText(articleBytes, `Fixture ${fixture.id} text`);
  const articleSha = sha256(articleBytes);
  const codePoints = Array.from(article).length;
  if (articleSha !== fixture.sha256 || article.length !== fixture.characters ||
      codePoints !== fixture.unicodeCodePoints || articleBytes.length !== fixture.utf8Bytes) {
    fail(`Fixture ${fixture.id} text bytes, hash, or Unicode counts do not match the registry.`);
  }

  const metadataBytes = await readRegularFile(metadataPath, `Fixture ${fixture.id} metadata`);
  const chunksBytes = await readRegularFile(chunksPath, `Fixture ${fixture.id} chunk manifest`);
  let metadata, manifest;
  try {
    metadata = JSON.parse(metadataBytes.toString('utf8'));
    manifest = JSON.parse(chunksBytes.toString('utf8'));
  } catch {
    fail(`Fixture ${fixture.id} metadata or chunk manifest is invalid JSON.`);
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
      !manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    fail(`Fixture ${fixture.id} metadata or chunk manifest must be a JSON object.`);
  }
  if (metadata.fixtureId !== fixture.id || metadata.language !== fixture.language || metadata.sha256 !== articleSha ||
      metadata.javascriptStringLength !== article.length || metadata.unicodeCodePoints !== codePoints ||
      metadata.utf8Bytes !== articleBytes.length || metadata.chunkCount !== fixture.chunks ||
      !isDeepStrictEqual(metadata.source, fixture.source)) {
    fail(`Fixture ${fixture.id} metadata does not match its registry and source bytes.`);
  }
  if (!fixture.source || typeof fixture.source !== 'object' || !['original', 'translation'].includes(fixture.source.type) ||
      typeof fixture.source.description !== 'string' || !fixture.source.description.trim()) {
    fail(`Fixture ${fixture.id} has no source provenance.`);
  }
  if (fixture.source.type === 'translation') {
    if (fixture.source.sourceFixtureId !== ENGLISH_FIXTURE_ID || fixture.source.sourceLanguage !== 'en' ||
        fixture.source.sourceSha256 !== canonicalSourceSha || typeof metadata.creator !== 'string' || !metadata.creator.trim() ||
        typeof metadata.license !== 'string' || !metadata.license.trim()) {
      fail(`Fixture ${fixture.id} must bind translation provenance to the canonical English source and include creator and license metadata.`);
    }
  } else if (fixture.id !== ENGLISH_FIXTURE_ID) {
    fail(`Only ${ENGLISH_FIXTURE_ID} may use original-source provenance.`);
  }
  if (manifest.articleSha256 !== articleSha || manifest.targetCharacters !== article.length ||
      !Array.isArray(manifest.chunks) || manifest.chunks.length !== fixture.chunks) {
    fail(`Fixture ${fixture.id} chunk manifest header does not match its source.`);
  }

  let cursor = 0;
  const graphemeBoundaries = new Set([0, article.length]);
  for (const segment of new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(article)) {
    graphemeBoundaries.add(segment.index);
    graphemeBoundaries.add(segment.index + segment.segment.length);
  }
  for (const [index, span] of manifest.chunks.entries()) {
    if (!span || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end)) {
      fail(`Fixture ${fixture.id} has an invalid chunk at index ${index}.`);
    }
    const chunkText = article.slice(span.start, span.end);
    if (!span || span.id !== index || span.start !== cursor || !Number.isSafeInteger(span.end) ||
        span.end <= span.start || span.end > article.length || span.characters !== chunkText.length ||
        span.end - span.start > MAX_CHUNK_CHARACTERS ||
        !graphemeBoundaries.has(span.start) || !graphemeBoundaries.has(span.end) || !/[^\s]/u.test(chunkText) ||
        sha256(Buffer.from(chunkText, 'utf8')) !== span.sha256) {
      fail(`Fixture ${fixture.id} has an invalid grapheme-safe, speakable chunk at index ${index}.`);
    }
    cursor = span.end;
  }
  if (cursor !== article.length) fail(`Fixture ${fixture.id} chunks do not reconstruct its source text.`);
  return {
    id: fixture.id,
    language: fixture.language,
    characters: article.length,
    unicodeCodePoints: codePoints,
    utf8Bytes: articleBytes.length,
    chunks: manifest.chunks.length,
    sha256: articleSha,
  };
}

export async function listFixtures(root = REPO_ROOT) {
  const { registry } = await readRegistry(resolve(root));
  return registry.fixtures.map(({ id, smokeId, language, characters, unicodeCodePoints, utf8Bytes, chunks, sha256: hash }) => ({
    id, smokeId, language, characters, unicodeCodePoints, utf8Bytes, chunks, sha256: hash,
  }));
}

export async function checkFixtures({ root = REPO_ROOT, id } = {}) {
  root = resolve(root);
  const { registry } = await readRegistry(root);
  const canonical = await verifyEnglishSource(root, registry);
  const fixtures = id === undefined ? registry.fixtures : registry.fixtures.filter(fixture => fixture.id === id);
  if (!fixtures.length) fail(`Unknown benchmark fixture: ${id}`);
  const checked = [];
  for (const fixture of fixtures) checked.push(await checkOneFixture(root, fixture, canonical.sha256));
  return { status: 'ok', checked };
}

function validateDescription(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} is required and must not be blank.`);
  if (value.length > 2000) fail(`${name} must be at most 2,000 characters.`);
  return value;
}

async function writeSyncedFile(path, bytes, mode = 0o644) {
  const handle = await open(path, 'wx', mode);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectory(path) {
  const handle = await open(path, fsConstants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function addFixture({ root = REPO_ROOT, language, id, text: textPath, creator, description, license } = {}) {
  root = resolve(root);
  id = validateId(id);
  language = canonicalLanguageTag(language);
  creator = validateDescription(creator, 'Creator credit');
  description = validateDescription(description, 'Translation and review provenance description');
  license = validateDescription(license, 'Explicit license identifier');

  if (typeof textPath !== 'string' || !textPath.trim()) fail('A UTF-8 text file path is required with --text.');
  const inputPath = resolve(process.cwd(), textPath);
  const inputBytes = await readRegularFile(inputPath, 'Translation text');
  const text = decodeSourceText(inputBytes, 'Translation text');
  const chunks = makeChunks(text);
  const articleSha = sha256(inputBytes);
  const codePoints = Array.from(text).length;
  const fixtureDirectory = join(root, 'fixtures');
  const lockPath = join(fixtureDirectory, '.translation-fixture.lock');
  const lockToken = `${process.pid}:${randomBytes(12).toString('hex')}`;
  let lockHandle;
  try {
    lockHandle = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') fail('Another translation-fixture add holds fixtures/.translation-fixture.lock; do not remove an unknown lock.');
    throw error;
  }

  const temporaryPaths = [];
  const createdFinalPaths = [];
  let registryCommitted = false;
  let registryTemp;
  try {
    await lockHandle.writeFile(`${JSON.stringify({ token: lockToken, pid: process.pid, createdAt: new Date().toISOString() })}\n`);
    await lockHandle.sync();
    const { file: registryPath, bytes: originalRegistryBytes, registry } = await readRegistry(root);
    const canonical = await verifyEnglishSource(root, registry);
    await checkFixtures({ root });
    if (registry.fixtures.some(fixture => fixture.id === id)) fail(`Fixture ID already exists and is immutable: ${id}`);
    const smokeId = smokeIdFor(id);
    if (registry.fixtures.some(fixture => fixture.smokeId === smokeId)) fail(`Fixture smoke ID already exists: ${smokeId}`);
    const occupiedNames = new Set(registry.fixtures.flatMap(fixture => [fixture.id, fixture.smokeId]));
    if (occupiedNames.has(id)) fail(`Fixture ID collides with an existing fixture or smoke ID: ${id}`);
    if (occupiedNames.has(smokeId)) fail(`Fixture smoke ID collides with an existing fixture or smoke ID: ${smokeId}`);

    const articleFile = `${id}.txt`;
    const chunksFile = `${id}.chunks.json`;
    const metadataFile = `${id}.meta.json`;
    const targetNames = [articleFile, chunksFile, metadataFile];
    for (const name of targetNames) {
      const target = safeFixturePath(root, name);
      try {
        await lstat(target);
        fail(`Refusing to overwrite existing fixture file: ${target}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const source = {
      type: 'translation',
      description,
      sourceFixtureId: ENGLISH_FIXTURE_ID,
      sourceSha256: canonical.sha256,
      sourceLanguage: 'en',
    };
    const chunkLengths = chunks.map(chunk => chunk.characters);
    const terminalNewlineCount = text.match(/\n*$/u)?.[0].length ?? 0;
    const metadata = {
      corpusVersion: id,
      file: articleFile,
      sha256: articleSha,
      utf8Bytes: inputBytes.length,
      unicodeCodePoints: codePoints,
      javascriptStringLength: text.length,
      terminalNewline: terminalNewlineCount === 0 ? 'none' :
        `${terminalNewlineCount} LF character${terminalNewlineCount === 1 ? '' : 's'} included in character and byte totals`,
      chunkCount: chunks.length,
      chunkCharacters: { min: Math.min(...chunkLengths), max: Math.max(...chunkLengths) },
      fixtureId: id,
      language,
      source,
      creator,
      license,
      generator: 'translation-fixture-v1',
    };
    const manifest = {
      articleSha256: articleSha,
      targetCharacters: text.length,
      policy: POLICY,
      chunks,
    };
    const fixture = {
      id,
      smokeId,
      language,
      articleFile,
      chunksFile,
      metadataFile,
      sha256: articleSha,
      characters: text.length,
      unicodeCodePoints: codePoints,
      utf8Bytes: inputBytes.length,
      chunks: chunks.length,
      source,
    };
    const updatedRegistry = structuredClone(registry);
    updatedRegistry.fixtures.push(fixture);
    validateRegistry(updatedRegistry);
    const products = [
      [articleFile, inputBytes],
      [chunksFile, jsonBytes(manifest)],
      [metadataFile, jsonBytes(metadata)],
    ];
    for (const [name, bytes] of products) {
      const temp = join(fixtureDirectory, `.translation-fixture-${process.pid}-${randomBytes(8).toString('hex')}-${name}.tmp`);
      temporaryPaths.push(temp);
      await writeSyncedFile(temp, bytes);
    }
    registryTemp = join(fixtureDirectory, `.translation-fixture-${process.pid}-${randomBytes(8).toString('hex')}-registry.tmp`);
    temporaryPaths.push(registryTemp);
    await writeSyncedFile(registryTemp, jsonBytes(updatedRegistry));

    for (const [name, temp] of products.map(([name], index) => [name, temporaryPaths[index]])) {
      const target = safeFixturePath(root, name);
      await link(temp, target);
      createdFinalPaths.push(target);
      await unlink(temp);
    }

    const latestRegistryBytes = await readRegularFile(registryPath, 'Fixture registry');
    if (!latestRegistryBytes.equals(originalRegistryBytes)) {
      fail('Fixture registry changed during add. No registry update was committed; retry after reviewing the concurrent edit.');
    }
    await rename(registryTemp, registryPath);
    registryCommitted = true;
    await syncDirectory(fixtureDirectory);
    return {
      status: 'added',
      fixture: {
        id, smokeId, language, characters: text.length, unicodeCodePoints: codePoints,
        utf8Bytes: inputBytes.length, chunks: chunks.length, sha256: articleSha,
      },
      files: targetNames.map(name => `fixtures/${name}`),
      source,
      contentContract: { utf8Bom: 'rejected', lineEndings: 'LF only; CR and CRLF rejected', finalLf: 'preserved exactly as supplied and included in counts and hashes' },
    };
  } catch (error) {
    if (!registryCommitted) {
      await Promise.all(createdFinalPaths.map(path => unlink(path).catch(() => {})));
      throw error;
    }
    throw error;
  } finally {
    await Promise.all(temporaryPaths.map(path => unlink(path).catch(() => {})));
    await lockHandle.close().catch(() => {});
    const currentLock = await readFile(lockPath, 'utf8').catch(() => null);
    if (currentLock?.includes(lockToken)) await unlink(lockPath).catch(() => {});
  }
}

function parseArgs(args) {
  const [command, ...rest] = args;
  if (command === '--help' || command === '-h' || command === 'help') return { command: 'help' };
  if (!['list', 'add', 'check'].includes(command)) fail('Expected command: list, add, or check.');
  const options = {};
  for (let index = 0; index < rest.length; index++) {
    const key = rest[index];
    if (!key.startsWith('--')) fail(`Unexpected argument: ${key}`);
    const option = key.slice(2);
    if (!['language', 'id', 'text', 'creator', 'description', 'license'].includes(option)) fail(`Unknown option: ${key}`);
    if (Object.hasOwn(options, option)) fail(`Option supplied more than once: ${key}`);
    const value = rest[++index];
    if (value === undefined || value.startsWith('--')) fail(`Expected a value after ${key}.`);
    options[option] = value;
  }
  if (command === 'list' && Object.keys(options).length) fail('The list command does not accept options.');
  if (command === 'check' && Object.keys(options).some(option => option !== 'id')) fail('The check command accepts only --id.');
  if (command === 'add') {
    for (const option of ['language', 'id', 'text', 'creator', 'description', 'license']) {
      if (!Object.hasOwn(options, option)) fail(`Missing required option: --${option}`);
    }
  }
  return { command, options };
}

const HELP = `Usage:\n  node tools/translation-fixture.mjs list\n  node tools/translation-fixture.mjs add --language <BCP47> --id <safe-versioned-fixture-id> --text <UTF8file> --creator <credit> --description <translation and review provenance> --license <license identifier>\n  node tools/translation-fixture.mjs check [--id <id>]\n\nText files must be UTF-8 without a BOM and use LF line endings. Final LF characters are preserved and included in counts and hashes. Fixture IDs are immutable; add refuses existing IDs/files and serializes writers with fixtures/.translation-fixture.lock. The current registry supports canonical BCP 47 tags with a 2-3 letter primary language subtag and 2-8 character following subtags.\n`;

export async function execute(args, root = REPO_ROOT) {
  const parsed = parseArgs(args);
  if (parsed.command === 'help') return { help: HELP };
  if (parsed.command === 'list') return { fixtures: await listFixtures(root) };
  if (parsed.command === 'check') return await checkFixtures({ root, id: parsed.options.id });
  return await addFixture({ root, ...parsed.options });
}

async function main() {
  try {
    const result = await execute(process.argv.slice(2));
    if (result.help) process.stdout.write(result.help);
    else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`translation-fixture: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
