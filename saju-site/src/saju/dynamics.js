import * as K from '../data/knowledge.js';
import { ELEMENT_KO, BRANCH_YUKHAP, BRANCH_SAMHAP, BRANCH_CHUNG, BRANCH_SAMHYEONG, STEM_HAP, STEM_KO, BRANCH_KO } from './tables.js';

/**
 * 원국의 "약한 고리"(issues)와, 운(대운·세운·월운)이 그것을 채워 주는지/도드라지게 하는지(unEffect).
 *  - 모든 문장은 쉬운 말로, 사용자의 실제 글자를 인용한다.
 */
const ko = ELEMENT_KO;
const uniq = (a) => [...new Set(a.filter(Boolean))];
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ctrlBy = (el) => Object.keys(CTRL).find((k) => CTRL[k] === el);
const grp = (g) => K.TEN_GOD_GROUP[g] || '';
const POS_KO = { year: '년', month: '월', day: '일', time: '시' };
const POS_ROLE = { year: '집안·초년·윗사람', month: '직장·사회', day: '나·배우자·몸', time: '자식·말년·계획' };
const GOD_EASY = { 관성: '회사·직함·책임을 뜻하는 글자', 인성: '배움·자격·보호를 뜻하는 글자', 재성: '돈과 현실 감각을 뜻하는 글자', 식상: '표현·재능·만드는 힘을 뜻하는 글자', 비겁: '나와 같은 편(동료·형제)을 뜻하는 글자' };
const NONE_EASY = { 관성: '조직이 나를 붙잡는 힘이 약해 자리 잡기가 늦고, 규칙보다 자유를 택하기 쉬워요.', 재성: '돈이 늘 곁에 머무는 구조가 아니라 벌어도 모으는 감각을 따로 익혀야 해요.', 인성: '배움·보호가 약해 스스로 부딪혀 익히는 편이고 쉬는 법을 잘 몰라요.', 식상: '표현하고 만드는 출구가 약해 속에 쌓이기 쉬워요.', 비겁: '혼자 결정하는 힘과 동료의 도움이 약해 좋은 파트너가 중요해요.' };
const EXCESS_EASY = { 관성: '책임과 압박을 몸으로 받아 늘 긴장하기 쉬워요.', 재성: '돈과 사람 일이 많아 몸이 바쁘고 감당이 벅찰 때가 있어요.', 인성: '생각과 준비는 많은데 실행이 늦어지기 쉬워요.', 비겁: '고집이 세고 나눠야 하는 돈·자리 다툼이 생기기 쉬워요.', 식상: '말과 재능이 앞서 기운이 새고 규칙과 부딪히기 쉬워요.' };
const EXCESS_FIX = { 관성: ['인성', '식상'], 재성: ['비겁', '인성'], 인성: ['재성', '식상'], 비겁: ['관성', '식상'], 식상: ['인성', '재성'] };
const hapPartners = (b) => uniq([...BRANCH_YUKHAP.filter((p) => p.includes(b)).flat(), ...BRANCH_SAMHAP.filter((t) => t.includes(b)).flat()].filter((x) => x !== b));
const chungPartner = (b) => BRANCH_CHUNG.find((p) => p.includes(b))?.find((x) => x !== b);
const stemHapPartner = (s) => STEM_HAP.find((p) => p.includes(s))?.find((x) => x !== s);
const br = (b) => `${b}(${BRANCH_KO[b]})`;
const list = (arr) => uniq(arr).map(br).join('·');

