import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CosmosScene } from './three/CosmosScene.js';
import { calculate } from './saju/calc.js';
import Landing from './components/Landing.jsx';
import Result from './components/Result.jsx';

export default function App() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [phase, setPhase] = useState('intro'); // intro | warping | result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const scene = new CosmosScene(canvasRef.current);
    scene.init();
    sceneRef.current = scene;
    return () => scene.dispose();
  }, []);

  const handleSubmit = useCallback(async (input) => {
    let r;
    try {
      r = calculate(input);
    } catch (e) {
      console.error(e);
      setError('사주를 계산할 수 없는 날짜입니다. 입력값을 다시 확인해 주세요.');
      return;
    }
    setError('');
    setPhase('warping');
    await sceneRef.current.warp();
    setResult(r);
    setPhase('result');
    window.scrollTo({ top: 0 });
  }, []);

  const reset = useCallback(() => {
    setPhase('intro');
    setResult(null);
    sceneRef.current?.setMode('intro');
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={`cosmos ${phase}`} />
      <div className="vignette" />

      <AnimatePresence mode="wait">
        {phase !== 'result' && (
          <motion.main
            key="landing"
            className="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'warping' ? 0 : 1, scale: phase === 'warping' ? 1.08 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            <Landing onSubmit={handleSubmit} error={error} busy={phase === 'warping'} />
          </motion.main>
        )}
        {phase === 'result' && result && (
          <motion.main
            key="result"
            className="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Result data={result} onReset={reset} />
          </motion.main>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'warping' && (
          <motion.div
            key="flash"
            className="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, times: [0, 0.75, 1], ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
