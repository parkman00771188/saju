import * as K from '../data/knowledge.js';
import * as P from '../data/patterns.js';
import * as D from '../data/deep.js';
import { ELEMENT_KO, STEMS, STEM_ELEMENT, STEM_KO, BRANCH_ANIMAL, BRANCH_YUKHAP, BRANCH_SAMHAP, BRANCH_CHUNG, BRANCH_WONJIN } from './tables.js';
import { eventFor, makeEventCtx } from './events.js';
import { yearExpertOverview } from './yearExpert.js';
import { monthsForYear } from './context.js';

// 절입 기준 월운 기간 → "6월 6일~7월 6일"
const fmtDay = (x) => { const d = new Date(String(x).replace(' ', 'T')); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
const rangeCache = {};
export const monthRange = (year, monthNo) => {
  try { rangeCache[year] ||= monthsForYear(year); const t = rangeCache[year][monthNo - 1]; return t ? `${fmtDay(t.start)}~${fmtDay(t.end)}` : `${monthNo}월`; } catch { return `${monthNo}월`; }
};

/** 해석 결과(R)와 원국(data)에서 자주 묻는 질문 14개의 답을 만든다. 시기 질문은 연도 카드(그 해에 좋은 달과 이유)로 답한다. */
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s || ''])[0];
const uniq = (a) => [...new Set(a.filter(Boolean))];
const mList = (ms) => ms.map((m) => `${m.monthNo}월`).join('·');
const yList = (ys) => ys.map((y) => `${y.year}년(${y.text})`).join(', ');
const scoreTone = (n) => (n >= 4 ? 'good' : n <= 2 ? 'bad' : 'gray');
const GOOD_SAL = ['천을귀인', '천덕귀인', '월덕귀인', '문창귀인', '학당귀인', '금여록', '천주귀인', '태극귀인', '천의성', '암록', '천관귀인', '복성귀인', '건록'];
const KW_JUNK = /(일주|일간|사주|인데|태어|이라|라고|분들|같은|이런|그런|이제|그냥|정도|경우)/;
const STAGE_UP = ['장생', '관대', '건록', '제왕'];
const PEOPLE = {
  비겁: '같은 길을 가는 동료·형제 같은 사람(경쟁보다 협업이 되는 관계)',
  식상: '나를 표현하게 하고 결과물을 만들게 하는 사람(후배·제자·창작 파트너)',
  재성: '현실 감각이 있고 실속을 챙겨 주는 사람(재무·실행에 밝은 사람)',
  관성: '규칙과 책임감이 있어 나를 관리해 주는 윗사람·조직형 사람',
  인성: '가르쳐 주고 보호해 주는 멘토·연장자·학문적인 사람',
};
const pairHas = (table, a, b) => table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export function buildFaq(R, data) {
  const { current, meta, pillars, dayStem, sinsal = {}, order = [], missing = [], strongest, elements = {} } = data;
  const ko = ELEMENT_KO;
  const nowY = current.nowYear, nowM = current.nowMonth;
  const years = R.years.filter((yy) => yy.year >= nowY);
  const thisYear = R.years.find((yy) => yy.year === nowY) || years[0];
  const months = R.monthsOf(nowY) || [];
  const remaining = months.filter((m) => m.monthNo >= nowM);
  const monthsNow = remaining.length ? remaining : months; // 올해 추천은 남은 달 기준
  const NEAR_END = nowY + 2; // 올해·내년·내후년 우선
  const ectx = makeEventCtx(R, data);
  const S = K.STEMS[dayStem] || {};
  const gy = R.gyeok, y = R.yong, prof = R.profile, needEl = R.needEl;
  const dayBranch = pillars.day.branch, yearBranch = pillars.year.branch;
  const grp = (g) => K.TEN_GOD_GROUP[g] || '';
  const hasG = (g, G) => grp(g.branchGod) === G || grp(g.stemGod) === G;
  const hasFlag = (g, type, pos) => (g.luck?.flags || []).some((f) => f.type === type && (!pos || f.pos === pos));
  const byNo = (a, b) => a.monthNo - b.monthNo;
  const sortM = (arr, val, desc = true) => [...arr].sort((a, b) => (desc ? val(b) - val(a) : val(a) - val(b)) || byNo(a, b));
  const topM = (cat, n = 3) => sortM(monthsNow, (m) => m.luck.scores[cat]).slice(0, n).sort(byNo);
  const lowM = (cat, n = 2) => sortM(monthsNow, (m) => m.luck.scores[cat], false).slice(0, n).sort(byNo);
  const bestOverallM = sortM(monthsNow, (m) => m.luck.overall).slice(0, 3).sort(byNo);
  const lowOverallM = sortM(monthsNow, (m) => m.luck.overall, false).slice(0, 2).sort(byNo);
  const stemsOf = (el) => STEMS.filter((s) => STEM_ELEMENT[s] === el).map((s) => `${s}(${STEM_KO[s]})`).join('·');

  const dAll = R.daeunAll || [];
  const dNow = dAll.find((d) => d.isNow);
  const rank = (d) => d.luck.overall * 10 + (d.luck.hasNeed ? 3 : 0) + (d.luck.hasYong ? 2 : 0) - (d.luck.hasGi ? 1 : 0) - (d.luck.isGong ? 1 : 0);
  const dSpan = (d) => `${d.age}~${d.age + 9}세 ${d.stem}${d.branch} 대운(${d.startYear}~${d.endYear})`;
  const dFuture = dAll.filter((d) => !d.past).sort((a, b) => rank(b) - rank(a));
  const dBestAll = [...dAll].sort((a, b) => rank(b) - rank(a))[0];
  const dBestFuture = dFuture[0];
  const dBestCat = (cat) => [...dAll].filter((d) => !d.past).sort((a, b) => b.luck.scores[cat] - a.luck.scores[cat] || a.age - b.age)[0];

  const spouseGroup = meta.gender === '여' ? '관성' : '재성';
  const spouseWord = meta.gender === '여' ? '관성(남편·연인의 별)' : '재성(아내·연인의 별)';
  const sinsalNames = uniq(order.flatMap((k) => (sinsal[k] || []).map((x) => x.name)));
  const sinsalWhere = (n) => order.filter((k) => (sinsal[k] || []).some((x) => x.name === n)).map((k) => ({ year: '년주', month: '월주', day: '일주', time: '시주' }[k])).join('·');
  const goodSal = sinsalNames.filter((n) => GOOD_SAL.includes(n) && K.SINSAL[n]);
  const keywords = (R.keywords || []).filter((k) => k && !KW_JUNK.test(k)).slice(0, 6);
  const catScoreChips = (l) => K.CATS.map((c) => ({ label: `${c} ${l.scores[c]}/5`, tone: scoreTone(l.scores[c]) }));

  // ---- 연·월 공통: 이유와 주의 ----
  const reasonsFor = (g, cat) => {
    const r = [];
    if (cat === '직장') { if (hasG(g, '관성')) r.push('관성(자리·발령·합격)'); if (hasG(g, '인성')) r.push('인성(자격·서류·추천)'); if (hasG(g, '식상')) r.push('식상(면접·표현력)'); }
    if (cat === '금전') { if (hasG(g, '재성')) r.push('재성(수입·계약)'); if (hasG(g, '식상')) r.push('식상생재(만든 것이 돈이 됨)'); if (hasG(g, '관성')) r.push('관성(급여·직위)'); }
    if (cat === '연애') { if (hasG(g, spouseGroup)) r.push(`${spouseWord} 등장`); if (g.sal === '년살') r.push('도화(매력·만남)'); if (hasFlag(g, '합', 'day')) r.push('일지 합(인연이 맺어짐)'); }
    if (cat === '결혼') { if (hasG(g, spouseGroup)) r.push(`${spouseWord} 등장`); if (hasFlag(g, '합', 'day')) r.push('일지(배우자궁) 합·결합의 기운'); if (hasG(g, '관성') && spouseGroup !== '관성') r.push('관성(약속·책임)'); if (hasG(g, '재성') && spouseGroup !== '재성') r.push('재성(살림·현실 기반)'); if (g.sal === '년살') r.push('도화(인연 활발)'); }
    if (cat === '도전') { if (hasG(g, '식상')) r.push('식상(새 일을 벌이는 힘)'); if (hasG(g, '비겁')) r.push('비겁(추진력)'); if (STAGE_UP.includes(g.stage)) r.push(`12운성 ${g.stage}(오르는 기운)`); if (hasG(g, '재성')) r.push('재성(결과가 손에 잡힘)'); }
    if (g.luck.hasNeed) r.push(`조후 ${needEl}(${ko[needEl]}) 충족`);
    if (g.luck.hasYong) r.push(`용신 ${y.el}(${ko[y.el]}) 유입`);
    return uniq(r);
  };
  const cautionsFor = (g) => uniq([hasFlag(g, '충', 'day') ? '일지 충' : null, hasFlag(g, '원진') ? '원진' : null, g.luck.hasGi ? `기신 ${y.gi}` : null, g.luck.isGong ? '공망' : null, g.samjae ? '삼재' : null]);
  const cautionWeight = (g) => (g.samjae ? 0.9 : 0) + (hasFlag(g, '충', 'day') ? 0.7 : 0) + (hasFlag(g, '원진') ? 0.5 : 0) + (g.luck.hasGi ? 0.5 : 0) + (g.luck.isGong ? 0.3 : 0);
  const scoreOf = (g, key) => (key ? g.luck.scores[key] : g.luck.overall);
  const yearCard = (yy, cat, key) => {
    const ms = (R.monthsOf(yy.year) || []).filter((m) => yy.year !== nowY || m.monthNo >= nowM);
    const val = (m) => scoreOf(m, key) + reasonsFor(m, cat).length * 0.6 - cautionWeight(m);
    const strongM = sortM(ms, val).filter((m) => reasonsFor(m, cat).length || scoreOf(m, key) >= 4).slice(0, 3);
    const top = (strongM.length ? strongM : sortM(ms, val).slice(0, 2)).sort(byNo);
    const avoid = ms.filter((m) => cautionsFor(m).length && scoreOf(m, key) <= 2).slice(0, 2);
    const why = reasonsFor(yy, cat);
    return {
      year: yy.year, text: yy.text, age: yy.age, score: scoreOf(yy, key),
      why: (why.length ? `${why.join(', ')}. ` : '') + first(yy.luck.texts[key || '직장']),
      dyn: yy.dyn ? { helps: yy.dyn.helps.slice(0, 2).map((h) => h.title), hurts: yy.dyn.hurts.slice(0, 2).map((h) => h.title) } : null,
      months: top.map((m) => ({ no: m.monthNo, text: m.text, score: scoreOf(m, key), why: reasonsFor(m, cat).join(', ') || (strongM.length ? '흐름이 높은 달' : '이 해 안에서는 상대적으로 나은 달'), event: eventFor({ g: m, cat: cat || '종합', ctx: ectx, range: monthRange(yy.year, m.monthNo) }), expert: (R.monthExpert ? R.monthExpert(yy.year, m.monthNo) : []).filter((r) => !cat || r.cat === cat || r.cat === '운').slice(0, 2).map((r) => r.outs[0]).filter(Boolean) })),
      expert: (R.yearClaimsFor ? R.yearClaimsFor(yy.year) : []).filter((r) => !cat || r.cat === cat || r.cat === '운').slice(0, 3).map((r) => ({ label: r.label, out: r.outs[0] || '', pol: r.pol, time: r.times?.[0] || '' })),
      story: eventFor({ g: yy, cat: cat || '종합', ctx: ectx, span: '년' }),
      weak: scoreOf(yy, key) < 3,
      avoid: avoid.map((m) => `${m.monthNo}월(${cautionsFor(m).join('·')})`),
      cautions: cautionsFor(yy),
      note: yy.year === nowY ? '남은 달 기준' : null,
    };
  };
  // 올해·내년·내후년 세 해는 항상 보여 주고(각 해의 좋은 달), 세 해 모두 약하면 뒤 연도 하나를 참고로 덧붙인다
  const rankOf = (yy, cat, key) => scoreOf(yy, key) + reasonsFor(yy, cat).length * 0.7 - cautionWeight(yy);
  const pickYears = (cat, key) => {
    const near = years.filter((yy) => yy.year <= NEAR_END).map((yy) => ({ yy, far: false }));
    const strong = near.some(({ yy }) => scoreOf(yy, key) >= 4 && cautionWeight(yy) < 1.2);
    if (!strong) { const far = years.filter((yy) => yy.year > NEAR_END).sort((a, b) => rankOf(b, cat, key) - rankOf(a, cat, key) || a.year - b.year)[0]; if (far) near.push({ yy: far, far: true }); }
    return near;
  };
  const timelineOf = (cat, key) => pickYears(cat, key).map(({ yy, far }) => ({ ...yearCard(yy, cat, key), far }));
  const bestOf = (tl) => [...tl].sort((a, b) => (b.score - cautionWeight(years.find((yy) => yy.year === b.year) || { luck: {} })) - (a.score - cautionWeight(years.find((yy) => yy.year === a.year) || { luck: {} })) || a.year - b.year)[0];
  const leadOf = (tl, label) => {
    const near = tl.filter((c) => !c.far), farOnes = tl.filter((c) => c.far);
    const b = bestOf(near); if (!b) return `${label} 흐름을 계산할 해가 없어요.`;
    const list = near.map((c) => `${c.year}년 ${c.score}/5`).join(' · ');
    if (b.score >= 4) return `올해·내년·내후년(${list}) 중에서는 ${b.year}년(${b.text})에 ${label}이 가장 강해요. 세 해 각각 어떤 달이 좋은지 아래에 정리했어요.`;
    if (farOnes.length) return `올해·내년·내후년(${list})에는 ${label}이 뚜렷하게 열리는 해가 없어요. 냉정하게 보면 이 3년은 준비 기간이고, 그중에서는 ${b.year}년(${b.text})이 상대적으로 나아요. 참고로 ${farOnes.map((c) => `${c.year}년(${c.score}/5)`).join('·')}에 흐름이 크게 열려요.`;
    return `올해·내년·내후년(${list})에는 아주 강한 해는 없고 ${b.year}년(${b.text})이 상대적으로 나아요. 각 해의 좋은 달을 골라 움직이세요.`;
  };
  const chipsOf = (tl) => tl.map((c) => ({ label: `${c.year}년 ${c.text} ${c.score}/5`, tone: scoreTone(c.score) }));

  const items = [];

  // 1. 올해 운의 흐름
  if (thisYear) {
    const l = thisYear.luck;
    const bestCat = K.CATS.reduce((a, c) => (l.scores[c] > l.scores[a] ? c : a), K.CATS[0]);
    const worstCat = K.CATS.reduce((a, c) => (l.scores[c] < l.scores[a] ? c : a), K.CATS[0]);
    items.push({
      id: 'year', icon: '🔮', q: '올해 내 운의 흐름은?',
      lead: `${nowY}년 ${thisYear.text}년은 종합 ${l.overall}/5 — ${l.head}이 한 해의 주제예요.`,
      chips: catScoreChips(l),
      paras: [
        ...l.summary.slice(0, 3),
        months.length ? `${remaining.length && remaining.length < 12 ? '남은 달로 보면' : '달로 보면'} ${mList(bestOverallM)}에 흐름이 가장 좋고, ${mList(lowOverallM)}에는 속도를 늦추고 지키는 쪽이 좋아요. 지금 ${nowM}월은 ${months[nowM - 1]?.luck.head || ''} 흐름이에요.` : null,
        `가장 좋은 영역은 ${bestCat}운, 신경 쓸 영역은 ${worstCat}운이에요. ${first(l.texts[bestCat])}`,
        ...(R.yearExpert?.now ? yearExpertOverview(R.yearExpert.now).paras.slice(0, 2) : []),
        R.yearExpert?.now?.months?.length ? `전문가들이 ${nowY}년에 짚은 달: ${R.yearExpert.now.months.slice(0, 6).map((m) => `${m.mk}(${m.labels.map((x) => x.label).join('·') || '언급'})`).join(', ')}.` : null,
      ].filter(Boolean),
    });
  }

  // 2. 연애운
  {
    const tl = timelineOf('연애', '연애');
    const bestD = dBestCat('연애');
    items.push({
      id: 'love', icon: '❤️', q: '내 연애운은 언제 강해질까?', cat: '연애',
      lead: leadOf(tl, '연애운'), chips: chipsOf(tl), timeline: tl,
      paras: [
        R.cats.연애?.personal?.[0]?.paras?.slice(0, 2).join(' '),
        first(S.love || ''),
        `${spouseWord}이 운으로 들어오거나 일지(배우자 자리)와 합이 되는 해·달에 인연이 구체적으로 나타나요. 올해는 ${months.length ? `${mList(topM('연애', 3))}이 연애운이 높아요` : '월 흐름을 계산할 수 없어요'}.`,
        bestD ? `긴 흐름으로는 ${dSpan(bestD)}이 연애·결혼 인연에 가장 유리한 10년이에요.` : null,
        R.cats.연애?.worst ? `반대로 ${R.cats.연애.worst.year}년(${R.cats.연애.worst.text})은 관계가 흔들리기 쉬운 해라 다툼과 성급한 결정을 조심하세요.` : null,
      ].filter(Boolean),
    });
  }

  // 3. 결혼운
  {
    const tl = timelineOf('결혼', '연애');
    const lv = prof.level(spouseGroup);
    const shake = years.filter((yy) => hasFlag(yy, '충', 'day')).slice(0, 2);
    const bestD = dBestCat('연애');
    items.push({
      id: 'marriage', icon: '💍', q: '결혼운이 강해지는 시기는 언제일까?', cat: '연애',
      lead: leadOf(tl, '결혼 인연'), chips: chipsOf(tl), timeline: tl,
      paras: [
        `배우자 자리인 일지 ${dayBranch}(${BRANCH_ANIMAL[dayBranch]})로 보면 인연은 "${D.SPOUSE[dayBranch] || ''}"`,
        lv === '무' ? `원국에 ${spouseWord}이 없어 인연은 운에서 들어올 때 뚜렷해져요. 위 연도 카드처럼 배우자 별이 들어오는 해·달을 놓치지 마세요.` : lv === '강' ? `원국에 ${spouseWord}이 많아 인연은 잦지만 "고르는 것"이 과제예요. 배우자 별이 아닌 일지 합·관성(약속)의 해가 오히려 결혼으로 이어지기 쉬워요.` : `원국에 ${spouseWord}이 적당히 있어 배우자 별이 운으로 들어오는 해에 만남이 결혼으로 이어지기 쉬워요.`,
        shake.length ? `${yList(shake)}은 세운이 일지와 충해 배우자궁이 흔들리는 해예요 — 결혼·이별·동거 변화 양쪽으로 움직이니 이 해의 결정은 좋은 달에 몰아서 하세요.` : `앞으로 9년 안에 일지와 충하는 해는 없어 배우자궁이 비교적 안정적이에요.`,
        bestD ? `대운으로는 ${dSpan(bestD)}이 결혼에 가장 유리한 10년이에요.` : null,
      ].filter(Boolean),
    });
  }

  // 4. 직업
  {
    const jobs = uniq([...(P.JOBS[prof.dominant] || []), ...(P.JOBS[prof.second] || []), ...(gy.career || [])]).slice(0, 8);
    const gauge = R.cats.직장?.gauge;
    const style = gauge ? (gauge.value >= 60 ? '혼자 판을 짜고 책임지는 독립형' : gauge.value <= 40 ? '조직 안에서 자리를 키워 가는 조직형' : '조직과 독립을 오갈 수 있는 유연형') : '';
    items.push({
      id: 'job', icon: '🧭', q: '나에게 가장 잘 맞는 직업은?',
      lead: `${gy.key} — "${gy.tag}". ${jobs.slice(0, 3).join(', ')} 쪽이 격에 맞아요.`,
      chips: jobs.map((j) => ({ label: j, tone: 'good' })),
      paras: [
        R.cats.직장?.personal?.[0]?.paras?.slice(0, 2).join(' '),
        `${first(gy.desc)} ${gy.strength}`,
        prof.dominant ? `십성으로는 ${prof.dominant}이 가장 두드러져 ${first(K.GROUP_DESC[prof.dominant] || '')} ${style ? `일하는 방식은 ${style}(${gauge.value}%)이에요.` : ''}` : null,
        `용신 ${y.el}(${ko[y.el]})의 직업군 — ${D.YONG[y.el].job} — 은 일하면서 스스로 균형을 잡게 해 주는 분야예요.`,
        gy.advice,
      ].filter(Boolean),
    });
  }

  // 5. 재물운
  {
    const tl = timelineOf('금전', '금전');
    const bestD = dBestCat('금전');
    const moneySec = R.cats.금전?.sections?.[0]?.paras?.[0];
    items.push({
      id: 'money', icon: '💰', q: '재물운이 강해지는 시기는 언제일까?', cat: '금전',
      lead: leadOf(tl, '재물운'), chips: chipsOf(tl), timeline: tl,
      paras: [
        R.cats.금전?.personal?.[0]?.paras?.slice(0, 2).join(' '),
        moneySec ? first(moneySec) : null,
        `재성(재물의 별)이 들어오는 해·달에 수입·계약·투자가 구체화되고, 식상 운은 만든 것이 돈으로 바뀌는 흐름이에요. 올해는 ${months.length ? `${mList(topM('금전', 3))}에 돈이 움직이기 쉽고 ${mList(lowM('금전', 2))}은 지출·손재를 조심할 달이에요` : '월 흐름을 계산할 수 없어요'}.`,
        bestD ? `크게 보면 ${dSpan(bestD)}이 재물 흐름이 가장 좋은 10년이에요.` : null,
        y.gi === D.GEN_OF[D.GEN_OF[STEM_ELEMENT[dayStem]]] ? `재성 오행 ${y.gi}이 이 사주의 기신이라 돈을 좇을수록 균형이 깨지기 쉬워요. 돈은 결과로 따라오게 하세요.` : null,
      ].filter(Boolean),
    });
  }

  // 6. 장점과 약점
  {
    const missTxt = missing.length ? `없는 오행 ${missing.map((m) => `${m}(${ko[m]})`).join('·')}은 ${missing.map((m) => K.ELEMENTS[m]?.remedy).filter(Boolean).join(', ')}로 채우면 약점이 덜 드러나요.` : '다섯 오행을 모두 갖춰 어느 한쪽으로 크게 치우치지 않아요.';
    items.push({
      id: 'traits', icon: '🧠', q: '내가 타고난 장점과 약점은?',
      lead: `${S.title || dayStem} 일간의 ${R.strength.label} 사주 — 장점은 "${first(S.strengths || '')}"`,
      chips: keywords.map((k) => ({ label: k, tone: 'gray' })),
      paras: [`장점 — ${S.strengths || ''} ${gy.strength || ''}`, `약점 — ${S.cautions || ''} ${gy.weakness || ''}`, `${R.strengthProfile.headline}. ${R.strengthProfile.traits}`, `${R.strengthProfile.personal}`, missTxt].filter(Boolean),
    });
  }

  // 7. 올해 조심할 시기
  if (thisYear) {
    const reasons = (m) => uniq([
      hasFlag(m, '충', 'day') ? '일지와 충(거처·건강·관계 변동)' : null,
      hasFlag(m, '충') && !hasFlag(m, '충', 'day') ? '원국과 충(일정·계획이 흔들림)' : null,
      hasFlag(m, '원진') ? '원진(오해와 감정 소모)' : null,
      m.luck.hasGi ? `기신 ${y.gi}(판단이 흐려지기 쉬움)` : null,
      m.branchGod === '편관' ? '편관(압박·사고·건강 주의)' : null,
      m.luck.isGong ? '공망(기대만큼 손에 잡히지 않음)' : null,
      m.luck.scores.건강 <= 2 ? '건강 점수 낮음' : null,
    ]);
    const risky = sortM(monthsNow, (m) => m.luck.overall, false).filter((m) => reasons(m).length || m.luck.overall <= 2).slice(0, 3).sort(byNo);
    items.push({
      id: 'caution', icon: '⚠️', q: '올해 조심해야 할 시기는?',
      lead: risky.length ? `${nowY}년에는 ${mList(risky)}을 특히 조심하세요.${thisYear.samjae ? ' 올해는 삼재에 해당해 무리한 확장을 피하는 해예요.' : ''}` : `${nowY}년은 크게 조심할 달이 두드러지지 않아요.${thisYear.samjae ? ' 다만 삼재에 해당해 무리한 확장은 피하세요.' : ''}`,
      chips: risky.map((m) => ({ label: `${m.monthNo}월 ${m.text}`, tone: 'bad' })),
      paras: [
        ...risky.map((m) => `${m.monthNo}월(${m.text}) — ${reasons(m).join(', ') || '전반적으로 낮은 흐름'}. ${first(m.luck.texts.건강)}`),
        hasFlag(thisYear, '충', 'day') ? '올해 세운 지지가 일지와 충해 한 해 전체로 거처·배우자·건강 영역의 변화가 있어요. 큰 결정은 좋은 달에 몰아서 하세요.' : null,
        thisYear.luck.hasGi ? `올해는 기신 ${y.gi}(${ko[y.gi]})이 들어와 잘 풀리는 와중에도 판단이 흐려질 수 있어요. 계약·투자는 확인을 두 번.` : null,
        `건강은 ${K.ELEMENTS[y.gi]?.organ || '기신 오행의 장부'} 쪽을 살피고, 낮은 달에는 새 판보다 정리에 집중하세요.`,
      ].filter(Boolean),
    });
  }

  // 8. 인생의 상승기
  {
    const need = R.climate?.timing?.daeun || [];
    const peakY = [...years].sort((a, b) => b.luck.overall - a.luck.overall || a.year - b.year).slice(0, 2).sort((a, b) => a.year - b.year);
    const tl = peakY.map((yy) => yearCard(yy, null, null));
    items.push({
      id: 'rise', icon: '📈', q: '내 인생의 상승기는 언제일까?',
      lead: dBestFuture ? `${dSpan(dBestFuture)}이 앞으로 가장 크게 올라가는 10년이에요 (${dBestFuture.luck.overall}/5). 가까운 해로는 ${peakY.map((yy) => `${yy.year}년`).join('·')}이 도약의 해예요.` : '대운 정보가 없어요.',
      chips: [...(dBestFuture ? [{ label: `${dBestFuture.age}~${dBestFuture.age + 9}세 ${dBestFuture.stem}${dBestFuture.branch} 대운`, tone: 'good' }] : []), ...chipsOf(tl)],
      timeline: tl,
      paras: [
        dNow ? `지금은 ${dSpan(dNow)}, ${dNow.luck.head}이 주제인 시기예요 (${dNow.luck.overall}/5).` : null,
        dBestFuture ? first(dBestFuture.text) + (dBestFuture.luck.hasNeed ? ` 이 대운에 필요한 ${needEl}(${ko[needEl]})이 들어와 웅크렸던 힘이 밖으로 드러나요.` : dBestFuture.luck.hasYong ? ` 용신 ${y.el}이 들어와 균형이 잡히는 대운이에요.` : '') : null,
        dBestAll && dBestAll.past ? `이미 지나온 ${dSpan(dBestAll)}이 전체 중 가장 높았고, 앞으로는 ${dBestFuture ? dSpan(dBestFuture) : '현재 대운'}이 두 번째 상승기예요.` : null,
        need.length ? `조후로 보면 ${need.map((d) => `${d.startYear}년(${d.age}세) ${d.text} 대운`).join(', ')}에 얼어 있던 기운이 풀려 크게 움직여요.` : `조후로 필요한 ${needEl}(${ko[needEl]})이 대운으로 크게 오지는 않아 세운·월운에서 ${needEl}이 오는 때를 잡는 편이에요.`,
      ].filter(Boolean),
    });
  }

  // 9. 가장 강한 장점
  {
    const ilju = P.ILJU[pillars.day.text];
    items.push({
      id: 'best', icon: '✨', q: '내 사주에서 가장 강한 장점은?',
      lead: `${prof.dominant ? `${prof.dominant}의 힘` : '균형'}과 ${strongest}(${ko[strongest]}) 기운 — ${gy.tag}`,
      chips: uniq([prof.dominant, `${strongest}(${ko[strongest]}) 강함`, gy.key, ...goodSal.slice(0, 3)]).map((k) => ({ label: k, tone: 'good' })),
      paras: [
        prof.dominant ? `${K.GROUP_DESC[prof.dominant] || ''}` : null,
        `오행 중 ${strongest}(${ko[strongest]})이 가장 강해 ${({ 木: '시작하고 키우는 추진력', 火: '표현하고 밝히는 열정', 土: '중심을 잡고 버티는 신뢰', 金: '정리하고 완성하는 결단력', 水: '살피고 흐르는 지혜' })[strongest]}이 이 사주의 무기예요.`,
        ilju ? `일주 ${pillars.day.text}, "${ilju.img}" — ${ilju.pos}` : null,
        goodSal.length ? goodSal.slice(0, 3).map((n) => `${sinsalWhere(n)}에 ${K.SINSAL[n].title}이 있어 ${first(K.SINSAL[n].text)}`).join(' ') : null,
        gy.strength,
      ].filter(Boolean),
    });
  }

  // 10. 이사운
  if (thisYear) {
    const moveSig = uniq([
      hasFlag(thisYear, '충', 'day') ? '세운이 일지와 충(거처 변동)' : null,
      hasFlag(thisYear, '충', 'year') ? '세운이 년지와 충(터전 변화)' : null,
      ['역마', '지살'].includes(thisYear.sal) ? `${thisYear.sal}(이동의 별)` : null,
      ['편인', '편재'].includes(thisYear.branchGod) ? `${thisYear.branchGod} 운(변동·확장)` : null,
    ]);
    const stay = hasFlag(thisYear, '합', 'day') || thisYear.branchGod === '정인' || thisYear.branchGod === '정관';
    const cand = monthsNow.filter((m) => ['역마', '지살'].includes(m.sal) || hasFlag(m, '충', 'day') || hasFlag(m, '충', 'year') || ['편인', '편재'].includes(m.branchGod));
    const good = cand.filter((m) => m.luck.overall >= 3 && !hasFlag(m, '원진') && !m.luck.isGong).slice(0, 4);
    const avoid = monthsNow.filter((m) => m.luck.overall <= 2 || hasFlag(m, '원진')).slice(0, 3);
    const level = moveSig.length >= 2 ? '강' : moveSig.length === 1 || good.length >= 3 ? '중' : '약';
    items.push({
      id: 'move', icon: '🏠', q: '올해 이사운은 어떨까?',
      lead: level === '강' ? `${nowY}년은 이동 기운이 뚜렷한 해예요 — ${moveSig.join(', ')}.` : level === '중' ? `${nowY}년은 해 전체로는 보통이지만 ${good.length ? `${mList(good)}에 이사·이동의 문이 열려요` : '특정 달에 기회가 있어요'}.` : `${nowY}년은 이사보다 지금 자리를 정비하는 편이 좋은 해예요.`,
      chips: [...good.map((m) => ({ label: `${m.monthNo}월 ${m.text} 좋음`, tone: 'good' })), ...avoid.map((m) => ({ label: `${m.monthNo}월 피함`, tone: 'bad' }))],
      paras: [
        moveSig.length ? `이동 신호: ${moveSig.join(', ')}. ${hasFlag(thisYear, '충', 'day') ? '일지 충은 살던 곳·함께 사는 사람에 변화가 오는 신호라 이사가 자연스럽게 따라오기 쉬워요.' : '역마·지살과 편재·편인 운은 옮기고 넓히는 기운이라 옮겨도 손해가 적어요.'}` : `올해 세운 ${thisYear.text}은 원국과 큰 충이 없고 이동의 별도 두드러지지 않아 굳이 움직일 이유가 적어요.${stay ? ' 오히려 안정(합·정인·정관)의 흐름이라 지금 자리에서 다지는 게 유리해요.' : ''}`,
        good.length ? `달로는 ${good.map((m) => `${m.monthNo}월(${m.text}${['역마', '지살'].includes(m.sal) ? `·${m.sal}` : ''}${hasFlag(m, '충', 'day') ? '·일지 충' : ''}${['편인', '편재'].includes(m.branchGod) ? `·${m.branchGod}` : ''})`).join(', ')}이 이동 기운과 운의 높이가 함께 맞아 계약·이사에 좋고, ${avoid.length ? `${mList(avoid)}은 피하세요` : '피할 달은 두드러지지 않아요'}.` : `이동 기운이 실린 달이 뚜렷하지 않아, 꼭 옮겨야 한다면 종합운이 높은 ${mList(bestOverallM)}을 고르세요.`,
        `방향은 용신 ${y.el}(${ko[y.el]})의 ${D.YONG[y.el].dir}쪽, 색은 ${D.YONG[y.el].color} 계열이 유리하고, 기신 ${y.gi}(${ko[y.gi]})의 ${D.YONG[y.gi].dir}쪽은 피하는 편이 좋아요.`,
        thisYear.samjae ? '올해는 삼재라 큰 이사·신축보다 리모델링·정리 정도가 무난해요.' : null,
      ].filter(Boolean),
    });
  }

  // 11. 취업운
  {
    const tl = timelineOf('직장', '직장');
    items.push({
      id: 'career', icon: '💼', q: '취업운이 강해지는 시기는?', cat: '직장',
      lead: leadOf(tl, '직장·취업운'), chips: chipsOf(tl), timeline: tl,
      paras: [
        `관성(자리·조직)이 들어오는 달은 지원·면접·발령이, 인성(자격·문서)이 들어오는 달은 서류·추천·시험이, 식상 달은 면접·발표의 표현력이 살아나요. 올해는 ${months.length ? `${mList(topM('직장', 3))}이 직장운이 높아요` : '월 흐름을 계산할 수 없어요'}.`,
        dNow ? `현재 ${dSpan(dNow)}의 직장운은 ${dNow.luck.scores.직장}/5 — ${first(dNow.luck.texts.직장)}` : null,
        `${gy.key}의 방향인 ${(gy.career || []).slice(0, 3).join('·')} 분야를 우선 노리고, 낮은 달에는 준비(자격·포트폴리오)에 쓰세요.`,
      ].filter(Boolean),
    });
  }

  // 12. 삶의 방향
  {
    const cl = R.climate;
    items.push({
      id: 'direction', icon: '🎯', q: '내 사주에 가장 잘 맞는 삶의 방향은?',
      lead: `"${gy.tag}" — ${D.YONG[y.el].mean}을 향해 갈 때 운이 따라오는 사주예요.`,
      chips: uniq([gy.key, `용신 ${y.el} ${D.YONG[y.el].mean.split('·')[0]}`, prof.dominant ? `${prof.dominant} 중심` : null, R.strength.label]).map((k) => ({ label: k, tone: 'good' })),
      paras: [
        `${first(S.nature || '')} ${gy.desc}`,
        `${R.strength.label} 사주라 ${R.strength.label === '신강' ? '힘을 밖으로 써야 해요 — 표현하고, 만들고, 책임지는 자리로 나가는 방향' : R.strength.label === '신약' ? '나를 채우며 가야 해요 — 배움·자격·좋은 사람 곁에서 한 가지를 깊게 하는 방향' : '완급을 조절하는 방향 — 좋은 때 과감하게, 낮은 때 지키며 가는 길'}이 맞아요.`,
        `용신 ${y.el}(${ko[y.el]})의 뜻은 ${D.YONG[y.el].mean}이에요. 진로·관계·거주지를 고를 때 이 방향(${D.YONG[y.el].job.split('·').slice(0, 3).join('·')}, ${D.YONG[y.el].dir})으로 선택하면 힘이 덜 들고, 기신 ${y.gi}(${ko[y.gi]}) 쪽(${D.YONG[y.gi].mean})으로 치우칠수록 소모가 커요.`,
        cl?.image ? `형국으로 보면 "${cl.image}"예요. ${cl.imageNote || ''} ${cl.needWhy ? `이 사주에 필요한 것은 ${cl.needWhy}이니, 그 기운을 주는 일과 사람 곁에 서세요.` : ''}` : null,
        prof.dominant ? `${prof.dominant}이 두드러진 구조라 ${D.GROUP_OPEN[prof.dominant]}` : null,
      ].filter(Boolean),
    });
  }

  // 13. 새로운 도전의 시기
  {
    const tl = timelineOf('도전', null);
    const nowGood = dNow ? reasonsFor(dNow, '도전') : [];
    const needYears = (R.climate?.timing?.years || []).slice(0, 3);
    items.push({
      id: 'challenge', icon: '🌱', q: '새로운 도전을 시작하기 좋은 시기는?',
      lead: leadOf(tl, '시작의 기운'), chips: chipsOf(tl), timeline: tl,
      paras: [
        dNow ? `지금 ${dSpan(dNow)}은 ${nowGood.length ? `${nowGood.join(', ')} — 새 판을 벌이기에 나쁘지 않은 10년이에요` : `${dNow.luck.head} 흐름이라 큰 도전보다 준비와 축적에 맞는 10년이에요`}.` : null,
        `시작에 좋은 신호는 식상(새 일을 벌이는 힘)·비겁(추진력)·12운성 장생·관대·건록·제왕, 그리고 조후 ${needEl}·용신 ${y.el} 기운이에요. 반대로 삼재·일지 충·기신 ${y.gi}이 겹치는 때는 시작보다 정리가 맞아요.`,
        R.strength.label === '신강' ? '신강한 사주는 결심하면 바로 움직여도 버틸 힘이 있어요. 다만 혼자 다 하려 하지 말고 역할을 나눠 시작하세요.' : R.strength.label === '신약' ? '신약한 사주는 준비 기간을 충분히 두고, 용신·조후 달에 "작게" 시작해 키우는 방식이 맞아요.' : '중화 사주는 시기를 잘 타는 것이 곧 실력이에요. 위 카드의 좋은 달에 첫 단추를 끼우세요.',
        needYears.length ? `조후로 보면 ${needYears.map((s) => `${s.year}년(${s.text})`).join(', ')}에 ${needEl}이 들어와 미뤄 둔 도전을 꺼내기 좋아요.` : null,
      ].filter(Boolean),
    });
  }

  // 14. 함께하면 운이 좋아지는 사람
  {
    const yukhap = BRANCH_YUKHAP.find((p) => p.includes(dayBranch))?.find((b) => b !== dayBranch);
    const samhap = (BRANCH_SAMHAP.find((g) => g.includes(dayBranch)) || []).filter((b) => b !== dayBranch);
    const goodAnimals = uniq([yukhap, ...samhap]).map((b) => `${BRANCH_ANIMAL[b]}띠(${b})`);
    const badBranches = uniq([BRANCH_CHUNG.find((p) => p.includes(dayBranch))?.find((b) => b !== dayBranch), BRANCH_WONJIN.find((p) => p.includes(dayBranch))?.find((b) => b !== dayBranch)]);
    const badAnimals = badBranches.map((b) => `${BRANCH_ANIMAL[b]}띠(${b})`);
    const heeG = y.groups?.hee, yongG = y.group;
    items.push({
      id: 'people', icon: '👥', q: '나는 어떤 사람과 함께할 때 운이 좋아질까?',
      lead: `${stemsOf(y.el)} 일간처럼 ${y.el}(${ko[y.el]}) 기운이 강한 사람, 그리고 ${PEOPLE[yongG]?.split('(')[0] || ''}이 나를 살려요.`,
      chips: uniq([`${y.el} 일간 ${stemsOf(y.el)}`, needEl !== y.el ? `${needEl} 일간 ${stemsOf(needEl)}` : null, ...goodAnimals.map((a) => `${a} 궁합`)]).map((k) => ({ label: k, tone: 'good' })),
      paras: [
        `용신 ${y.el}(${ko[y.el]})은 내게 ${D.YONG[y.el].mean}을 주는 기운이에요. ${stemsOf(y.el)} 일간인 사람 곁에서는 힘이 덜 들고 일이 풀리기 쉬워요.${needEl !== y.el ? ` 조후로 필요한 ${needEl}(${ko[needEl]}) 기운의 ${stemsOf(needEl)} 일간은 "온도"를 맞춰 주는 사람이라 오래 함께하면 편해요.` : ''}`,
        `십성으로는 ${R.strength.label === '신약' ? '나를 채워 주는 쪽' : R.strength.label === '신강' ? '내 힘을 다스리고 흘려 주는 쪽' : '균형을 잡아 주는 쪽'} — 용신 ${yongG}에 해당하는 ${PEOPLE[yongG] || ''}${heeG ? `, 희신 ${heeG}에 해당하는 ${PEOPLE[heeG] || ''}` : ''}이 좋은 인연이에요.`,
        goodAnimals.length ? `띠로는 일지 ${dayBranch}(${BRANCH_ANIMAL[dayBranch]})와 합이 되는 ${goodAnimals.join('·')} 사람이 함께 있으면 편하고 일이 맞물려요.${badAnimals.length ? ` 반대로 ${badAnimals.join('·')}은 일지와 충·원진이라 가까울수록 부딪히기 쉬워 거리와 역할을 분명히 두세요.` : ''}` : null,
        `피할 조합은 기신 ${y.gi}(${ko[y.gi]}) 기운이 강한 ${stemsOf(y.gi)} 일간과 오래 붙어 있는 것이에요. 그 곁에서는 내 안의 ${y.gi}도 함께 넘쳐요 — ${(K.ELEMENTS[y.gi]?.excess || '').split('. ').slice(1).join('. ')}`,
      ].filter(Boolean),
    });
  }

  return items;
}