export function natalIssues({ data, prof, yong, climate, st, gongmangSet, groupEl }) {
  const { pillars, detail, order, dayStem, relations = {} } = data;
  const present = order.filter((k) => pillars[k]);
  const lv = (g) => prof.level(g);
  const hasGod = (g) => present.some((k) => detail[k].branchGod === g || (k !== 'day' && detail[k].stemGod === g));
  const issues = [];

  // 1) 조후 — 계절과 온도
  if (climate.needCount <= 1) {
    const need = climate.needEl;
    const harm = climate.season === '겨울' ? '水' : climate.season === '여름' ? '火' : ctrlBy(need);
    issues.push({
      id: 'climate', kind: '온도', severity: climate.needCount ? 2 : 3,
      title: `${climate.season}에 태어난 ${ko[climate.dayEl]} 일간인데 ${need}(${ko[need]}) 기운이 ${climate.needCount ? '하나뿐이에요' : '없어요'}`,
      easy: `쉽게 말해 ${climate.needWhy}이 모자라요. 형국으로 보면 "${climate.image}" — 재능과 힘은 있는데 그것을 꺼내 줄 열쇠가 밖(운)에 있는 셈이에요.`,
      remedyEls: [need], harmEls: [harm],
      fixText: `모자라던 ${need}(${ko[need]}) 기운이 채워져 막혀 있던 데가 풀려요`, worseText: `${harm}(${ko[harm]}) 기운이 더해져 답답함이 심해져요`,
    });
  }
  // 2) 억부 — 힘의 균형 (중화는 약점이 아니므로 제외)
  if (st.label !== '중화') issues.push({
    id: 'balance', kind: '균형', severity: st.label === '중화' ? 1 : 2,
    title: st.label === '신강' ? `나(${dayStem})를 받쳐 주는 기운이 많아 힘이 넘쳐요(신강 ${st.pct}%)` : st.label === '신약' ? `나(${dayStem})를 받쳐 주는 기운이 적어 힘이 부족해요(신약 ${st.pct}%)` : `힘의 균형이 잡혀 있어요(중화 ${st.pct}%)`,
    easy: st.label === '신강' ? `넘치는 힘은 밖으로 써야 편해요. 가장 필요한 기운(용신)은 ${yong.el}(${ko[yong.el]})·${yong.group}이고, 힘을 더 보태는 ${yong.gi}(${ko[yong.gi]})은 오히려 고집과 과욕을 키워요.` : st.label === '신약' ? `부족한 힘은 채워야 해요. 가장 필요한 기운(용신)은 ${yong.el}(${ko[yong.el]})·${yong.group}이고, 힘을 빼앗는 ${yong.gi}(${ko[yong.gi]})이 오면 더 지쳐요.` : `운의 기운을 고르게 소화하는 편이에요. ${yong.el}(${ko[yong.el]}) 운에 한층 편해지고 ${yong.gi}(${ko[yong.gi]}) 운에는 살짝 흔들려요.`,
    remedyEls: uniq([yong.el, yong.hee]), harmEls: uniq([yong.gi, yong.gu]),
    fixText: st.label === '신강' ? '넘치는 힘이 밖으로 흘러 결정이 가볍고 결과가 잘 따라와요' : '든든하게 힘이 채워져 밀어붙일 수 있어요',
    worseText: st.label === '신강' ? '힘이 안에 고여 고집과 과욕으로 새기 쉬워요' : '힘이 더 빠져 지치고 판단이 흐려져요',
  });
  // 3) 없는 십성
  for (const g of ['관성', '재성', '인성', '식상', '비겁']) if (lv(g) === '무') {
    const el = groupEl[g];
    issues.push({ id: `none-${g}`, kind: '빈자리', severity: 2, title: `${g}(${GOD_EASY[g]})이 원국에 없어요`, easy: `${NONE_EASY[g]} ${el}(${ko[el]}) 기운이 운으로 들어오면 그때만큼은 이 빈자리가 채워져요.`, remedyEls: [el], harmEls: [], fixText: `없던 ${g}이 잠시 채워져 ${g === '관성' ? '자리·제안' : g === '재성' ? '돈·현실 기회' : g === '인성' ? '배움·보호' : g === '식상' ? '표현할 출구' : '함께할 동료'}가 생겨요`, worseText: '' });
  }
  // 4) 과다 십성
  for (const g of ['관성', '재성', '인성', '식상', '비겁']) if (lv(g) === '강' && (prof.groups[g] || 0) >= 3) {
    const fixG = EXCESS_FIX[g], fixEls = fixG.map((x) => groupEl[x]);
    issues.push({ id: `excess-${g}`, kind: '과다', severity: 2, title: `${g}(${GOD_EASY[g]})이 많아요`, easy: `${EXCESS_EASY[g]} ${fixG.join('·')} 기운(${fixEls.map((e) => `${e}(${ko[e]})`).join('·')})이 오면 눌러 주거나 흘려 줘 균형이 잡히고, ${g} 기운이 더 오면 과열돼요.`, remedyGroups: fixG, harmGroups: [g], fixText: `많던 ${g}이 다스려져 부담이 줄어요`, worseText: `${g}이 더 쌓여 부담이 커져요` });
  }
  // 5) 자리 간 충·원진·형·귀문
  const relPairs = (name, kind) => (relations[name] || []).filter((r) => r.chars?.length >= 2).map((r) => ({ kind, a: r.chars[0], b: r.chars[1] }));
  const merged = new Map();
  for (const { kind, a, b } of [...relPairs('chung', '충'), ...relPairs('wonjin', '원진'), ...relPairs('hyeong', '형'), ...relPairs('gwimun', '귀문')]) {
    const key = `${kind}|${[a.ch, b.ch].sort().join('')}`;
    const m = merged.get(key) || { kind, a: { ch: a.ch, pos: [] }, b: { ch: b.ch, pos: [] } };
    const [x, y] = m.a.ch === a.ch ? [a, b] : [b, a];
    if (!m.a.pos.includes(x.pos)) m.a.pos.push(x.pos); if (!m.b.pos.includes(y.pos)) m.b.pos.push(y.pos);
    merged.set(key, m);
  }
  for (const { kind, a, b } of merged.values()) {
    const posTxt = (p) => p.pos.map((x) => POS_KO[x]).join('·') + '지';
    const roleTxt = (p) => uniq(p.pos.map((x) => POS_ROLE[x])).join('·');
    const fix = uniq([...hapPartners(a.ch), ...hapPartners(b.ch)]);
    const worse = kind === '형' ? uniq([a.ch, b.ch, ...BRANCH_SAMHYEONG.filter((t) => t.includes(a.ch) && t.includes(b.ch)).flat()]) : [a.ch, b.ch];
    const meaning = kind === '충' ? '서로 밀어내 변화·이동이 잦아요' : kind === '원진' ? '이유 없는 미움과 오해가 쌓이기 쉬워요' : kind === '형' ? '조정하느라 마찰이 생기고 건강·법 문제를 조심해야 해요' : '감이 예민하고 신경이 날카로워지기 쉬워요';
    issues.push({
      id: `${kind}-${a.pos.join('')}${a.ch}-${b.pos.join('')}${b.ch}`, kind: '글자 관계', severity: [...a.pos, ...b.pos].includes('day') ? 3 : 2,
      title: `${posTxt(a)} ${a.ch}${WA(a.ch)} ${posTxt(b)} ${b.ch}${GA(b.ch)} ${kind}을 이뤄요`,
      easy: `${roleTxt(a)} 영역과 ${roleTxt(b)} 영역이 ${meaning}. ${list(fix)} 글자가 운으로 오면 한쪽을 합으로 묶어 ${kind}이 풀리듯 완화되고, ${list(worse)}가 다시 오면 더 흔들려요.`,
      fixBranches: fix, worseBranches: worse,
      fixText: `${posTxt(a)} ${a.ch}–${posTxt(b)} ${b.ch}의 ${kind}이 합으로 묶여 ${kind === '충' ? '변동이' : '마찰이'} 잦아들어요`, worseText: `${a.ch}–${b.ch}의 ${kind}이 다시 건드려져 ${kind === '충' ? '변동' : '마찰'}이 커져요`,
    });
  }
  // 6) 공망
  for (const k of present) if (gongmangSet?.has(pillars[k].branch)) {
    const b = pillars[k].branch;
    issues.push({ id: `gong-${k}`, kind: '빈자리', severity: 1, title: `${POS_KO[k]}주 ${pillars[k].stem}${b}가 비어 있는 자리(공망)예요`, easy: `${POS_ROLE[k]} 영역이 손에 잘 안 잡히는 느낌이 있어요. ${list(hapPartners(b))}(합)나 ${br(chungPartner(b))}(충) 글자가 운으로 오면 빈자리가 채워지듯 움직여요.`, fixBranches: uniq([...hapPartners(b), chungPartner(b)]), fixText: `${POS_KO[k]}주의 빈자리가 채워지듯 ${POS_ROLE[k]} 영역이 움직여요`, worseText: '' });
  }
  // 7) 관살혼잡 / 배우자 별 혼잡
  if (hasGod('정관') && hasGod('편관')) {
    const stems = present.filter((k) => k !== 'day' && ['정관', '편관'].includes(detail[k].stemGod)).map((k) => pillars[k].stem);
    const fixStems = uniq(stems.map(stemHapPartner));
    issues.push({ id: 'mixed-gwan', kind: '섞임', severity: 2, title: '정관과 편관이 섞여 있어요(관살혼잡)', easy: `안정된 길과 도전적인 길이 동시에 열려 두 가지 일을 병행하거나 마음이 나뉘기 쉬워요.${fixStems.length ? ` 운의 천간 ${fixStems.map((s) => `${s}(${STEM_KO[s]})`).join('·')}이 오면 하나를 합으로 데려가(합거) 길이 정리되고,` : ''} 관성이 더 오면 압박만 커져요.`, fixStems, harmGroups: ['관성'], fixText: '섞여 있던 관성 중 하나가 정리되어 길이 하나로 모여요', worseText: '관성이 더 겹쳐 압박과 갈림길이 늘어요' });
  }
  // 8) 상관견관
  if (hasGod('상관') && hasGod('정관')) issues.push({ id: 'sanggwan', kind: '섞임', severity: 2, title: '표현 글자(상관)가 규칙 글자(정관)와 부딪혀요(상관견관)', easy: '상사·규정과 의견 충돌이 잦고 말로 손해 보기 쉬워요. 배움 글자(인성) 기운이 오면 표현이 다듬어져 완화되고(상관패인), 식상이 더 오면 마찰이 커져요.', remedyGroups: ['인성'], harmGroups: ['식상'], fixText: '표현이 다듬어져 규칙과의 마찰이 줄어요', worseText: '말이 앞서 규칙과 더 부딪혀요' });
  // 9) 군겁쟁재
  if (lv('비겁') === '강' && lv('재성') !== '무') issues.push({ id: 'jaengjae', kind: '섞임', severity: 2, title: '나와 같은 편 글자(비겁)가 돈 글자(재성)를 나눠 가져요(군겁쟁재)', easy: '형제·동료·동업자와 얽힌 돈이 새기 쉬워요. 회사·규칙 글자(관성) 기운이 오면 비겁이 다스려져 완화되고, 비겁이 더 오면 나눠야 할 돈이 늘어요.', remedyGroups: ['관성'], harmGroups: ['비겁'], fixText: '돈을 다투는 힘이 다스려져 내 몫이 지켜져요', worseText: '나눠야 할 돈과 경쟁이 늘어요' });

  return issues.sort((a, b) => b.severity - a.severity).slice(0, 8);
}

