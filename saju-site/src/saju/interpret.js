// 사주 결과(calc.js 출력) → 해석 섹션 목록 생성
// 각 섹션: { id, title, hanja, paragraphs: [string], sources: [{title,url,channel}], themes: [string], keys: [개념키] }
import kb from '../data/kb_stats.json';
import * as K from '../data/knowledge.js';
import { ELEMENT_KO, BRANCH_MAIN_STEM, HIDDEN_STEMS, tenGod, STEM_ELEMENT, BRANCH_ELEMENT } from './tables.js';

const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const posKo = { year: '년주', month: '월주', day: '일주', time: '시주' };

function sources(keys, n = 4) {
  const seen = new Set();
  const out = [];
  for (const k of keys) {
    const c = kb.concepts[k];
    if (!c) continue;
    for (const v of c.top) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
      if (out.length >= n) return out;
    }
  }
  return out;
}
function mentions(keys) {
  return keys.reduce((a, k) => a + (kb.concepts[k]?.docs || 0), 0);
}
function themes(keys, n = 4) {
  const acc = {};
  for (const k of keys) for (const t of kb.concepts[k]?.themes || []) acc[t.theme] = (acc[t.theme] || 0) + t.share;
  return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t);
}
function section(id, title, hanja, paragraphs, keys) {
  return { id, title, hanja, paragraphs: paragraphs.filter(Boolean), sources: sources(keys), themes: themes(keys), docs: mentions(keys), keys };
}

/** 신강/신약 판단: 월지 2, 일지 1.5, 나머지 1 가중치로 일간을 돕는 오행(비겁·인성) 비율 */
export function strength(data) {
  const { pillars, order, dayStem } = data;
  const dayEl = STEM_ELEMENT[dayStem];
  const helps = (el) => el === dayEl || GEN[el] === dayEl;
  let sup = 0, tot = 0;
  for (const k of order) {
    const p = pillars[k];
    if (!p) continue;
    if (k !== 'day') { const w = k === 'month' ? 1.2 : 1; tot += w; if (helps(p.stemEl)) sup += w; }
    const bw = k === 'month' ? 2 : k === 'day' ? 1.5 : 1;
    tot += bw; if (helps(p.branchEl)) sup += bw;
  }
  const r = sup / tot;
  return { ratio: r, label: r >= 0.5 ? '신강' : r <= 0.3 ? '신약' : '중화' };
}

/** 십성 분포 (천간 1, 지지 본기 1, 지장간 나머지 0.3) */
export function tenGodProfile(data) {
  const { pillars, order, dayStem } = data;
  const score = {};
  const add = (g, w) => { if (g) score[g] = (score[g] || 0) + w; };
  for (const k of order) {
    const p = pillars[k];
    if (!p) continue;
    if (k !== 'day') add(tenGod(dayStem, p.stem), 1);
    add(tenGod(dayStem, BRANCH_MAIN_STEM[p.branch]), 1);
    for (const h of HIDDEN_STEMS[p.branch].slice(0, -1)) add(tenGod(dayStem, h), 0.3);
  }
  const groups = {};
  for (const [g, v] of Object.entries(score)) { const grp = K.TEN_GOD_GROUP[g]; groups[grp] = (groups[grp] || 0) + v; }
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const allGroups = ['비겁', '식상', '재성', '관성', '인성'];
  return { score, groups, dominant: sorted[0]?.[0], second: sorted[1]?.[0], missing: allGroups.filter((g) => !groups[g]) };
}

