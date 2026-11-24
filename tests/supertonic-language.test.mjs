import test from 'node:test';
import assert from 'node:assert/strict';
import { describeSupertonicFrontend, resolveSupertonicFixtureLanguage, resolveSupertonicLanguage } from '../web/supertonic/language.mjs';
import { UnicodeProcessor } from '../web/supertonic/helper.mjs';
import { FRONTEND_DESCRIPTION } from '../web/supertonic/settings.mjs';

test('Supertonic preserves its English default and resolves fixture language into settings value', () => {
  assert.equal(resolveSupertonicLanguage(), 'en');
  assert.equal(resolveSupertonicLanguage('FR'), 'fr');
  assert.equal(resolveSupertonicLanguage('de'), 'de');
  assert.match(describeSupertonicFrontend(FRONTEND_DESCRIPTION, 'en'), /<en> tags/);
  assert.match(describeSupertonicFrontend(FRONTEND_DESCRIPTION, 'fr'), /<fr> tags/);
});

test('Supertonic accepts only the exact language tags exposed by its official helper', () => {
  assert.throws(() => resolveSupertonicLanguage('fr-FR'), /does not support fixture language/);
  assert.throws(() => resolveSupertonicLanguage('na'), /does not support fixture language/);
  assert.throws(() => resolveSupertonicLanguage('xx'), /does not support fixture language/);
  assert.throws(() => resolveSupertonicLanguage('  '), /nonempty language code/);
});

test('official Unicode processor applies the resolved French language tag', () => {
  const language = resolveSupertonicLanguage('fr');
  const processor = new UnicodeProcessor([]);
  assert.match(processor.preprocessText('Bonjour, tout le monde', language), /^<fr>Bonjour, tout le monde\.<\/fr>$/);
});

test('Supertonic keeps the regional fixture tag and submits the supported model tag', () => {
  const processor = new UnicodeProcessor([]);
  for (const [tag, modelLanguage] of [['es-ES', 'es'], ['pt-BR', 'pt']]) {
    const route = resolveSupertonicFixtureLanguage(tag.toLowerCase());
    assert.deepEqual(route, { language: tag, modelLanguage });
    const text = processor.preprocessText('Hola.', route.modelLanguage);
    assert.equal(text, `<${modelLanguage}>Hola.</${modelLanguage}>`);
  }
  assert.deepEqual(resolveSupertonicFixtureLanguage(), { language: 'en', modelLanguage: 'en' });
  assert.throws(() => resolveSupertonicFixtureLanguage('pt-PT'), /does not support fixture language/);
  assert.throws(() => resolveSupertonicFixtureLanguage('es-AR'), /does not support fixture language/);
});

test('Supertonic frontend description reports each language tag and official split target', () => {
  for (const [language, target] of [['en', 300], ['it', 300], ['ko', 120], ['ja', 120]]) {
    const description = describeSupertonicFrontend(FRONTEND_DESCRIPTION, language);
    assert.match(description, new RegExp(`<${language}> tags`));
    assert.match(description, new RegExp(`target internal chunk length of ${target} UTF-16 code units`));
    assert.match(description, /0\.3-second pause between internal utterances/);
  }
});
