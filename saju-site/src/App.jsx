import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { calculate } from './saju/calc.js';
import { loadClaims } from './saju/claims.js';
loadClaims(); // 전문가 지식 색인은 용량이 커서 번들 밖(public/kb_claims.json)에 두고 앱 시작 때 내려받는다
import Landing from './components/Landing.jsx';
import Result from './components/Result.jsx';
import Passage from './components/Passage.jsx';

export default function App() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState('opening');
  const [result, setResult] = useState(null);
  const [input, setInput] = useState(null);
  const [error, setError] = useState('');
  const submit = (value) => {
    try {
      const data = calculate(value);
      setInput(value); setResult(data); setError(''); setPhase('calculating');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      setError('날짜를 다시 확인해 주세요. 음력이라면 해당 월의 날짜와 윤달 여부도 확인해 주세요.');
    }
  };
  return <AnimatePresence mode="wait">
    {phase === 'opening' ? <motion.div key="opening" className="opening" exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .35 }}>
      <motion.div className="opening-mark" initial={{ opacity: 0, scale: .86, filter: 'blur(16px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: reduced ? 0 : 1.5 }} onAnimationComplete={() => setPhase('input')} aria-label="천기록 시작">
        <span>命</span><p>천 기 록</p>
      </motion.div>
      <button className="skip-intro" onClick={() => setPhase('input')}>건너뛰기 →</button>
    </motion.div> : phase === 'calculating' ? <Passage key="calculating" data={result} onDone={() => setPhase('result')} /> : phase === 'result' ? <motion.main key="result" className="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Result data={result} onReset={() => { setPhase('opening'); window.scrollTo({ top: 0, behavior: 'instant' }); }} onHome={() => { setResult(null); setInput(null); setError(''); setPhase('opening'); window.scrollTo({ top: 0, behavior: 'instant' }); }} />
    </motion.main> : <motion.main key="input" className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .6 }}>
      <Landing onSubmit={submit} error={error} initialInput={input} />
    </motion.main>}
  </AnimatePresence>;
}
