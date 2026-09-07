import test from 'node:test';
import assert from 'node:assert/strict';
import { pickYong } from '../src/saju/yongshin.js';
import { CLIMATE_NEED } from '../src/data/patterns.js';

// 甲(木) 일간 기준: 비겁 木 · 식상 火 · 재성 土 · 관성 金 · 인성 水
const pick = (label, groups, needEl = '火') => pickYong({ label, groups, needEl, dayEl: '木' });
const five = (r) => [r.group, r.groups.hee, r.groups.gi, r.groups.gu, r.groups.han];

test('신강(비겁 과다, 관성 있음) → 용 관성 · 희 재성 · 기 비겁 · 구 인성 · 한 식상', () => {
  const r = pick('신강', { 비겁: 4, 인성: 1, 관성: 1, 재성: 1, 식상: 1 });
  assert.deepEqual(five(r), ['관성', '재성', '비겁', '인성', '식상']);
  assert.deepEqual([r.el, r.hee, r.gi, r.gu, r.han], ['金', '土', '木', '水', '火']);
});
test('신강(비겁 과다, 관성 없음) → 용 식신·상관(식상) · 희 재성', () => {
  const r = pick('신강', { 비겁: 4, 인성: 1, 재성: 1, 식상: 1 });
  assert.deepEqual(five(r), ['식상', '재성', '비겁', '인성', '관성']);
});
test('신강(인성 과다) → 용 재성 · 희 식상 · 기 인성 · 구 비겁 · 한 관성', () => {
  const r = pick('신강', { 비겁: 1, 인성: 4, 재성: 1, 식상: 1, 관성: 1 });
  assert.deepEqual(five(r), ['재성', '식상', '인성', '비겁', '관성']);
});
test('신약(관성 과다·살중) → 용 인성 · 희 비겁 · 기 관성 · 구 재성 · 한 식상', () => {
  const r = pick('신약', { 비겁: 1, 인성: 1, 관성: 4, 재성: 1, 식상: 0.3 });
  assert.deepEqual(five(r), ['인성', '비겁', '관성', '재성', '식상']);
});
test('신약(재성 과다·재다신약) → 용 비겁 · 희 인성 · 기 재성 · 구 식상 · 한 관성', () => {
  const r = pick('신약', { 비겁: 1, 인성: 0.3, 재성: 4, 관성: 1, 식상: 1 });
  assert.deepEqual(five(r), ['비겁', '인성', '재성', '식상', '관성']);
});
test('신약(식상 과다) → 용 인성 · 희 비겁 · 기 식상 · 구 재성 · 한 관성', () => {
  const r = pick('신약', { 비겁: 1, 인성: 1, 식상: 4, 재성: 1, 관성: 0.3 });
  assert.deepEqual(five(r), ['인성', '비겁', '식상', '재성', '관성']);
});
test('신약인데 인성이 없으면 비겁이 용신', () => {
  const r = pick('신약', { 비겁: 1, 관성: 3, 재성: 1 });
  assert.equal(r.group, '비겁'); assert.equal(r.groups.hee, '인성');
});
test('중화 → 조후 기운이 용신, 희신은 용신을 낳는 오행', () => {
  const r = pick('중화', { 비겁: 2, 인성: 2, 재성: 2, 관성: 1, 식상: 1 }, '火');
  assert.equal(r.group, '식상'); assert.equal(r.el, '火'); assert.equal(r.hee, '木'); assert.equal(r.gi, '水'); assert.equal(r.gu, '金'); assert.equal(r.han, '土');
});
test('용신·희신·기신·구신·한신은 항상 서로 다른 다섯 그룹', () => {
  for (const label of ['신강', '신약', '중화']) for (const dom of ['비겁', '식상', '재성', '관성', '인성']) {
    const groups = { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1, [dom]: 4 };
    const r = pickYong({ label, groups, needEl: '火', dayEl: '土' });
    assert.equal(new Set(five(r)).size, 5, `${label}/${dom}: ${five(r)}`);
  }
});
test('조후용신 표: 10 일간 × 4 계절, 유효한 오행', () => {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  for (const season of ['봄', '여름', '가을', '겨울']) for (const s of stems) {
    const v = CLIMATE_NEED[season][s];
    assert.ok(Array.isArray(v) && ['木', '火', '土', '金', '水'].includes(v[0]) && v[1], `${season}/${s}`);
  }
  assert.equal(CLIMATE_NEED['봄']['壬'][0], '金'); assert.equal(CLIMATE_NEED['봄']['丙'][0], '水'); assert.equal(CLIMATE_NEED['겨울']['甲'][0], '火'); assert.equal(CLIMATE_NEED['여름']['癸'][0], '金');
});
