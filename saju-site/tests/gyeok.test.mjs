import test from 'node:test';
import assert from 'node:assert/strict';
import { determineGyeok } from '../src/saju/gyeokguk.js';

const gz = (s) => ({ stem: s[0], branch: s[1], text: s });
const P = (y, m, d, t) => ({ year: gz(y), month: gz(m), day: gz(d), time: gz(t) });

test('왕지 子월 甲일간 → 정인격 (여기 壬 투출은 참고 정보)', () => {
  const r = determineGyeok({ dayStem: '甲', pillars: P('辛未', '庚子', '甲寅', '壬申') });
  assert.equal(r.key, '정인격'); assert.equal(r.method, '왕지');
  assert.equal(r.extra[0]?.stem, '壬'); assert.equal(r.alt, null);
});
test('생지 寅월 甲일간, 중기 丙 투출 → 식신격 (정기 비견은 격으로 취하지 않음)', () => {
  const r = determineGyeok({ dayStem: '甲', pillars: P('丙子', '甲寅', '甲子', '戊辰') });
  assert.equal(r.key, '식신격'); assert.equal(r.method, '투출'); assert.equal(r.alt, '건록격');
});
test('생지 寅월 甲일간, 투출 없음 → 건록격', () => {
  const r = determineGyeok({ dayStem: '甲', pillars: P('辛未', '庚寅', '甲子', '壬申') });
  assert.equal(r.key, '건록격'); assert.equal(r.method, '정기');
});
test('생지 寅월 甲일간, 정기·중기 미투출·여기 戊 투출 → 편재격', () => {
  const r = determineGyeok({ dayStem: '甲', pillars: P('戊辰', '庚寅', '甲子', '壬申') });
  assert.equal(r.key, '편재격'); assert.equal(r.pick.role, '여기');
});
test('고지 辰월 庚일간, 여기 乙 투출 → 정재격', () => {
  const r = determineGyeok({ dayStem: '庚', pillars: P('乙丑', '庚辰', '庚午', '壬午') });
  assert.equal(r.key, '정재격'); assert.equal(r.method, '투출');
});
test('고지 辰월 庚일간, 투출 없음 + 子 삼합 → 상관격(중기 癸)', () => {
  const r = determineGyeok({ dayStem: '庚', pillars: P('丁丑', '庚辰', '庚子', '丙午') });
  assert.equal(r.key, '상관격'); assert.equal(r.method, '삼합');
});
test('고지 辰월 庚일간, 투출·삼합 없음 → 편인격(정기 戊)', () => {
  const r = determineGyeok({ dayStem: '庚', pillars: P('丁丑', '庚辰', '庚午', '丙午') });
  assert.equal(r.key, '편인격'); assert.equal(r.method, '정기');
});
test('午월 丙일간 → 양인격, 午월 丁일간 → 건록격, 寅월 乙일간 → 월겁격, 午월 戊일간 → 정인격', () => {
  assert.equal(determineGyeok({ dayStem: '丙', pillars: P('庚子', '壬午', '丙寅', '庚辰') }).key, '양인격');
  assert.equal(determineGyeok({ dayStem: '丁', pillars: P('庚子', '壬午', '丁卯', '庚辰') }).key, '건록격');
  assert.equal(determineGyeok({ dayStem: '乙', pillars: P('辛未', '庚寅', '乙丑', '壬申') }).key, '월겁격');
  assert.equal(determineGyeok({ dayStem: '戊', pillars: P('庚子', '壬午', '戊寅', '庚辰') }).key, '정인격');
});
test('시주 없음(시간 모름)에서도 동작', () => {
  const r = determineGyeok({ dayStem: '甲', pillars: { year: gz('丙子'), month: gz('甲寅'), day: gz('甲子') } });
  assert.equal(r.key, '식신격');
});
