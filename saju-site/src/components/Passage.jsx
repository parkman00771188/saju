import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Passage({ data, kind = 'chart', onDone }) {
  const reduced = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => done.current(), reduced ? 80 : 1850);
    return () => clearTimeout(timer);
  }, [reduced]);
  const chars = data.order.filter(k => data.pillars[k]).flatMap(k => [data.pillars[k].stem, data.pillars[k].branch]);
  return <motion.div className="passage" role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .25 }}>
    <div className="passage-art" aria-hidden="true">
      <svg viewBox="0 0 300 300"><motion.circle cx="150" cy="150" r="133" fill="none" stroke="currentColor" strokeWidth=".7" initial={{ pathLength: 0, rotate: -90 }} animate={{ pathLength: 1, rotate: 0 }} transition={{ duration: 1.4 }}/><circle cx="150" cy="150" r="112" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 8"/></svg>
      <motion.span initial={{ opacity: 0, scale: .85, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0)' }} transition={{ duration: .7 }}>{kind === 'chart' ? '命' : '解'}</motion.span>
    </div>
    <h2>{kind === 'chart' ? '태어난 순간을 펼칩니다' : '여덟 글자의 이야기를 잇습니다'}</h2>
    <p>{kind === 'chart' ? '나의 사주팔자와 시간의 흐름' : '나의 바탕, 서로 만나는 기운, 다가오는 때'}</p>
    <div className="passage-letters" aria-hidden="true">{chars.map((ch, i) => <motion.span key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .3 + i * .09 }}>{ch}</motion.span>)}</div>
    <button onClick={() => done.current()} className="passage-skip">바로 보기 →</button>
  </motion.div>;
}
