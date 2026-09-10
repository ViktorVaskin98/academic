import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEntries } from '../tools/build.mjs';

const html = `
<main>
  <h1>Лекция 1. Топологическая структура на множестве</h1>
  <section id="s-1-1" data-section-id="lecture-01/1.1">
    <h2 id="h-1-1">1.1 Открытые множества</h2>
    <div class="block block--def" id="def-1" data-label="Def. 1" data-title="Топология">
      <div class="block__label">Def. 1 <span class="block__title">Топология</span></div>
      <p>Топологией на множестве $X$ называется любая система $\\tau$ подмножеств.</p>
    </div>
  </section>
  <section id="s-1-3" data-section-id="lecture-01/1.3">
    <h2 id="h-1-3">1.3 Окрестность точки</h2>
    <div class="block block--def" id="def-7" data-label="Def. 7" data-title="Внутренность">
      <div class="block__label">Def. 7 <span class="block__title">Внутренность</span></div>
      <p>Внутренностью множества называется наибольшее открытое подмножество.</p>
    </div>
    <div class="block block--nb" id="nb-6" data-label="NB 6" data-title="Открытое и замкнутое не антонимы">
      <div class="block__label">NB 6</div>
      <p>Множество может быть одновременно открытым и замкнутым.</p>
    </div>
    <div class="block block--example" data-label="Ex. 99">
      <p>Блок без id в индекс не попадает.</p>
    </div>
  </section>
</main>`;

test('extractEntries вытаскивает блоки с их разделом и источником', () => {
  const entries = extractEntries(html, { url: 'lectures/lecture-01.html', source: 'Лекция 1' });
  assert.equal(entries.length, 3);
  const [first, second, third] = entries;
  assert.equal(first.id, 'def-1');
  assert.equal(first.section, '1.1 Открытые множества');
  assert.equal(second.id, 'def-7');
  assert.equal(second.kind, 'def');
  assert.equal(second.label, 'Def. 7');
  assert.equal(second.title, 'Внутренность');
  assert.equal(second.section, '1.3 Окрестность точки');
  assert.equal(second.url, 'lectures/lecture-01.html#def-7');
  assert.equal(second.source, 'Лекция 1');
  assert.ok(second.text.startsWith('Внутренностью'));
  assert.ok(!second.text.includes('<p>'));
  assert.ok(!second.text.includes('Def. 7'));
  assert.equal(third.kind, 'nb');
});

test('extractEntries не падает на странице без блоков', () => {
  assert.deepEqual(extractEntries('<main><h1>Пусто</h1></main>', { url: 'x.html', source: 'X' }), []);
});

test('extractEntries переживает вложенные div внутри блока', () => {
  const nested = `
    <div class="block block--lemma" id="lm-3" data-label="Lm. 3" data-title="Внутренность существует">
      <div class="block__label">Lm. 3</div>
      <p>Формулировка леммы.</p>
      <div class="proof-step"><div class="proof-step__index">1.</div><div>Шаг.</div></div>
    </div>
    <div class="block block--example" id="ex-1" data-label="Ex. 1"><p>После вложенного блока.</p></div>`;
  const entries = extractEntries(nested, { url: 'lectures/lecture-01.html', source: 'Лекция 1' });
  assert.equal(entries.length, 2);
  assert.ok(entries[0].text.includes('Шаг.'));
  assert.equal(entries[1].id, 'ex-1');
  assert.equal(entries[1].text, 'После вложенного блока.');
});
