import kb from '../data/kb_stats.json';
import * as P from '../data/patterns.js';
import { BRANCH_ANIMAL, STEM_KO } from './tables.js';

/**
 * 전문가들의 신년운세 콘텐츠(일간별·띠별·일주별·전체)를 해당 사용자에게 맞게 합친다.
 * kb.years[key] = { docs, claims:[[label,n,docs]], timeline:{ '3월': { n, polarity, labels:[[label,n]] }, ... }, polarity, categories }
 */
const CLAIM_META = kb.meta?.claims || {};
const first = (s) => (s?.match(/^[^.!?]*[.!?]/) || [s || ''])[0];
const MONTH_ORDER = ['연초', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '상반기', '하반기', '연말'];
const hasBatchim = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : true; };
const EUL = (w) => (hasBatchim(w) ? '을' : '를');

export function yearExpert({ year, dayStem, yearBranch, dayText }) {
  const Y = kb.years || {};
  const srcs = [
    [`${dayStem}+Y${year}`, `${STEM_KO[dayStem]}${{ 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }[dayStem]} 일간`, 3],
    [`${dayText}+Y${year}`, `${dayText} 일주`, 3],
    [`${yearBranch}+Y${year}`, `${BRANCH_ANIMAL[yearBranch]}띠`, 2],
    [`Y${year}`, `${year}년 전체`, 0.3],
  ].map(([k, label, w]) => ({ key: k, label, w, data: Y[k] })).filter((s) => s.data);
  if (!srcs.length) return null;
  const claims = {};
  const months = {};
  const monthsPersonal = {};
  let docs = 0, personalDocs = 0, generalDocs = 0;
  for (const s of srcs) {
    docs += s.data.docs; if (s.w >= 2) personalDocs += s.data.docs; else generalDocs += s.data.docs;
    for (const [label, n, d] of s.data.claims || []) {
      const cat = CLAIM_META[label]?.[0] || '운', pol = CLAIM_META[label]?.[1] ?? 0;
      const row = (claims[label] ||= { label, cat, pol, n: 0, docs: 0, from: [], score: 0 });
      row.n += n; row.docs += d; row.score += d * s.w; if (!row.from.includes(s.label)) row.from.push(s.label);
    }
    for (const [mk, t] of Object.entries(s.data.timeline || {})) {
      for (const bucket of s.w >= 2 ? [months, monthsPersonal] : [months]) {
        const m = (bucket[mk] ||= { n: 0, pos: 0, labels: {} });
        m.n += t.n; m.pos += t.polarity * t.n;
        for (const [label, n] of t.labels || []) m.labels[label] = (m.labels[label] || 0) + n * s.w;
      }
    }
  }
  const rows = Object.values(claims).sort((a, b) => b.score - a.score);
  const byCat = {};
  for (const r of rows) (byCat[r.cat] ||= []).push(r);
  const useMonths = Object.keys(monthsPersonal).length >= 3 ? monthsPersonal : months;
  const monthList = MONTH_ORDER.filter((mk) => useMonths[mk] && useMonths[mk].n >= 2).map((mk) => {
    const m = useMonths[mk];
    const labels = Object.entries(m.labels).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => ({ label, pol: CLAIM_META[label]?.[1] ?? 0, cat: CLAIM_META[label]?.[0] || '운' }));
    return { mk, n: m.n, polarity: m.n ? m.pos / m.n : 0, labels };
  });
  const only = srcs.filter((s) => s.w >= 2).map((s) => s.label);
  return { year, docs, personalDocs, generalDocs, sources: srcs.map((s) => s.label), personalSources: only, rows, byCat, months: monthList };
}

/** 영역별 문단 */
export function yearExpertParas(ye, cat, limit = 3) {
  if (!ye) return [];
  const rows = (ye.byCat[cat] || []).slice(0, limit);
  if (!rows.length) return [];
  const pos = rows.filter((r) => r.pol > 0), neg = rows.filter((r) => r.pol < 0);
  const who = ye.personalSources.length ? `${ye.personalSources.join('·')}${EUL(ye.personalSources[ye.personalSources.length - 1])} 다룬 ${ye.personalDocs}편${ye.generalDocs ? `(전체 운세 ${ye.generalDocs}편 참고)` : ''}` : `전체 ${ye.docs}편`;
  const lead = `${ye.year}년 신년운세 강의 중 ${who}에서 ${cat} 관련으로 자주 짚는 것은 ${rows.map((r) => `'${r.label}'`).join(', ')}이에요.`;
  const detail = [pos.length ? `좋게 보는 흐름은 ${pos.map((r) => r.label).join('·')} — ${first(P.CLAIM_TEXT[pos[0].label] || '')}` : null, neg.length ? `조심하라는 흐름은 ${neg.map((r) => r.label).join('·')} — ${first(P.CLAIM_TEXT[neg[0].label] || '')}` : null].filter(Boolean).join(' ');
  const monthsFor = ye.months.filter((m) => m.labels.some((l) => l.cat === cat)).slice(0, 5);
  const monthLine = monthsFor.length ? `달로는 ${monthsFor.map((m) => `${m.mk}(${m.labels.filter((l) => l.cat === cat).map((l) => l.label).join('·')})`).join(', ')}을 짚어요.` : '';
  return [lead, detail, monthLine].filter(Boolean);
}

/** 올해 전체 요약 문단 + 월별 표 */
export function yearExpertOverview(ye) {
  if (!ye) return { paras: [], months: [] };
  const top = ye.rows.slice(0, 6);
  const pos = top.filter((r) => r.pol > 0), neg = top.filter((r) => r.pol < 0);
  const paras = [
    `${ye.year}년 신년운세 강의 가운데 ${ye.personalSources.length ? `${ye.personalSources.join('·')}${EUL(ye.personalSources[ye.personalSources.length - 1])} 다룬 ${ye.personalDocs}편` : `전체 ${ye.docs}편`}${ye.generalDocs && ye.personalSources.length ? `을 중심으로, 그해 전체 운세 ${ye.generalDocs}편을 참고해` : ''} 모아 보면 가장 자주 나오는 주제는 ${top.map((r) => `'${r.label}'`).join(', ')}이에요.`,
    pos.length ? `좋게 보는 쪽: ${pos.map((r) => `${r.label} — ${first(P.CLAIM_TEXT[r.label] || '')}`).join(' ')}` : null,
    neg.length ? `조심하라는 쪽: ${neg.map((r) => `${r.label} — ${first(P.CLAIM_TEXT[r.label] || '')}`).join(' ')}` : null,
  ].filter(Boolean);
  return { paras, months: ye.months };
}
