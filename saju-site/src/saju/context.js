import pkg from 'lunar-javascript';
import * as T from './tables.js';

const { Solar } = pkg;
const SEASON = { 寅:'봄',卯:'봄',辰:'봄',巳:'여름',午:'여름',未:'여름',申:'가을',酉:'가을',戌:'가을',亥:'겨울',子:'겨울',丑:'겨울' };
const EL = { 木:'나무',火:'불',土:'흙',金:'금속',水:'물' };
const GROUP = { 비견:'비겁',겁재:'비겁',식신:'식상',상관:'식상',정재:'재성',편재:'재성',정관:'관성',편관:'관성',정인:'인성',편인:'인성' };
const ROLE = { 비겁:'주도권과 협업',식상:'표현과 결과물',재성:'현실 감각과 자원 관리',관성:'책임과 조직 생활',인성:'배움과 준비' };
const POSITION = { year:'태어난 해',month:'태어난 달',day:'나의 일상',time:'태어난 시간' };
const NATURE = { 木:['방향을 정하고 자라는 사람','새로운 목표를 세우고 꾸준히 넓혀 가는 모습'],火:['생각을 밖으로 꺼내는 사람','마음에 든 일에 몰입하고 사람들과 나누는 모습'],土:['흐름의 중심을 잡는 사람','서로 다른 요구를 조율하고 끝까지 책임지는 모습'],金:['나만의 기준을 가진 사람','복잡한 상황을 정리하고 필요한 것을 선택하는 모습'],水:['깊이 살피고 유연하게 흐르는 사람','충분히 관찰하고 상황에 맞춰 방향을 바꾸는 모습'] };
const FOCUS = { 직장:['관성','인성','식상'],금전:['재성','식상'],연애:['식상','비겁'],학업:['인성','관성'],생활:['인성','비겁'] };
const ACTION = {
  직장: ['지원·면담을 구체화해 보세요','이직이라면 지원서와 포트폴리오를 꺼내고, 내부 이동이라면 원하는 역할을 상사와 이야기해 보세요. 실제 제안의 업무 범위와 조건을 함께 비교하는 게 좋아요.','변화의 이유부터 정리해 보세요','바로 자리를 옮기기보다 지금 불편한 점과 새 자리에서 원하는 조건을 적어 보세요. 역할과 인수인계 범위를 확인하는 대화에 활용할 수 있어요.'],
  금전: ['내 결과물의 가치를 정리해 보세요','작업 단가나 보상 조건을 이야기하기 전에 내가 만든 성과를 정리해 보세요. 새 수입 기회도 비용과 계약 조건을 함께 확인해요.','수입과 지출의 구조를 살펴보세요','크게 바꾸기보다 반복되는 지출과 약속한 비용을 정리하는 시간으로 삼아 보세요.'],
  연애: ['대화의 기회를 만들어 보세요','새로운 만남이나 함께하는 활동을 가볍게 제안해 보세요. 가까운 사이일수록 서로 원하는 시간과 거리를 말로 확인하면 좋아요.','서로의 속도를 맞춰 보세요','관계를 서둘러 정의하기보다 기대하는 연락 방식과 각자의 일상을 이야기해 보세요.'],
  학업: ['준비한 것을 밖으로 확인해 보세요','모의시험, 발표, 피드백 요청처럼 배운 것을 확인하는 일정을 잡아 보세요. 결과를 보고 다음 학습 계획을 조정해요.','작게 나누어 반복해 보세요','목표를 늘리기보다 부족한 부분을 좁혀 복습하고, 실행할 수 있는 분량으로 계획을 나눠 보세요.'],
  생활: ['내 일상의 리듬을 살펴보세요','새로운 일정 사이에 쉬는 시간을 함께 확보하고, 지속하기 편한 생활 방식을 찾아보세요.','일정에 여백을 두어 보세요','해야 할 일의 우선순위를 줄이고 내 속도에 맞는 일상을 만들어 보세요. 사주로 체력이나 질병을 판단하지 않아요.'],
};
export const READING_SOURCES = [
  { title:'산책처럼 사주 · 명식을 볼 때 고려해야 하는 것들',url:'https://www.youtube.com/watch?v=47XaSRCsryw', note:'수집 자막 검토: 전체 구성 → 계절 → 자리와 뿌리 → 운의 순서' },
  { title:'산책처럼 사주 · 방합과 삼합 (추가설명)',url:'https://www.youtube.com/watch?v=42JvoBoqJF0', note:'수집 자막 검토: 운에서 세 글자가 갖춰지는 경우와 강해진 기운의 영향' },
  { title:'포춘캣 · 조후 안내',url:'https://fortunecat.co.kr/wiki/saju-johu',note:'계절과 전체 오행을 함께 보는 관점' },
  { title:'SAZU · 합과 충 안내',url:'https://www.sazu.app/fortune/guide/how-to-read-compatibility',note:'합·충을 관계와 변화의 관점으로 풀어 쓰는 방식' },
];
const gz = text => ({ text,stem:text[0],branch:text[1],stemEl:T.STEM_ELEMENT[text[0]],branchEl:T.BRANCH_ELEMENT[text[1]] });
const char = c => `${c}(${T.STEM_KO[c] || T.BRANCH_KO[c]})`;
const groupOf = (day, el) => GROUP[T.tenGod(day,T.STEMS.find(s=>T.STEM_ELEMENT[s]===el))];
const pair = (table,a,b) => table.find(([x,y]) => (x===a && y===b)||(x===b && y===a));
const elementWeights = entries => {
  const weights = Object.fromEntries(T.ELEMENTS.map(e=>[e,0]));
  entries.forEach(p=>{ const w=p.pos==='month'?1.6:1; weights[p.stemEl]+=w; const hidden=T.HIDDEN_STEMS[p.branch]; hidden.forEach((s,i)=>{ weights[T.STEM_ELEMENT[s]]+=w*(i===hidden.length-1?.7:.3/(hidden.length-1)); }); });
  return weights;
};