const READ = { ...STEM_KO, ...BRANCH_KO };
function hasBatchim(ch) { const r = READ[ch] || ch; const c = r.charCodeAt(r.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false; }
const GA = (ch) => (hasBatchim(ch) ? '이' : '가');
const WA = (ch) => (hasBatchim(ch) ? '과' : '와');

/** 운 한 기둥이 각 약점에 미치는 영향 */
export function unEffect(issues, g) {
  const helps = [], hurts = [], mixed = [];
  const els = uniq([g.stemEl, g.branchEl]), groups = uniq([grp(g.stemGod), grp(g.branchGod)]);
  for (const it of issues) {
    const how = [];
    if (it.remedyEls?.some((e) => els.includes(e))) how.push(`${els.filter((e) => it.remedyEls.includes(e)).map((e) => `${e}(${ko[e]})`).join('·')} 기운이 들어와`);
    if (it.remedyGroups?.some((x) => groups.includes(x))) how.push(`${it.remedyGroups.filter((x) => groups.includes(x)).join('·')} 운이 와서`);
    if (it.fixBranches?.includes(g.branch)) how.push(`${g.branch}${GA(g.branch)} 원국 글자와 합해서`);
    if (it.fixStems?.includes(g.stem)) how.push(`천간 ${g.stem}${GA(g.stem)} 합으로 하나를 데려가서`);
    const worse = (it.harmEls?.some((e) => els.includes(e))) || (it.harmGroups?.some((x) => groups.includes(x))) || (it.worseBranches?.includes(g.branch));
    if (how.length && !worse) helps.push({ id: it.id, title: it.title, how: how.join(' '), text: `${how.join(' ')} ${it.fixText}.` });
    else if (worse && !how.length && it.worseText) hurts.push({ id: it.id, title: it.title, text: `${it.worseText}.` });
    else if (how.length && worse) mixed.push({ id: it.id, title: it.title, text: `${how.join(' ')} ${it.fixText}. 다만 같은 운 안에 ${it.worseText.replace(/요$/, '는')} 면도 있어 반은 풀리고 반은 남아요.` });
  }
  return { helps, hurts, mixed, score: helps.length - hurts.length };
}

/** 운 항목에 붙일 한두 문장 */
export function dynLine(dyn, span = '이 운') {
  if (!dyn) return '';
  const s = [];
  if (dyn.helps.length) s.push(`${span}은 타고난 약한 고리 "${dyn.helps[0].title}"를 채워 줘요 — ${dyn.helps[0].text}`);
  if (dyn.hurts.length) s.push(`${dyn.helps.length ? '다만' : span + '에는'} "${dyn.hurts[0].title}"${dyn.hurts.length > 1 ? ` 등 ${dyn.hurts.length}가지` : ''}가 더 도드라져요 — ${dyn.hurts[0].text}`);
  if (!s.length && dyn.mixed.length) s.push(`${span}은 "${dyn.mixed[0].title}"에 양면으로 작용해요 — ${dyn.mixed[0].text}`);
  return s.join(' ');
}
