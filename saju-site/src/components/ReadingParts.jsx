import { motion } from 'framer-motion';
import { CATS, CAT_META } from '../data/knowledge.js';
import Tile from './Tile.jsx';

const KW_JUNK = /(일주|일간|사주|인데|태어|이라|라고|이신|하신|하시|되시|분들|같은|이런|그런|저런|이제|그냥|정도|경우|들여$|있거$|거$|여$|은$|는$|을$|를$|에$|의$|으로$|해서$|하고$)/;
export const cleanKw = (arr) => arr.filter((k) => !KW_JUNK.test(k));
export const polClass = (pol) => (pol > 0 ? 'p' : pol < 0 ? 'n' : 'z');
export const polMark = (pol) => (pol > 0 ? '吉' : pol < 0 ? '凶' : '中');

export function Score({ n, color }) {
  return (
    <span className="score" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => <motion.i key={i} style={{ background: i <= n ? color || 'var(--gold)' : 'var(--line)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 300, damping: 15 }} />)}
    </span>
  );
}
export function Paras({ items, delay = 0 }) {
  return items.filter(Boolean).map((p, i) => (
    <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + Math.min(i, 8) * 0.05, duration: 0.45 }}>{p}</motion.p>
  ));
}
export function GZ({ g, size = 'sm' }) {
  return <span className="gz-pair"><Tile ch={g.stem} ko={g.stemKo} el={g.stemEl} size={size} flip={false} /><Tile ch={g.branch} ko={g.branchKo} el={g.branchEl} size={size} flip={false} /></span>;
}
export function Bars({ scores, small }) {
  return (
    <div className={`catbars ${small ? 'small' : ''}`}>
      {CATS.map((c) => (
        <div key={c} className="cb"><span className="cbl" style={{ color: CAT_META[c].color }}>{c}</span>
          <div className="cbt"><motion.i style={{ background: CAT_META[c].color }} initial={{ width: 0 }} animate={{ width: `${scores[c] * 20}%` }} transition={{ duration: 0.7 }} /></div><b>{scores[c]}</b></div>
      ))}
    </div>
  );
}
export function Gauge({ g, color }) {
  return (
    <div className="gauge">
      <div className="gl"><span>{g.left}</span><b>{g.label}</b><span>{g.right}</span></div>
      <div className="gt"><motion.i style={{ background: color }} initial={{ left: '50%' }} animate={{ left: `${g.value}%` }} transition={{ duration: 0.9 }} /></div>
    </div>
  );
}
export function Meter({ stats }) {
  if (!stats) return <span className="meter"><small>전문가 의견 데이터 없음</small></span>;
  const pct = ((stats.polarity + 1) / 2) * 100;
  const top = Object.entries(stats.categories || {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 2);
  return (
    <span className="meter" title={`긍정어 ${stats.pos} · 부정어 ${stats.neg}`}>
      <span>전문가 언급 {stats.mentions}회</span>
      <span className="bar2"><i style={{ left: `${pct}%` }} /></span>
      <span>{stats.polarity > 0.15 ? '긍정 우세' : stats.polarity < -0.15 ? '부정 우세' : '중립'}</span>
      {top.length > 0 && <span className="ctx">{top.map(([c]) => <b key={c}>{c}</b>)}</span>}
    </span>
  );
}
export function Sec({ icon, title, sub, color, children, id }) {
  return (
    <motion.section id={id} className="rsec" style={color ? { '--c': color } : undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <header><i className="rsec-ic">{icon}</i><div><h4>{title}</h4>{sub && <small>{sub}</small>}</div></header>
      <div className="rsec-body">{children}</div>
    </motion.section>
  );
}
export function Stats({ items }) {
  return (
    <div className="stats">
      {items.map((it, i) => (
        <motion.div key={i} className="stat" style={it.color ? { '--c': it.color } : undefined} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
          <small>{it.label}</small><b>{it.value}</b>{it.sub && <span>{it.sub}</span>}
        </motion.div>
      ))}
    </div>
  );
}
export function Evidence({ rows, title, note }) {
  if (!rows || !rows.length) return null;
  return (
    <div className="evbox">
      {title && <h4 className="rh4" style={{ marginTop: 0 }}>{title}</h4>}
      {note && <p className="muted" style={{ margin: '0 0 8px' }}>{note}</p>}
      {rows.map((r, i) => (
        <motion.div className="evrow" key={r.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
          <i className={polClass(r.pol)}>{polMark(r.pol)}</i>
          <div><b>{r.label}</b><p>{r.text}</p><small>전문가들이 짚은 글자: {r.from.slice(0, 4).join(' · ')}</small></div>
          <span className="evn">{r.n || r.docs}회</span>
        </motion.div>
      ))}
    </div>
  );
}
export function PatternCard({ p, i, claimMeta }) {
  const claims = (p.stats?.claims || []).slice(0, 5);
  return (
    <motion.article className="pcard" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 4) * 0.06 }}>
      <header><h4>{p.title} <small>{p.kind}</small></h4><Meter stats={p.stats} /></header>
      <p className="img">{p.img}</p>
      <div className="pos"><i>吉</i><p>{p.pos}</p></div>
      <div className="neg"><i>凶</i><p>{p.neg}</p></div>
      {claims.length > 0 && (
        <div className="pclaims">
          <span style={{ background: 'transparent', color: 'var(--ink-faint)', padding: '2px 0' }}>전문가들이 함께 말하는 것:</span>
          {claims.map(([label, n]) => <span key={label} className={polClass(claimMeta[label]?.[1] ?? 0)}>{label} {n}회</span>)}
        </div>
      )}
      {p.stats?.keywords?.length > 0 && <div className="kws">{cleanKw(p.stats.keywords).slice(0, 6).map((k) => <i key={k}>#{k}</i>)}</div>}
    </motion.article>
  );
}
