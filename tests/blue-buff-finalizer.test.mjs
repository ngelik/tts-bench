import test from 'node:test';
import assert from 'node:assert/strict';
import { setBlueBuffBuildDeclaration } from '../tools/blue-buff-profile-marker.mjs';

const syntheticBuild = Object.freeze({
  graph: 'synthetic.onnx',
  bytes: 123,
  sha256: 'a'.repeat(64),
});
const marker = 'export const BLUE_BUFF_BUILD = null;';
const profile = `export const BLUE_BUFF = Object.freeze({});\n${marker}\n`;

test('finalizer installs a verified declaration into the fresh null marker', () => {
  const result = setBlueBuffBuildDeclaration(profile, syntheticBuild);
  assert.match(result, /"graph": "synthetic\.onnx"/);
  assert.equal(result.includes(marker), false);
});

test('finalizer accepts an exact retry without changing profile bytes', () => {
  const once = setBlueBuffBuildDeclaration(profile, syntheticBuild);
  assert.equal(setBlueBuffBuildDeclaration(once, syntheticBuild), once);
});

test('finalizer rejects a missing marker', () => {
  assert.throws(() => setBlueBuffBuildDeclaration('export const BLUE_BUFF = {};\n', syntheticBuild), /exactly one BLUE_BUFF_BUILD marker/);
});

test('finalizer rejects duplicate markers', () => {
  assert.throws(() => setBlueBuffBuildDeclaration(`${profile}${marker}\n`, syntheticBuild), /exactly one BLUE_BUFF_BUILD marker/);
});

test('finalizer rejects a conflicting non-null declaration', () => {
  const conflicting = setBlueBuffBuildDeclaration(profile, { ...syntheticBuild, bytes: 124 });
  assert.throws(() => setBlueBuffBuildDeclaration(conflicting, syntheticBuild), /conflicts with the verified build/);
});