export function interpret(data) {
  const { pillars, detail, order, dayStem, elements, missing, strongest, relations, sinsal, current, meta } = data;
  const dayEl = STEM_ELEMENT[dayStem];
  const st = strength(data);
  const prof = tenGodProfile(data);
  const S = K.STEMS[dayStem];
  const dayBranch = pillars.day.branch;
  const dayBranchGod = detail.day.branchGod;
  const monthGod = detail.month.branchGod;
  const name = meta.name ? `${meta.name} 님` : '당신';

  const out = [];

  // 1. 총평
  out.push(section('summary', '총평', '總評', [
    `${name}의 일간은 ${S.title.split(' · ')[0]}입니다. ${S.nature}`,
    K.STRENGTH[st.label],
    `월지(${pillars.month.branch}·${monthGod})가 삶의 무대를, 일지(${dayBranch}·${dayBranchGod})가 나의 몸과 배우자 자리를 나타냅니다. ${K.TEN_GODS[monthGod]?.month || ''}`,
  ], [dayStem, st.label === '중화' ? '용신' : st.label, '격국']));

  // 2. 성격과 기질
  out.push(section('character', '성격과 기질', '性情', [
    S.strengths,
    S.cautions,
    `${K.BRANCHES[dayBranch]} 일지가 ${dayBranchGod}이라 ${K.TEN_GODS[dayBranchGod]?.core || ''}`,
    K.STAGES[detail.day.stage],
  ], [dayStem, dayBranch]));

  // 3. 오행의 균형
  const el = [];
  el.push(`여덟 글자의 오행은 ${['木', '火', '土', '金', '水'].map((e) => `${e} ${elements[e]}`).join(' · ')} 입니다. 가장 강한 기운은 ${strongest}(${ELEMENT_KO[strongest]})으로, ${K.ELEMENTS[strongest].excess}`);
  for (const m of missing) el.push(K.ELEMENTS[m].lack);
  if (!missing.length) el.push('다섯 오행이 모두 갖추어져 어느 한쪽으로 크게 치우치지 않습니다. 균형 잡힌 사주는 큰 굴곡 없이 꾸준히 가는 힘이 있고, 운에서 들어오는 기운을 고르게 소화합니다.');
  if (missing.length) el.push(`비어 있는 오행은 색·방향·습관으로 보완할 수 있습니다: ${missing.map((m) => `${m}(${ELEMENT_KO[m]}) → ${K.ELEMENTS[m].remedy}`).join(' / ')}.`);
  out.push(section('elements', '오행의 균형', '五行', el, [`${strongest}과다`, ...missing.map((m) => `${m}결핍`)]));

  // 4. 사주의 구조 (십성)
  const struct = [];
  if (prof.dominant) struct.push(K.GROUP_DESC[prof.dominant]);
  const domGods = Object.entries(prof.score).filter(([g]) => K.TEN_GOD_GROUP[g] === prof.dominant).sort((a, b) => b[1] - a[1]);
  if (domGods[0] && domGods[0][1] >= 2) struct.push(K.TEN_GODS[domGods[0][0]].many);
  for (const g of prof.missing.slice(0, 2)) struct.push(K.GROUP_NONE[g]);
  out.push(section('structure', '사주의 구조', '格局', struct, [...domGods.slice(0, 2).map(([g]) => g), prof.dominant]));

  // 5. 특별한 별 (신살)
  const present = [];
  for (const k of order) for (const s of sinsal[k] || []) if (!present.some((p) => p.name === s.name)) present.push({ name: s.name, pos: k });
  present.sort((a, b) => K.SINSAL_ORDER.indexOf(a.name) - K.SINSAL_ORDER.indexOf(b.name));
  const starPars = present.slice(0, 5).map((p) => {
    const s = K.SINSAL[p.name];
    if (!s) return null;
    const where = order.filter((k) => (sinsal[k] || []).some((x) => x.name === p.name)).map((k) => posKo[k]).join('·');
    return `【${s.title}】 ${where}에 있습니다. ${s.text}`;
  });
  if (!starPars.filter(Boolean).length) starPars.push('두드러지는 신살이 없어 별의 영향보다 오행과 십성의 구조가 삶을 이끕니다. 특별한 살이 없다는 것은 굴곡 대신 꾸준함이 있다는 뜻입니다.');
  out.push(section('stars', '나를 따르는 별', '神殺', starPars, present.slice(0, 5).map((p) => p.name)));

  // 6. 관계의 흐름 (합충)
  const rel = [];
  const label = (c) => `${posKo[c.pos]} ${c.ch}`;
  for (const r of relations.chung) rel.push(K.RELATION_TEXT.충(label(r.chars[0]), label(r.chars[1]), r.chars[0].pos, r.chars[1].pos));
  for (const r of relations.stemChung) rel.push(`천간 ${r.chars.map(label).join('·')}이 충합니다. 생각과 태도가 두 방향으로 갈리기 쉬워 결정이 늦어질 수 있지만, 양쪽을 다 보는 균형 감각이기도 합니다.`);
  for (const r of [...relations.yukhap, ...relations.samhap, ...relations.banghap].slice(0, 2)) rel.push(K.RELATION_TEXT.합(label(r.chars[0]), label(r.chars[1]), r.label));
  for (const r of relations.stemHap) rel.push(`천간 ${r.chars.map(label).join('·')}이 합하여 ${r.result}(${ELEMENT_KO[r.result]}) 기운으로 변합니다. 두 자리의 사람·영역이 하나로 묶이는 깊은 인연입니다.`);
  for (const r of relations.wonjin) rel.push(K.RELATION_TEXT.원진(label(r.chars[0]), label(r.chars[1]), r.chars[0].pos, r.chars[1].pos));
  for (const r of relations.gwimun) rel.push(K.RELATION_TEXT.귀문(label(r.chars[0]), label(r.chars[1])));
  for (const r of relations.hae.slice(0, 1)) rel.push(K.RELATION_TEXT.해(label(r.chars[0]), label(r.chars[1])));
  for (const r of relations.hyeong.slice(0, 1)) rel.push(K.RELATION_TEXT.형(label(r.chars[0]), label(r.chars[1])));
  const gm = meta.gongmang.filter((b) => order.some((k) => pillars[k]?.branch === b));
  if (gm.length) rel.push(`${gm.map((b) => `${posKo[order.find((k) => pillars[k]?.branch === b)]} ${b}`).join(', ')}가 공망입니다. ${K.SINSAL.공망.text}`);
  if (!rel.length) rel.push('여덟 글자 사이에 충·형·원진 같은 마찰이 없습니다. 내부 갈등이 적어 마음이 평온한 편이고, 변화는 외부의 운에서 들어올 때 일어납니다.');
  out.push(section('relations', '관계의 흐름', '合沖', rel, ['충', ...(relations.wonjin.length ? ['원진살'] : []), ...(relations.gwimun.length ? ['귀문관살'] : []), ...(gm.length ? ['공망'] : []), '삼합']));

  // 7. 지금의 운
  const now = [];
  const d = current.daeun, s = current.seun;
  if (d) now.push(`지금은 ${d.age}세부터 시작된 ${d.text}(${d.stemKo}${d.branchKo}) 대운입니다. 천간 ${d.stemGod}·지지 ${d.branchGod}의 시기로, ${K.TEN_GODS[d.stemGod]?.luck || ''}`);
  if (s) {
    now.push(`${s.year}년 세운은 ${s.text}(${s.stemKo}${s.branchKo}), ${s.stemGod}·${s.branchGod}의 해입니다. ${K.TEN_GODS[s.branchGod]?.luck || ''}`);
    const yb = s.branch;
    const pairs = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
    const hits = order.filter((k) => pillars[k] && pairs[yb] === pillars[k].branch);
    if (hits.length) now.push(`올해 지지 ${yb}가 ${hits.map((k) => posKo[k]).join('·')}의 ${pillars[hits[0]].branch}와 충합니다. ${hits.map((k) => K.POSITION_MEANING[k]).join(', ')} 영역에서 이동·변동·결단이 일어나는 해이니 흔들림을 방향 전환의 기회로 삼으세요.`);
    if (s.samjae) now.push('올해는 삼재(三災)에 해당하는 해입니다. 삼재는 큰 재앙이라기보다 "무리하지 말라"는 신호입니다. 새 판을 크게 벌이기보다 지키고 다듬는 데 집중하면 무난히 지나갑니다.');
    if (current.month) now.push(`이번 달(${current.month.text})은 ${current.month.stemGod}·${current.month.branchGod}의 달입니다. ${K.TEN_GODS[current.month.branchGod]?.luck?.split('.')[0] || ''}.`);
  }
  out.push(section('now', '지금 흐르는 운', '運勢', now, ['대운', '세운', d?.stemGod, s?.branchGod].filter(Boolean)));

  // 8. 조언
  const adv = [];
  adv.push(st.label === '신강'
    ? '힘이 넘치는 사주는 밖으로 써야 합니다. 표현하고, 만들고, 책임지는 자리로 나가세요. 가만히 있으면 그 힘이 안에서 나를 해칩니다.'
    : st.label === '신약'
      ? '나를 채우는 것이 먼저입니다. 배움·휴식·좋은 사람을 곁에 두고, 혼자 다 짊어지려 하지 마세요. 함께할 때 더 멀리 갑니다.'
      : '균형이 좋은 사주는 운의 흐름을 읽는 것이 핵심입니다. 좋은 운에는 과감하게, 낮은 운에는 지키면서 가세요.');
  if (missing.length) adv.push(`부족한 ${missing.map((m) => `${m}(${ELEMENT_KO[m]})`).join('·')} 기운은 ${missing.map((m) => K.ELEMENTS[m].remedy).join(', ')} 로 생활 속에서 채워 보세요. 작은 습관이 운의 방향을 바꿉니다.`);
  if (prof.dominant) adv.push({ 비겁: '경쟁보다 협업의 기술을, 승부보다 지키는 힘을 기르면 강점이 완성됩니다.', 식상: '재능을 세상에 꺼내 놓는 것을 두려워하지 마세요. 보여줄수록 길이 열립니다.', 재성: '벌어들이는 힘은 충분하니 쓰는 원칙과 쉬는 시간을 정해 두세요.', 관성: '책임을 감당하는 힘이 큰 만큼 몸을 먼저 챙기세요. 건강이 곧 명예의 밑천입니다.', 인성: '배운 것을 세상에 내놓는 실행이 과제입니다. 완벽해질 때까지 기다리지 말고 지금 시작하세요.' }[prof.dominant]);
  adv.push('사주는 정해진 운명이 아니라 타고난 기질과 흐름의 지도입니다. 지도를 알면 같은 길도 덜 헤매며 갈 수 있습니다.');
  out.push(section('advice', '별이 건네는 조언', '助言', adv, [dayStem, ...missing.map((m) => `${m}결핍`)]));

  return { sections: out, strength: st, profile: prof, meta: kb.meta };
}
