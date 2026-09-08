import { STEM_KO, BRANCH_KO, BRANCH_ANIMAL } from './tables.js';

/** 전문가 발언 다이제스트(public/kb_digest.json) 로더 — 한 번만 내려받아 캐시 */
let cache = null, pending = null;
export function loadDigest() {
  if (cache) return Promise.resolve(cache);
  if (!pending) pending = fetch(`${import.meta.env.BASE_URL || '/'}kb_digest.json`).then((r) => (r.ok ? r.json() : {})).then((j) => (cache = j || {})).catch(() => (cache = {}));
  return pending;
}

const EL_OF = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
export function keyLabel(key) {
  if (/^[甲乙丙丁戊己庚辛壬癸]$/.test(key)) return `${STEM_KO[key]}${EL_OF[key]} 일간`;
  if (/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(key)) return `${STEM_KO[key[0]]}${BRANCH_KO[key[1]]} 일주`;
  if (/^[子丑寅卯辰巳午未申酉戌亥]$/.test(key)) return `${BRANCH_KO[key]}(${key})`;
  let m;
  if ((m = key.match(/^([甲乙丙丁戊己庚辛壬癸])\+Y(\d{4})$/))) return `${STEM_KO[m[1]]}${EL_OF[m[1]]} 일간 ${m[2]}년`;
  if ((m = key.match(/^([子丑寅卯辰巳午未申酉戌亥])\+Y(\d{4})$/))) return `${BRANCH_ANIMAL[m[1]]}띠 ${m[2]}년`;
  if ((m = key.match(/^([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\+Y(\d{4})$/))) return `${STEM_KO[m[1][0]]}${BRANCH_KO[m[1][1]]} 일주 ${m[2]}년`;
  if ((m = key.match(/^Y(\d{4})$/))) return `${m[1]}년 운세`;
  if ((m = key.match(/^([甲乙丙丁戊己庚辛壬癸])\+(.+)$/))) return `${STEM_KO[m[1]]}${EL_OF[m[1]]} 일간의 ${m[2]}`;
  if ((m = key.match(/^([년월일시])지\+(.+)$/))) return `${m[1]}지 ${m[2]}`;
  if (/과다$/.test(key)) return `${key[0]}(${{ 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }[key[0]]}) 많음`;
  if (/결핍$/.test(key)) return `${key[0]}(${{ 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }[key[0]]}) 없음`;
  return key;
}

/**
 * 여러 키의 문장을 영역별로 모아 n개 고른다. cat: '직장'|'금전'|'연애'|'건강'|'학업'|'성격'|'전체'|null(전체 영역)
 * 반환: [{ t, from }]
 */
export function pickDigest(digest, keys, cat = null, n = 5) {
  if (!digest) return [];
  const out = [], seen = new Set();
  const toks = (s) => new Set(s.match(/[가-힣]{2,}/g) || []);
  const dup = (s) => { const a = toks(s); for (const b of seen) { let inter = 0; for (const w of a) if (b.has(w)) inter++; if (inter && inter / Math.max(1, Math.min(a.size, b.size)) > 0.6) return true; } return false; };
  const cats = cat ? [cat, ...(cat === '성격' ? ['전체'] : [])] : ['전체', '성격', '직장', '금전', '연애', '건강', '학업'];
  // 키 순서를 우선(개인 키 → 일반 키), 같은 키에서 영역 순서대로
  for (const key of keys) {
    const d = digest[key]; if (!d) continue;
    for (const c of cats) for (const t of d[c] || []) {
      if (out.length >= n) return out;
      if (dup(t)) continue;
      out.push({ t, from: keyLabel(key), key }); seen.add(toks(t));
    }
  }
  return out;
}
