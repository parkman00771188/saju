import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { interpret } from '../saju/interpret.js';
import { contextualReading, READING_SOURCES } from '../saju/context.js';
import { CATS, CAT_META } from '../data/knowledge.js';
import { ELEMENT_COLOR, ELEMENT_KO, STEM_KO } from '../saju/tables.js';
import { Radar, Trend, MonthBars } from './Charts.jsx';
import Tile from './Tile.jsx';
import { Score, Paras, GZ, Bars, Gauge, Sec, Stats, Evidence, PatternCard, polClass } from './ReadingParts.jsx';

const WEB_SOURCES = [
  { title: '정해 만세력 · 격국(내격) 강의', url: 'https://doc.8-codes.com/docs/lecture/16/', note: '월지 십성으로 격을 정하는 내격 분류' },
  { title: '사주포럼 · 용신(억부·조후·통관·병약)', url: 'https://www.sajuforum.com/01forum/nm/05_youngsin.php', note: '억부용신과 조후용신을 함께 보는 관점' },
  { title: '위키백과 · 용신(사주팔자)', url: 'https://ko.wikipedia.org/wiki/%EC%9A%A9%EC%8B%A0_(%EC%82%AC%EC%A3%BC%ED%8C%94%EC%9E%90)', note: '용신·희신·기신·구신의 정의' },
  { title: '기운사 · 년주·월주·일주·시주 가이드', url: 'https://giunsa.com/blog/four-pillars-guide', note: '근묘화실 — 네 기둥과 인생 시기·가족 자리' },
  { title: '정해 만세력 · 십이신살', url: 'https://doc.8-codes.com/docs/lecture/19/', note: '일지 기준 십이신살과 운에서의 적용' },
  { title: '사주스터디 · 행운론(세운·월운)', url: 'https://www.sajustudy.com/97', note: '대운·세운·월운을 겹쳐 읽는 방법' },
];
const NAV = [['#r-summary', '종합평가'], ['#r-character', '성격'], ['#r-flow', '운의 흐름'], ['#r-topic', '주제별'], ['#r-patterns', '조합'], ['#r-sources', '참고']];

function Connection({ r }) {
  return <div className={`reading-connection ${r.kind.includes('충') ? 'is-change' : ''}`}><div><span>{r.kind}</span><b>{r.members.map((m) => `${m.ch}(${m.label})`).join(' + ')}</b></div><p>{r.effect}</p>{r.caveat && <small>{r.caveat}</small>}</div>;
}

