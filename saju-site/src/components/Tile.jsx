import { motion } from 'framer-motion';
import { ELEMENT_COLOR, ELEMENT_KO } from '../saju/tables.js';

/** 천간/지지 한 글자 타일. size: sm | md | lg */
export default function Tile({ ch, ko, el, size = 'md', ghost = false, delay = 0, flip = true, className = '' }) {
  const c = el ? ELEMENT_COLOR[el] : null;
  const style = ghost || !c
    ? { background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.35)', borderColor: 'rgba(255,255,255,.12)' }
    : { background: `linear-gradient(160deg, ${c.bg} 0%, ${shade(c.bg, -18)} 100%)`, color: c.fg, boxShadow: `0 8px 24px -8px ${c.glow}, inset 0 1px 0 rgba(255,255,255,.25)` };
  return (
    <motion.div
      className={`tile ${size} ${className}`}
      style={style}
      initial={flip ? { rotateY: 90, opacity: 0 } : false}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      title={el ? `${ch} · ${ELEMENT_KO[el]}(${el})` : undefined}
    >
      <span className="hanja">{ch ?? '?'}</span>
      {ko && <span className="ko">{ko}</span>}
    </motion.div>
  );
}

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