export function climateOf(data) {
  const entries = Object.entries(data.pillars).filter(([,p])=>p).map(([pos,p])=>({...p,pos}));
  const weights=elementWeights(entries), season=SEASON[data.pillars.month.branch];
  const temperature = ({봄:0,여름:2.5,가을:-.5,겨울:-2.5}[season]) + weights.火*.7 - weights.水*.65;
  const need = temperature < -1.2 ? '火' : temperature > 1.2 ? '水' : null;
  const state = need==='火'?'차가운 쪽에 무게가 있어요':need==='水'?'뜨거운 쪽에 무게가 있어요':'계절의 한쪽으로 크게 치우치지 않아요';
  const text = `${char(data.pillars.month.branch)}월, ${season}에 태어났어요. 계절에 다른 글자와 그 안의 기운까지 더해 보면 ${state}. ${need ? `${EL[need]} 기운은 ${need==='火'?'온기를 보태 움직임을 돕는':'지나친 열기를 조절하는'} 쪽으로 읽어요.` : '한 가지 기운을 더하는 것보다 어떤 글자와 관계를 맺는지가 더 중요해요.'}`;
  const roles = {};
  entries.forEach(p=>{
    const targets = [p.pos==='day'?null:p.stem,T.BRANCH_MAIN_STEM[p.branch]].filter(Boolean);
    targets.forEach(stem=>{ const g=GROUP[T.tenGod(data.dayStem,stem)]; roles[g]=(roles[g]||0)+(p.pos==='month'?1.6:1); });
  });
  const dominant=Object.entries(roles).sort((a,b)=>b[1]-a[1])[0]?.[0];
  return { entries,weights,season,temperature,need,state,text,dominant };
}

