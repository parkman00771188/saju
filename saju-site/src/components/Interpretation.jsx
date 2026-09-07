import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { interpret } from '../saju/interpret.js';

const SECTION_DELAY = 1.6; // 섹션 간 간격(초)

function Brush() {
  // 먹붓이 지나가는 듯한 획 애니메이션
  return (
    <svg className="brush" viewBox="0 0 600 120" preserveAspectRatio="none">
      <motion.path
        d="M10 70 C 120 20, 200 110, 320 60 S 520 30, 590 70"
        fill="none" stroke="url(#ink)" strokeWidth="14" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 1, 0.35] }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
      />
      <defs>
        <linearGradient id="ink" x1="0" x2="1">
          <stop offset="0" stopColor="#f0d495" /><stop offset="1" stopColor="#8a6a2a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Section({ s, index, active, onDone }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    setShown(0);
    const timers = s.paragraphs.map((_, i) => setTimeout(() => setShown(i + 1), 350 + i * 700));
    const end = setTimeout(onDone, 350 + s.paragraphs.length * 700 + 300);
    return () => { timers.forEach(clearTimeout); clearTimeout(end); };
  }, [active, s, onDone]);

  return (
    <motion.article className="isec" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <header>
        <span className="inum">{['一', '二', '三', '四', '五', '六', '七', '八'][index]}</span>
        <h4>{s.title} <small>{s.hanja}</small></h4>
      </header>
      <div className="ibody">
        {s.paragraphs.map((p, i) => (
          <motion.p key={i} initial={{ opacity: 0, filter: 'blur(6px)', y: 8 }}
            animate={i < shown ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut' }}>{p}</motion.p>
        ))}
      </div>
      {shown >= s.paragraphs.length && (s.sources.length > 0) && (
        <motion.footer className="isrc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <span className="ilabel">근거 영상 {s.docs.toLocaleString()}편 분석</span>
          {s.themes.length > 0 && <span className="ithemes">{s.themes.map((t) => <i key={t}>#{t}</i>)}</span>}
          <ul>
            {s.sources.map((v) => (
              <li key={v.id}><a href={v.url} target="_blank" rel="noreferrer"><b>{v.channel}</b> {v.title}</a></li>
            ))}
          </ul>
        </motion.footer>
      )}
    </motion.article>
  );
}

export default function Interpretation({ data }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1); // -1: 인트로, 0..n-1: 섹션 진행, n: 완료
  const ref = useRef(null);
  const result = useMemo(() => interpret(data), [data]);
  const { sections } = result;

  const start = () => {
    setOpen(true);
    setStep(-1);
    setTimeout(() => setStep(0), 1900);
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };
  const next = () => setStep((s) => Math.min(s + 1, sections.length));
  const skip = () => setStep(sections.length);

  return (
    <div className="interp" ref={ref}>
      {!open && (
        <motion.button type="button" className="ibtn" onClick={start}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <span className="ibtn-hanja">解</span>
          <span className="ibtn-text">
            <b>사주 해석 보기</b>
            <small>사주 강의 영상 {result.meta.docs.toLocaleString()}편을 분석한 해석을 읽어드립니다</small>
          </span>
          <i className="ibtn-glow" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div className="ipanel card" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <div className="ihead">
              <Brush />
              <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>命을 읽습니다</motion.p>
              <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}>
                {data.meta.name || '당신'}의 사주 해석
              </motion.h3>
              <motion.p className="isub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
                {result.meta.channels.map((c) => c[1]).join(' · ')} 채널 {result.meta.docs.toLocaleString()}편 · {(result.meta.chars / 10000).toFixed(0)}만 자의 강의 원문에서 개념별 빈도와 주제를 분석해 구성했습니다.
              </motion.p>
              {step >= 0 && step < sections.length && (
                <button type="button" className="iskip" onClick={skip}>한 번에 펼치기</button>
              )}
            </div>

            <div className="isections">
              {sections.map((s, i) => (
                (i <= step || step >= sections.length) && (
                  <Section key={s.id} s={s} index={i} active={i === step || step >= sections.length} onDone={i === step ? next : () => {}} />
                )
              ))}
            </div>

            {step >= 0 && step < sections.length && (
              <div className="iprogress">
                <span style={{ width: `${(step / sections.length) * 100}%` }} />
              </div>
            )}
            {step >= sections.length && (
              <motion.p className="iend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                해석은 명리 이론과 공개 강의 영상의 경향을 종합한 참고 자료입니다. 중요한 결정은 여러 관점을 함께 살펴 주세요.
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
