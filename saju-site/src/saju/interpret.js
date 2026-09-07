// 사주 결과(calc.js) → 해석 데이터
import kb from '../data/kb_stats.json';
import * as K from '../data/knowledge.js';
import * as P from '../data/patterns.js';
import { ELEMENT_KO, BRANCH_MAIN_STEM, HIDDEN_STEMS, tenGod, STEM_ELEMENT, BRANCH_CHUNG, BRANCH_YUKHAP, BRANCH_WONJIN, twelveSal, STEMS as STEM_LIST, STEM_KO } from './tables.js';

const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const posKo = { year: '년주', month: '월주', day: '일주', time: '시주' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pairHas = (table, a, b) => table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const first = (s) => (s.match(/^[^.!?]*[.!?]/) || [s])[0];

export function strength(data) {
  const { pillars, order, dayStem } = data;
  const dayEl = STEM_ELEMENT[dayStem];
  const helps = (el) => el === dayEl || GEN[el] === dayEl;
  let sup = 0, tot = 0;
  for (const k of order) {
    const p = pillars[k]; if (!p) continue;
    if (k !== 'day') { const w = k === 'month' ? 1.2 : 1; tot += w; if (helps(p.stemEl)) sup += w; }
    const bw = k === 'month' ? 2 : k === 'day' ? 1.5 : 1;
    tot += bw; if (helps(p.branchEl)) sup += bw;
  }
  const r = sup / tot;
  return { ratio: r, label: r >= 0.5 ? '신강' : r <= 0.3 ? '신약' : '중화' };
}

export function tenGodProfile(data) {
  const { pillars, order, dayStem } = data;
  const score = {};
  const add = (g, w) => { if (g) score[g] = (score[g] || 0) + w; };
  for (const k of order) {
    const p = pillars[k]; if (!p) continue;
    if (k !== 'day') add(tenGod(dayStem, p.stem), 1);
    add(tenGod(dayStem, BRANCH_MAIN_STEM[p.branch]), 1);
    for (const h of HIDDEN_STEMS[p.branch].slice(0, -1)) add(tenGod(dayStem, h), 0.3);
  }
  const groups = {};
  for (const [g, v] of Object.entries(score)) { const grp = K.TEN_GOD_GROUP[g]; groups[grp] = (groups[grp] || 0) + v; }
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const all = ['비겁', '식상', '재성', '관성', '인성'];
  return { score, groups, dominant: sorted[0]?.[0], second: sorted[1]?.[0], missing: all.filter((g) => !groups[g]),
    has: (g) => (score[g] || 0) >= 0.9, level: (g) => (groups[g] || 0) >= 2.5 ? '강' : (groups[g] || 0) > 0 ? '중' : '무' };
}

const CAT_GOD_BOOST = {
  직장: { 관성: 1, 인성: 0.5, 식상: 0.3, 비겁: -0.5 },
  금전: { 재성: 1, 식상: 0.5, 비겁: -1, 인성: -0.3 },
  연애: { 재성: 0.5, 관성: 0.5, 식상: 0.3, 비겁: -0.5, 인성: -0.3 },
  건강: { 인성: 0.5, 식상: 0.5, 관성: -1, 비겁: -0.3 },
  학업: { 인성: 1, 식상: 0.3, 관성: 0.3, 재성: -0.5 },
};

export function interpret(data) {
  const { pillars, detail, order, dayStem, elements, missing, strongest, relations, sinsal, current, meta, daeun } = data;
  const st = strength(data);
  const prof = tenGodProfile(data);
  const S = K.STEMS[dayStem];
  const gender = meta.gender;
  const dayEl = STEM_ELEMENT[dayStem];
  const dayBranch = pillars.day.branch;
  const monthGod = detail.month.branchGod;
  const name = meta.name ? `${meta.name} 님` : '당신';
  const present = order.filter((k) => pillars[k]);
  const branches = present.map((k) => ({ pos: k, ch: pillars[k].branch }));
  const sinsalNames = [...new Set(present.flatMap((k) => (sinsal[k] || []).map((s) => s.name)))].sort((a, b) => K.SINSAL_ORDER.indexOf(a) - K.SINSAL_ORDER.indexOf(b));
  const fav = (god) => (K.STRENGTH[st.label].good.includes(god) ? 1 : K.STRENGTH[st.label].bad.includes(god) ? -1 : 0);
  const spouseGroup = gender === '남' ? '재성' : '관성';

  // ---------- 조후 · 형국 ----------
  const season = P.SEASON_OF[pillars.month.branch];
  const [needEl, needWhy] = P.CLIMATE_NEED[season][dayEl];
  const needCount = elements[needEl];
  const image = P.IMAGE[dayEl][season];
  const imageNote = strongest !== dayEl && elements[strongest] >= 3 ? `주위에 ${strongest}(${ELEMENT_KO[strongest]})이 많아 ${P.EXCESS_IMAGE[strongest]}` : null;
  const allSeun = daeun.flatMap((d) => d.seun.map((s) => ({ ...s, daeun: d })));
  const needDaeun = daeun.filter((d) => d.stemEl === needEl || d.branchEl === needEl);
  const nowY = current.nowYear;
  const needYears = allSeun.filter((s) => s.year >= nowY && s.year < nowY + 12 && (s.stemEl === needEl || s.branchEl === needEl));
  const inNeedDaeun = current.daeun && (current.daeun.stemEl === needEl || current.daeun.branchEl === needEl);
  const nextNeedDaeun = needDaeun.find((d) => d.startYear > nowY);
  const climate = {
    season, needEl, needWhy, image, imageNote, dayEl, needCount, inNeedDaeun,
    paras: [
      `${name}의 사주는 "${image}"의 형국입니다. ${imageNote ? imageNote + '. ' : ''}${P.SEASON_DESC[season]}`,
      `이 사주에 가장 필요한 기운은 ${needEl}(${ELEMENT_KO[needEl]}), 곧 ${needWhy}입니다. ` +
        (needCount === 0
          ? `그런데 원국에 ${needEl}이 하나도 없습니다. 타고난 재능과 힘은 있지만 그것을 세상에 꺼내 줄 열쇠가 밖(운)에 있다는 뜻으로, 평소에는 웅크려 있다가 운에서 ${needEl}이 들어올 때 비로소 크게 풀리는 유형입니다.`
          : needCount === 1
            ? `원국에 ${needEl}이 하나 있어 최소한의 불씨는 있습니다. 운에서 ${needEl}이 더해질 때 그 불씨가 크게 살아납니다.`
            : `원국에 ${needEl}이 ${needCount}개 있어 조후가 갖춰진 편입니다. 필요한 기운을 스스로 지녔으니 운의 굴곡을 덜 타고, ${needEl} 운에는 한층 더 힘을 받습니다.`),
      inNeedDaeun
        ? `지금 흐르는 ${current.daeun.text} 대운(${current.daeun.age}세~)에 ${needEl}이 들어와 있습니다. 바로 지금이 웅크려 있던 기운이 투출(透出)되는 시기입니다. 지금 시작하는 일은 뿌리를 내립니다.`
        : nextNeedDaeun
          ? `${needEl}이 대운으로 들어오는 때는 ${nextNeedDaeun.startYear}년(${nextNeedDaeun.age}세)부터 시작되는 ${nextNeedDaeun.text} 대운입니다. 그때 얼어 있던 기운이 녹아 흐르기 시작하니, 그 전까지는 준비하고 쌓는 시기로 삼으세요.`
          : `앞으로의 대운에서는 ${needEl}이 크게 들어오지 않습니다. 대신 세운(해)과 월운에서 ${needEl}이 오는 때를 잘 잡아 움직이면 됩니다.`,
      needYears.length
        ? `가까운 해 중 ${needEl}이 들어오는 해는 ${needYears.map((s) => `${s.year}년(${s.text})`).join(', ')}입니다. 이 해들에 막힌 것이 풀리고 결단이 결실로 이어집니다.`
        : null,
    ].filter(Boolean),
    timing: { daeun: needDaeun.map((d) => ({ age: d.age, startYear: d.startYear, endYear: d.endYear, text: d.text })), years: needYears.map((s) => ({ year: s.year, text: s.text })) },
  };
  const catTiming = (cat) => {
    const p = [];
    if (needCount <= 1) {
      p.push(`${cat}운의 열쇠 역시 ${needEl}(${ELEMENT_KO[needEl]})입니다. ${P.FREEZE[cat]}`);
      if (inNeedDaeun) p.push(`지금 ${current.daeun.text} 대운에 ${needEl}이 들어와 있으니 ${P.THAW[cat]}`);
      else if (nextNeedDaeun) p.push(`${nextNeedDaeun.startYear}년 ${nextNeedDaeun.text} 대운부터 ${P.THAW[cat]}`);
      if (needYears.length) p.push(`해 단위로는 ${needYears.slice(0, 4).map((s) => `${s.year}년`).join('·')}에 ${needEl}이 들어와 ${cat}운이 한 번씩 크게 열립니다.`);
    } else {
      p.push(`조후가 갖춰져 있어 ${cat}운은 운의 굴곡을 크게 타지 않습니다. 다만 ${needEl} 운(${needYears.slice(0, 3).map((s) => `${s.year}년`).join('·') || '해당 대운'})에는 평소보다 한층 힘을 받습니다.`);
    }
    return p;
  };

  // ---------- 조합 패턴 매칭 ----------
  const patterns = [];
  const pushPat = (key, def, kind, title) => {
    if (!def) return;
    if (patterns.some((p) => p.key === key)) return;
    patterns.push({ key, kind, title, img: def.img, pos: def.pos, neg: def.neg, cats: def.cats || [], stats: kb.patterns[key] || null });
  };
  pushPat(pillars.day.text, P.ILJU[pillars.day.text], '일주', `${pillars.day.text} 일주`);
  const relKey = (chars, suffix) => { const a = chars[0].ch, b = chars[1].ch; return P.REL_PATTERN[a + b + suffix] ? a + b + suffix : P.REL_PATTERN[b + a + suffix] ? b + a + suffix : null; };
  for (const r of relations.stemChung) { const k = relKey(r.chars, '충'); if (k) pushPat(k, P.REL_PATTERN[k], '천간충', `${k.slice(0, 2)} 충`); }
  for (const r of relations.stemHap) { const k = relKey(r.chars, '합'); if (k) pushPat(k, P.REL_PATTERN[k], '천간합', `${k.slice(0, 2)} 합`); }
  for (const r of relations.chung) { const k = relKey(r.chars, '충'); if (k) pushPat(k, P.REL_PATTERN[k], '지지충', `${k.slice(0, 2)} 충`); }
  for (const r of relations.yukhap) { const k = relKey(r.chars, '합'); if (k) pushPat(k, P.REL_PATTERN[k], '육합', `${k.slice(0, 2)} 육합`); }
  for (const r of relations.samhap.filter((x) => x.full)) { const k = ['寅午戌', '申子辰', '亥卯未', '巳酉丑'].find((t) => r.chars.every((c) => t.includes(c.ch))); if (k) pushPat(k, P.REL_PATTERN[k], '삼합', `${k} 삼합`); }
  for (const r of relations.hyeong) { const k = r.label === '삼형' ? ['寅巳申형', '丑戌未형'].find((t) => r.chars.every((c) => t.includes(c.ch))) : r.label === '상형' ? '子卯형' : null; if (k) pushPat(k, P.REL_PATTERN[k], '형', k.replace('형', ' 형')); }
  for (const r of relations.wonjin) { const k = relKey(r.chars, '원진'); if (k) pushPat(k, P.REL_PATTERN[k], '원진', `${k.slice(0, 2)} 원진`); }
  for (const r of relations.gwimun) { const k = relKey(r.chars, '귀문'); if (k) pushPat(k, P.REL_PATTERN[k], '귀문', `${k.slice(0, 2)} 귀문`); }
  const has = prof.has, lv = prof.level;
  const structs = [
    ['식신제살', has('식신') && has('편관')], ['상관견관', has('상관') && has('정관')], ['관살혼잡', has('편관') && has('정관')],
    ['재다신약', lv('재성') === '강' && st.label === '신약'], ['인다신약', lv('인성') === '강'], ['군겁쟁재', lv('비겁') === '강' && lv('재성') !== '무'],
    ['재생관', lv('재성') !== '무' && lv('관성') !== '무' && st.label !== '신약'], ['관인상생', lv('관성') !== '무' && lv('인성') !== '무'],
    ['살인상생', has('편관') && lv('인성') !== '무'], ['탐재괴인', lv('재성') === '강' && lv('인성') === '중'], ['상관패인', has('상관') && has('정인')],
    ['식신생재', has('식신') && lv('재성') !== '무'], ['상관생재', has('상관') && lv('재성') !== '무'],
    ['무재', lv('재성') === '무'], ['무관', lv('관성') === '무'], ['무인성', lv('인성') === '무'], ['무식상', lv('식상') === '무'], ['무비겁', lv('비겁') === '무'],
    ['도화홍염', sinsalNames.includes('도화') && sinsalNames.includes('홍염')], ['양인편관', sinsalNames.includes('양인') && has('편관')], ['백호괴강', sinsalNames.includes('백호대살') && sinsalNames.includes('괴강')],
  ].filter(([, ok]) => ok).map(([k]) => k);
  structs.sort((a, b) => (kb.patterns[b]?.mentions || 0) - (kb.patterns[a]?.mentions || 0));
  for (const k of structs.slice(0, 6)) pushPat(k, P.STRUCT[k], '구조', k === '인다신약' ? '인성과다' : k);
  // 일간 × 십성 (월지·일지 십성만, 원문 통계 카드)
  for (const g of [monthGod, detail.day.branchGod]) {
    const key = `${dayStem}+${g}`;
    if (kb.patterns[key] && !patterns.some((p) => p.key === key)) {
      patterns.push({ key, kind: '일간×십성', title: `${S.title.split(' ')[0]} 일간의 ${g}`, img: `${g === monthGod ? '월지' : '일지'}에 자리한 ${g}`,
        pos: `${S.title.split(' ')[0]}에게 ${g}은 ${K.TEN_GODS[g].core} ${g === monthGod ? K.TEN_GODS[g].month : ''}`,
        neg: K.TEN_GODS[g].many, cats: [], stats: kb.patterns[key] });
    }
  }
  const patFor = (cat) => patterns.filter((p) => p.cats.includes(cat));

  // ---------- 원문 '주장' 층: 이 사주에 해당하는 개념·조합마다 강의 원문이 실제로 말하는 결과·특성 ----------
  const CLAIM_META = kb.meta.claims || {};
  const claimsOf = (key) => {
    const src = kb.concepts[key] || kb.patterns[key];
    return (src?.claims || []).map(([label, n, docs]) => ({ label, n, docs, cat: CLAIM_META[label]?.[0] || '운', pol: CLAIM_META[label]?.[1] ?? 0 }));
  };
  const evidenceKeys = [
    [dayStem, `${S.title.split(' ')[0]} 일간`], [pillars.day.text, `${pillars.day.text} 일주`],
    [monthGod, `월지 ${monthGod}`], [detail.day.branchGod, `일지 ${detail.day.branchGod}`],
    ...sinsalNames.map((n) => [n, K.SINSAL[n]?.title || n]),
    ...patterns.filter((p) => p.kind !== '일주' && p.kind !== '일간×십성').map((p) => [p.key, p.title]),
    ...missing.map((m) => [`${m}결핍`, `${m}(${ELEMENT_KO[m]}) 없음`]),
    [`${strongest}과다`, `${strongest}(${ELEMENT_KO[strongest]}) 과다`],
    st.label !== '중화' ? [st.label, st.label] : null,
  ].filter(Boolean);
  const evidence = [];
  for (const [key, title] of evidenceKeys) {
    if (evidence.some((e) => e.key === key)) continue;
    const claims = claimsOf(key);
    if (claims.length) evidence.push({ key, title, claims, stats: kb.concepts[key] || kb.patterns[key] });
  }
  // 카테고리별로 합산 (문서 수 가중) — 좋은 것·나쁜 것 모두
  const evidenceByCat = {};
  for (const e of evidence) for (const c of e.claims) {
    const bucket = (evidenceByCat[c.cat] ||= {});
    const row = (bucket[c.label] ||= { label: c.label, pol: c.pol, weight: 0, docs: 0, from: [] });
    row.weight += c.docs * (e.key === pillars.day.text || e.key === dayStem ? 1.5 : 1);
    row.docs += c.docs;
    if (!row.from.includes(e.title)) row.from.push(e.title);
  }
  for (const cat of Object.keys(evidenceByCat)) {
    evidenceByCat[cat] = Object.values(evidenceByCat[cat]).sort((a, b) => b.weight - a.weight).slice(0, 8)
      .map((r) => ({ ...r, text: P.CLAIM_TEXT[r.label] || '' }));
  }
  const evidenceSummary = (() => {
    const all = Object.values(evidenceByCat).flat().sort((a, b) => b.weight - a.weight);
    const pos = all.filter((r) => r.pol > 0).slice(0, 5), neg = all.filter((r) => r.pol < 0).slice(0, 5);
    return { pos, neg, total: evidence.reduce((a, e) => a + (e.stats?.docs || 0), 0) };
  })();

  // ---------- 키워드 ----------
  const kwKeys = [dayStem, pillars.day.text, monthGod, detail.day.branchGod, ...sinsalNames.slice(0, 3), ...structs.slice(0, 2), st.label === '중화' ? null : st.label].filter(Boolean);
  const keywords = [];
  const KW_JUNK = /(일주|일간|사주|인데|태어|이라|라고|이신|하신|하시|되시|분들|같은|이런|그런|저런|이제|그냥|정도|경우|들여$|있거$|거$|여$|은$|는$|을$|를$|에$|의$|으로$|해서$|하고$)/;
  for (const k of kwKeys) for (const w of (kb.concepts[k] || kb.patterns[k])?.keywords || []) if (!KW_JUNK.test(w) && !keywords.includes(w) && keywords.length < 14) keywords.push(w);

  // ---------- 운 생성기 ----------
  const relFlags = (branch) => {
    const flags = [];
    for (const b of branches) {
      if (pairHas(BRANCH_CHUNG, branch, b.ch)) flags.push({ type: '충', pos: b.pos, ch: b.ch });
      if (pairHas(BRANCH_YUKHAP, branch, b.ch)) flags.push({ type: '합', pos: b.pos, ch: b.ch });
      if (pairHas(BRANCH_WONJIN, branch, b.ch)) flags.push({ type: '원진', pos: b.pos, ch: b.ch });
    }
    return flags;
  };
  const relPhrase = (flags) => flags.map((f) => f.type === '충' ? `${posKo[f.pos]} ${f.ch}와 충하여 ${K.POSITION_MEANING[f.pos]} 영역에 변동·이동이 생기고`
    : f.type === '합' ? `${posKo[f.pos]} ${f.ch}와 합하여 ${K.POSITION_MEANING[f.pos]} 영역에 인연이 묶이고`
      : `${posKo[f.pos]} ${f.ch}와 원진이 되어 ${K.POSITION_MEANING[f.pos]} 관계에 오해가 생기기 쉽고`);

  function luckOf(g, { short = false, samjae = false } = {}) {
    const flags = relFlags(g.branch);
    const stage = K.STAGE_TONE[g.stage] || { d: 0, t: '' };
    const hasNeed = g.stemEl === needEl || g.branchEl === needEl;
    const scores = {}, texts = {};
    for (const cat of K.CATS) {
      let s = 3 + fav(g.branchGod) * 0.8 + fav(g.stemGod) * 0.4 + (CAT_GOD_BOOST[cat][K.TEN_GOD_GROUP[g.branchGod]] || 0) + (CAT_GOD_BOOST[cat][K.TEN_GOD_GROUP[g.stemGod]] || 0) * 0.5 + stage.d * 0.5;
      if (hasNeed && needCount <= 1) s += 0.7; else if (hasNeed) s += 0.3;
      if (cat === '연애') {
        if (K.TEN_GOD_GROUP[g.branchGod] === spouseGroup || K.TEN_GOD_GROUP[g.stemGod] === spouseGroup) s += 0.8;
        if (twelveSal(pillars.year.branch, g.branch) === '년살' || twelveSal(dayBranch, g.branch) === '년살') s += 0.5;
        if (flags.some((f) => f.type === '원진')) s -= 0.8;
        if (flags.some((f) => f.type === '합' && f.pos === 'day')) s += 0.6;
        if (flags.some((f) => f.type === '충' && f.pos === 'day')) s -= 0.6;
      }
      if (cat === '건강') { if (flags.some((f) => f.type === '충')) s -= 0.6; if (samjae) s -= 0.4; }
      if (cat === '직장' && flags.some((f) => f.type === '충' && f.pos === 'month')) s -= 0.4;
      if (cat === '금전' && flags.some((f) => f.type === '충' && f.pos === 'day')) s -= 0.3;
      if (samjae) s -= 0.3;
      scores[cat] = clamp(Math.round(s), 1, 5);
      const base = K.LUCK[g.branchGod][cat];
      const salNote = P.SAL_LUCK[g.sal]?.[cat] || '';
      texts[cat] = short ? `${first(base)} ${salNote}`.trim()
        : base + (g.stemGod !== g.branchGod && K.STEM_NOTE[g.stemGod] ? ` 천간으로는 ${K.STEM_NOTE[g.stemGod]}, 속으로는 ${K.LUCK[g.branchGod].head}이 흐릅니다.` : '') + (salNote ? ` 십이신살로는 ${P.SAL_LUCK[g.sal].all}이니 ${salNote}` : '');
    }
    const summary = [
      `${g.text}(${g.stemKo}${g.branchKo}) · 천간 ${g.stemGod} / 지지 ${g.branchGod}. ${stage.t ? stage.t + ' 흐름으로, ' : ''}${K.LUCK[g.branchGod].head}이 중심이 됩니다.`,
      hasNeed ? `이 사주에 필요한 ${needEl}(${ELEMENT_KO[needEl]}) 기운이 들어오는 때입니다. ${needCount <= 1 ? '웅크려 있던 힘이 밖으로 드러나는 투출의 시기이니 미뤄 온 일을 꺼내세요.' : '평소보다 한층 힘을 받는 시기입니다.'}` : null,
      flags.length ? relPhrase(flags).join(', ') + ' 그만큼 움직임이 많은 시기입니다.' : null,
      samjae ? '삼재에 해당하는 해입니다. 큰 재앙이라기보다 "무리하지 말라"는 신호이니 새 판을 크게 벌이기보다 지키고 다듬는 데 집중하세요.' : null,
    ].filter(Boolean);
    const overall = clamp(Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / K.CATS.length), 1, 5);
    return { head: K.LUCK[g.branchGod].head, summary, scores, texts, flags, overall, hasNeed };
  }

  const dNow = current.daeun, sNow = current.seun, mNow = current.month;
  const dLuck = dNow ? luckOf(dNow) : null;
  const sLuck = sNow ? luckOf(sNow, { samjae: sNow.samjae }) : null;
  const mLuck = mNow ? luckOf(mNow, { short: true }) : null;
  const years = allSeun.filter((s) => s.year >= nowY - 1 && s.year < nowY + 9).map((s) => ({ ...s, luck: luckOf(s, { samjae: s.samjae }) }));
  const monthsOf = (year) => { const s = allSeun.find((x) => x.year === year); return s ? s.wolun.map((m) => ({ ...m, luck: luckOf(m, { short: true }) })) : []; };
  const seriesFor = (cat) => years.map((y) => ({ label: String(y.year).slice(2), value: y.luck.scores[cat], now: y.year === nowY, mark: y.luck.hasNeed ? needEl : y.samjae ? '삼재' : null }));
  const bestYears = (cat, n = 3) => [...years].filter((y) => y.year >= nowY).sort((a, b) => b.luck.scores[cat] - a.luck.scores[cat]).slice(0, n);
  const worstYears = (cat, n = 2) => [...years].filter((y) => y.year >= nowY).sort((a, b) => a.luck.scores[cat] - b.luck.scores[cat]).slice(0, n);
  const yearsWhere = (pred) => years.filter((y) => y.year >= nowY && pred(y)).map((y) => `${y.year}년(${y.text})`);

  // ---------- 총평 / 성격 ----------
  const overview = [
    `${name}의 일간은 ${S.title}, ${S.sub}입니다. ${S.nature}`,
    K.STRENGTH[st.label].text,
    `월지 ${pillars.month.branch}(${monthGod})가 삶의 무대를, 일지 ${dayBranch}(${detail.day.branchGod})가 나의 몸과 배우자 자리를 나타냅니다. ${K.TEN_GODS[monthGod]?.month || ''}`,
    prof.dominant ? K.GROUP_DESC[prof.dominant] : '',
  ].filter(Boolean);
  const ilju = P.ILJU[pillars.day.text];
  const sinsalWhere = (n) => order.filter((k) => (sinsal[k] || []).some((x) => x.name === n)).map((k) => posKo[k]).join('·');
  const sinsalSentence = (n) => K.SINSAL[n] ? `${sinsalWhere(n)}에 ${K.SINSAL[n].title}이 있어 ${K.SINSAL[n].text}` : null;
  const character = [
    S.strengths, S.cautions,
    ilju ? `일주가 ${pillars.day.text}, "${ilju.img}"입니다. ${ilju.pos} 다만 ${ilju.neg}` : null,
    `${K.BRANCHES[dayBranch]} 이 일지가 ${detail.day.branchGod}이어서 ${K.TEN_GODS[detail.day.branchGod]?.core || ''}`,
    K.STAGES[detail.day.stage],
    sinsalNames.length ? sinsalNames.slice(0, 4).map(sinsalSentence).filter(Boolean).join(' ') : null,
  ].filter(Boolean);

  // ---------- 카테고리별 (각각 다른 구성) ----------
  const nowItems = (cat) => [
    dLuck && dNow && { label: `현재 대운 ${dNow.text} (${dNow.age}세~)`, text: dLuck.texts[cat], score: dLuck.scores[cat] },
    sLuck && sNow && { label: `${sNow.year}년 세운 ${sNow.text}`, text: sLuck.texts[cat], score: sLuck.scores[cat] },
    mLuck && mNow && { label: `${current.nowMonth}월 월운 ${mNow.text}`, text: mLuck.texts[cat], score: mLuck.scores[cat] },
  ].filter(Boolean);
  const patSection = (cat) => { const ps = patFor(cat); return ps.length ? { title: '이 사주의 조합에서', paras: ps.map((p) => `【${p.title}】 ${p.pos} 반대로 ${p.neg}`) } : null; };
  const sinsalFor = (cat) => {
    const list = sinsalNames.filter((n) => K.SINSAL[n]?.cats[cat]);
    return list.length ? [list.map((n) => `${sinsalWhere(n)}의 ${K.SINSAL[n].title}은(는) ${cat}운에 ${K.SINSAL[n].cats[cat] > 0 ? '힘이 되는' : '조심할'} 별입니다 — ${first(K.SINSAL[n].text)}`).join(' ')] : [];
  };
  const best = (cat) => `가까운 해 중 ${cat}운이 가장 좋은 때는 ${bestYears(cat).map((y) => `${y.year}년(${y.text})`).join(', ')}이고, 조심할 해는 ${worstYears(cat).map((y) => `${y.year}년(${y.text})`).join(', ')}입니다.`;

  const cats = {};
  // 직장
  {
    const lvG = lv('관성');
    const indep = clamp(Math.round(50 + (prof.groups['비겁'] || 0) * 8 + (prof.groups['식상'] || 0) * 6 - (prof.groups['관성'] || 0) * 10 - (prof.groups['인성'] || 0) * 3 + (st.label === '신강' ? 8 : st.label === '신약' ? -8 : 0)), 10, 90);
    const jobs = [...new Set([...(P.JOBS[prof.dominant] || []), ...(P.JOBS[prof.second] || [])])].slice(0, 5);
    cats.직장 = {
      gauge: { label: '조직 ↔ 독립', value: indep, left: '조직형', right: '독립형' },
      sections: [
        { title: '타고난 직장 기운', paras: [
          lvG === '강' ? '관성(직장·명예·책임)이 강한 구조입니다. 조직과 직책, 사회적 인정이 인생의 큰 주제이고 압박 속에서 성장합니다. 소속이 있을 때 안정되고 책임이 클수록 오히려 힘이 납니다.'
            : lvG === '중' ? '관성이 적당히 있어 조직 생활과 자유를 둘 다 소화합니다. 규범을 지키면서도 자기 색을 낼 수 있는 자리가 가장 잘 맞습니다.'
              : '관성이 없어 조직·규범에 얽매이지 않는 자유인입니다. 소속보다 자기 브랜드·전문성으로 서는 것이 어울리고, 승진보다 실력으로 인정받는 길을 택하세요.',
          `월지 ${monthGod}의 격: ${K.TEN_GODS[monthGod].month}`,
          indep >= 60 ? `조직·독립 지수 ${indep}%로 독립형에 가깝습니다. 남의 지시보다 스스로 판을 짜는 자리에서 성과가 납니다.` : indep <= 40 ? `조직·독립 지수 ${indep}%로 조직형에 가깝습니다. 체계와 역할이 분명한 곳에서 안정적으로 성장합니다.` : `조직·독립 지수 ${indep}%로 균형형입니다. 조직 안에서도 자율이 보장되는 자리가 이상적입니다.`,
        ] },
        { title: '맞는 일과 분야', paras: [S.work, jobs.length ? `십성 구조로 보면 ${jobs.join(', ')} 분야가 어울립니다.` : null, ...sinsalFor('직장')].filter(Boolean) },
        { title: '상사·동료와의 관계', paras: [
          lv('비겁') === '강' ? '비겁이 강해 동료·경쟁자가 많고 승부 구도가 생기기 쉽습니다. 협업의 기술이 곧 승진의 기술입니다.' : lv('비겁') === '무' ? '비겁이 없어 경쟁보다 홀로 묵묵히 일하는 유형입니다. 내 성과를 알리는 것을 잊지 마세요.' : '동료와 적당한 거리를 유지하며 협력하는 유형입니다.',
          has('편관') ? '편관이 있어 강한 상사·엄한 조직을 만나기 쉽습니다. 압박을 견디면 그만큼 빨리 큽니다.' : has('정관') ? '정관이 있어 원칙 있는 상사 밑에서 신뢰를 받습니다.' : '윗사람의 통제를 덜 받는 대신 스스로 기준을 세워야 합니다.',
        ] },
        patSection('직장'),
        { title: '기운이 들어오는 때', paras: [...catTiming('직장'), best('직장'), `승진·취업·자격에 유리한 해는 관성·인성 운이 오는 ${yearsWhere((y) => ['관성', '인성'].includes(K.TEN_GOD_GROUP[y.branchGod])).slice(0, 3).join(', ') || '없음'}, 이직·독립 욕구가 커지는 해는 상관·비겁 운의 ${yearsWhere((y) => ['식상', '비겁'].includes(K.TEN_GOD_GROUP[y.branchGod]) && y.branchGod !== '식신').slice(0, 3).join(', ') || '없음'}입니다.`] },
      ].filter(Boolean),
      now: nowItems('직장'),
    };
  }
  // 금전
  {
    const mt = has('정재') && !has('편재') ? '정재' : has('편재') ? '편재' : lv('재성') === '무' ? '없음' : '정재';
    const leaks = [];
    if (lv('비겁') === '강') leaks.push('비겁이 강해 형제·동료·동업자와 나누게 되는 돈이 새는 구멍입니다. 보증과 동업은 피하세요.');
    if (relations.chung.some((r) => r.chars.some((c) => c.pos === 'day'))) leaks.push('일지가 충을 맞아 배우자·가정 관련 지출이 갑자기 생기기 쉽습니다.');
    if (has('상관')) leaks.push('상관이 있어 기분·체면·취미 지출이 큽니다. 예산을 정해 두세요.');
    if (has('편인')) leaks.push('편인이 있어 배움·종교·특수한 관심사에 돈이 들어갑니다. 투자라고 여기되 한도를 두세요.');
    cats.금전 = {
      gauge: { label: '안정 ↔ 활동', value: mt === '편재' ? 72 : mt === '없음' ? 50 : 30, left: '저축·안정형', right: '투자·활동형' },
      sections: [
        { title: '재물의 성격', paras: [P.MONEY_TYPE[mt], S.money] },
        { title: '돈이 들어오는 길', paras: [
          lv('식상') !== '무' ? '식상이 있어 내가 만든 것(재능·기술·콘텐츠·서비스)이 돈이 되는 길이 열려 있습니다. 실력을 상품화하세요.' : null,
          lv('재성') !== '무' ? '재성이 있어 활동하고 사람을 만나는 만큼 수입이 늘어납니다.' : '재성이 없어 돈은 운에서 들어올 때 크게 움직입니다. 그 시기를 아래에서 확인하세요.',
          lv('인성') !== '무' ? '인성이 있어 문서·자격·부동산·부모를 통한 재물 인연이 있습니다.' : null,
          ...sinsalFor('금전'),
        ].filter(Boolean) },
        { title: '새는 구멍', paras: leaks.length ? leaks : ['재물이 크게 새는 구조는 없습니다. 꾸준함이 곧 재물입니다.'] },
        patSection('금전'),
        { title: '재물이 움직이는 때', paras: [...catTiming('금전'), best('금전'), `재성 운이 들어오는 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === '재성').slice(0, 3).join(', ') || '없음'}에 수입 기회가 커지고, 비겁 운의 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === '비겁').slice(0, 2).join(', ') || '없음'}에는 지출·손재를 경계하세요.`] },
      ].filter(Boolean),
      now: nowItems('금전'),
    };
  }
  // 연애
  {
    const lvS = lv(spouseGroup);
    const partnerEl = needEl;
    const partnerStems = STEM_LIST.filter((s) => STEM_ELEMENT[s] === partnerEl).map((s) => `${s}(${STEM_KO[s]})`).join('·');
    const hapBranch = BRANCH_YUKHAP.find(([a, b]) => a === dayBranch || b === dayBranch);
    const mate = hapBranch ? hapBranch.find((b) => b !== dayBranch) : null;
    const dayRel = [...relations.chung, ...relations.wonjin, ...relations.hae].filter((r) => r.chars.some((c) => c.pos === 'day'));
    cats.연애 = {
      gauge: { label: '안정 ↔ 열정', value: clamp(Math.round(50 + (sinsalNames.includes('도화') ? 12 : 0) + (sinsalNames.includes('홍염') ? 12 : 0) + (lv('식상') === '강' ? 8 : 0) - (lv('정관') === '강' || has('정재') ? 8 : 0) - (sinsalNames.includes('고란살') ? 10 : 0)), 10, 90), left: '안정·헌신형', right: '열정·매력형' },
      sections: [
        { title: '연애 스타일', paras: [S.love, lvS === '강' ? `${spouseGroup}(배우자성)이 강해 이성 인연이 많고 관계가 인생의 큰 비중을 차지합니다. 선택과 정리가 과제입니다.` : lvS === '중' ? `${spouseGroup}(배우자성)이 적당히 있어 안정적인 인연을 만듭니다. 서두르지 않아도 때가 되면 이어집니다.` : `${spouseGroup}(배우자성)이 원국에 없습니다. 인연이 없는 것이 아니라 운에서 들어올 때 결정되는 유형입니다.`, ...sinsalFor('연애')] },
        { title: '배우자 자리와 배우자상', paras: [
          `일지 ${dayBranch}(${detail.day.branchGod})는 배우자 자리입니다. ${K.BRANCHES[dayBranch]} 배우자도 이런 기질을 지니거나 이런 관계를 원하게 됩니다.`,
          `일지 십이운성이 ${detail.day.stage}이라 ${first(K.STAGES[detail.day.stage].replace(/^일지 [^.]*\. /, ''))}`,
          dayRel.length ? `일지가 ${dayRel.map((r) => r.label).join('·')}을 맞고 있어 배우자 자리가 흔들리기 쉽습니다. 서로의 공간을 존중하고 사실 중심으로 대화하는 관계가 오래 갑니다.` : '일지에 충·원진이 없어 배우자 자리가 안정적입니다.',
        ] },
        { title: '이런 인연이 맞습니다', paras: [
          `사주에 필요한 ${partnerEl}(${ELEMENT_KO[partnerEl]}) 기운을 가진 사람, 곧 ${partnerStems} 일간이 나를 살려 주는 인연입니다. 함께 있으면 편안하고 일이 풀립니다.`,
          mate ? `일지 ${dayBranch}와 육합하는 ${mate} 일지(또는 ${mate}년생)와는 끌림이 강하고 잘 묶입니다.` : null,
          `반대로 나를 극하는 ${gender === '남' ? '관성' : '재성'} 기운이 지나친 사람과는 힘겨루기가 되기 쉽습니다.`,
        ].filter(Boolean) },
        patSection('연애'),
        { title: '인연이 오는 때', paras: [...catTiming('연애'), best('연애'), `배우자성(${spouseGroup}) 운이 들어오는 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === spouseGroup || K.TEN_GOD_GROUP[y.stemGod] === spouseGroup).slice(0, 3).join(', ') || '없음'}에 결정적인 만남·결혼 인연이 있고, 도화(년살) 운의 ${yearsWhere((y) => twelveSal(pillars.year.branch, y.branch) === '년살').slice(0, 2).join(', ') || '없음'}에 이성 인기가 오릅니다. 일지와 충·원진이 되는 ${yearsWhere((y) => y.luck.flags.some((f) => f.pos === 'day' && f.type !== '합')).slice(0, 2).join(', ') || '없음'}에는 관계가 흔들리니 다툼을 키우지 마세요.`] },
      ].filter(Boolean),
      now: nowItems('연애'),
    };
  }
  // 건강
  {
    cats.건강 = {
      gauge: { label: '체력 지수', value: clamp(Math.round(st.ratio * 100), 15, 90), left: '소모 빠름', right: '기운 넘침' },
      sections: [
        { title: '체질', paras: [P.HEALTH_TYPE[st.label], `${P.SEASON_DESC[season]} ${season === '겨울' ? '몸이 차가워지기 쉬우니 따뜻하게 유지하는 것이 기본입니다.' : season === '여름' ? '열이 위로 뜨기 쉬우니 수분과 수면으로 식혀 주어야 합니다.' : season === '가을' ? '건조함과 호흡기를 살피세요.' : '간·근육의 피로와 알레르기를 살피세요.'}`] },
        { title: '약한 곳', paras: [
          missing.length ? `사주에 없는 ${missing.map((m) => `${m}(${ELEMENT_KO[m]})`).join('·')} 오행이 가리키는 ${missing.map((m) => K.ELEMENTS[m].organ).join(', ')} 계통이 약점이 되기 쉽습니다.` : '오행이 모두 있어 특별히 비어 있는 장기 계통은 없습니다.',
          `가장 강한 ${strongest}(${ELEMENT_KO[strongest]}) 기운은 과하면 ${K.ELEMENTS[strongest].organ} 계통에 부담이 됩니다.`,
          lv('관성') === '강' ? '관성이 강해 스트레스를 몸으로 받는 유형입니다. 긴장을 풀어 주는 운동과 정기 검진이 필수입니다.' : null,
          relations.chung.length ? '원국에 충이 있어 몸이 바쁘고 사고·부상 위험이 있는 편입니다.' : null,
          ...sinsalFor('건강'),
        ].filter(Boolean) },
        { title: '관리법', paras: [missing.length ? `보완: ${missing.map((m) => `${m}(${ELEMENT_KO[m]}) → ${K.ELEMENTS[m].remedy}`).join(' / ')}.` : `가장 강한 ${strongest} 기운을 흘려보내는 ${K.ELEMENTS[GEN[strongest]].remedy} 이 균형을 잡아 줍니다.`, st.label === '신약' ? '무리한 일정보다 수면 7시간 이상, 규칙적인 식사가 어떤 보약보다 낫습니다.' : '땀을 내는 운동으로 넘치는 기운을 빼 주면 마음까지 안정됩니다.'] },
        patSection('건강'),
        { title: '주의할 때', paras: [...catTiming('건강'), best('건강'), `편관 운(${yearsWhere((y) => y.branchGod === '편관' || y.stemGod === '편관').slice(0, 3).join(', ') || '없음'})과 원국을 충하는 해(${yearsWhere((y) => y.luck.flags.some((f) => f.type === '충')).slice(0, 3).join(', ') || '없음'})에는 검진을 챙기고 무리한 일정을 피하세요.`] },
      ].filter(Boolean),
      now: nowItems('건강'),
    };
  }
  // 학업
  {
    const styleKey = has('정인') ? '정인' : has('편인') ? '편인' : lv('식상') !== '무' ? '식상' : lv('관성') !== '무' ? '관성' : lv('재성') !== '무' ? '재성' : '비겁';
    cats.학업 = {
      gauge: { label: '실전 ↔ 이론', value: clamp(Math.round(50 + (prof.groups['인성'] || 0) * 10 - (prof.groups['재성'] || 0) * 6 - (prof.groups['비겁'] || 0) * 4), 10, 90), left: '실전·경험형', right: '이론·학문형' },
      sections: [
        { title: '학습 스타일', paras: [P.STUDY_STYLE[styleKey], lv('인성') === '강' ? '인성이 강해 학문·연구·교육과 인연이 깊습니다. 실행이 느려지지 않도록 결과물을 내는 습관이 중요합니다.' : lv('인성') === '무' ? '인성이 없어 책상 공부보다 몸으로 부딪혀 배우는 유형입니다. 멘토를 두면 배움이 빨라집니다.' : '배움과 실행의 균형이 좋아 필요한 공부를 때맞춰 챙깁니다.'] },
        { title: '유리한 시험과 분야', paras: [
          lv('관성') !== '무' ? '관성이 있어 시험·자격·승진 시험처럼 규범 안의 경쟁에서 결과를 냅니다.' : '관성이 없어 정해진 시험보다 실력으로 증명하는 포트폴리오형 진로가 맞습니다.',
          has('편인') ? '편인의 직관으로 IT·의학·역학·심리·예술 같은 특수 분야에 강합니다.' : has('정인') ? '정인의 체계성으로 행정·교육·법·회계 같은 정통 학문에 강합니다.' : null,
          lv('식상') !== '무' ? '식상이 있어 발표·논술·실기·창의 과제에서 두각을 나타냅니다.' : null,
          ...sinsalFor('학업'),
        ].filter(Boolean) },
        patSection('학업'),
        { title: '공부가 잘 되는 때', paras: [...catTiming('학업'), best('학업'), `인성 운의 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === '인성').slice(0, 3).join(', ') || '없음'}은 배움·자격·유학에, 정관 운의 ${yearsWhere((y) => y.branchGod === '정관').slice(0, 2).join(', ') || '없음'}은 합격·승진 시험에 가장 유리합니다.`] },
      ].filter(Boolean),
      now: nowItems('학업'),
    };
  }
  // 점수·차트
  for (const cat of K.CATS) {
    const c = cats[cat];
    let baseScore = 3;
    const grp = { 직장: '관성', 금전: '재성', 학업: '인성', 연애: spouseGroup }[cat];
    if (grp) baseScore += lv(grp) === '강' ? 0.6 : lv(grp) === '중' ? 0.3 : -0.3;
    for (const n of sinsalNames) baseScore += (K.SINSAL[n]?.cats[cat] || 0) * 0.4;
    for (const p of patFor(cat)) baseScore += (p.stats?.polarity || 0) * 0.4;
    if (cat === '건강') baseScore -= missing.length * 0.3 + relations.chung.length * 0.3;
    const nowAvg = c.now.length ? c.now.reduce((a, x) => a + x.score, 0) / c.now.length : 3;
    // 원문 주장 극성도 점수에 반영 (좋은 것·나쁜 것 모두)
    const ev = evidenceByCat[cat] || [];
    const evSum = ev.reduce((a, r) => a + r.pol * r.weight, 0), evW = ev.reduce((a, r) => a + r.weight, 0);
    if (evW) baseScore += (evSum / evW) * 0.6;
    c.score = clamp(Math.round(baseScore * 0.5 + nowAvg * 0.5), 1, 5);
    c.series = seriesFor(cat);
    c.evidence = ev;
    const b = bestYears(cat, 1)[0], w = worstYears(cat, 1)[0];
    c.best = b ? { year: b.year, text: b.text, score: b.luck.scores[cat] } : null;
    c.worst = w ? { year: w.year, text: w.text, score: w.luck.scores[cat] } : null;
    c.summary = `${cat}운 ${c.score}/5 · ${c.now[0]?.label?.split(' ')[0] || ''} 대운 ${c.now[0]?.score ?? '-'}점 · 올해 ${c.now[1]?.score ?? '-'}점`;
  }

  const advice = [
    st.label === '신강' ? '힘이 넘치는 사주는 밖으로 써야 합니다. 표현하고, 만들고, 책임지는 자리로 나가세요.' : st.label === '신약' ? '나를 채우는 것이 먼저입니다. 배움·휴식·좋은 사람을 곁에 두고 혼자 다 짊어지지 마세요.' : '균형이 좋은 사주는 운의 흐름을 읽는 것이 핵심입니다. 좋은 운에는 과감하게, 낮은 운에는 지키면서 가세요.',
    `이 사주의 열쇠는 ${needEl}(${ELEMENT_KO[needEl]})입니다. ${K.ELEMENTS[needEl].remedy} 를 생활에 두고, ${needEl}이 들어오는 해에 미뤄 둔 결단을 내리세요.`,
    prof.dominant ? { 비겁: '경쟁보다 협업의 기술을, 승부보다 지키는 힘을 기르면 강점이 완성됩니다.', 식상: '재능을 세상에 꺼내 놓는 것을 두려워하지 마세요. 보여줄수록 길이 열립니다.', 재성: '벌어들이는 힘은 충분하니 쓰는 원칙과 쉬는 시간을 정해 두세요.', 관성: '책임을 감당하는 힘이 큰 만큼 몸을 먼저 챙기세요. 건강이 곧 명예의 밑천입니다.', 인성: '배운 것을 세상에 내놓는 실행이 과제입니다. 완벽해질 때까지 기다리지 말고 지금 시작하세요.' }[prof.dominant] : null,
  ].filter(Boolean);

  // 대운 흐름 총평 (현재 포함 앞으로 3개)
  const daeunFlow = daeun.filter((d) => d.endYear >= nowY).slice(0, 3).map((d) => {
    const l = luckOf(d);
    return { ...d, luck: l, text: `${d.age}세~${d.age + 9}세 (${d.startYear}~${d.endYear}) ${d.text} 대운 — 천간 ${d.stemGod}·지지 ${d.branchGod}, ${K.STAGE_TONE[d.stage]?.t || ''} 시기. ${K.LUCK[d.branchGod].head}이 10년의 주제가 되어 ${first(K.LUCK[d.branchGod].직장)} ${first(K.LUCK[d.branchGod].금전)}${l.hasNeed ? ` 이 대운에 필요한 ${needEl}이 들어와 웅크렸던 힘이 밖으로 드러납니다.` : ''}${d.branch === dayBranch || pairHas(BRANCH_CHUNG, d.branch, dayBranch) ? ' 대운 지지가 일지와 부딪혀 거처·배우자·건강 영역에 큰 변화가 있는 10년입니다.' : ''}` };
  });

  return { strength: st, profile: prof, keywords, climate, patterns, overview, character, cats, years, monthsOf, advice, needEl, evidence, evidenceByCat, evidenceSummary, daeunFlow, meta: kb.meta };
}