export default function Reading({ data, onBack }) {
  const heading = useRef(null);
  const R = useMemo(() => interpret(data), [data]);
  const [cat, setCat] = useState('직장');
  const [year, setYear] = useState(data.current.nowYear);
  const [month, setMonth] = useState(data.current.nowMonth);
  const [openDaeun, setOpenDaeun] = useState(false);
  const ctx = useMemo(() => contextualReading(data, year, cat === '건강' ? '생활' : cat), [data, year, cat]);
  const months = useMemo(() => R.monthsOf(year), [R, year]);
  const c = R.cats[cat];
  const m = CAT_META[cat];
  const yearObj = R.years.find((y) => y.year === year);
  const monthObj = months.find((mm) => mm.monthNo === month);
  const ctxMonth = ctx.months.find((mm) => mm.month === month);
  const elements = Object.fromEntries(['목', '화', '토', '금', '수'].map((k, i) => [k, Object.values(data.elements)[i]]));
  const radarMeta = { 목: { color: '#457459' }, 화: { color: '#b3473c' }, 토: { color: '#987021' }, 금: { color: '#6c647b' }, 수: { color: '#416b9a' } };
  const pickYear = (y) => { setYear(y); setMonth(y === data.current.nowYear ? data.current.nowMonth : 1); };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const catValues = Object.fromEntries(CATS.map((k) => [k, R.cats[k].score]));

  return (
    <div className="analysis-page deep">
      <header className="report-top"><span className="report-brand">天機錄 <small>사주 해석</small></span><button className="text-button" onClick={onBack}>← 만세력으로 돌아가기</button></header>
      <div className="analysis-heading">
        <p className="kicker">여덟 글자, 하나의 이야기</p>
        <h1 tabIndex={-1} ref={heading}>{data.meta.name ? `${data.meta.name} 님의` : '나의'} 사주 심층 해석</h1>
        <p>"{R.climate.image}" — {R.gyeok.key}, {R.strength.label}. 타고난 바탕과 다가오는 흐름을 격국·용신·자리·조합·원문 통계로 함께 읽습니다.</p>
      </div>
      <nav className="section-links" aria-label="해석 빠른 이동">{NAV.map(([h, t]) => <a key={h} href={h}>{t}</a>)}<button onClick={onBack}>만세력 보기 ↗</button></nav>
      {!data.pillars.time && <p className="gentle-note">시간을 제외한 여섯 글자로 풀었어요. 태어난 시간에 따라 시주(말년·자식) 관련 해석은 달라질 수 있어요.</p>}

      <Stats items={[
        { label: '일간', value: `${data.dayStem} ${ELEMENT_KO[data.pillars.day.stemEl]}`, sub: `${STEM_KO[data.dayStem]} · ${R.strength.label} (${R.strength.pct}%)` },
        { label: '격국', value: R.gyeok.key, sub: R.gyeok.tag },
        { label: '용신 · 희신', value: `${R.yong.el} · ${R.yong.hee}`, sub: `기신 ${R.yong.gi} · 구신 ${R.yong.gu}`, color: ELEMENT_COLOR[R.yong.el].bg },
        { label: '조후 필요 기운', value: `${R.needEl} ${ELEMENT_KO[R.needEl]}`, sub: R.climate.needCount ? `원국에 ${R.climate.needCount}개` : '원국에 없음 → 운에서', color: ELEMENT_COLOR[R.needEl].bg },
      ]} />

      {/* 01 종합평가 */}
      <section id="r-summary" className="reading-flow-section">
        <div className="section-heading"><div><span>01</span><h2>종합평가</h2></div><p>형국 · 격국 · 용신 · 구조 · 네 기둥 · 관계 · 대운 · 원문 · 조언</p></div>
        <div className="paper overview-paper">
          <div className="overview-grid">
            <div>
              <p className="kicker">형국 形局</p>
              <h3 className="overview-title">{R.climate.image}</h3>
              <p className="overview-sub">{R.climate.imageNote ? R.climate.imageNote + ' · ' : ''}{R.climate.season}생 {ELEMENT_KO[R.climate.dayEl]} 일간 · {R.profile.dominant ? `${R.profile.dominant} 중심` : ''} · 필요한 기운 {R.needEl}({ELEMENT_KO[R.needEl]})</p>
              <Bars scores={catValues} />
            </div>
            <div className="overview-radars">
              <div><Radar values={elements} axes={['목', '화', '토', '금', '수']} meta={radarMeta} max={Math.max(4, ...Object.values(elements))} unit="개" size={200} /><small>오행 분포</small></div>
              <div><Radar values={catValues} size={200} /><small>5대 운 종합</small></div>
            </div>
          </div>
        </div>
        {R.summary.map((g, gi) => (
          <Sec key={g.title} icon={g.icon} title={g.title} sub={g.sub}>
            <Paras items={g.paras} />
            {g.positions && (
              <div className="posgrid">
                {g.positions.map((p) => (
                  <article key={p.pos} className={`poscard ${p.pos === 'day' ? 'me' : ''}`}>
                    <header><GZ g={p.gz} /><div><b>{p.ko} · {p.root}</b><small>{p.period}<br />{p.who}</small></div></header>
                    <div className="posmeta"><span>{p.pos !== 'day' ? `천간 ${p.stemGod}` : '일간(나)'}</span><span>지지 {p.branchGod}</span><span>{p.stage}</span><span>{p.sal}</span>{p.gongmang && <span className="gm">공망</span>}</div>
                    {p.texts.map((t, i) => <p key={i}>{t}</p>)}
                  </article>
                ))}
              </div>
            )}
            {g.daeunAll && (
              <div className="lifeline">
                {(openDaeun ? g.daeunAll : g.daeunAll.filter((d) => !d.past)).map((d) => (
                  <div key={d.index} className={`drow ${d.isNow ? 'now' : ''} ${d.past ? 'past' : ''}`}><GZ g={d} /><div><div className="dtop"><b>{d.age}세~ {d.text.split(' 대운')[0].split(' ').slice(-1)[0]} 대운</b><Score n={d.luck.overall} />{d.isNow && <em className="ytag need">지금</em>}{d.luck.hasNeed && <em className="ytag need">{R.needEl}</em>}{d.luck.hasYong && <em className="ytag hap">용신</em>}{d.luck.hasGi && <em className="ytag chung">기신</em>}</div><p>{d.text}</p></div></div>
                ))}
                {g.daeunAll.some((d) => d.past) && <button type="button" className="ylink" onClick={() => setOpenDaeun((v) => !v)}>{openDaeun ? '지나온 대운 접기' : `지나온 대운 ${g.daeunAll.filter((d) => d.past).length}개 펼치기`}</button>}
              </div>
            )}
            {g.evidenceSummary && (
              <>
                <div className="evsum">
                  <div className="col p"><h5>吉 · 좋게 보는 점</h5>{g.evidenceSummary.pos.map((r) => <span key={r.label}>{r.label} <small>{r.docs}편</small></span>)}</div>
                  <div className="col n"><h5>凶 · 조심하라는 점</h5>{g.evidenceSummary.neg.map((r) => <span key={r.label}>{r.label} <small>{r.docs}편</small></span>)}</div>
                </div>
                <p className="muted">이 사주의 일간·일주·십성·신살·충합·구조를 다룬 강의 원문에서 실제로 반복된 결과·특성을 집계한 것입니다. 각 주제 탭에서 근거와 함께 자세히 볼 수 있습니다.</p>
                {g.keywords.length > 0 && <div className="kws">{g.keywords.map((k) => <i key={k}>#{k}</i>)}</div>}
              </>
            )}
          </Sec>
        ))}
      </section>

      {/* 02 성격 */}
      <section id="r-character" className="reading-flow-section">
        <div className="section-heading"><div><span>02</span><h2>성격과 기질</h2></div><p>일간 · 일주 · 일지 · 십이운성 · 신살 · 원문</p></div>
        <Sec icon="性" title="타고난 기질" sub={`${R.gyeok.tag} · ${R.strength.label}`}>
          <div className="character-intro"><span className="character-glyph">{data.dayStem}</span><div><h3>{ctx.character[0]}</h3><p>{ctx.character[1]}을 상징해요.</p></div></div>
          <Paras items={R.character} />
        </Sec>
        <Sec icon="言" title="강의 원문이 말하는 이 사주의 기질" sub="좋은 평가와 조심하라는 평가를 가리지 않고 반복된 것">
          <Evidence rows={R.evidenceByCat['성격']} />
          <Evidence rows={R.evidenceByCat['가족']} title="가족·인간관계에 대해 말하는 것" />
        </Sec>
        <Sec icon="結" title="글자들이 만나며 달라지는 면" sub="원국 안의 합·충·삼합·방합">
          {ctx.natal.length ? ctx.natal.map((r) => <Connection key={r.key} r={r} />) : <p>뚜렷한 합·충·삼합·방합은 없어, 계절과 전체 기운의 분포를 중심으로 읽어요.</p>}
        </Sec>
      </section>

      {/* 03 운의 흐름 */}
      <section id="r-flow" className="reading-flow-section">
        <div className="section-heading"><div><span>03</span><h2>운의 흐름</h2></div><p>주제를 고르고 연도 → 달을 눌러 보세요</p></div>
        <div className="topic-picker" role="group" aria-label="해석 주제">{CATS.map((k) => <button key={k} aria-pressed={cat === k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}><span aria-hidden="true">{CAT_META[k].hanja}</span>{k}운</button>)}</div>
        <Stats items={[
          { label: `${cat}운 종합`, value: `${c.score} / 5`, color: m.color },
          { label: '가장 좋은 해', value: c.best ? `${c.best.year}` : '-', sub: c.best ? `${c.best.text} · ${c.best.score}점` : '', color: '#2f8a4b' },
          { label: '조심할 해', value: c.worst ? `${c.worst.year}` : '-', sub: c.worst ? `${c.worst.text} · ${c.worst.score}점` : '', color: '#d6453d' },
          { label: '열쇠 기운', value: `${R.needEl} · ${R.yong.el}`, sub: R.climate.inNeedDaeun ? '지금 대운에 들어옴' : '운에서 올 때 풀림' },
        ]} />
        <div className="paper graph-paper">
          <div className="graph-title"><div><h3>앞으로 10년 {cat}운 흐름</h3><p>연도를 누르면 그 해의 월별 {cat}운이 아래에 펼쳐져요. {R.needEl}=필요한 기운, 삼재 표시.</p></div><label className="year-control"><span className="sr-only">해석 연도</span><select value={year} onChange={(e) => pickYear(+e.target.value)}>{R.years.map((y) => <option key={y.year} value={y.year}>{y.year}년</option>)}</select></label></div>
          <div className="flow-chart-scroll"><Trend points={c.series} color={m.color} height={190} selected={year} onPick={(p) => pickYear(p.key)} /></div>
          <p className="graph-note">십성·십이운성·십이신살·조후·용신·합충·공망·삼재를 종합한 참고 지수(1~5)이며 사건의 확률을 뜻하지 않아요.</p>
        </div>
        {yearObj && (
          <motion.article key={year} className="period-reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <header><span className="kicker">{year}년 · {yearObj.age}세 · {cat}운 {yearObj.luck.scores[cat]}점</span><h3><GZ g={yearObj} /> {yearObj.text}년 — {yearObj.luck.head}</h3></header>
            <div className="ytags">{yearObj.luck.hasNeed && <em className="ytag need">{R.needEl} 투출</em>}{yearObj.luck.hasYong && <em className="ytag hap">용신</em>}{yearObj.luck.hasGi && <em className="ytag chung">기신</em>}{yearObj.samjae && <em className="ytag">삼재</em>}{yearObj.luck.isGong && <em className="ytag">공망</em>}{yearObj.luck.flags.map((f, i) => <em key={i} className={`ytag ${f.type === '충' ? 'chung' : f.type === '합' || f.type === '삼합' ? 'hap' : ''}`}>{f.ch} {f.type}</em>)}</div>
            <p className="period-lead">{yearObj.luck.texts[cat]}</p>
            <div className="reading-reasons">
              <div><span className="reason-label">이 해의 흐름</span>{yearObj.luck.summary.map((s, i) => <p key={i}>{s}</p>)}</div>
              {ctx.annual.rels[0] && <div><span className="reason-label">함께 살펴볼 글자</span>{ctx.annual.rels.slice(0, 2).map((r) => <Connection key={r.key} r={r} />)}</div>}
              <div className="action-box"><span className="reason-label">이렇게 활용해 보세요</span><h4>{ctx.annual.actionTitle}</h4><p>{ctx.annual.action}</p></div>
            </div>
            <Bars scores={yearObj.luck.scores} small />
          </motion.article>
        )}
        <div className="paper graph-paper">
          <div className="graph-title"><div><h3>{year}년 열두 달 {cat}운</h3><p>막대를 누르면 그 달의 풀이가 아래에 나와요. 사주의 한 달은 절기에 시작해요.</p></div></div>
          <MonthBars months={months} color={m.color} nowMonth={year === data.current.nowYear ? data.current.nowMonth : null} getValue={(mm) => mm.luck.scores[cat]} selected={month} onPick={(mm) => setMonth(mm.monthNo)} />
        </div>
        {monthObj && (
          <motion.article key={`${year}-${month}`} className="period-reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <header><span className="kicker">{year}년 {month}월 · {ctxMonth ? `${ctxMonth.term} ${ctxMonth.start.slice(5, 10).replace('-', '.')} ~ ${ctxMonth.end.slice(5, 10).replace('-', '.')}` : ''} · {cat}운 {monthObj.luck.scores[cat]}점</span><h3><GZ g={monthObj} /> {monthObj.text}월 — {monthObj.luck.head}</h3></header>
            <p className="period-lead">{monthObj.luck.texts[cat]}</p>
            <div className="reading-reasons">
              <div><span className="reason-label">이 달의 흐름</span>{monthObj.luck.summary.map((s, i) => <p key={i}>{s}</p>)}</div>
              {ctxMonth?.rels?.[0] && <div><span className="reason-label">함께 살펴볼 글자</span>{ctxMonth.rels.slice(0, 2).map((r) => <Connection key={r.key} r={r} />)}</div>}
              {ctxMonth && <div className="action-box"><span className="reason-label">이렇게 활용해 보세요</span><h4>{ctxMonth.actionTitle}</h4><p>{ctxMonth.action}</p></div>}
            </div>
            <Bars scores={monthObj.luck.scores} small />
          </motion.article>
        )}
        <details className="reading-detail"><summary>10년 연도별 요약 한 번에 보기</summary>
          <div className="ylist">
            {R.years.map((y) => (
              <div key={y.year} className={`ycard ${y.year === data.current.nowYear ? 'now' : ''}`}>
                <button type="button" className="yhead" onClick={() => pickYear(y.year)}><span className="yyear">{y.year}<small>{y.age}세</small></span><GZ g={y} /><span className="ygod"><span>{y.stemGod}·{y.branchGod}</span><small>{y.luck.head}</small></span><Score n={y.luck.overall} /><i className="chev" /></button>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* 04 주제별 상세 */}
      <section id="r-topic" className="reading-flow-section">
        <div className="section-heading"><div><span>04</span><h2>{cat}운 자세히</h2></div><p>위에서 고른 주제의 타고난 기운 · 조합 · 원문 · 시기 · 지금</p></div>
        <div className="cathead" style={{ '--c': m.color }}><span className="cathanja">{m.hanja}</span><div><h3>{cat}운 <small>{m.desc}</small></h3><Score n={c.score} color={m.color} /></div></div>
        {c.gauge && <Gauge g={c.gauge} color={m.color} />}
        {c.sections.map((s, i) => (
          <Sec key={i} icon={['基', '適', '人', '合', '時', '流'][i] || '記'} title={s.title} color={m.color}><Paras items={s.paras} /></Sec>
        ))}
        <Sec icon="言" title={`강의 원문이 말하는 이 사주의 ${cat}`} sub="이 사주의 글자·조합을 다룬 강의에서 반복된 이야기 · 吉/凶 함께" color={m.color}>
          <Evidence rows={c.evidence} />
          {!c.evidence?.length && <p className="muted">이 주제와 직접 연결된 원문 주장이 충분히 모이지 않았어요.</p>}
        </Sec>
        <Sec icon="今" title="지금 흐르는 운" sub="대운 · 세운 · 월운" color={m.color}>
          <div className="nowlist">{c.now.map((n, i) => <div className="nowitem" key={i}><div className="nowlabel"><span>{n.label}</span><Score n={n.score} color={m.color} /></div><p>{n.text}</p></div>)}</div>
        </Sec>
        <div className="topic-switch">다른 주제 보기: {CATS.filter((k) => k !== cat).map((k) => <button key={k} type="button" onClick={() => { setCat(k); document.getElementById('r-topic')?.scrollIntoView({ behavior: 'smooth' }); }}>{k}운</button>)}</div>
      </section>

      {/* 05 조합 */}
      <section id="r-patterns" className="reading-flow-section">
        <div className="section-heading"><div><span>05</span><h2>이 사주에 해당하는 조합</h2></div><p>{R.patterns.length}개 · 吉/凶 병기 · 미터는 강의 원문의 어조, 칩은 함께 언급된 결과</p></div>
        <div className="plist">{R.patterns.map((p, i) => <PatternCard key={p.key} p={p} i={i} claimMeta={R.meta.claims || {}} />)}</div>
      </section>

      {/* 06 참고 */}
      <section id="r-sources" className="reading-flow-section">
        <details className="reading-detail source-detail" open><summary>풀이 방식과 참고 자료</summary>
          <p>이 해석은 (1) 만세력 계산(lunar-javascript, 한국시·야자시·입춘 기준), (2) 명리 규칙 — 격국(월지 십성), 억부·조후 용신, 자리별 십성·십이운성·십이신살, 지장간 통근·투출, 공망, 합충형파해, 대운·세운·월운 —, (3) 수집한 사주 강의 자막 {R.meta.docs.toLocaleString()}편에서 개념·조합별로 추출한 반복 주장(吉/凶)·어조·키워드를 결합한 규칙 기반 풀이예요. 점수와 그래프는 비교를 돕는 참고 지수이며 사건의 확률이 아니고, 건강 문구는 진단이 아닌 생활 관리의 힌트예요.</p>
          {[...READING_SOURCES, ...WEB_SOURCES].map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗<small>{s.note}</small></a>)}
        </details>
      </section>

      <footer className="report-footer"><button className="gold-button" onClick={onBack}>만세력으로 돌아가기</button><p>나를 이해하는 힌트로 읽고, 선택은 나의 현실에 맞게.</p></footer>
    </div>
  );
}
