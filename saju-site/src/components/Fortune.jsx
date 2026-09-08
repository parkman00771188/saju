import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Tile from './Tile.jsx';
import { unRelations } from '../saju/unrel.js';

function Card({ g, top, sub, active, onClick, delay = 0, badge, small, tags = [] }) {
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
      <div className="fmeta">{[g.stage, g.sal].filter(Boolean).join(' · ')}</div>
      <div className="ftags" aria-label="원국과의 합충">{tags.length ? tags.slice(0, 3).map((t) => <i key={t.short} className={`ft ${t.tone}`}>{t.short}</i>) : <i className="ft none">—</i>}</div>
    </Component>
  );
}

function Block({ title, sub, children }) {
  const ref = useRef(null);
  useEffect(() => {
    // 창(세로)은 건드리지 않고 카드 띠 안에서만 가로로 가운데 정렬
    const strip = ref.current?.querySelector('.strip'); const el = strip?.querySelector('.fcard.active');
    if (!strip || !el) return;
    const sr = strip.getBoundingClientRect(), er = el.getBoundingClientRect();
    const delta = (er.left + er.width / 2) - (sr.left + sr.width / 2);
    if (Math.abs(delta) > 2) strip.scrollBy({ left: delta, behavior: 'smooth' });
  });
  return (
    <div className="fblock" ref={ref}>
      <div className="fbhead">
        <h3>{title} <small>{sub}</small></h3>
      </div>
      {children}
    </div>
  );
}

/** 선택한 운 기둥과 원국의 합·충·형·파·해 및 지장간 관계 — 요약은 항상, 상세는 펼쳐서 */
function RelPanel({ g, data, label }) {
  const r = useMemo(() => (g ? unRelations(data, g) : null), [data, g]);
  if (!g || !r) return null;
  const rows = [['천간', r.stem], ['지지', r.branch], ['지장간', r.hidden]];
  const total = r.stem.length + r.branch.length + r.hidden.length;
  return (
    <details className="relpanel">
      <summary>
        <span className="rp-title"><b>{label} {g.text}</b><span className="rp-sub">원국과의 합·충·형·파·해 {total ? `${total}건` : '없음'}</span></span>
        <span className="rp-tags">{r.tags.length ? r.tags.map((t) => <i key={t.short} className={`ft ${t.tone}`}>{t.short}</i>) : <i className="ft none">관계 없음</i>}<i className="rp-more">자세히</i></span>
        {r.note && <span className="rp-note">{r.note}</span>}
      </summary>
      <div className="rp-body">
        {rows.map(([k, list]) => (
          <div className="rp-row" key={k}>
            <span className="rp-k">{k}</span>
            <div className="rp-list">{list.length ? list.map((x) => <span key={x.key} className={`rp-tag ${x.tone}`}>{x.label}</span>) : <span className="rp-none">해당 없음</span>}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function Fortune({ data }) {
  const { daeun, current, meta } = data;
  const [dIdx, setDIdx] = useState(() => Math.max(0, daeun.findIndex((d) => d.index === current.daeun?.index)));
  const [year, setYear] = useState(current.nowYear);
  const [mNo, setMNo] = useState(current.nowMonth);
  const d = daeun[dIdx];
  const seun = d?.seun || [];
  const s = useMemo(() => seun.find((x) => x.year === year) || seun[0], [seun, year]);
  const m = useMemo(() => (s?.wolun || []).find((x) => x.monthNo === mNo) || s?.wolun?.[0], [s, mNo]);
  const pickDaeun = (i) => { setDIdx(i); const first = daeun[i].seun; if (!first.some((x) => x.year === year)) setYear(first[0].year); };
  const tagsOf = (g) => unRelations(data, g).tags;

  return (
    <div className="fortune">
      <Block title="대운" sub={`10년 주기 · ${meta.forward ? '순행' : '역행'} · 첫 대운 ${meta.daeunStart}`}>
        <div className="strip">
          {daeun.map((x, i) => (
            <Card key={x.index} g={x} top={x.age} sub={x.startYear} active={i === dIdx} onClick={() => pickDaeun(i)} delay={i * 0.04} badge={x.index === current.daeun?.index ? '현재' : null} tags={tagsOf(x)} />
          ))}
        </div>
        <RelPanel g={d} data={data} label={`${d?.age}세~ 대운`} />
      </Block>
      <Block title="세운" sub={`${d?.text} 대운의 열 해`}>
        <div className="strip">
          {seun.map((x, i) => (
            <Card key={x.year} g={x} top={x.year} sub={`${x.age}세`} active={x.year === s?.year} onClick={() => setYear(x.year)} delay={i * 0.03}
              badge={x.year === current.nowYear ? '올해' : x.samjae ? '삼재' : null} tags={tagsOf(x)} />
          ))}
        </div>
        <RelPanel g={s} data={data} label={`${s?.year}년 세운`} />
      </Block>
      <Block title="월운" sub={`${s?.year}년 ${s?.text}`}>
        <div className="strip">
          {(s?.wolun || []).map((x, i) => (
            <Card key={x.monthNo} g={x} top={`${x.monthNo}월`} small active={x.monthNo === m?.monthNo} onClick={() => setMNo(x.monthNo)}
              badge={s?.year === current.nowYear && x.monthNo === current.nowMonth ? '이달' : null} delay={i * 0.02} tags={tagsOf(x)} />
          ))}
        </div>
        <RelPanel g={m} data={data} label={`${s?.year}년 ${m?.monthNo}월 월운`} />
      </Block>
    </div>
  );
}
