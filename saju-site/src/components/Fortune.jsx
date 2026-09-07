import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Tile from './Tile.jsx';
import { SAL_DESC, TEN_GOD_DESC } from '../saju/tables.js';

function Card({ g, top, sub, active, onClick, delay = 0, badge, small }) {
  return (
    <motion.button
      type="button"
      className={`fcard ${active ? 'active' : ''} ${small ? 'small' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      <div className="ftop">{top}</div>
      {sub && <div className="fsub">{sub}</div>}
      {badge && <span className="fbadge">{badge}</span>}
      <div className="fgod" title={TEN_GOD_DESC[g.stemGod]}>{g.stemGod}</div>
      <Tile ch={g.stem} ko={g.stemKo} el={g.stemEl} size={small ? 'sm' : 'md'} flip={false} />
      <Tile ch={g.branch} ko={g.branchKo} el={g.branchEl} size={small ? 'sm' : 'md'} flip={false} />
      <div className="fgod" title={TEN_GOD_DESC[g.branchGod]}>{g.branchGod}</div>
      <div className="fmeta">{g.stage}</div>
      <div className="fmeta" title={SAL_DESC[g.sal]}>{g.sal}</div>
    </motion.button>
  );
}

export default function Fortune({ data }) {
  const { daeun, current, meta } = data;
  const [dIdx, setDIdx] = useState(() => Math.max(0, daeun.findIndex((d) => d.index === current.daeun?.index)));
  const [year, setYear] = useState(current.nowYear);
  const [showAll, setShowAll] = useState(false);

  const d = daeun[dIdx];
  const seun = d?.seun || [];
  const s = useMemo(() => seun.find((x) => x.year === year) || seun[0], [seun, year]);

  const pickDaeun = (i) => { setDIdx(i); const first = daeun[i].seun; if (!first.some((x) => x.year === year)) setYear(first[0].year); };

  return (
    <div className="fortune">
      <div className="fhead">
        <h3>대운 <small>大運 · 10년마다 바뀌는 큰 흐름 · {meta.forward ? '순행' : '역행'}</small></h3>
        <p className="fnote">첫 대운 시작 {meta.daeunStart} ({meta.daeunStartText})</p>
      </div>
      <div className="strip">
        {daeun.map((x, i) => (
          <Card key={x.index} g={x} top={x.age} sub={x.startYear} active={i === dIdx} onClick={() => pickDaeun(i)} delay={i * 0.05}
            badge={x.index === current.daeun?.index ? '현재' : null} />
        ))}
      </div>

      <div className="fhead">
        <h3>세운 <small>歲運 · {d?.text} 대운의 열 해</small></h3>
      </div>
      <div className="strip">
        <AnimatePresence mode="popLayout">
          {seun.map((x, i) => (
            <Card key={x.year} g={x} top={x.year} sub={`${x.age}세`} active={x.year === s?.year} onClick={() => setYear(x.year)} delay={i * 0.04}
              badge={x.year === current.nowYear ? '올해' : x.samjae ? '삼재' : null} />
          ))}
        </AnimatePresence>
      </div>

      <div className="fhead">
        <h3>월운 <small>月運 · {s?.year}년 {s?.text}의 열두 달</small></h3>
      </div>
      <div className="strip months">
        {(s?.wolun || []).map((m, i) => (
          <Card key={m.monthNo} g={m} top={`${m.monthNo}월`} small active={s?.year === current.nowYear && m.monthNo === current.nowMonth}
            badge={s?.year === current.nowYear && m.monthNo === current.nowMonth ? '이달' : null} delay={i * 0.03} />
        ))}
      </div>

      <button type="button" className="toggle" onClick={() => setShowAll((v) => !v)}>
        {showAll ? '접기' : '인생 100년 운의 흐름 펼치기'} <i className={showAll ? 'up' : ''} />
      </button>
      <AnimatePresence>
        {showAll && (
          <motion.div className="century" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5 }}>
            {daeun.map((x) => (
              <div className="cblock" key={x.index}>
                <div className="chead"><span className="hj">{x.text}</span><span>{x.age}세 · {x.stemGod}/{x.branchGod}</span></div>
                {x.seun.map((y) => (
                  <div key={y.year} className={`crow ${y.year === current.nowYear ? 'now' : ''} ${y.samjae ? 'samjae' : ''}`}>
                    <span>{y.year}</span><span className="hj">{y.text}</span><span>{y.age}</span>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
