import { HIDDEN_STEMS, tenGod, isYangStem, STEM_KO, BRANCH_KO, STEM_ELEMENT } from './tables.js';

/**
 * 격국(내격) 판정 — 자평진전 취격법
 *  1) 왕지(子午卯酉): 기운이 순수하므로 투출 여부와 관계없이 정기(본기)로 격을 정한다.
 *  2) 생지(寅申巳亥)·고지(辰戌丑未): 월지 지장간 중 천간(년간·월간·시간)에 투출한 글자를 격으로 취한다.
 *     우선순위 정기 → 중기 → 여기. 비견·겁재는 격으로 취하지 않고 건너뛴다.
 *  3) 고지에서 투출이 없고 중기가 다른 지지와 삼합(왕지)을 이루면 중기로 격을 정한다.
 *  4) 그래도 없으면 정기로 격을 정한다.
 *  5) 정해진 글자가 비견이면 건록격, 겁재이면 양인격(양간 일간)·월겁격(음간 일간).
 */
const WANG = ['子', '午', '卯', '酉'];
const GO = ['辰', '戌', '丑', '未'];
const GO_WANG = { 辰: '子', 戌: '午', 丑: '酉', 未: '卯' }; // 고지 중기가 이루는 삼합의 왕지
const POS_KO = { year: '년간', month: '월간', time: '시간' };
const roleNames = (n) => (n === 2 ? ['여기', '정기'] : ['여기', '중기', '정기']);

export function gyeokName(god, dayStem) {
  if (god === '비견') return '건록격';
  if (god === '겁재') return isYangStem(dayStem) ? '양인격' : '월겁격';
  return `${god}격`;
}

export function determineGyeok({ dayStem, pillars }) {
  const mb = pillars.month.branch;
  const stems = HIDDEN_STEMS[mb];
  const roles = roleNames(stems.length);
  const tops = ['year', 'month', 'time'].filter((p) => pillars[p]);
  const hidden = stems.map((s, i) => {
    const god = tenGod(dayStem, s);
    const at = tops.filter((p) => pillars[p].stem === s).map((p) => POS_KO[p]);
    return { stem: s, ko: STEM_KO[s], el: STEM_ELEMENT[s], role: roles[i], god, at, transparent: at.length > 0, isBigeop: god === '비견' || god === '겁재' };
  });
  const byRole = Object.fromEntries(hidden.map((h) => [h.role, h]));
  const main = byRole.정기;
  const otherBranches = ['year', 'day', 'time'].filter((p) => pillars[p]).map((p) => pillars[p].branch);

  let pick = null, method = '';
  if (WANG.includes(mb)) { pick = main; method = '왕지'; }
  else {
    pick = [byRole.정기, byRole.중기, byRole.여기].filter(Boolean).find((h) => h.transparent && !h.isBigeop) || null;
    if (pick) method = '투출';
    if (!pick && GO.includes(mb) && byRole.중기 && !byRole.중기.isBigeop && otherBranches.includes(GO_WANG[mb])) { pick = byRole.중기; method = '삼합'; }
    if (!pick) { pick = main; method = '정기'; }
  }

  const key = gyeokName(pick.god, dayStem);
  const mainKey = gyeokName(main.god, dayStem);
  const alt = key !== mainKey ? mainKey : null;
  const extra = hidden.filter((h) => h !== pick && h.transparent && !h.isBigeop);
  const list = hidden.map((h) => `${h.stem}(${h.god})`).join('·');
  const mbKo = `${mb}(${BRANCH_KO[mb]})`;
  const reason = ({
    왕지: `태어난 달 ${mbKo}월은 한 가지 기운이 순수하게 모인 왕지라, 지장간 ${list} 가운데 정기 ${pick.stem}(${pick.god})으로 격을 정합니다.`,
    투출: `월지 ${mbKo}의 지장간 ${list} 가운데 ${pick.role} ${pick.stem}(${pick.god})이 ${pick.at.join('·')}에 투출(透出)하여 격을 이룹니다.`,
    삼합: `월지 ${mbKo}의 지장간 ${list} 가운데 천간에 투출한 글자는 없지만, 중기 ${pick.stem}(${pick.god})이 ${GO_WANG[mb]}와 삼합을 이루어 격을 정합니다.`,
    정기: `월지 ${mbKo}의 지장간 ${list} 가운데 천간에 투출한 글자가 없어 정기 ${pick.stem}(${pick.god})으로 격을 정합니다.`,
  })[method];
  const extraNote = extra.length ? ` ${extra.map((h) => `${h.role} ${h.stem}(${h.god})`).join('과 ')}도 ${extra.map((h) => h.at.join('·')).join('·')}에 투출해 ${extra.map((h) => h.god).join('·')}의 기운을 함께 지닙니다.` : '';
  const altNote = alt ? `월지의 본기만으로 격을 보는 방식에서는 ${alt}으로 부르기도 하며, ${alt}의 성향이 바탕에 깔려 있습니다.` : '';

  return { key, method, pick, main, hidden, alt, extra, reason: reason + extraNote, altNote, monthBranch: mb };
}
