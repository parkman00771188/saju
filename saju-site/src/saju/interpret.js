// 사주 결과(calc.js) → 심층 해석 데이터
//  overview(총평 그룹) · character · cats[5] · years · monthsOf · patterns · evidence · deep(격국/용신/자리/뿌리/대운 전 생애/배우자/개운)
import kb from '../data/kb_stats.json';
import { determineGyeok } from './gyeokguk.js';
import { pickYong, GROUP_EL } from './yongshin.js';
import { buildPersonal } from './personal.js';
import { natalIssues, unEffect, dynLine } from './dynamics.js';
import * as K from '../data/knowledge.js';
import * as P from '../data/patterns.js';
import * as D from '../data/deep.js';
import { ELEMENT_KO, BRANCH_MAIN_STEM, HIDDEN_STEMS, tenGod, STEM_ELEMENT, BRANCH_ELEMENT, BRANCH_CHUNG, BRANCH_YUKHAP, BRANCH_WONJIN, BRANCH_SAMHAP, twelveSal, STEMS as STEM_LIST, STEM_KO, BRANCH_KO } from './tables.js';

const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const genBy = (el) => Object.keys(GEN).find((k) => GEN[k] === el);   // el 을 생하는 오행
const ctrlBy = (el) => Object.keys(CTRL).find((k) => CTRL[k] === el); // el 을 극하는 오행
const posKo = { year: '년주', month: '월주', day: '일주', time: '시주' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pairHas = (table, a, b) => table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const first = (s) => (s.match(/^[^.!?]*[.!?]/) || [s])[0];
const KW_JUNK = /(일주|일간|사주|인데|태어|이라|라고|이신|하신|하시|되시|분들|같은|이런|그런|저런|이제|그냥|정도|경우|들여$|있거$|거$|여$|은$|는$|을$|를$|에$|의$|으로$|해서$|하고$)/;

export function strength(data) {
  const { pillars, order, dayStem } = data;
  const dayEl = STEM_ELEMENT[dayStem];
  const helps = (el) => el === dayEl || GEN[el] === dayEl;
  let sup = 0, tot = 0;
  for (const k of order) {
    const p = pillars[k]; if (!p) continue;
    if (k !== 'day') { const w = k === 'month' ? 1.2 : 1; tot += w; if (helps(p.stemEl)) sup += w; }
    const bw = k === 'month' ? 3 : k === 'day' ? 1.5 : 1; // 월지(득령, 약 30%) > 일지(득지) > 년지·시지
    tot += bw; if (helps(p.branchEl)) sup += bw;
  }
  const r = sup / tot;
  return { ratio: r, label: r >= 0.5 ? '신강' : r < 0.4 ? '신약' : '중화', pct: Math.round(r * 100) };
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
  const nowY = current.nowYear;
  const allSeun = daeun.flatMap((d) => d.seun.map((s) => ({ ...s, daeun: d })));
  const lv = prof.level, has = prof.has;

  // ---------- 조후 · 형국 ----------
  const season = P.SEASON_OF[pillars.month.branch];
  const [needEl, needWhy] = P.CLIMATE_NEED[season][dayStem];
  const needCount = elements[needEl];
  const image = P.IMAGE[dayEl][season];
  const imageNote = strongest !== dayEl && elements[strongest] >= 3 ? `주위에 ${strongest}(${ELEMENT_KO[strongest]})이 많아 ${P.EXCESS_IMAGE[strongest]}` : null;
  const needDaeun = daeun.filter((d) => d.stemEl === needEl || d.branchEl === needEl);
  const needYears = allSeun.filter((s) => s.year >= nowY && s.year < nowY + 12 && (s.stemEl === needEl || s.branchEl === needEl));
  const inNeedDaeun = !!current.daeun && (current.daeun.stemEl === needEl || current.daeun.branchEl === needEl);
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
      needYears.length ? `가까운 해 중 ${needEl}이 들어오는 해는 ${needYears.map((s) => `${s.year}년(${s.text})`).join(', ')}입니다. 이 해들에 막힌 것이 풀리고 결단이 결실로 이어집니다.` : null,
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

  // ---------- 격국 ----------
  const how = determineGyeok({ dayStem, pillars });
  const gyeokKey = how.key;
  const gyeok = { key: gyeokKey, ...D.GYEOKGUK[gyeokKey], how };

  // ---------- 억부용신 · 희신 · 기신 · 구신 · 한신 ----------
  const groupEl = GROUP_EL(dayEl);
  const yg = pickYong({ label: st.label, groups: prof.groups, needEl, dayEl });
  const yongGroup = yg.group, yongEl = yg.el, heeEl = yg.hee, giEl = yg.gi, guEl = yg.gu, hanEl = yg.han, yongWhy = yg.why;
  const yong = {
    ...yg,
    agree: yongEl === needEl,
    text: `억부(抑扶)로 보면 용신은 ${yongEl}(${ELEMENT_KO[yongEl]}) · ${yongGroup}입니다. ${yongWhy} 희신은 ${heeEl}(${ELEMENT_KO[heeEl]}) · ${yg.groups.hee}으로 ${yg.how.hee}이고, 기신은 ${giEl}(${ELEMENT_KO[giEl]}) · ${yg.groups.gi}으로 ${yg.how.gi}입니다. 구신은 ${guEl}(${ELEMENT_KO[guEl]}) · ${yg.groups.gu}으로 ${yg.how.gu}이며, 한신은 ${hanEl}(${ELEMENT_KO[hanEl]}) · ${yg.groups.han}입니다.` +
      (yongEl === needEl ? ` 조후(계절)로 본 필요 기운 ${needEl}과 억부 용신이 일치하니 방향이 분명합니다 — ${needEl} 기운이 들어오는 때가 곧 큰 기회입니다.`
        : ` 조후로 본 필요 기운은 ${needEl}(${ELEMENT_KO[needEl]})이라 억부 용신과 다릅니다. 두 기운은 각각 "균형(${yongEl})"과 "온도(${needEl})"를 맡으니, 둘 중 어느 하나가 운으로 들어와도 삶이 편해지고 둘이 함께 오는 때가 가장 큰 기회입니다.`),
    open: D.YONG[yongEl],
    openText: `${yongEl}(${ELEMENT_KO[yongEl]}) 기운을 생활에 두는 개운법 — 색은 ${D.YONG[yongEl].color}, 방향은 ${D.YONG[yongEl].dir}, 숫자는 ${D.YONG[yongEl].num}, 어울리는 일은 ${D.YONG[yongEl].job}, 습관은 ${D.YONG[yongEl].habit}. 반대로 기신 ${giEl}(${ELEMENT_KO[giEl]})이 지나친 환경 — ${D.YONG[giEl].color} 계열이 가득한 공간, ${D.YONG[giEl].dir} 방향에 오래 머무는 일, ${D.YONG[giEl].mean}만 좇는 생활 — 은 피하세요.`,
  };

  // ---------- 자리(궁)별 풀이 ----------
  const gongmangSet = new Set(meta.gongmang);
  const positions = ['year', 'month', 'day', 'time'].filter((k) => pillars[k]).map((k) => {
    const d = detail[k];
    const per = D.POS_PERIOD[k];
    const texts = [];
    if (k !== 'day') texts.push(D.POS_STEM[k][d.stemGod]);
    texts.push(D.POS_BRANCH[k][d.branchGod]);
    texts.push(`${per.ko}의 십이운성은 ${d.stage} — ${per.period}에 ${D.STAGE_LIFE[d.stage]}.`);
    texts.push(`${per.ko}에 ${D.SAL_POS[d.salDay]}.`);
    const hiddenGods = d.hidden.map((h) => `${h.ko}(${h.god})`).join('·');
    texts.push(`지장간 ${hiddenGods}이 숨어 있어 겉으로 드러나는 ${d.branchGod} 뒤에 ${d.hidden.filter((h) => h.god !== d.branchGod).map((h) => h.god).join('·') || '같은'} 기운이 함께 작용합니다.`);
    if (gongmangSet.has(d.branch)) texts.push(D.GONGMANG_POS[k]);
    return { pos: k, ...per, gz: pillars[k], stemGod: d.stemGod, branchGod: d.branchGod, stage: d.stage, sal: d.salDay, hidden: d.hidden, gongmang: gongmangSet.has(d.branch), texts };
  });

  // ---------- 뿌리(통근) · 투출 ----------
  const rootPos = present.filter((k) => HIDDEN_STEMS[pillars[k].branch].some((h) => STEM_ELEMENT[h] === dayEl));
  const tuchul = [];
  for (const k of present) for (const h of HIDDEN_STEMS[pillars[k].branch]) for (const k2 of present) if (k2 !== 'day' && pillars[k2].stem === h) tuchul.push({ stem: h, god: tenGod(dayStem, h), from: posKo[k], to: posKo[k2] });
  const tuchulUniq = [...new Map(tuchul.map((t) => [t.stem, t])).values()];
  const roots = {
    tonggeun: rootPos.length > 0, rootPos,
    text: (rootPos.length
      ? `일간 ${dayStem}(${ELEMENT_KO[dayEl]})은 ${rootPos.map((k) => posKo[k]).join('·')} 지지에 뿌리(통근)를 두고 있습니다. 뿌리가 있는 나무는 바람에 흔들려도 쓰러지지 않습니다 — 외부 압박을 견디고 자기 뜻을 지키는 힘이 있습니다.`
      : `일간 ${dayStem}(${ELEMENT_KO[dayEl]})이 어느 지지에도 뿌리(통근)를 두지 못했습니다. 재능이 있어도 붙잡아 줄 땅이 약해 환경에 따라 흔들리기 쉬우니, 나를 받쳐 주는 사람·조직·습관을 의식적으로 만들어야 합니다.`)
      + (tuchulUniq.length ? ` 지장간에 숨어 있던 ${tuchulUniq.map((t) => `${t.stem}(${t.god}, ${t.from}→${t.to})`).join(', ')}이 천간으로 투출(透出)되어 있어 그 기운은 숨겨진 잠재력이 아니라 이미 겉으로 쓰이는 힘입니다.` : ' 지장간의 기운이 천간으로 투출된 것은 없어 잠재력이 안에 머무는 편이니, 운에서 그 글자가 올 때 드러납니다.'),
  };

  // ---------- 조합 패턴 ----------
  const patterns = [];
  const pushPat = (key, def, kind, title) => { if (!def || patterns.some((p) => p.key === key)) return; patterns.push({ key, kind, title, img: def.img, pos: def.pos, neg: def.neg, cats: def.cats || [], stats: kb.patterns[key] || null }); };
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
  for (const g of [monthGod, detail.day.branchGod]) {
    const key = `${dayStem}+${g}`;
    if (kb.patterns[key] && !patterns.some((p) => p.key === key)) patterns.push({ key, kind: '일간×십성', title: `${S.title.split(' ')[0]} 일간의 ${g}`, img: `${g === monthGod ? '월지' : '일지'}에 자리한 ${g}`, pos: `${S.title.split(' ')[0]}에게 ${g}은 ${K.TEN_GODS[g].core} ${g === monthGod ? K.TEN_GODS[g].month : ''}`, neg: K.TEN_GODS[g].many, cats: [], stats: kb.patterns[key] });
  }
  const patFor = (cat) => patterns.filter((p) => p.cats.includes(cat));

  // ---------- 원문 주장 층 ----------
  const CLAIM_META = kb.meta.claims || {};
  const claimsOf = (key) => { const src = kb.concepts[key] || kb.patterns[key]; return (src?.claims || []).map(([label, n, docs]) => ({ label, n, docs, cat: CLAIM_META[label]?.[0] || '운', pol: CLAIM_META[label]?.[1] ?? 0 })); };
  const evidenceKeys = [
    [dayStem, `${S.title.split(' ')[0]} 일간`], [pillars.day.text, `${pillars.day.text} 일주`], [monthGod, `월지 ${monthGod}`], [detail.day.branchGod, `일지 ${detail.day.branchGod}`],
    ...sinsalNames.map((n) => [n, K.SINSAL[n]?.title || n]),
    ...patterns.filter((p) => p.kind !== '일주' && p.kind !== '일간×십성').map((p) => [p.key, p.title]),
    ...missing.map((m) => [`${m}결핍`, `${m}(${ELEMENT_KO[m]}) 없음`]), [`${strongest}과다`, `${strongest}(${ELEMENT_KO[strongest]}) 과다`],
    st.label !== '중화' ? [st.label, st.label] : null,
    [gyeok.key, gyeok.key],
    ...['year', 'month', 'day', 'time'].filter((k) => detail[k]).map((k) => [`${{ year: '년', month: '월', day: '일', time: '시' }[k]}지+${detail[k].branchGod}`, `${{ year: '년', month: '월', day: '일', time: '시' }[k]}지 ${detail[k].branchGod}`]),
    current.daeun ? [`${current.daeun.branchGod}운`, `${current.daeun.branchGod} 대운`] : null,
  ].filter(Boolean);
  const evidence = [];
  for (const [key, title] of evidenceKeys) { if (evidence.some((e) => e.key === key)) continue; const claims = claimsOf(key); if (claims.length) evidence.push({ key, title, claims, stats: kb.concepts[key] || kb.patterns[key] }); }
  const evidenceByCat = {};
  for (const e of evidence) for (const c of e.claims) {
    const bucket = (evidenceByCat[c.cat] ||= {});
    const row = (bucket[c.label] ||= { label: c.label, pol: c.pol, weight: 0, docs: 0, from: [] });
    row.weight += c.docs * (e.key === pillars.day.text || e.key === dayStem ? 1.5 : 1); row.docs += c.docs;
    if (!row.from.includes(e.title)) row.from.push(e.title);
  }
  for (const cat of Object.keys(evidenceByCat)) evidenceByCat[cat] = Object.values(evidenceByCat[cat]).sort((a, b) => b.weight - a.weight).slice(0, 8).map((r) => ({ ...r, text: P.CLAIM_TEXT[r.label] || '' }));
  const evidenceSummary = (() => { const all = Object.values(evidenceByCat).flat().sort((a, b) => b.weight - a.weight); return { pos: all.filter((r) => r.pol > 0).slice(0, 6), neg: all.filter((r) => r.pol < 0).slice(0, 6), total: evidence.reduce((a, e) => a + (e.stats?.docs || 0), 0) }; })();
  const kwKeys = [dayStem, pillars.day.text, monthGod, detail.day.branchGod, ...sinsalNames.slice(0, 3), ...structs.slice(0, 2), st.label === '중화' ? null : st.label].filter(Boolean);
  const keywords = [];
  for (const k of kwKeys) for (const w of (kb.concepts[k] || kb.patterns[k])?.keywords || []) if (!KW_JUNK.test(w) && !keywords.includes(w) && keywords.length < 14) keywords.push(w);

  // ---------- 운 생성기 ----------
  const relFlags = (branch) => {
    const flags = [];
    for (const b of branches) {
      if (pairHas(BRANCH_CHUNG, branch, b.ch)) flags.push({ type: '충', pos: b.pos, ch: b.ch });
      if (pairHas(BRANCH_YUKHAP, branch, b.ch)) flags.push({ type: '합', pos: b.pos, ch: b.ch });
      if (pairHas(BRANCH_WONJIN, branch, b.ch)) flags.push({ type: '원진', pos: b.pos, ch: b.ch });
    }
    // 삼합 완성 (원국 두 글자 + 들어오는 글자)
    for (const tri of BRANCH_SAMHAP) if (tri.includes(branch)) { const others = tri.filter((t) => t !== branch); if (others.every((o) => branches.some((b) => b.ch === o))) flags.push({ type: '삼합', pos: 'all', ch: tri.join('') }); }
    return flags;
  };
  const relPhrase = (flags) => flags.map((f) => f.type === '충' ? `${posKo[f.pos]} ${f.ch}와 충하여 ${K.POSITION_MEANING[f.pos]} 영역에 변동·이동이 생기고`
    : f.type === '합' ? `${posKo[f.pos]} ${f.ch}와 합하여 ${K.POSITION_MEANING[f.pos]} 영역에 인연이 묶이고`
      : f.type === '삼합' ? `원국의 두 글자와 ${f.ch} 삼합을 완성해 그 기운이 하나로 뭉치고`
        : `${posKo[f.pos]} ${f.ch}와 원진이 되어 ${K.POSITION_MEANING[f.pos]} 관계에 오해가 생기기 쉽고`);

  const LOVE_MALE = {
    편관: '남성에게는 연애보다 책임·자식·직장이 앞서는 시기라 관계에 소홀해지기 쉽습니다. 상대의 서운함을 먼저 챙기면 관계가 지켜집니다.',
    정관: '남성에게는 체면과 안정이 중요해지는 시기라 관계를 정리하거나 공식화(약혼·결혼 발표)하는 흐름이 옵니다. 책임질 준비가 된 만큼만 약속하세요.',
  };
  const LOVE_FEMALE = {
    편재: '여성에게는 활동적인 만남과 인기가 늘지만 관계가 가볍게 흐를 수 있고, 시댁·재물 문제가 관계에 끼어들 수 있습니다. 진지한 관계는 천천히 확인하세요.',
    정재: '여성에게는 현실적이고 안정된 관계가 이어지고, 결혼 준비·살림·재물 같은 실속의 주제가 관계 안으로 들어옵니다.',
  };
  const loveBase = (god) => (gender === '남' && LOVE_MALE[god]) || (gender === '여' && LOVE_FEMALE[god]) || K.LUCK[god].연애;
  function luckOf(g, { short = false, samjae = false } = {}) {
    const flags = relFlags(g.branch);
    const stage = K.STAGE_TONE[g.stage] || { d: 0, t: '' };
    const hasNeed = g.stemEl === needEl || g.branchEl === needEl;
    const hasYong = g.stemEl === yongEl || g.branchEl === yongEl;
    const hasGi = g.stemEl === giEl || g.branchEl === giEl;
    const isGong = gongmangSet.has(g.branch);
    const stemClash = pairHas([['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']], g.stem, dayStem);
    const stemHap = pairHas([['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']], g.stem, dayStem);
    const scores = {}, texts = {};
    for (const cat of K.CATS) {
      let s = 3 + fav(g.branchGod) * 0.8 + fav(g.stemGod) * 0.4 + (CAT_GOD_BOOST[cat][K.TEN_GOD_GROUP[g.branchGod]] || 0) + (CAT_GOD_BOOST[cat][K.TEN_GOD_GROUP[g.stemGod]] || 0) * 0.5 + stage.d * 0.5;
      if (hasNeed && needCount <= 1) s += 0.7; else if (hasNeed) s += 0.3;
      if (hasYong) s += 0.5; if (hasGi) s -= 0.5; if (isGong) s -= 0.3;
      if (cat === '연애') {
        if (K.TEN_GOD_GROUP[g.branchGod] === spouseGroup || K.TEN_GOD_GROUP[g.stemGod] === spouseGroup) s += 0.8;
        if (twelveSal(pillars.year.branch, g.branch) === '년살' || twelveSal(dayBranch, g.branch) === '년살') s += 0.5;
        if (flags.some((f) => f.type === '원진')) s -= 0.8;
        if (flags.some((f) => f.type === '합' && f.pos === 'day')) s += 0.6;
        if (flags.some((f) => f.type === '충' && f.pos === 'day')) s -= 0.6;
        if (stemHap) s += 0.4;
      }
      if (cat === '건강') { if (flags.some((f) => f.type === '충')) s -= 0.6; if (samjae) s -= 0.4; if (stemClash) s -= 0.4; }
      if (cat === '직장' && flags.some((f) => f.type === '충' && f.pos === 'month')) s -= 0.4;
      if (cat === '금전' && flags.some((f) => f.type === '충' && f.pos === 'day')) s -= 0.3;
      if (samjae) s -= 0.3;
      scores[cat] = clamp(Math.round(s), 1, 5);
      const base = cat === '연애' ? loveBase(g.branchGod) : K.LUCK[g.branchGod][cat];
      const salNote = P.SAL_LUCK[g.sal]?.[cat] || '';
      texts[cat] = short ? `${first(base)} ${salNote}`.trim()
        : base + (g.stemGod !== g.branchGod && K.STEM_NOTE[g.stemGod] ? ` 천간으로는 ${K.STEM_NOTE[g.stemGod]}, 속으로는 ${K.LUCK[g.branchGod].head}이 흐릅니다.` : '') + (salNote ? ` 십이신살로는 ${P.SAL_LUCK[g.sal].all}이니 ${salNote}` : '');
    }
    const summary = [
      `${g.text}(${g.stemKo}${g.branchKo}) · 천간 ${g.stemGod} / 지지 ${g.branchGod}. ${stage.t ? stage.t + ' 흐름으로, ' : ''}${K.LUCK[g.branchGod].head}이 중심이 됩니다.`,
      hasNeed ? `이 사주에 필요한 ${needEl}(${ELEMENT_KO[needEl]}) 기운이 들어오는 때입니다. ${needCount <= 1 ? '웅크려 있던 힘이 밖으로 드러나는 투출의 시기이니 미뤄 온 일을 꺼내세요.' : '평소보다 한층 힘을 받는 시기입니다.'}` : null,
      hasYong && !hasNeed ? `억부 용신 ${yongEl}(${ELEMENT_KO[yongEl]})이 들어와 사주의 균형이 잡히는 때입니다. 힘이 고르게 실려 결정이 잘 됩니다.` : null,
      hasGi ? `기신 ${giEl}(${ELEMENT_KO[giEl]})이 함께 들어와 용신을 흔듭니다. 잘 풀리는 와중에도 판단이 흐려질 수 있으니 큰 결정은 확인을 두 번 하세요.` : null,
      stemClash ? `천간 ${g.stem}이 일간 ${dayStem}과 충하여 생각과 태도가 흔들리기 쉬운 때입니다. 결정은 신중하게.` : stemHap ? `천간 ${g.stem}이 일간 ${dayStem}과 합하여 인연·제안이 들어오지만 내 뜻이 흐려질 수 있습니다.` : null,
      isGong ? `이 지지는 원국에서 공망인 자리라 기대만큼 결과가 손에 잡히지 않을 수 있습니다. 물질보다 배움과 정리에 좋은 때입니다.` : null,
      flags.length ? relPhrase(flags).join(', ') + ' 그만큼 움직임이 많은 시기입니다.' : null,
      samjae ? '삼재에 해당하는 해입니다. 큰 재앙이라기보다 "무리하지 말라"는 신호이니 새 판을 크게 벌이기보다 지키고 다듬는 데 집중하세요.' : null,
    ].filter(Boolean);
    const overall = clamp(Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / K.CATS.length), 1, 5);
    return { head: K.LUCK[g.branchGod].head, summary, scores, texts, flags, overall, hasNeed, hasYong, hasGi, isGong };
  }

  // ---------- 원국의 약한 고리와 운의 보완/악화 ----------
  const issues = natalIssues({ data, prof, yong, climate, st, gongmangSet, groupEl });
  const withDyn = (g) => ({ ...g, dyn: unEffect(issues, g) });
  const dNow = current.daeun, sNow = current.seun, mNow = current.month;
  const dLuck = dNow ? luckOf(dNow) : null;
  const sLuck = sNow ? luckOf(sNow, { samjae: sNow.samjae }) : null;
  const mLuck = mNow ? luckOf(mNow, { short: true }) : null;
  const years = allSeun.filter((s) => s.year >= nowY - 1 && s.year < nowY + 9).map((s) => withDyn({ ...s, luck: luckOf(s, { samjae: s.samjae }) }));
  const monthsOf = (year) => { const s = allSeun.find((x) => x.year === year); return s ? s.wolun.map((m) => withDyn({ ...m, luck: luckOf(m, { short: true }) })) : []; };
  const seriesFor = (cat) => years.map((y) => ({ key: y.year, label: String(y.year).slice(2), value: y.luck.scores[cat], now: y.year === nowY, mark: y.luck.hasNeed ? needEl : y.samjae ? '삼재' : null }));
  const bestYears = (cat, n = 3) => [...years].filter((y) => y.year >= nowY).sort((a, b) => b.luck.scores[cat] - a.luck.scores[cat]).slice(0, n);
  const worstYears = (cat, n = 2) => [...years].filter((y) => y.year >= nowY).sort((a, b) => a.luck.scores[cat] - b.luck.scores[cat]).slice(0, n);
  const yearsWhere = (pred) => years.filter((y) => y.year >= nowY && pred(y)).map((y) => `${y.year}년(${y.text})`);

  // ---------- 대운 전 생애 ----------
  const daeunAll = daeun.map((d) => {
    const l = luckOf(d);
    const isNow = d.startYear <= nowY && d.endYear >= nowY;
    const past = d.endYear < nowY;
    const dayClash = pairHas(BRANCH_CHUNG, d.branch, dayBranch), monthClash = pairHas(BRANCH_CHUNG, d.branch, pillars.month.branch);
    const text = `${d.age}~${d.age + 9}세 ${D.DAEUN_AGE(d.age)}(${d.startYear}~${d.endYear}) ${d.text} 대운 — 천간 ${d.stemGod}·지지 ${d.branchGod}, ${K.STAGE_TONE[d.stage]?.t || ''} 시기. ${K.LUCK[d.branchGod].head}이 10년의 주제가 되어 ${first(K.LUCK[d.branchGod].직장)} ${first(K.LUCK[d.branchGod].금전)}` +
      (l.hasNeed ? ` 필요한 ${needEl}이 들어와 웅크렸던 힘이 밖으로 드러나는 대운입니다.` : '') + (l.hasYong && !l.hasNeed ? ` 용신 ${yongEl}이 들어와 균형이 잡히는 대운입니다.` : '') + (l.hasGi ? ` 기신 ${giEl}이 함께 있어 좋은 흐름 속에서도 판단을 흐리는 요소가 있습니다.` : '') +
      (dayClash ? ' 대운 지지가 일지와 충하여 거처·배우자·건강 영역에 큰 변화가 있는 10년입니다.' : '') + (monthClash ? ' 대운 지지가 월지와 충하여 직장·부모·사회 환경이 바뀌는 10년입니다.' : '') + (l.isGong ? ' 공망 자리의 대운이라 겉으로 화려한 성과보다 내면·배움이 쌓이는 10년입니다.' : '');
    return withDyn({ ...d, luck: l, isNow, past, text });
  });
  const lifeStages = positions.map((p) => {
    const ages = { year: [0, 20], month: [20, 40], day: [40, 60], time: [60, 100] }[p.pos];
    const ds = daeun.filter((d) => d.age + 9 >= ages[0] && d.age < ages[1]);
    return { pos: p.pos, label: p.period, text: `${p.period}은 ${p.ko}(${p.gz.text})가 보여 줍니다. ${p.texts[0]} ${ds.length ? `이 시기를 지나는 대운은 ${ds.map((d) => `${d.text}(${d.stemGod}·${d.branchGod})`).join(', ')}로, ${ds.map((d) => K.LUCK[d.branchGod].head).join('과 ')}이 흐릅니다.` : ''}` };
  });

  // ---------- 총평 / 성격 ----------
  const overview = [
    `${name}의 일간은 ${S.title}, ${S.sub}입니다. ${S.nature}`,
    K.STRENGTH[st.label].text + ` (일간을 돕는 기운의 비중 약 ${st.pct}%)`,
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
    sinsalNames.length ? sinsalNames.slice(0, 5).map(sinsalSentence).filter(Boolean).join(' ') : null,
  ].filter(Boolean);

  // 십성 구조 상세
  const structureParas = [
    `열 가지 십성 중 이 사주에 실제로 자리한 것은 ${Object.keys(prof.score).join('·')}이고, 힘의 크기로 보면 ${Object.entries(prof.groups).sort((a, b) => b[1] - a[1]).map(([g, v]) => `${g} ${v.toFixed(1)}`).join(' > ')} 순입니다.`,
    prof.dominant ? K.GROUP_DESC[prof.dominant] : null,
    ...Object.entries(prof.score).filter(([, v]) => v >= 2).map(([g]) => K.TEN_GODS[g].many),
    ...prof.missing.map((g) => K.GROUP_NONE[g]),
  ].filter(Boolean);
  // 오행 상세
  const elementParas = [
    `여덟 글자의 오행은 ${['木', '火', '土', '金', '水'].map((e) => `${e} ${elements[e]}`).join(' · ')} 입니다. 지장간까지 넓혀 보면 ${present.flatMap((k) => HIDDEN_STEMS[pillars[k].branch]).map((h) => STEM_ELEMENT[h]).reduce((acc, e) => (acc[e] = (acc[e] || 0) + 1, acc), {}) && ['木', '火', '土', '金', '水'].map((e) => `${e} ${present.flatMap((k) => HIDDEN_STEMS[pillars[k].branch]).filter((h) => STEM_ELEMENT[h] === e).length}`).join('·')}개의 숨은 기운이 더 있습니다.`,
    K.ELEMENTS[strongest].excess,
    ...missing.map((m) => `${K.ELEMENTS[m].lack} ${m}(${ELEMENT_KO[m]})이 가리키는 ${K.ELEMENTS[m].organ} 계통과 "${D.YONG[m].mean}"의 영역이 삶에서 비어 있기 쉬우니, ${D.YONG[m].habit} 같은 습관으로 채우고 ${m} 운(${K.ELEMENTS[m].luckBranches.join('·')} 해·달)에 그 영역이 움직이는 것을 기회로 삼으세요.`),
    !missing.length ? '다섯 오행이 모두 갖추어져 크게 치우치지 않습니다. 균형 잡힌 사주는 큰 굴곡 없이 꾸준히 가는 힘이 있고 운에서 들어오는 기운을 고르게 소화합니다.' : null,
  ].filter(Boolean);
  // 합충 종합
  const relParas = [];
  const label = (c) => `${posKo[c.pos]} ${c.ch}`;
  for (const r of relations.chung) relParas.push(K.RELATION_TEXT.충(label(r.chars[0]), label(r.chars[1]), r.chars[0].pos, r.chars[1].pos));
  for (const r of relations.stemChung) relParas.push(`천간 ${r.chars.map(label).join('·')}이 충합니다. 생각과 태도가 두 방향으로 갈려 결정이 늦어질 수 있지만 양쪽을 다 보는 균형 감각이기도 합니다.`);
  for (const r of [...relations.yukhap, ...relations.samhap.filter((x) => x.full), ...relations.banghap.filter((x) => x.full)].slice(0, 3)) relParas.push(K.RELATION_TEXT.합(label(r.chars[0]), label(r.chars[1]), r.label));
  for (const r of relations.stemHap) relParas.push(`천간 ${r.chars.map(label).join('·')}이 합하여 ${r.result}(${ELEMENT_KO[r.result]}) 기운으로 기울어집니다. 두 자리의 사람·영역이 하나로 묶이는 깊은 인연이지만, 합화(완전히 변함)는 계절·뿌리 조건이 더 필요해 확정하지 않습니다.`);
  for (const r of relations.wonjin) relParas.push(K.RELATION_TEXT.원진(label(r.chars[0]), label(r.chars[1]), r.chars[0].pos, r.chars[1].pos));
  for (const r of relations.gwimun) relParas.push(K.RELATION_TEXT.귀문(label(r.chars[0]), label(r.chars[1])));
  for (const r of relations.hae.slice(0, 1)) relParas.push(K.RELATION_TEXT.해(label(r.chars[0]), label(r.chars[1])));
  for (const r of relations.hyeong.slice(0, 1)) relParas.push(K.RELATION_TEXT.형(label(r.chars[0]), label(r.chars[1])));
  if (!relParas.length) relParas.push('여덟 글자 사이에 충·형·원진 같은 마찰이 없습니다. 내부 갈등이 적어 마음이 평온한 편이고, 변화는 외부의 운에서 들어올 때 일어납니다.');
  const sinsalParas = sinsalNames.length ? sinsalNames.map(sinsalSentence).filter(Boolean) : ['두드러지는 신살이 없어 별의 영향보다 오행과 십성의 구조가 삶을 이끕니다.'];

  // ---------- 카테고리 ----------
  const nowItems = (cat) => [
    dLuck && dNow && { label: `현재 대운 ${dNow.text} (${dNow.age}세~)`, text: `${dLuck.texts[cat]} ${dynLine(unEffect(issues, dNow), '이 대운')}`.trim(), score: dLuck.scores[cat] },
    sLuck && sNow && { label: `${sNow.year}년 세운 ${sNow.text}`, text: `${sLuck.texts[cat]} ${dynLine(unEffect(issues, sNow), '올해')}`.trim(), score: sLuck.scores[cat] },
    mLuck && mNow && { label: `${current.nowMonth}월 월운 ${mNow.text}`, text: `${mLuck.texts[cat]} ${dynLine(unEffect(issues, mNow), '이달')}`.trim(), score: mLuck.scores[cat] },
  ].filter(Boolean);
  const patSection = (cat) => { const ps = patFor(cat); return ps.length ? { title: '이 사주의 조합에서', paras: ps.map((p) => `【${p.title}】 ${p.pos} 반대로 ${p.neg}`) } : null; };
  const sinsalFor = (cat) => { const list = sinsalNames.filter((n) => K.SINSAL[n]?.cats[cat]); return list.length ? [list.map((n) => `${sinsalWhere(n)}의 ${K.SINSAL[n].title}은 ${cat}운에 ${K.SINSAL[n].cats[cat] > 0 ? '힘이 되는' : '조심할'} 별입니다 — ${first(K.SINSAL[n].text)}`).join(' ')] : []; };
  const best = (cat) => `가까운 해 중 ${cat}운이 가장 좋은 때는 ${bestYears(cat).map((y) => `${y.year}년(${y.text})`).join(', ')}이고, 조심할 해는 ${worstYears(cat).map((y) => `${y.year}년(${y.text})`).join(', ')}입니다.`;
  const yongLine = (cat) => `억부 용신 ${yongEl}(${ELEMENT_KO[yongEl]})이 들어오는 ${yearsWhere((y) => y.luck.hasYong).slice(0, 3).join(', ') || '해가 가까운 10년 안에는 없어 대운·월운에서 찾아야 하고'} ${cat}운이 균형을 얻고, 기신 ${giEl}(${ELEMENT_KO[giEl]})이 오는 ${yearsWhere((y) => y.luck.hasGi).slice(0, 2).join(', ') || '해는 없습니다'}에는 판단을 두 번 확인하세요.`;

  const cats = {};
  {
    const lvG = lv('관성');
    const indep = clamp(Math.round(50 + (prof.groups['비겁'] || 0) * 8 + (prof.groups['식상'] || 0) * 6 - (prof.groups['관성'] || 0) * 10 - (prof.groups['인성'] || 0) * 3 + (st.label === '신강' ? 8 : st.label === '신약' ? -8 : 0)), 10, 90);
    const jobs = [...new Set([...(P.JOBS[prof.dominant] || []), ...(P.JOBS[prof.second] || []), ...gyeok.career])].slice(0, 7);
    cats.직장 = {
      gauge: { label: '조직 ↔ 독립', value: indep, left: '조직형', right: '독립형' },
      sections: [
        { title: '타고난 직장 기운 — 격국으로 보는 나의 무대', paras: [
          `${gyeok.how.reason} 그래서 이 사주는 ${gyeok.key}(${gyeok.hanja}), "${gyeok.tag}"입니다. ${gyeok.desc}`, gyeok.strength, gyeok.weakness,
          lvG === '강' ? '관성(직장·명예·책임)이 강한 구조입니다. 조직과 직책, 사회적 인정이 인생의 큰 주제이고 압박 속에서 성장합니다. 소속이 있을 때 안정되고 책임이 클수록 오히려 힘이 납니다.' : lvG === '중' ? '관성이 적당히 있어 조직 생활과 자유를 둘 다 소화합니다. 규범을 지키면서도 자기 색을 낼 수 있는 자리가 가장 잘 맞습니다.' : '관성이 없어 조직·규범에 얽매이지 않는 자유인입니다. 소속보다 자기 브랜드·전문성으로 서는 것이 어울리고, 승진보다 실력으로 인정받는 길을 택하세요.',
          indep >= 60 ? `조직·독립 지수 ${indep}%로 독립형에 가깝습니다. 남의 지시보다 스스로 판을 짜는 자리에서 성과가 납니다.` : indep <= 40 ? `조직·독립 지수 ${indep}%로 조직형에 가깝습니다. 체계와 역할이 분명한 곳에서 안정적으로 성장합니다.` : `조직·독립 지수 ${indep}%로 균형형입니다. 조직 안에서도 자율이 보장되는 자리가 이상적입니다.`,
        ] },
        { title: '맞는 일과 분야', paras: [S.work, `격국과 십성 구조로 보면 ${jobs.join(', ')} 분야가 어울립니다. ${gyeok.advice}`, `용신 ${yongEl}(${ELEMENT_KO[yongEl]})의 직업군 — ${D.YONG[yongEl].job} — 은 일하면서 스스로 균형을 잡게 해 주는 분야입니다.`, ...sinsalFor('직장')].filter(Boolean) },
        { title: '상사·동료와의 관계', paras: [
          lv('비겁') === '강' ? '비겁이 강해 동료·경쟁자가 많고 승부 구도가 생기기 쉽습니다. 협업의 기술이 곧 승진의 기술입니다.' : lv('비겁') === '무' ? '비겁이 없어 경쟁보다 홀로 묵묵히 일하는 유형입니다. 내 성과를 알리는 것을 잊지 마세요.' : '동료와 적당한 거리를 유지하며 협력하는 유형입니다.',
          has('편관') ? '편관이 있어 강한 상사·엄한 조직을 만나기 쉽습니다. 압박을 견디면 그만큼 빨리 큽니다.' : has('정관') ? '정관이 있어 원칙 있는 상사 밑에서 신뢰를 받습니다.' : '윗사람의 통제를 덜 받는 대신 스스로 기준을 세워야 합니다.',
          positions.find((p) => p.pos === 'month')?.texts[0],
        ].filter(Boolean) },
        patSection('직장'),
        { title: '기운이 들어오는 때', paras: [...catTiming('직장'), yongLine('직장'), best('직장'), `승진·취업·자격에 유리한 해는 관성·인성 운이 오는 ${yearsWhere((y) => ['관성', '인성'].includes(K.TEN_GOD_GROUP[y.branchGod])).slice(0, 3).join(', ') || '없음'}, 이직·독립 욕구가 커지는 해는 상관·비겁 운의 ${yearsWhere((y) => ['식상', '비겁'].includes(K.TEN_GOD_GROUP[y.branchGod]) && y.branchGod !== '식신').slice(0, 3).join(', ') || '없음'}, 월지(직장 자리)와 충하는 ${yearsWhere((y) => y.luck.flags.some((f) => f.type === '충' && f.pos === 'month')).slice(0, 2).join(', ') || '해는 없어'} 직장 환경이 바뀔 수 있습니다.`] },
      ].filter(Boolean),
      now: nowItems('직장'),
    };
  }
  {
    const mt = has('정재') && !has('편재') ? '정재' : has('편재') ? '편재' : lv('재성') === '무' ? '없음' : '정재';
    const leaks = [];
    if (lv('비겁') === '강') leaks.push('비겁이 강해 형제·동료·동업자와 나누게 되는 돈이 새는 구멍입니다. 보증과 동업은 피하세요.');
    if (relations.chung.some((r) => r.chars.some((c) => c.pos === 'day'))) leaks.push('일지가 충을 맞아 배우자·가정 관련 지출이 갑자기 생기기 쉽습니다.');
    if (has('상관')) leaks.push('상관이 있어 기분·체면·취미 지출이 큽니다. 예산을 정해 두세요.');
    if (has('편인')) leaks.push('편인이 있어 배움·종교·특수한 관심사에 돈이 들어갑니다. 투자라고 여기되 한도를 두세요.');
    if (giEl === GEN[GEN[dayEl]]) leaks.push(`재성 오행 ${giEl}이 이 사주의 기신이라, 돈을 좇을수록 균형이 깨지기 쉬운 구조입니다. 돈은 결과로 따라오게 하세요.`);
    cats.금전 = {
      gauge: { label: '안정 ↔ 활동', value: mt === '편재' ? 72 : mt === '없음' ? 50 : 30, left: '저축·안정형', right: '투자·활동형' },
      sections: [
        { title: '재물의 성격', paras: [P.MONEY_TYPE[mt], S.money, st.label === '신약' && lv('재성') === '강' ? '재다신약 — 재물 기회는 많은데 감당할 힘이 약한 구조입니다. 돈이 들어올 때 몸이 상하거나 남의 손을 타기 쉬우니, 나를 돕는 비겁·인성 운에 크게 풀립니다.' : st.label === '신강' && lv('재성') !== '무' ? '신강하고 재성이 있어 재물을 감당하는 힘이 좋습니다. 벌어서 지키는 유형입니다.' : null].filter(Boolean) },
        { title: '돈이 들어오는 길', paras: [
          lv('식상') !== '무' ? '식상이 있어 내가 만든 것(재능·기술·콘텐츠·서비스)이 돈이 되는 길이 열려 있습니다. 실력을 상품화하세요.' : null,
          lv('재성') !== '무' ? '재성이 있어 활동하고 사람을 만나는 만큼 수입이 늘어납니다.' : '재성이 없어 돈은 운에서 들어올 때 크게 움직입니다. 그 시기를 아래에서 확인하세요.',
          lv('인성') !== '무' ? '인성이 있어 문서·자격·부동산·부모를 통한 재물 인연이 있습니다.' : null,
          `용신 ${yongEl}(${ELEMENT_KO[yongEl]})의 영역 — ${D.YONG[yongEl].mean} — 에서 번 돈이 오래 남습니다.`,
          ...sinsalFor('금전'),
        ].filter(Boolean) },
        { title: '새는 구멍', paras: leaks.length ? leaks : ['재물이 크게 새는 구조는 없습니다. 꾸준함이 곧 재물입니다.'] },
        patSection('금전'),
        { title: '재물이 움직이는 때', paras: [...catTiming('금전'), yongLine('금전'), best('금전'), `재성 운이 들어오는 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === '재성').slice(0, 3).join(', ') || '없음'}에 수입 기회가 커지고, 비겁 운의 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === '비겁').slice(0, 2).join(', ') || '없음'}에는 지출·손재를 경계하세요.`] },
      ].filter(Boolean),
      now: nowItems('금전'),
    };
  }
  {
    const lvS = lv(spouseGroup);
    const partnerStems = STEM_LIST.filter((s) => STEM_ELEMENT[s] === needEl).map((s) => `${s}(${STEM_KO[s]})`).join('·');
    const yongStems = STEM_LIST.filter((s) => STEM_ELEMENT[s] === yongEl).map((s) => `${s}(${STEM_KO[s]})`).join('·');
    const hapBranch = BRANCH_YUKHAP.find(([a, b]) => a === dayBranch || b === dayBranch);
    const mate = hapBranch ? hapBranch.find((b) => b !== dayBranch) : null;
    const tri = BRANCH_SAMHAP.find((t) => t.includes(dayBranch)) || [];
    const clashB = BRANCH_CHUNG.find(([a, b]) => a === dayBranch || b === dayBranch)?.find((b) => b !== dayBranch);
    const wonB = BRANCH_WONJIN.find(([a, b]) => a === dayBranch || b === dayBranch)?.find((b) => b !== dayBranch);
    const dayRel = [...relations.chung, ...relations.wonjin, ...relations.hae].filter((r) => r.chars.some((c) => c.pos === 'day'));
    const spousePos = present.filter((k) => K.TEN_GOD_GROUP[detail[k].branchGod] === spouseGroup || (k !== 'day' && K.TEN_GOD_GROUP[detail[k].stemGod] === spouseGroup));
    cats.연애 = {
      gauge: { label: '안정 ↔ 열정', value: clamp(Math.round(50 + (sinsalNames.includes('도화') ? 12 : 0) + (sinsalNames.includes('홍염') ? 12 : 0) + (lv('식상') === '강' ? 8 : 0) - (lv('정관') === '강' || has('정재') ? 8 : 0) - (sinsalNames.includes('고란살') ? 10 : 0)), 10, 90), left: '안정·헌신형', right: '열정·매력형' },
      sections: [
        { title: '연애 스타일', paras: [S.love, lvS === '강' ? `${spouseGroup}(배우자성)이 강해 이성 인연이 많고 관계가 인생의 큰 비중을 차지합니다. 선택과 정리가 과제입니다.` : lvS === '중' ? `${spouseGroup}(배우자성)이 적당히 있어 안정적인 인연을 만듭니다. 서두르지 않아도 때가 되면 이어집니다.` : `${spouseGroup}(배우자성)이 원국에 없습니다. 인연이 없는 것이 아니라 운에서 들어올 때 결정되는 유형입니다.`, spousePos.length ? `배우자성이 ${spousePos.map((k) => posKo[k]).join('·')}에 있어 ${spousePos.includes('day') ? '배우자가 내 몸자리 가까이 있는 인연이고' : spousePos.includes('month') ? '사회 활동·직장을 통해 인연을 만나기 쉽고' : spousePos.includes('year') ? '집안·오래된 인연에서 배우자가 나오기 쉽고' : '늦게 또는 자식·후배 인연을 통해 배우자가 나오기 쉽고'}, 그 자리의 십이운성 ${detail[spousePos[0]].stage}은 ${D.STAGE_LIFE[detail[spousePos[0]].stage]}.` : null, ...sinsalFor('연애')].filter(Boolean) },
        { title: '배우자 자리와 배우자상', paras: [
          `일지 ${dayBranch}(${detail.day.branchGod})는 배우자 자리입니다. 배우자상은 "${D.SPOUSE[dayBranch]}" ${D.POS_BRANCH.day[detail.day.branchGod]}`,
          `일지 십이운성이 ${detail.day.stage}이라 결혼 생활은 ${D.STAGE_LIFE[detail.day.stage]}. 지장간 ${detail.day.hidden.map((h) => `${h.ko}(${h.god})`).join('·')}은 배우자의 속마음과 가정 안의 숨은 기운입니다.`,
          dayRel.length ? `일지가 ${dayRel.map((r) => r.label).join('·')}을 맞고 있어 배우자 자리가 흔들리기 쉽습니다. 서로의 공간을 존중하고 사실 중심으로 대화하는 관계가 오래 갑니다.` : '일지에 충·원진이 없어 배우자 자리가 안정적입니다.',
          gongmangSet.has(dayBranch) ? D.GONGMANG_POS.day : null,
        ].filter(Boolean) },
        { title: '이런 인연이 맞습니다 — 궁합 힌트', paras: [
          `사주에 필요한 ${needEl}(${ELEMENT_KO[needEl]}) 기운을 가진 사람, 곧 ${partnerStems} 일간이 나를 살려 주는 인연입니다.${yongEl !== needEl ? ` 억부 용신 ${yongEl}(${ELEMENT_KO[yongEl]})을 지닌 ${yongStems} 일간은 내 삶의 균형을 잡아 주는 인연입니다.` : ''} 함께 있으면 편안하고 일이 풀립니다.`,
          `일지 ${dayBranch}와 육합하는 ${mate}(${BRANCH_KO[mate]}) 일지·${mate}년생과는 끌림이 강하고 잘 묶이며, 삼합 ${tri.filter((b) => b !== dayBranch).map((b) => `${b}(${BRANCH_KO[b]})`).join('·')} 일지와는 뜻이 잘 모입니다.`,
          `반대로 일지와 충하는 ${clashB}(${BRANCH_KO[clashB]}) 일지·${clashB}년생과는 끌리지만 부딪히기 쉽고, 원진인 ${wonB}(${BRANCH_KO[wonB]})와는 이유 없는 미움이 쌓이기 쉬우니 거리 조절이 필요합니다. 나를 극하는 ${gender === '남' ? '관성' : '재성'} 기운이 지나친 사람과는 힘겨루기가 됩니다.`,
        ] },
        patSection('연애'),
        { title: '인연이 오는 때', paras: [...catTiming('연애'), best('연애'), `배우자성(${spouseGroup}) 운이 들어오는 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === spouseGroup || K.TEN_GOD_GROUP[y.stemGod] === spouseGroup).slice(0, 3).join(', ') || '없음'}에 결정적인 만남·결혼 인연이 있고, 도화(년살) 운의 ${yearsWhere((y) => twelveSal(pillars.year.branch, y.branch) === '년살').slice(0, 2).join(', ') || '없음'}에 이성 인기가 오릅니다. 일지와 합하는 ${yearsWhere((y) => y.luck.flags.some((f) => f.pos === 'day' && f.type === '합')).slice(0, 2).join(', ') || '해는 없고'} 인연이 묶이고, 일지와 충·원진이 되는 ${yearsWhere((y) => y.luck.flags.some((f) => f.pos === 'day' && f.type !== '합')).slice(0, 2).join(', ') || '없음'}에는 관계가 흔들리니 다툼을 키우지 마세요.`] },
      ].filter(Boolean),
      now: nowItems('연애'),
    };
  }
  {
    cats.건강 = {
      gauge: { label: '체력 지수', value: clamp(Math.round(st.ratio * 100), 15, 90), left: '소모 빠름', right: '기운 넘침' },
      sections: [
        { title: '체질', paras: [P.HEALTH_TYPE[st.label], `${P.SEASON_DESC[season]} ${season === '겨울' ? '몸이 차가워지기 쉬우니 따뜻하게 유지하는 것이 기본입니다.' : season === '여름' ? '열이 위로 뜨기 쉬우니 수분과 수면으로 식혀 주어야 합니다.' : season === '가을' ? '건조함과 호흡기를 살피세요.' : '간·근육의 피로와 알레르기를 살피세요.'}`, roots.tonggeun ? '일간이 뿌리를 두어 기본 체력과 회복력이 있습니다.' : '일간이 뿌리가 없어 겉보다 속이 허해지기 쉬우니 기초 체력을 먼저 다지세요.'] },
        { title: '약한 곳', paras: [
          missing.length ? `사주에 없는 ${missing.map((m) => `${m}(${ELEMENT_KO[m]})`).join('·')} 오행이 가리키는 ${missing.map((m) => K.ELEMENTS[m].organ).join(', ')} 계통이 약점이 되기 쉽습니다.` : '오행이 모두 있어 특별히 비어 있는 장기 계통은 없습니다.',
          `가장 강한 ${strongest}(${ELEMENT_KO[strongest]}) 기운은 과하면 ${K.ELEMENTS[strongest].organ} 계통에 부담이 되고, 그 기운이 극하는 ${CTRL[strongest]}(${ELEMENT_KO[CTRL[strongest]]})의 ${K.ELEMENTS[CTRL[strongest]].organ} 계통도 눌립니다.`,
          lv('관성') === '강' ? '관성이 강해 스트레스를 몸으로 받는 유형입니다. 긴장을 풀어 주는 운동과 정기 검진이 필수입니다.' : null,
          relations.chung.length ? `원국에 ${relations.chung.map((r) => r.chars.map((c) => c.ch).join('')).join('·')} 충이 있어 몸이 바쁘고 사고·부상 위험이 있는 편입니다.` : null,
          ...sinsalFor('건강'),
        ].filter(Boolean) },
        { title: '관리법', paras: [missing.length ? `보완: ${missing.map((m) => `${m}(${ELEMENT_KO[m]}) → ${K.ELEMENTS[m].remedy}, ${D.YONG[m].food}`).join(' / ')}.` : `가장 강한 ${strongest} 기운을 흘려보내는 ${K.ELEMENTS[GEN[strongest]].remedy} 이 균형을 잡아 줍니다.`, `용신 ${yongEl}(${ELEMENT_KO[yongEl]}) 기운의 습관 — ${D.YONG[yongEl].habit} — 이 몸의 균형을 잡는 처방이고, 음식은 ${D.YONG[yongEl].food}이 맞습니다.`, st.label === '신약' ? '무리한 일정보다 수면 7시간 이상, 규칙적인 식사가 어떤 보약보다 낫습니다.' : '땀을 내는 운동으로 넘치는 기운을 빼 주면 마음까지 안정됩니다.'] },
        patSection('건강'),
        { title: '주의할 때', paras: [...catTiming('건강'), best('건강'), `편관 운(${yearsWhere((y) => y.branchGod === '편관' || y.stemGod === '편관').slice(0, 3).join(', ') || '없음'})과 원국을 충하는 해(${yearsWhere((y) => y.luck.flags.some((f) => f.type === '충')).slice(0, 3).join(', ') || '없음'}), 기신 ${giEl} 운(${yearsWhere((y) => y.luck.hasGi).slice(0, 2).join(', ') || '없음'})에는 검진을 챙기고 무리한 일정을 피하세요.`] },
      ].filter(Boolean),
      now: nowItems('건강'),
    };
  }
  {
    const styleKey = has('정인') ? '정인' : has('편인') ? '편인' : lv('식상') !== '무' ? '식상' : lv('관성') !== '무' ? '관성' : lv('재성') !== '무' ? '재성' : '비겁';
    cats.학업 = {
      gauge: { label: '실전 ↔ 이론', value: clamp(Math.round(50 + (prof.groups['인성'] || 0) * 10 - (prof.groups['재성'] || 0) * 6 - (prof.groups['비겁'] || 0) * 4), 10, 90), left: '실전·경험형', right: '이론·학문형' },
      sections: [
        { title: '학습 스타일', paras: [P.STUDY_STYLE[styleKey], lv('인성') === '강' ? '인성이 강해 학문·연구·교육과 인연이 깊습니다. 실행이 느려지지 않도록 결과물을 내는 습관이 중요합니다.' : lv('인성') === '무' ? '인성이 없어 책상 공부보다 몸으로 부딪혀 배우는 유형입니다. 멘토를 두면 배움이 빨라집니다.' : '배움과 실행의 균형이 좋아 필요한 공부를 때맞춰 챙깁니다.', `${gyeok.key}의 학습 방향 — ${gyeok.career.join('·')} 쪽 공부가 격에 맞습니다.`] },
        { title: '유리한 시험과 분야', paras: [
          lv('관성') !== '무' ? '관성이 있어 시험·자격·승진 시험처럼 규범 안의 경쟁에서 결과를 냅니다.' : '관성이 없어 정해진 시험보다 실력으로 증명하는 포트폴리오형 진로가 맞습니다.',
          has('편인') ? '편인의 직관으로 IT·의학·역학·심리·예술 같은 특수 분야에 강합니다.' : has('정인') ? '정인의 체계성으로 행정·교육·법·회계 같은 정통 학문에 강합니다.' : null,
          lv('식상') !== '무' ? '식상이 있어 발표·논술·실기·창의 과제에서 두각을 나타냅니다.' : null,
          ...sinsalFor('학업'),
        ].filter(Boolean) },
        patSection('학업'),
        { title: '공부가 잘 되는 때', paras: [...catTiming('학업'), yongLine('학업'), best('학업'), `인성 운의 ${yearsWhere((y) => K.TEN_GOD_GROUP[y.branchGod] === '인성').slice(0, 3).join(', ') || '없음'}은 배움·자격·유학에, 정관 운의 ${yearsWhere((y) => y.branchGod === '정관').slice(0, 2).join(', ') || '없음'}은 합격·승진 시험에 가장 유리합니다.`] },
      ].filter(Boolean),
      now: nowItems('학업'),
    };
  }
  for (const cat of K.CATS) {
    const c = cats[cat];
    let baseScore = 3;
    const grp = { 직장: '관성', 금전: '재성', 학업: '인성', 연애: spouseGroup }[cat];
    if (grp) baseScore += lv(grp) === '강' ? 0.6 : lv(grp) === '중' ? 0.3 : -0.3;
    for (const n of sinsalNames) baseScore += (K.SINSAL[n]?.cats[cat] || 0) * 0.4;
    for (const p of patFor(cat)) baseScore += (p.stats?.polarity || 0) * 0.4;
    if (cat === '건강') baseScore -= missing.length * 0.3 + relations.chung.length * 0.3;
    const ev = evidenceByCat[cat] || [];
    const evSum = ev.reduce((a, r) => a + r.pol * r.weight, 0), evW = ev.reduce((a, r) => a + r.weight, 0);
    if (evW) baseScore += (evSum / evW) * 0.6;
    const nowAvg = c.now.length ? c.now.reduce((a, x) => a + x.score, 0) / c.now.length : 3;
    c.score = clamp(Math.round(baseScore * 0.5 + nowAvg * 0.5), 1, 5);
    c.series = seriesFor(cat);
    c.evidence = ev;
    const b = bestYears(cat, 1)[0], w = worstYears(cat, 1)[0];
    c.best = b ? { year: b.year, text: b.text, score: b.luck.scores[cat] } : null;
    c.worst = w ? { year: w.year, text: w.text, score: w.luck.scores[cat] } : null;
  }
  // ---------- 이 사주만의 포인트 (글자·자리·개수·관계 기반) ----------
  const personal = buildPersonal({ data, prof, gyeok, yong, needEl, evidenceByCat, daeunAll, spouseGroup, st, gongmangSet, currentDaeun: current.daeun });
  for (const cat of K.CATS) { cats[cat].personal = personal[cat]?.sections || []; cats[cat].headline = personal[cat]?.headline || null; }

  // ---------- 조언 ----------
  const advice = [
    st.label === '신강' ? '힘이 넘치는 사주는 밖으로 써야 합니다. 표현하고, 만들고, 책임지는 자리로 나가세요.' : st.label === '신약' ? '나를 채우는 것이 먼저입니다. 배움·휴식·좋은 사람을 곁에 두고 혼자 다 짊어지지 마세요.' : '균형이 좋은 사주는 운의 흐름을 읽는 것이 핵심입니다. 좋은 운에는 과감하게, 낮은 운에는 지키면서 가세요.',
    yong.openText,
    `이 사주의 열쇠는 ${needEl}(${ELEMENT_KO[needEl]})${yongEl !== needEl ? `과 ${yongEl}(${ELEMENT_KO[yongEl]})` : ''}입니다. 그 기운이 들어오는 해와 달에 미뤄 둔 결단을 내리고, 기신 ${giEl}(${ELEMENT_KO[giEl]})이 오는 때에는 지키는 쪽을 택하세요.`,
    prof.dominant ? { 비겁: '경쟁보다 협업의 기술을, 승부보다 지키는 힘을 기르면 강점이 완성됩니다.', 식상: '재능을 세상에 꺼내 놓는 것을 두려워하지 마세요. 보여줄수록 길이 열립니다.', 재성: '벌어들이는 힘은 충분하니 쓰는 원칙과 쉬는 시간을 정해 두세요.', 관성: '책임을 감당하는 힘이 큰 만큼 몸을 먼저 챙기세요. 건강이 곧 명예의 밑천입니다.', 인성: '배운 것을 세상에 내놓는 실행이 과제입니다. 완벽해질 때까지 기다리지 말고 지금 시작하세요.' }[prof.dominant] : null,
    gyeok.advice,
  ].filter(Boolean);

  // ---------- 종합평가 (그룹) ----------
  const summary = [
    { icon: '形', title: '형국과 조후', sub: `${season}에 태어난 ${ELEMENT_KO[dayEl]} 일간 · 필요한 기운 ${needEl}`, paras: climate.paras },
    { icon: '命', title: '일간과 격국', sub: `${S.title} · ${gyeok.key}`, paras: [overview[0], `${gyeok.how.reason} 격국은 ${gyeok.key}(${gyeok.hanja}) — "${gyeok.tag}"입니다. ${gyeok.how.altNote} ${gyeok.desc}`, gyeok.strength, gyeok.weakness] },
    { icon: '衡', title: '신강·신약과 용신', sub: `${st.label} · 용신 ${yongEl} · 희신 ${heeEl} · 기신 ${giEl}`, paras: [overview[1], yong.text, roots.text] },
    { icon: '構', title: '오행과 십성의 구조', sub: `${strongest} 강 · ${missing.length ? missing.join('·') + ' 없음' : '오행 구비'} · ${prof.dominant} 중심`, paras: [...elementParas, ...structureParas] },
    { icon: '宮', title: '네 기둥, 인생의 네 시기', sub: '년주=초년·조상 / 월주=청년·사회 / 일주=중년·배우자 / 시주=말년·자식', paras: [], positions },
    { icon: '合', title: '글자들의 관계와 신살', sub: `합충형파해 ${relations.chung.length + relations.stemChung.length + relations.yukhap.length + relations.stemHap.length}건 · 신살 ${sinsalNames.length}개`, paras: [...relParas, ...sinsalParas] },
    { icon: '運', title: '인생의 흐름 — 대운', sub: `${meta.forward ? '순행' : '역행'} · 첫 대운 ${meta.daeunStart}`, paras: lifeStages.map((l) => l.text), daeunAll },
    { icon: '言', title: '사주 전문가들이 이 사주에 대해 말하는 것', sub: `전문가 강의 ${evidenceSummary.total.toLocaleString()}편에서 반복된 의견 · 吉/凶 모두`, paras: [], evidenceSummary, keywords },
    { icon: '助', title: '개운법과 조언', sub: `용신 ${yongEl}(${ELEMENT_KO[yongEl]}) 중심`, paras: advice },
  ];

  return {
    strength: st, profile: prof, keywords, climate, patterns, overview, character, cats, years, monthsOf, advice, needEl, issues,
    evidence, evidenceByCat, evidenceSummary, daeunFlow: daeunAll.filter((d) => d.endYear >= nowY).slice(0, 3), daeunAll, lifeStages,
    gyeok, yong, positions, roots, summary, meta: kb.meta,
  };
}
