import * as K from '../data/knowledge.js';
import * as D from '../data/deep.js';
import { ELEMENT_KO, STEMS, STEM_ELEMENT, BRANCHES, BRANCH_ELEMENT } from './tables.js';

/** 개운법 — 용신·기신·조후·달력·신살·신강신약·일간별로 구체적인 실천을 만든다. */
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s || ''])[0];
const uniq = (a) => [...new Set(a.filter(Boolean))];
const POS_KO = { year: '년주', month: '월주', day: '일주', time: '시주' };

export function buildGaeun(R, data) {
  const { current, dayStem, sinsal = {}, order = [], missing = [], strongest } = data;
  const ko = ELEMENT_KO;
  const y = R.yong, needEl = R.needEl, gi = y.gi, gu = y.gu;
  const Y = D.YONG[y.el], YD = D.YONG_DETAIL[y.el], G = D.YONG[gi], GD = D.YONG_DETAIL[gi];
  const nowY = current.nowYear;
  const months = R.monthsOf(nowY) || [];
  const stemsOf = (el) => STEMS.filter((s) => STEM_ELEMENT[s] === el).join('·');
  const branchesOf = (el) => BRANCHES.filter((b) => BRANCH_ELEMENT[b] === el).join('·');
  const sections = [];

  // 1. 용신 채우기
  sections.push({
    icon: '🎨', title: `용신 ${y.el}(${ko[y.el]}) 기운 채우기`,
    chips: [{ label: `색 ${Y.color}`, tone: 'good' }, { label: `방향 ${Y.dir}`, tone: 'good' }, { label: `숫자 ${Y.num}`, tone: 'good' }, { label: `${YD.weekday}`, tone: 'good' }, { label: `${YD.time}`, tone: 'good' }],
    paras: [
      `소지품·옷차림 — ${YD.items}. 매일 몸에 닿는 것부터 ${y.el} 기운으로 바꾸는 게 가장 빠른 개운이에요.`,
      `공간 — ${YD.space}. 하루의 대부분을 보내는 자리(책상·침대 머리)를 ${Y.dir}으로 두면 좋아요.`,
      `활동 — ${YD.activity}. ${Y.habit}.`,
      `음식 — ${Y.food}. 계절로는 ${Y.season}에 힘이 붙으니 그때 새 일을 시작하세요.`,
      `마음가짐 — ${YD.mind}`,
    ],
  });

  // 2. 기신 줄이기
  sections.push({
    icon: '🚫', title: `기신 ${gi}(${ko[gi]}) 기운 줄이기`,
    chips: [{ label: `${G.color} 옷·소품 줄이기`, tone: 'bad' }, { label: `${G.dir} 장기 체류 피하기`, tone: 'bad' }, { label: `${GD.weekday}엔 큰 결정 보류`, tone: 'bad' }, { label: `구신 ${gu}(${ko[gu]})도 절제`, tone: 'gray' }],
    paras: [
      `${Y.avoid}`,
      `${gi}(${ko[gi]})이 지나친 환경 — ${GD.space.split('.')[0]} 같은 배치, ${G.food} 위주의 식단, ${GD.activity.split(',')[0]} 같은 활동 — 을 "없애기"보다 비중을 줄이세요. 이미 원국에 ${gi}이 ${data.elements[gi]}개 있어 운에서 더해질 때 균형이 깨지기 쉬워요.`,
      `건강으로는 ${K.ELEMENTS[gi].organ} 쪽이 기신 오행의 자리예요. ${gi} 운이 오는 달(아래 달력의 주의 달)에는 검진과 휴식을 앞당기세요.`,
    ],
  });

  // 3. 조후
  const cl = R.climate;
  sections.push({
    icon: '🌡️', title: `조후 — ${cl.season}에 태어난 ${ko[cl.dayEl]} 일간의 온도 맞추기`,
    chips: [{ label: `필요한 기운 ${needEl}(${ko[needEl]})`, tone: 'good' }, ...(needEl !== y.el ? [{ label: '억부 용신과 다름 — 둘 다 챙기기', tone: 'gray' }] : [{ label: '억부 용신과 일치', tone: 'good' }])],
    paras: [
      `${cl.needWhy}이 필요해요. ${D.CLIMATE_OPEN[needEl]}`,
      cl.needCount <= 1 ? `원국에 ${needEl}이 ${cl.needCount}개라 조후가 부족한 편이에요. 계절 감각을 생활로 보완하는 것이 이 사주의 핵심 개운법이고, ${needEl} 운이 오는 해·달에 미뤄 둔 일을 몰아서 하세요.` : `원국에 ${needEl}이 ${cl.needCount}개 있어 조후는 갖춘 편이에요. 무리하게 더하기보다 ${needEl} 운이 오는 때를 "속도를 내는 신호"로 쓰세요.`,
    ],
  });

  // 4. 올해 개운 달력
  const goodM = months.filter((m) => m.luck.hasNeed || m.luck.hasYong);
  const badM = months.filter((m) => m.luck.hasGi && !m.luck.hasNeed && !m.luck.hasYong);
  const mLabel = (m) => `${m.monthNo}월 ${m.text}${m.luck.hasNeed && m.luck.hasYong ? ' 조후+용신' : m.luck.hasNeed ? ' 조후' : m.luck.hasYong ? ' 용신' : ''}`;
  sections.push({
    icon: '📅', title: `${nowY}년 개운 달력`,
    chips: [...goodM.map((m) => ({ label: mLabel(m), tone: 'good' })), ...badM.map((m) => ({ label: `${m.monthNo}월 ${m.text} 기신`, tone: 'bad' }))],
    paras: [
      goodM.length ? `${goodM.map((m) => `${m.monthNo}월`).join('·')}은 용신·조후 기운이 들어오는 달이에요. 계약·이사·시작·고백·지원처럼 "첫 단추"를 이 달에 끼우면 뒤가 편해요.` : `올해는 용신·조후 기운이 정면으로 들어오는 달이 없어요. 대신 아래 요일·일진 루틴으로 매주 기운을 채우세요.`,
      badM.length ? `${badM.map((m) => `${m.monthNo}월`).join('·')}은 기신 ${gi}이 들어오는 달이라 큰 결정은 확인을 두 번, 지출과 건강은 보수적으로.` : `기신 ${gi}만 단독으로 들어오는 달은 없어 한 해 리듬이 비교적 고르게 흘러요.`,
      `매주 ${YD.weekday}과 ${stemsOf(y.el)}일·${branchesOf(y.el)}일(일진)은 작은 용신 날이에요. 이날 ${YD.time}에 중요한 미팅·결정·시작을 배치하는 습관을 들이세요.`,
    ],
  });

  // 5. 신살 다듬기
  const names = uniq(order.flatMap((k) => (sinsal[k] || []).map((x) => x.name))).filter((n) => D.SAL_REMEDY[n]).slice(0, 6);
  if (names.length) {
    const where = (n) => order.filter((k) => (sinsal[k] || []).some((x) => x.name === n)).map((k) => POS_KO[k]).join('·');
    sections.push({
      icon: '🧿', title: '신살 다듬기 — 타고난 별을 쓰는 법',
      chips: names.map((n) => ({ label: n, tone: 'gray' })),
      paras: names.map((n) => `${where(n)}의 ${K.SINSAL[n]?.title || n} — ${D.SAL_REMEDY[n]}`),
    });
  }

  // 6. 신강·신약과 격국 습관
  sections.push({
    icon: '⚖️', title: `${R.strength.label} 사주의 생활 습관`,
    paras: [D.STRENGTH_OPEN[R.strength.label], `${R.gyeok.key}의 개운 — ${R.gyeok.advice}`, R.profile.dominant ? `${R.profile.dominant}이 강한 구조의 개운 — ${D.GROUP_OPEN[R.profile.dominant]}` : null].filter(Boolean),
  });

  // 7. 오행 보완 (없는 오행·과한 오행)
  const excess = strongest && data.elements[strongest] >= 3 ? strongest : null;
  sections.push({
    icon: '🩺', title: '오행 균형 — 없는 기운 채우고 넘치는 기운 흘리기',
    chips: [...missing.map((m) => ({ label: `없음 ${m}(${ko[m]})`, tone: 'bad' })), ...(excess ? [{ label: `과함 ${excess}(${ko[excess]}) ${data.elements[excess]}개`, tone: 'gray' }] : [])],
    paras: [
      missing.length ? missing.map((m) => `${m}(${ko[m]})이 없어 ${first(K.ELEMENTS[m].lack)} 보완은 ${K.ELEMENTS[m].remedy}, ${D.YONG_DETAIL[m].items.split(',')[0]}.`).join(' ') : '다섯 오행을 모두 갖추고 있어 특별히 채울 기운은 없어요. 용신 위주로 미세 조정만 하면 돼요.',
      excess ? `${excess}(${ko[excess]})이 ${data.elements[excess]}개로 과한 편이에요. ${first(K.ELEMENTS[excess].excess)} 이 기운은 없애는 게 아니라 ${D.GEN_KO[excess]}(${excess}이 낳는 기운)으로 흘려보내야 해요 — ${D.YONG_DETAIL[D.GEN_OF[excess]].activity.split(',')[0]} 같은 활동이 출구가 돼요.` : `어느 오행도 3개 이상 몰려 있지 않아 기운의 출구를 따로 만들 필요는 적어요.`,
      `건강 관리의 우선순위는 ${missing.map((m) => K.ELEMENTS[m].organ).concat(excess ? [K.ELEMENTS[excess].organ] : []).join(' / ') || K.ELEMENTS[gi].organ}이에요.`,
    ],
  });

  // 8. 일간 맞춤 한 줄
  sections.push({ icon: '🌱', title: `${K.STEMS[dayStem]?.title || dayStem} 일간의 맞춤 개운`, paras: [D.OPEN_BY_STEM[dayStem]] });

  return sections;
}
