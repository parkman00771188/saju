/**
 * 전문가 강의 지식 색인(public/kb_claims.json) 로더.
 *  - analysis/extract_knowledge.py → build_knowledge.py 가 만든 "조건 키 → 결과 라벨별 집계(대표 결과 문장·원문 인용·조언·리프트)"
 *  - 용량이 커서 번들에 넣지 않고 앱 시작 시 한 번 내려받아 모듈 캐시에 둔다. interpret() 는 동기 함수라 getClaims() 로 캐시를 읽고,
 *    아직 없으면 kb_stats(정규식 통계)로 대체한다. App 은 로드 완료 후 재해석되도록 claimsVersion 을 의존성에 넣는다.
 */
let cache = null, pending = null, version = 0;
const listeners = new Set();

export function loadClaims() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL || '/'}kb_claims.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { cache = j && j.by_key ? j : { meta: {}, by_key: {} }; version += 1; for (const fn of listeners) fn(version); return cache; })
      .catch(() => { cache = { meta: {}, by_key: {} }; version += 1; for (const fn of listeners) fn(version); return cache; });
  }
  return pending;
}
export const getClaims = () => cache;
export const claimsVersion = () => version;
export function onClaims(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** 한 키의 항목들. 없으면 [] */
export function claimItems(key) {
  const p = cache?.by_key?.[key];
  return p ? p.items.map((it) => ({ ...it, keyDocs: p.docs })) : [];
}
/** 두 키가 함께 걸린 주장(짝 키) */
export function pairItems(a, b) {
  if (!cache?.by_key) return [];
  const k = a < b ? `${a}&${b}` : `${b}&${a}`;
  const p = cache.by_key[k];
  return p ? p.items.map((it) => ({ ...it, keyDocs: p.docs, pair: k })) : [];
}
