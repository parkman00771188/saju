import * as K from '../data/knowledge.js';
import * as P from '../data/patterns.js';
import * as D from '../data/deep.js';
import { ELEMENT_KO } from './tables.js';

/** 해석 결과(R)와 원국(data)에서 자주 묻는 질문 10개의 답을 만든다. */
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s || ''])[0];
const uniq = (a) => [...new Set(a.filter(Boolean))];
const mList = (ms) => ms.map((m) => `${m.monthNo}월`).join('·');
const yList = (ys) => ys.map((y) => `${y.year}년(${y.text})`).join(', ');
const scoreTone = (n) => (n >= 4 ? 'good' : n <= 2 ? 'bad' : 'gray');
const GOOD_SAL = ['천을귀인', '천덕귀인', '월덕귀인', '문창귀인', '학당귀인', '금여', '천주귀인', '태극귀인', '천의성', '암록', '천관귀인', '복성귀인', '건록'];
const KW_JUNK = /(일주|일간|사주|인데|태어|이라|라고|분들|같은|이런|그런|이제|그냥|정도|경우)/;

export function buildFaq(R, data) {
  const { current, meta, pillars, dayStem, sinsal = {}, order = [], missing = [], strongest } = data;
  const ko = ELEMENT_KO;
  const nowY = current.nowYear, nowM = current.nowMonth;
  const years = R.years.filter((y) => y.year >= nowY);
  const thisYear = R.years.find((y) => y.year === nowY) || years[0];
  const months = R.monthsOf(nowY) || [];
  const S = K.STEMS[dayStem] || {};
  const gy = R.gyeok, y = R.yong, prof = R.profile;
  const group = (g) => K.TEN_GOD_GROUP[g] || '';
  const godIn = (g, grp) => group(g.branchGod) === grp || group(g.stemGod) === grp;

  const sortM = (arr, val, desc = true) => [...arr].sort((a, b) => (desc ? val(b) - val(a) : val(a) - val(b)) || a.monthNo - b.monthNo);
  const topM = (cat, n = 3) => sortM(months, (m) => m.luck.scores[cat]).slice(0, n).sort((a, b) => a.monthNo - b.monthNo);
  const lowM = (cat, n = 2) => sortM(months, (m) => m.luck.scores[cat], false).slice(0, n).sort((a, b) => a.monthNo - b.monthNo);
  const topY = (cat, n = 2) => [...years].sort((a, b) => b.luck.scores[cat] - a.luck.scores[cat] || a.year - b.year).slice(0, n);
  const bestOverallM = sortM(months, (m) => m.luck.overall).slice(0, 3).sort((a, b) => a.monthNo - b.monthNo);
  const lowOverallM = sortM(months, (m) => m.luck.overall, false).slice(0, 2).sort((a, b) => a.monthNo - b.monthNo);
  const hasFlag = (g, type, pos) => (g.luck?.flags || []).some((f) => f.type === type && (!pos || f.pos === pos));

  const dAll = R.daeunAll || [];
  const dNow = dAll.find((d) => d.isNow);
  const rank = (d) => d.luck.overall * 10 + (d.luck.hasNeed ? 3 : 0) + (d.luck.hasYong ? 2 : 0) - (d.luck.hasGi ? 1 : 0) - (d.luck.isGong ? 1 : 0);
  const dSpan = (d) => `${d.age}~${d.age + 9}세 ${d.text} 대운(${d.startYear}~${d.endYear})`;
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

  const items = [];

  // 1. 올해 운의 흐름
  if (thisYear) {
    const l = thisYear.luck;
    items.push({
      id: 'year', icon: '🔮', q: '올해 내 운의 흐름은?',
      lead: `${nowY}년 ${thisYear.text}년은 종합 ${l.overall}/5 — ${l.head}이 한 해의 주제예요.`,
      chips: catScoreChips(l),
      paras: [
        ...l.summary.slice(0, 3),
        months.length ? `달로 보면 ${mList(bestOverallM)}에 흐름이 가장 좋고, ${mList(lowOverallM)}에는 속도를 늦추고 지키는 쪽이 좋아요. 지금 ${nowM}월은 ${months[nowM - 1]?.luck.head || ''} 흐름이에요.` : null,
        `가장 좋은 영역은 ${K.CATS.reduce((a, c) => (l.scores[c] > l.scores[a] ? c : a), K.CATS[0])}운, 신경 쓸 영역은 ${K.CATS.reduce((a, c) => (l.scores[c] < l.scores[a] ? c : a), K.CATS[0])}운이에요. ${first(l.texts[K.CATS.reduce((a, c) => (l.scores[c] > l.scores[a] ? c : a), K.CATS[0])])}`,
      ].filter(Boolean),
      months, cat: null,
    });
  }

  // 2. 연애운
  {
    const ys = topY('연애', 2);
    const spouseYears = years.filter((yy) => godIn(yy, spouseGroup)).slice(0, 3);
    const tm = topM('연애', 3);
    const dohwaM = months.filter((m) => m.sal === '년살');
    const bestD = dBestCat('연애');
    items.push({
      id: 'love', icon: '❤️', q: '내 연애운은 언제 강해질까?',
      lead: ys.length ? `가까운 해 중에는 ${yList(ys)}에 연애운이 가장 강해요 (${ys[0].luck.scores.연애}/5).` : '연애운 흐름을 계산할 해가 없어요.',
      chips: [...ys.map((yy) => ({ label: `${yy.year}년 ${yy.luck.scores.연애}/5`, tone: scoreTone(yy.luck.scores.연애) })), ...(tm.length ? [{ label: `올해 ${mList(tm)}`, tone: 'good' }] : [])],
      paras: [
        first(S.love || ''),
        spouseYears.length ? `${spouseWord}이 운으로 들어오는 ${yList(spouseYears)}에 인연이 구체적으로 나타나기 쉬워요. ${ys[0] ? first(ys[0].luck.texts.연애) : ''}` : `앞으로 9년 안에 ${spouseWord}이 정면으로 들어오는 해는 없어 큰 흐름보다 달 단위의 기회를 잡는 편이에요.`,
        tm.length ? `올해는 ${mList(tm)}에 연애운이 높고${dohwaM.length ? `, 특히 ${mList(dohwaM)}은 도화(년살)가 들어와 이성의 눈에 띄는 달이에요` : ''}.` : null,
        bestD ? `긴 흐름으로는 ${dSpan(bestD)}이 연애·결혼 인연에 가장 유리한 10년이에요.` : null,
        R.cats.연애?.worst ? `반대로 ${R.cats.연애.worst.year}년(${R.cats.연애.worst.text})은 관계가 흔들리기 쉬운 해라 다툼과 성급한 결정을 조심하세요.` : null,
      ].filter(Boolean),
      months, cat: '연애',
    });
  }

  // 3. 직업
  {
    const jobs = uniq([...(P.JOBS[prof.dominant] || []), ...(P.JOBS[prof.second] || []), ...(gy.career || [])]).slice(0, 8);
    const gauge = R.cats.직장?.gauge;
    const style = gauge ? (gauge.value >= 60 ? '혼자 판을 짜고 책임지는 독립형' : gauge.value <= 40 ? '조직 안에서 자리를 키워 가는 조직형' : '조직과 독립을 오갈 수 있는 유연형') : '';
    items.push({
      id: 'job', icon: '🧭', q: '나에게 가장 잘 맞는 직업은?',
      lead: `${gy.key} — "${gy.tag}". ${jobs.slice(0, 3).join(', ')} 쪽이 격에 맞아요.`,
      chips: jobs.map((j) => ({ label: j, tone: 'good' })),
      paras: [
        `${first(gy.desc)} ${gy.strength}`,
        prof.dominant ? `십성으로는 ${prof.dominant}이 가장 두드러져 ${first(K.GROUP_DESC[prof.dominant] || '')} ${style ? `일하는 방식은 ${style}(${gauge.value}%)이에요.` : ''}` : null,
        `용신 ${y.el}(${ko[y.el]})의 직업군 — ${D.YONG[y.el].job} — 은 일하면서 스스로 균형을 잡게 해 주는 분야예요.`,
        gy.advice,
      ].filter(Boolean),
    });
  }

  // 4. 재물운
  {
    const ys = topY('금전', 2);
    const jaeYears = years.filter((yy) => godIn(yy, '재성')).slice(0, 3);
    const tm = topM('금전', 3);
    const bestD = dBestCat('금전');
    const moneySec = R.cats.금전?.sections?.[0]?.paras?.[0];
    items.push({
      id: 'money', icon: '💰', q: '재물운이 강해지는 시기는 언제일까?',
      lead: ys.length ? `${yList(ys)}에 재물운이 가장 강해요 (${ys[0].luck.scores.금전}/5).` : '재물운 흐름을 계산할 해가 없어요.',
      chips: [...ys.map((yy) => ({ label: `${yy.year}년 ${yy.luck.scores.금전}/5`, tone: scoreTone(yy.luck.scores.금전) })), ...(tm.length ? [{ label: `올해 ${mList(tm)}`, tone: 'good' }] : [])],
      paras: [
        moneySec ? first(moneySec) : null,
        jaeYears.length ? `재성(재물의 별)이 들어오는 ${yList(jaeYears)}에 수입·계약·투자 기회가 구체화돼요. ${ys[0] ? first(ys[0].luck.texts.금전) : ''}` : `앞으로 9년 안에 재성이 정면으로 들어오는 해는 없어, ${prof.dominant === '식상' ? '식상(재능·생산)으로 벌어 재성으로 잇는 흐름' : '용신 운에 맞춰 준비한 것을 수입으로 바꾸는 흐름'}이 열쇠예요.`,
        tm.length ? `올해는 ${mList(tm)}에 돈이 움직이기 쉽고, ${mList(lowM('금전', 2))}은 지출·손재를 조심할 달이에요.` : null,
        bestD ? `크게 보면 ${dSpan(bestD)}이 재물 흐름이 가장 좋은 10년이에요.` : null,
      ].filter(Boolean),
      months, cat: '금전',
    });
  }

  // 5. 장점과 약점
  {
    const missTxt = missing.length ? `없는 오행 ${missing.map((m) => `${m}(${ko[m]})`).join('·')}은 ${missing.map((m) => K.ELEMENTS[m]?.remedy).filter(Boolean).join(', ')}로 채우면 약점이 덜 드러나요.` : '다섯 오행을 모두 갖춰 어느 한쪽으로 크게 치우치지 않아요.';
    items.push({
      id: 'traits', icon: '🧠', q: '내가 타고난 장점과 약점은?',
      lead: `${S.title || dayStem} 일간의 ${R.strength.label} 사주 — 장점은 "${first(S.strengths || '')}"`,
      chips: keywords.map((k) => ({ label: k, tone: 'gray' })),
      paras: [
        `장점 — ${S.strengths || ''} ${gy.strength || ''}`,
        `약점 — ${S.cautions || ''} ${gy.weakness || ''}`,
        first(R.overview?.[1] || ''),
        missTxt,
      ].filter(Boolean),
    });
  }

  // 6. 올해 조심할 시기
  if (thisYear) {
    const reasons = (m) => uniq([
      hasFlag(m, '충', 'day') ? '일지와 충 — 거처·건강·관계 변동' : null,
      hasFlag(m, '충') && !hasFlag(m, '충', 'day') ? '원국과 충 — 일정·계획이 흔들림' : null,
      hasFlag(m, '원진') ? '원진 — 오해와 감정 소모' : null,
      m.luck.hasGi ? `기신 ${y.gi} — 판단이 흐려지기 쉬움` : null,
      m.branchGod === '편관' ? '편관 — 압박·사고·건강 주의' : null,
      m.luck.isGong ? '공망 — 기대만큼 손에 잡히지 않음' : null,
      m.luck.scores.건강 <= 2 ? '건강 점수 낮음' : null,
    ]);
    const risky = sortM(months, (m) => m.luck.overall, false).filter((m) => reasons(m).length || m.luck.overall <= 2).slice(0, 3).sort((a, b) => a.monthNo - b.monthNo);
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
      months, cat: '건강',
    });
  }

  // 7. 인생의 상승기
  {
    const need = R.climate?.timing?.daeun || [];
    const peakY = [...years].sort((a, b) => b.luck.overall - a.luck.overall || a.year - b.year).slice(0, 2);
    items.push({
      id: 'rise', icon: '📈', q: '내 인생의 상승기는 언제일까?',
      lead: dBestFuture ? `${dSpan(dBestFuture)}이 앞으로 가장 크게 올라가는 10년이에요 (${dBestFuture.luck.overall}/5).` : '대운 정보가 없어요.',
      chips: [...(dBestFuture ? [{ label: `${dBestFuture.age}~${dBestFuture.age + 9}세 ${dBestFuture.text}`, tone: 'good' }] : []), ...peakY.map((yy) => ({ label: `${yy.year}년 ${yy.luck.overall}/5`, tone: scoreTone(yy.luck.overall) }))],
      paras: [
        dNow ? `지금은 ${dSpan(dNow)}, ${dNow.luck.head}이 주제인 시기예요 (${dNow.luck.overall}/5).` : null,
        dBestFuture ? first(dBestFuture.text) + (dBestFuture.luck.hasNeed ? ` 이 대운에 필요한 ${R.needEl}(${ko[R.needEl]})이 들어와 웅크렸던 힘이 밖으로 드러나요.` : dBestFuture.luck.hasYong ? ` 용신 ${y.el}이 들어와 균형이 잡히는 대운이에요.` : '') : null,
        dBestAll && dBestAll.past ? `이미 지나온 ${dSpan(dBestAll)}이 전체 중 가장 높았고, 앞으로는 ${dBestFuture ? dSpan(dBestFuture) : '현재 대운'}이 두 번째 상승기예요.` : null,
        need.length ? `조후로 보면 ${need.map((d) => `${d.startYear}년(${d.age}세) ${d.text} 대운`).join(', ')}에 얼어 있던 기운이 풀려 크게 움직여요.` : `조후로 필요한 ${R.needEl}(${ko[R.needEl]})이 대운으로 크게 오지는 않아 세운·월운에서 ${R.needEl}이 오는 때를 잡는 편이에요.`,
        peakY.length ? `가까운 해로는 ${yList(peakY)}이 종합운이 높아 도약의 해로 삼기 좋아요.` : null,
      ].filter(Boolean),
    });
  }

  // 8. 가장 강한 장점
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

  // 9. 이사운
  if (thisYear) {
    const moveSig = uniq([
      hasFlag(thisYear, '충', 'day') ? '세운이 일지와 충(거처 변동)' : null,
      hasFlag(thisYear, '충', 'year') ? '세운이 년지와 충(터전 변화)' : null,
      ['역마', '지살'].includes(thisYear.sal) ? `${thisYear.sal}(이동의 별)` : null,
      ['편인', '편재'].includes(thisYear.branchGod) ? `${thisYear.branchGod} 운(변동·확장)` : null,
    ]);
    const stay = hasFlag(thisYear, '합', 'day') || thisYear.branchGod === '정인' || thisYear.branchGod === '정관';
    const cand = months.filter((m) => ['역마', '지살'].includes(m.sal) || hasFlag(m, '충', 'day') || hasFlag(m, '충', 'year') || ['편인', '편재'].includes(m.branchGod));
    const good = cand.filter((m) => m.luck.overall >= 3 && !hasFlag(m, '원진') && !m.luck.isGong).slice(0, 4);
    const avoid = months.filter((m) => m.luck.overall <= 2 || hasFlag(m, '원진')).slice(0, 3);
    const level = moveSig.length >= 2 ? '강' : moveSig.length === 1 || good.length >= 3 ? '중' : '약';
    items.push({
      id: 'move', icon: '🏠', q: '올해 이사운은 어떨까?',
      lead: level === '강' ? `${nowY}년은 이동 기운이 뚜렷한 해예요 — ${moveSig.join(', ')}.` : level === '중' ? `${nowY}년은 해 전체로는 보통이지만 ${good.length ? `${mList(good)}에 이사·이동의 문이 열려요` : '특정 달에 기회가 있어요'}.` : `${nowY}년은 이사보다 지금 자리를 정비하는 편이 좋은 해예요.`,
      chips: [...good.map((m) => ({ label: `${m.monthNo}월 ${m.text} 좋음`, tone: 'good' })), ...avoid.map((m) => ({ label: `${m.monthNo}월 피함`, tone: 'bad' }))],
      paras: [
        moveSig.length ? `이동 신호: ${moveSig.join(', ')}. ${hasFlag(thisYear, '충', 'day') ? '일지 충은 살던 곳·함께 사는 사람에 변화가 오는 신호라 이사가 자연스럽게 따라오기 쉬워요.' : '역마·지살과 편재·편인 운은 옮기고 넓히는 기운이라 옮겨도 손해가 적어요.'}` : `올해 세운 ${thisYear.text}은 원국과 큰 충이 없고 이동의 별도 두드러지지 않아 굳이 움직일 이유가 적어요.${stay ? ' 오히려 안정(합·정인·정관)의 흐름이라 지금 자리에서 다지는 게 유리해요.' : ''}`,
        good.length ? `달로는 ${mList(good)}이 이동 기운과 운의 높이가 함께 맞아 계약·이사에 좋고, ${avoid.length ? `${mList(avoid)}은 피하세요` : '피할 달은 두드러지지 않아요'}.` : `이동 기운이 실린 달이 뚜렷하지 않아, 꼭 옮겨야 한다면 종합운이 높은 ${mList(bestOverallM)}을 고르세요.`,
        `방향은 용신 ${y.el}(${ko[y.el]})의 ${D.YONG[y.el].dir}쪽, 색은 ${D.YONG[y.el].color} 계열이 유리하고, 기신 ${y.gi}(${ko[y.gi]})의 ${D.YONG[y.gi].dir}쪽은 피하는 편이 좋아요.`,
        thisYear.samjae ? '올해는 삼재라 큰 이사·신축보다 리모델링·정리 정도가 무난해요.' : null,
      ].filter(Boolean),
    });
  }

  // 10. 취업운
  {
    const ys = topY('직장', 2);
    const gwanYears = years.filter((yy) => godIn(yy, '관성') || godIn(yy, '인성')).slice(0, 3);
    const tm = topM('직장', 3);
    const gwanM = months.filter((m) => group(m.branchGod) === '관성');
    const insM = months.filter((m) => group(m.branchGod) === '인성');
    const siksangM = months.filter((m) => group(m.branchGod) === '식상');
    items.push({
      id: 'career', icon: '💼', q: '취업운이 강해지는 시기는?',
      lead: ys.length ? `${yList(ys)}에 직장·취업운이 가장 강해요 (${ys[0].luck.scores.직장}/5).` : '직장운 흐름을 계산할 해가 없어요.',
      chips: [...ys.map((yy) => ({ label: `${yy.year}년 ${yy.luck.scores.직장}/5`, tone: scoreTone(yy.luck.scores.직장) })), ...(tm.length ? [{ label: `올해 ${mList(tm)}`, tone: 'good' }] : [])],
      paras: [
        gwanYears.length ? `관성(자리·조직)과 인성(자격·문서)이 들어오는 ${yList(gwanYears)}에 합격·입사·승진의 문이 열려요. ${ys[0] ? first(ys[0].luck.texts.직장) : ''}` : `앞으로 9년 안에 관성·인성이 정면으로 들어오는 해는 없어, 용신 ${y.el} 운과 좋은 달을 골라 움직이는 전략이 좋아요.`,
        tm.length ? `올해는 ${mList(tm)}에 직장운이 높아요.${gwanM.length ? ` ${mList(gwanM)}은 관성 달이라 지원·면접·발령이 맞물리고,` : ''}${insM.length ? ` ${mList(insM)}은 인성 달이라 자격·서류·추천이 유리하고,` : ''}${siksangM.length ? ` ${mList(siksangM)}은 식상 달이라 면접·발표에서 표현력이 살아나요.` : ''}` : null,
        dNow ? `현재 ${dSpan(dNow)}의 직장운은 ${dNow.luck.scores.직장}/5 — ${first(dNow.luck.texts.직장)}` : null,
        `${gy.key}의 방향인 ${(gy.career || []).slice(0, 3).join('·')} 분야를 우선 노리고, 낮은 달에는 준비(자격·포트폴리오)에 쓰세요.`,
      ].filter(Boolean),
      months, cat: '직장',
    });
  }

  return items;
}
