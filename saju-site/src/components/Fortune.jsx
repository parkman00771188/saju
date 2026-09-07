import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Tile from './Tile.jsx';

function Card({ g, top, sub, active, onClick, delay = 0, badge, small }) {
  const Component = onClick ? motion.button : motion.div;
  return (
    <Component type={onClick ? 'button' : undefined} aria-pressed={onClick ? active : undefined} className={`fcard ${active ? 'active' : ''} ${small ? 'small' : ''}`} onClick={onClick}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <div className="ftop">{top}</div>
      {sub && <div className="fsub">{sub}</div>}
      {badge && <span className="fbadge">{badge}</span>}
      <div className="fgod">{g.stemGod}</div>
      <Tile ch={g.stem} ko={g.stemKo} el={g.stemEl} size="sm" flip={false} />
      <Tile ch={g.branch} ko={g.branchKo} el={g.branchEl} size="sm" flip={false} />
      <div className="fgod">{g.branchGod}</div>
      <div className="fmeta">{g.stage}</div>
      <div className="fmeta">{g.sal}</div>
    </Component>
  );
}

function Block({ title, sub, children }) {
  return (
    <div className="fblock">
      <div className="fbhead">
        <h3>{title} <small>{sub}</small></h3>
      </div>
      {children}
    </div>
  );
}

export default function Fortune({ data }) {
  const { daeun, current, meta } = data;
  const [dIdx, setDIdx] = useState(() => Math.max(0, daeun.findIndex((d) => d.index === current.daeun?.index)));
  const [year, setYear] = useState(current.nowYear);
  const d = daeun[dIdx];
  const seun = d?.seun || [];
  const s = useMemo(() => seun.find((x) => x.year === year) || seun[0], [seun, year]);
  const pickDaeun = (i) => { setDIdx(i); const first = daeun[i].seun; if (!first.some((x) => x.year === year)) setYear(first[0].year); };

  return (
    <div className="fortune">
      <Block title="대운" sub={`10년 주기 · ${meta.forward ? '순행' : '역행'} · 첫 대운 ${meta.daeunStart}`}>
        <div className="strip">
          {daeun.map((x, i) => (
            <Card key={x.index} g={x} top={x.age} sub={x.startYear} active={i === dIdx} onClick={() => pickDaeun(i)} delay={i * 0.04} badge={x.index === current.daeun?.index ? '현재' : null} />
          ))}
        </div>
      </Block>
      <Block title="세운" sub={`${d?.text} 대운의 열 해`}>
        <div className="strip">
          {seun.map((x, i) => (
            <Card key={x.year} g={x} top={x.year} sub={`${x.age}세`} active={x.year === s?.year} onClick={() => setYear(x.year)} delay={i * 0.03}
              badge={x.year === current.nowYear ? '올해' : x.samjae ? '삼재' : null} />
          ))}
        </div>
      </Block>
      <Block title="월운" sub={`${s?.year}년 ${s?.text}`}>
        <div className="strip">
          {(s?.wolun || []).map((m, i) => (
            <Card key={m.monthNo} g={m} top={`${m.monthNo}월`} small active={s?.year === current.nowYear && m.monthNo === current.nowMonth}
              badge={s?.year === current.nowYear && m.monthNo === current.nowMonth ? '이달' : null} delay={i * 0.02} />
          ))}
        </div>
      </Block>
    </div>
  );
}
