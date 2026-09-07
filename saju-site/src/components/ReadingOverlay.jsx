import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { interpret } from '../saju/interpret.js';
import { CATS, CAT_META } from '../data/knowledge.js';
import { ELEMENT_COLOR, ELEMENT_KO, STEM_KO, BRANCH_KO } from '../saju/tables.js';
import { Radar, Trend, MonthBars } from './Charts.jsx';
import Tile from './Tile.jsx';

const TABS = ['종합', '형국·조합', '성격', '직장', '금전', '연애', '건강', '학업', '연도별', '월별'];
const KW_JUNK = /(일주|일간|사주|인데|태어|이라|라고|이신|하신|하시|되시|분들|같은|이런|그런|저런|이제|그냥|정도|경우)/;
const cleanKw = (arr) => arr.filter((k) => !KW_JUNK.test(k));

/* ---------- 부품 ---------- */
function Score({ n, color }) {
  return (
    <span className="score" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.i key={i} style={{ background: i <= n ? color || 'var(--gold)' : 'var(--line)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 300, damping: 15 }} />
      ))}
    </span>
  );
}
function Paras({ items, delay = 0 }) {
  return items.map((p, i) => (
    <motion.p key={i} initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: delay + i * 0.1, duration: 0.5, ease: 'easeOut' }}>{p}</motion.p>
  ));
}
function GZ({ g, size = 'sm' }) {
  return <span className="gz-pair"><Tile ch={g.stem} ko={g.stemKo} el={g.stemEl} size={size} flip={false} /><Tile ch={g.branch} ko={g.branchKo} el={g.branchEl} size={size} flip={false} /></span>;
}
function Bars({ scores, small }) {
  return (
    <div className={`catbars ${small ? 'small' : ''}`}>
      {CATS.map((c) => (
        <div key={c} className="cb"><span className="cbl" style={{ color: CAT_META[c].color }}>{c}</span>
          <div className="cbt"><motion.i style={{ background: CAT_META[c].color }} initial={{ width: 0 }} animate={{ width: `${scores[c] * 20}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} /></div><b>{scores[c]}</b></div>
      ))}
    </div>
  );
}
function Gauge({ g, color }) {
  return (
    <div className="gauge">
      <div className="gl"><span>{g.left}</span><b>{g.label}</b><span>{g.right}</span></div>
      <div className="gt"><motion.i style={{ background: color }} initial={{ left: '50%' }} animate={{ left: `${g.value}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} /></div>
    </div>
  );
}
function Meter({ stats }) {
  if (!stats) return <span className="meter"><small>원문 데이터 없음</small></span>;
  const pct = ((stats.polarity + 1) / 2) * 100;
  const top = Object.entries(stats.categories || {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 2);
  return (
    <span className="meter" title={`긍정어 ${stats.pos} · 부정어 ${stats.neg}`}>
      <span>강의 {stats.docs}편·{stats.mentions}회</span>
      <span className="bar2"><i style={{ left: `${pct}%` }} /></span>
      <span>{stats.polarity > 0.15 ? '긍정 우세' : stats.polarity < -0.15 ? '부정 우세' : '중립'}</span>
      {top.length > 0 && <span className="ctx">{top.map(([c]) => <b key={c}>{c}</b>)}</span>}
    </span>
  );
}
function PatternCard({ p, i }) {
  return (
    <motion.article className="pcard" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
      <header><h4>{p.title} <small>{p.kind}</small></h4><Meter stats={p.stats} /></header>
      <p className="img">{p.img}</p>
      <div className="pos"><i>吉</i><p>{p.pos}</p></div>
      <div className="neg"><i>凶</i><p>{p.neg}</p></div>
      {p.stats?.keywords?.length > 0 && <div className="kws">{cleanKw(p.stats.keywords).slice(0, 6).map((k) => <i key={k}>#{k}</i>)}</div>}
    </motion.article>
  );
}

/* ---------- 인트로 ---------- */
function Intro({ data, onDone }) {
  const chars = ['year', 'month', 'day', 'time'].filter((k) => data.pillars[k]).flatMap((k) => [
    { ch: data.pillars[k].stem, el: data.pillars[k].stemEl }, { ch: data.pillars[k].branch, el: data.pillars[k].branchEl },
  ]);
  useEffect(() => { const t = setTimeout(onDone, 3400); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div className="rintro" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }}>
      <svg className="rink" viewBox="0 0 400 400">
        <motion.circle cx="200" cy="200" r="150" fill="none" stroke="var(--gold)" strokeWidth="1.2" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.8 }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
        <motion.circle cx="200" cy="200" r="118" fill="none" stroke="var(--gold)" strokeWidth="0.8" strokeDasharray="3 6" initial={{ rotate: 0, opacity: 0 }} animate={{ rotate: 360, opacity: 0.6 }} transition={{ rotate: { duration: 30, repeat: Infinity, ease: 'linear' }, opacity: { delay: 0.5, duration: 1 } }} style={{ transformOrigin: '200px 200px' }} />
      </svg>
      <motion.div className="rglyph" initial={{ scale: 0.4, opacity: 0, filter: 'blur(12px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.4, duration: 1.1, ease: [0.22, 1, 0.36, 1] }} style={{ color: ELEMENT_COLOR[data.pillars.day.stemEl].bg }}>{data.dayStem}</motion.div>
      <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>命을 읽습니다</motion.p>
      <div className="rchars">
        {chars.map((c, i) => (
          <motion.span key={i} className="mini" style={{ background: ELEMENT_COLOR[c.el].bg, color: ELEMENT_COLOR[c.el].fg }}
            initial={{ opacity: 0, y: 40 + Math.random() * 40, x: (Math.random() - 0.5) * 200, rotate: (Math.random() - 0.5) * 90 }} animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }} transition={{ delay: 1.5 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}>{c.ch}</motion.span>
        ))}
      </div>
      <motion.p className="rsub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>{data.meta.name || '당신'}의 여덟 글자를 풀어냅니다</motion.p>
    </motion.div>
  );
}

/* ---------- 탭 ---------- */
function Overview({ R, data }) {
  const values = Object.fromEntries(CATS.map((c) => [c, R.cats[c].score]));
  return (
    <div className="rtab">
      <motion.div className="imgbox" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">형국 形局</p>
        <h3>{R.climate.image}</h3>
        <p>{R.climate.imageNote ? R.climate.imageNote + ' · ' : ''}{R.strength.label} · {R.profile.dominant ? `${R.profile.dominant} 중심` : ''} · 필요한 기운 {R.needEl}({ELEMENT_KO[R.needEl]})</p>
      </motion.div>
      <div className="rhero">
        <Radar values={values} />
        <div className="rhero-text">
          <div className="me-tile lg" style={{ background: ELEMENT_COLOR[data.pillars.day.stemEl].bg, color: ELEMENT_COLOR[data.pillars.day.stemEl].fg }}><span className="hanja">{data.dayStem}</span></div>
          <h3>{data.meta.name || '당신'}의 사주 총평</h3>
          <Bars scores={values} small />
        </div>
      </div>
      <Paras items={R.overview} delay={0.2} />
      {R.keywords.length > 0 && (
        <motion.div className="kwbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <span className="kwl">이 사주의 키워드</span>
          <div className="kws">{R.keywords.map((k, i) => <motion.i key={k} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.04 }}>#{k}</motion.i>)}</div>
          <small>사주 강의 {R.meta.docs.toLocaleString()}편의 원문에서 이 사주의 일간·일주·십성·신살·구조와 함께 자주 등장한 말</small>
        </motion.div>
      )}
      <h4 className="rh4">별이 건네는 조언</h4>
      <Paras items={R.advice} delay={0.3} />
    </div>
  );
}
function Climate({ R }) {
  return (
    <div className="rtab">
      <h3 className="rtitle">형국과 조후 <small>形局 · 調候</small></h3>
      <div className="imgbox"><p className="eyebrow">{R.climate.season}에 태어난 {ELEMENT_KO[R.climate.dayEl]}({R.climate.dayEl}) 일간</p><h3>{R.climate.image}</h3>{R.climate.imageNote && <p>{R.climate.imageNote}</p>}</div>
      <Paras items={R.climate.paras} />
      {(R.climate.timing.daeun.length > 0 || R.climate.timing.years.length > 0) && (
        <div className="timing">
          {R.climate.timing.daeun.length > 0 && <p><b>{R.needEl}이 들어오는 대운</b> {R.climate.timing.daeun.map((d) => `${d.text} (${d.age}세, ${d.startYear}~${d.endYear})`).join(' · ')}</p>}
          {R.climate.timing.years.length > 0 && <p><b>{R.needEl}이 들어오는 해</b> {R.climate.timing.years.map((y) => `${y.year} ${y.text}`).join(' · ')}</p>}
        </div>
      )}
      <h4 className="rh4">이 사주에 해당하는 조합 <small style={{ marginLeft: 6, color: 'var(--ink-faint)' }}>{R.patterns.length}개 · 강의 원문 통계와 함께</small></h4>
      <p className="muted">각 조합은 좋은 면(吉)과 조심할 면(凶)을 함께 적었습니다. 미터는 강의 원문에서 이 조합이 어떤 어조로 다뤄졌는지를 보여줍니다.</p>
      <div className="plist">{R.patterns.map((p, i) => <PatternCard key={p.key} p={p} i={i} />)}</div>
    </div>
  );
}
function Character({ R }) {
  return <div className="rtab"><h3 className="rtitle">성격과 기질 <small>性情</small></h3><Paras items={R.character} /></div>;
}
function Category({ R, cat, nowYear }) {
  const c = R.cats[cat];
  const m = CAT_META[cat];
  return (
    <div className="rtab">
      <div className="cathead" style={{ '--c': m.color }}>
        <span className="cathanja">{m.hanja}</span>
        <div><h3>{cat}운 <small>{m.desc}</small></h3><Score n={c.score} color={m.color} /></div>
      </div>
      <div className="chartbox">
        <div className="chartlabel"><span>앞으로 10년 {cat}운 흐름</span><small>{nowYear}년 기준 · 1~5</small></div>
        <Trend points={c.series} color={m.color} />
      </div>
      {c.gauge && <Gauge g={c.gauge} color={m.color} />}
      {c.sections.map((s, i) => (
        <div key={i}>
          <h4 className="rh4">{s.title}</h4>
          <Paras items={s.paras} delay={0.1 + i * 0.05} />
        </div>
      ))}
      <h4 className="rh4">지금 흐르는 운</h4>
      <div className="nowlist">
        {c.now.map((n, i) => (
          <motion.div className="nowitem" key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>
            <div className="nowlabel"><span>{n.label}</span><Score n={n.score} color={m.color} /></div>
            <p>{n.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
function Years({ R, onPickYear, nowYear }) {
  const [open, setOpen] = useState(nowYear);
  return (
    <div className="rtab">
      <h3 className="rtitle">연도별 운세 <small>歲運 · 올해부터 10년</small></h3>
      <div className="chartbox"><div className="chartlabel"><span>종합 운 흐름</span><small>{R.needEl} = 필요한 기운이 들어오는 해</small></div><Trend points={R.years.map((y) => ({ label: String(y.year).slice(2), value: y.luck.overall, now: y.year === nowYear, mark: y.luck.hasNeed ? R.needEl : y.samjae ? '삼재' : null }))} /></div>
      <div className="ylist">
        {R.years.map((y, i) => {
          const isOpen = open === y.year;
          return (
            <motion.div key={y.year} className={`ycard ${isOpen ? 'open' : ''} ${y.year === nowYear ? 'now' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button type="button" className="yhead" onClick={() => setOpen(isOpen ? null : y.year)}>
                <span className="yyear">{y.year}<small>{y.age}세</small></span>
                <GZ g={y} />
                <span className="ygod">{y.stemGod}·{y.branchGod}<small>{y.luck.head}</small></span>
                <Score n={y.luck.overall} />
                <i className={`chev ${isOpen ? 'up' : ''}`} />
                {(y.luck.hasNeed || y.samjae || y.luck.flags.length > 0) && (
                  <span className="ytags">
                    {y.luck.hasNeed && <em className="ytag need">{R.needEl} 투출</em>}
                    {y.samjae && <em className="ytag">삼재</em>}
                    {y.luck.flags.filter((f) => f.type === '충').map((f, i) => <em key={'c' + i} className="ytag chung">{f.ch} 충</em>)}
                    {y.luck.flags.filter((f) => f.type === '합').map((f, i) => <em key={'h' + i} className="ytag hap">{f.ch} 합</em>)}
                    {y.luck.flags.filter((f) => f.type === '원진').map((f, i) => <em key={'w' + i} className="ytag">{f.ch} 원진</em>)}
                  </span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div className="ybody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }}>
                    <Paras items={y.luck.summary} />
                    <Bars scores={y.luck.scores} small />
                    {CATS.map((c) => <div className="ycat" key={c}><b style={{ color: CAT_META[c].color }}>{c}</b><p>{y.luck.texts[c]}</p></div>)}
                    <button type="button" className="ylink" onClick={() => onPickYear(y.year)}>{y.year}년 월별 운세 보기 →</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
function Months({ R, year, setYear, nowYear, nowMonth }) {
  const months = useMemo(() => R.monthsOf(year), [R, year]);
  const [open, setOpen] = useState(year === nowYear ? nowMonth : 1);
  return (
    <div className="rtab">
      <h3 className="rtitle">월별 운세 <small>月運</small></h3>
      <div className="ychips">{R.years.map((y) => <button type="button" key={y.year} className={y.year === year ? 'on' : ''} onClick={() => { setYear(y.year); setOpen(y.year === nowYear ? nowMonth : 1); }}>{y.year}</button>)}</div>
      <div className="chartbox"><div className="chartlabel"><span>{year}년 열두 달 종합 운</span></div><MonthBars months={months} nowMonth={year === nowYear ? nowMonth : null} /></div>
      <div className="mgrid">
        {months.map((m, i) => {
          const isOpen = open === m.monthNo, isNow = year === nowYear && m.monthNo === nowMonth;
          return (
            <motion.div key={m.monthNo} className={`mcard ${isOpen ? 'open' : ''} ${isNow ? 'now' : ''}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} onClick={() => setOpen(isOpen ? null : m.monthNo)}>
              <div className="mhead"><span className="mno">{m.monthNo}월{isNow && <em>이달</em>}</span><GZ g={m} /><span className="mgod">{m.branchGod}</span><Score n={m.luck.overall} /></div>
              <p className="mhint">{m.luck.head}{m.luck.hasNeed ? ` · ${R.needEl} 투출` : ''}{m.luck.flags.length ? ` · ${m.luck.flags.map((f) => f.type).join('·')}` : ''}</p>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div className="mbody" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}>
                    <Bars scores={m.luck.scores} small />
                    {CATS.map((c) => <div className="ycat" key={c}><b style={{ color: CAT_META[c].color }}>{c}</b><p>{m.luck.texts[c]}</p></div>)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 오버레이 ---------- */
export default function ReadingOverlay({ data, onClose }) {
  const R = useMemo(() => interpret(data), [data]);
  const [phase, setPhase] = useState('intro');
  const [tab, setTab] = useState(0);
  const [dir, setDir] = useState(1);
  const [year, setYear] = useState(data.current.nowYear);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => { const onKey = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const go = (i) => { const n = Math.max(0, Math.min(TABS.length - 1, i)); setDir(n > tab ? 1 : -1); setTab(n); document.querySelector('.rbody')?.scrollTo({ top: 0 }); };
  const onDrag = (_, info) => { if (info.offset.x < -80) go(tab + 1); else if (info.offset.x > 80) go(tab - 1); };
  const content = () => {
    const t = TABS[tab];
    if (t === '종합') return <Overview R={R} data={data} />;
    if (t === '형국·조합') return <Climate R={R} />;
    if (t === '성격') return <Character R={R} />;
    if (t === '연도별') return <Years R={R} nowYear={data.current.nowYear} onPickYear={(y) => { setYear(y); go(TABS.indexOf('월별')); }} />;
    if (t === '월별') return <Months R={R} year={year} setYear={setYear} nowYear={data.current.nowYear} nowMonth={data.current.nowMonth} />;
    return <Category R={R} cat={t} nowYear={data.current.nowYear} />;
  };
  return (
    <motion.div className="reading" initial={{ opacity: 0, y: '6%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '6%' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
      <div className="rbar"><button type="button" className="rclose" onClick={onClose} aria-label="닫기">✕</button><span className="rname">{data.meta.name || '사주'} · 해석</span><span /></div>
      <AnimatePresence mode="wait">
        {phase === 'intro' ? <Intro key="intro" data={data} onDone={() => setPhase('read')} /> : (
          <motion.div key="read" className="rread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <nav className="rtabs">
              {TABS.map((t, i) => (
                <button type="button" key={t} className={i === tab ? 'on' : ''} onClick={() => go(i)} style={CAT_META[t] ? { '--c': CAT_META[t].color } : undefined}>
                  {CAT_META[t] && <small>{CAT_META[t].hanja}</small>}{t}{i === tab && <motion.i layoutId="rtab-ind" className="rind" />}
                </button>
              ))}
            </nav>
            <div className="rbody">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={tab} className="rpage" custom={dir} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15} onDragEnd={onDrag}
                  initial={{ opacity: 0, x: dir * 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -dir * 60 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                  {content()}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="rnav">
              <button type="button" disabled={tab === 0} onClick={() => go(tab - 1)}>← {TABS[tab - 1] || ''}</button>
              <span>{tab + 1} / {TABS.length}</span>
              <button type="button" disabled={tab === TABS.length - 1} onClick={() => go(tab + 1)}>{TABS[tab + 1] || ''} →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