// Concrete positions are retained so an annual clash with the work position is
// distinguishable from a clash elsewhere. Combinations never rewrite natal elements.
export function interactions(entries, triggerIds = null) {
  const found=[];
  const add = (kind, members, el=null) => {
    if(triggerIds && !members.some(m=>triggerIds.includes(m.id))) return;
    found.push({kind,members,el,key:kind+members.map(m=>m.id+m.ch).join('-')});
  };
  for(let i=0;i<entries.length;i++) for(let j=i+1;j<entries.length;j++) {
    const a=entries[i],b=entries[j];
    const stems=[{...a,ch:a.stem},{...b,ch:b.stem}], branches=[{...a,ch:a.branch},{...b,ch:b.branch}];
    const hap=pair(T.STEM_HAP,a.stem,b.stem);
    if(hap) add('천간합',stems,T.STEM_HAP_RESULT[hap.join('')]);
    if(pair(T.STEM_CHUNG,a.stem,b.stem)) add('천간충',stems);
    if(pair(T.BRANCH_YUKHAP,a.branch,b.branch)) add('육합',branches);
    if(pair(T.BRANCH_CHUNG,a.branch,b.branch)) add('충',branches);
  }
  [[T.BRANCH_SAMHAP,'삼합',['水','木','火','金']],[T.BRANCH_BANGHAP,'방합',['木','火','金','水']]].forEach(([table,kind,els])=>table.forEach((set,i)=>{
    // Prefer the incoming letter if the same branch already exists in the natal chart.
    const members=set.map(ch=>entries.find(e=>e.branch===ch && triggerIds?.includes(e.id)) || entries.find(e=>e.branch===ch));
    if(members.every(Boolean)) add(kind,members.map(m=>({...m,ch:m.branch})),els[i]);
  }));
  return found;
}
function relationText(r, dayStem, cat) {
  const meet=r.members.map(m=>`${m.label} ${char(m.ch)}`).join(' + ');
  const clash=r.kind.includes('충');
  const work=r.members.some(m=>m.pos==='month');
  const effect=clash ? `${work?'익숙한 업무 환경이나 역할':'익숙한 방식'}을 다시 조정하는 계기로 읽어요. 변화가 곧 실패라는 뜻은 아니에요.` : r.el && ['삼합','방합'].includes(r.kind) ? `${EL[r.el]}의 성향이 모이는 조합이에요. 나에게는 ${ROLE[groupOf(dayStem,r.el)]}라는 주제를 더 드러낼 수 있어요.` : '서로 연결되고 묶이는 관계예요. 협력의 계기가 될 수도, 내 선택이 상대의 상황에 영향을 받는 모습일 수도 있어요.';
  const application=cat==='직장' && work ? (clash?' 일에서는 담당 업무나 소속을 다시 협의하는 모습으로 연결해 볼 수 있어요.':' 일에서는 혼자 밀어붙이기보다 함께할 사람과 역할을 정하는 데 참고할 수 있어요.') : cat==='연애' && r.members.some(m=>m.pos==='day') ? (clash?' 가까운 사이에서는 생활 방식의 차이를 이야기하는 데 참고해요.':' 가까운 사이에서는 함께하는 약속이 늘 수 있지만, 서로의 자유도 챙겨요.') : '';
  return { ...r,meet,effect:effect+application, caveat:r.kind==='천간합'?`${r.members.map(m=>char(m.ch)).join('·')}의 합을 확인했어요. ${EL[r.el]}로 완전히 바뀌는 합화는 계절과 뿌리 등 추가 조건이 필요해 여기서는 확정하지 않아요.`:null };
}
const TERM = ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','XIAO_HAN'];
const TERM_KO = ['소한','입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설'];
export function monthsForYear(year) {
  const table=Solar.fromYmd(year,6,15).getLunar().getJieQiTable();
  return Array.from({length:12},(_,i)=>{
    const sample=Solar.fromYmd(year,i+1,15).getLunar();
    // Library solar terms are UTC+8; display Korean standard time (UTC+9).
    const start=table[TERM[i]].nextHour(1), end=table[TERM[i+1]].nextHour(1);
    return {...gz(sample.getMonthInGanZhiExact()),year,month:i+1,term:TERM_KO[i],start:start.toYmdHms(),end:end.toYmdHms(),yearPillar:gz(sample.getYearInGanZhiExact())};
  });
}
function contextFor(data, climate, year, month=null, cat='직장') {
  const natal=climate.entries.map(p=>({...p,id:p.pos,label:POSITION[p.pos]}));
  const annual=month?.yearPillar || gz(Solar.fromYmd(year,6,15).getLunar().getYearInGanZhiExact());
  const decade=data.daeun.find(d=>d.startYear<=year && d.endYear>=year);
  const background=[...natal,...(decade?[{...decade,id:'decade',label:'10년의 흐름'}]:[]),{...annual,id:'annual',label:`${year}년의 기운`}];
  const entries=month?[...background,{...month,id:'monthly',label:`${month.month}월의 기운`}]:background;
  const trigger=month?['monthly']:['annual'];
  const rels=interactions(entries,trigger).map(r=>relationText(r,data.dayStem,cat));
  const incoming=month||annual;
  const nativeCount=climate.need?climate.weights[climate.need]:0;
  const bringsNeed=!!climate.need && [incoming.stemEl,incoming.branchEl].includes(climate.need);
  const opposite=climate.need==='火'?'水':'火';
  const worsens=!!climate.need && !bringsNeed && [incoming.stemEl,incoming.branchEl].includes(opposite);
  const gods=[GROUP[T.tenGod(data.dayStem,incoming.stem)],groupOf(data.dayStem,incoming.branchEl)];
  const relevant=gods.filter(g=>FOCUS[cat].includes(g));
  const changes=rels.filter(r=>r.kind.includes('충'));
  const workChange=changes.some(r=>r.members.some(m=>m.pos==='month'));
  const combines=rels.filter(r=>['삼합','방합'].includes(r.kind));
  const support=combines.filter(r=>r.el===climate.need);
  const tension=combines.filter(r=>climate.need && r.el===opposite);
  // Editorial ordering only: no probability, success score, or corpus sentiment.
  const annualSupport=climate.need && [annual.stemEl,annual.branchEl].includes(climate.need);
  const decadeSupport=climate.need && decade && [decade.stemEl,decade.branchEl].includes(climate.need);
  const matchingWeight=climate.weights[data.pillars.day.stemEl];
  const generator={木:'水',火:'木',土:'火',金:'土',水:'金'}[data.pillars.day.stemEl];
  const supportRatio=(matchingWeight+climate.weights[generator])/Object.values(climate.weights).reduce((a,b)=>a+b,0);
  const pressure=supportRatio<.3 && gods.includes('관성');
  // Existing warmth/cooling in the annual and decade context reduces the need
  // to reward ever more of the same element. It does not imply full resolution.
  const saturation=month && annualSupport && decadeSupport;
  const priority=(bringsNeed?(saturation?1:2):0)+(relevant.length*.7)+(support.length*.6)-(worsens?.8:0)-(changes.length*.4)-(tension.length*.6)-(pressure?.6:0);
  const balance=bringsNeed ? `${incoming.text}의 ${EL[climate.need]} 기운이 ${climate.need==='火'?'차가운 바탕에 온기를 보태요':'뜨거운 바탕을 식혀 주는 쪽이에요'}. ${nativeCount>2?'이미 같은 기운도 있어, 많이 들어올수록 무조건 좋은 것으로 보지는 않아요.':''}` : worsens ? `${incoming.text}에는 ${EL[opposite]}이 있어 기존의 ${climate.need==='火'?'차가운':'뜨거운'} 성향이 더 드러날 수 있어요. 속도와 균형을 함께 살펴요.` : `${incoming.text}만으로 계절의 균형이 크게 해결된다고 보기는 어려워요. 글자 사이의 연결과 생활 주제를 함께 볼게요.`;
  const role=`${char(incoming.stem)}와 ${char(incoming.branch)}는 나를 나타내는 ${char(data.dayStem)}를 기준으로 ${[...new Set(gods.map(g=>ROLE[g]))].join(', ')}와 연결돼요.${pressure?' 다만 나를 받쳐 주는 기운보다 책임이 앞설 수 있어요. 기회가 생겨도 감당할 업무량과 도움받을 방법을 먼저 살펴요.':''}${saturation?' 올해와 10년 흐름에도 보완 기운이 있어요. 이달에 같은 기운이 더해진다는 이유만으로 더 좋은 달로 보지는 않아요.':''}${tension.length?' 함께 모이는 다른 기운은 기존의 치우침을 키울 수도 있어, 합의 도움과 부담을 같이 읽어요.':''}`;
  const reinforcement = gods.includes(climate.dominant) ? `원래 사주에서 눈에 띄는 ${ROLE[climate.dominant]}의 성향이 이때 한 번 더 강조돼요. 익숙한 강점을 쓰기 좋지만, 같은 방식만 고집하지 않는 것도 중요해요.` : null;
  const mixed=(bringsNeed||support.length>0) && changes.length>0;
  const title=mixed?'힘이 생기면서, 변화도 함께 와요':workChange?'일하는 방식이 달라질 수 있어요':bringsNeed?'균형을 보태는 기운이 들어와요':relevant.length?'관심 있는 주제를 꺼내 볼 때예요':'내 속도를 살피며 준비해요';
  const active=priority>=1 && !workChange;
  const action=ACTION[cat][active?1:3]+(mixed?' 균형을 돕는 기운과 변화가 함께 있는 만큼, 기회를 살펴보면서 기존 약속을 어떻게 조정할지도 정해 보세요.':'');
  return {annual,decade,rels,priority,bringsNeed,mixed,workChange,title,balance,role,reinforcement,actionTitle:ACTION[cat][active?0:2],action,background:decade?`${decade.startYear}~${decade.endYear}년의 ${decade.text} 흐름 위에 ${annual.text}년이 겹쳐요. ${decadeSupport?'10년의 흐름도 계절 균형을 돕는 쪽이에요.': '10년의 흐름이 모든 해의 결과를 결정하지는 않아요.'}${month && annualSupport?' 올해의 보완 기운과 이달의 합·충을 함께 읽었어요.':''}`:'현재 연도에 해당하는 대운이 없어 해와 달, 타고난 글자 사이의 관계로 읽었어요.'};
}
export function contextualReading(data, year=data.current.nowYear, cat='직장') {
  const climate=climateOf(data);
  const annual=contextFor(data,climate,year,null,cat);
  const months=monthsForYear(year).map(m=>({...m,...contextFor(data,climate,year,m,cat)}));
  const eligible=months.filter(m=>year!==data.current.nowYear || m.month>=data.current.nowMonth);
  const ranked=[...eligible].sort((a,b)=>b.priority-a.priority||a.month-b.month);
  const spread=ranked.length>1?ranked[0].priority-ranked[ranked.length-1].priority:0;
  const picks=(spread>=.5 || ranked.length===1)?ranked.filter(m=>m.priority>=1).slice(0,2).sort((a,b)=>a.month-b.month):[];
  const natal=interactions(climate.entries.map(p=>({...p,id:p.pos,label:POSITION[p.pos]}))).map(r=>relationText(r,data.dayStem));
  return { climate,annual,months,picks,spread,natal,character:NATURE[data.pillars.day.stemEl],unknownTime:!data.pillars.time };
}

// A visual guide to relative opportunities and preparation; never a probability.
export const flowValue = priority => Math.max(1, Math.min(5, 3 + priority * .65));
export function yearFlow(data, cat='직장') {
  const climate = climateOf(data);
  return Array.from({length:10}, (_,i) => {
    const year = data.current.nowYear+i;
    const context = contextFor(data,climate,year,null,cat);
    return { key:year, year, label:String(year).slice(2)+'년', value:flowValue(context.priority), now:i===0, ...context };
  });
}
