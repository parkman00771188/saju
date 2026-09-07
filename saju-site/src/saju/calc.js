// 사주 계산 엔진: lunar-javascript(음양력·절기·팔자·대운) + 한국식 규칙
import pkg from 'lunar-javascript';
import * as T from './tables.js';

const { Solar, Lunar } = pkg;

export const CITIES = [
  { name: '서울', lon: 126.98 }, { name: '대전', lon: 127.38 }, { name: '부산', lon: 129.08 },
  { name: '대구', lon: 128.6 }, { name: '인천', lon: 126.7 }, { name: '광주', lon: 126.85 },
  { name: '울산', lon: 129.31 }, { name: '수원', lon: 127.03 }, { name: '전주', lon: 127.15 },
  { name: '청주', lon: 127.49 }, { name: '강릉', lon: 128.9 }, { name: '제주', lon: 126.53 },
];

/** 해당 날짜의 한국 표준시 기준 경도(1954.3.21~1961.8.9는 UTC+8:30 → 127.5°) */
function standardMeridian(y, m, d) {
  const n = y * 10000 + m * 100 + d;
  if (n >= 19540321 && n <= 19610809) return 127.5;
  if (n >= 19080401 && n <= 19111231) return 127.5;
  return 135;
}

const gz = (s) => ({
  stem: s[0], branch: s[1],
  stemKo: T.STEM_KO[s[0]], branchKo: T.BRANCH_KO[s[1]],
  stemEl: T.STEM_ELEMENT[s[0]], branchEl: T.BRANCH_ELEMENT[s[1]],
  text: s,
});

function pairsIn(list, table, label) {
  // list: [{pos, ch}] 조합 중 table 에 있는 쌍/세트를 찾아 반환
  const found = [];
  for (const set of table) {
    const hits = set.map((ch) => list.filter((x) => x.ch === ch)).filter((a) => a.length);
    if (set.length === 2 && hits.length === 2) {
      for (const a of hits[0]) for (const b of hits[1]) found.push({ label, chars: [a, b] });
    } else if (set.length === 3 && hits.length === 3) {
      found.push({ label, chars: hits.map((h) => h[0]), full: true });
    } else if (set.length === 3 && hits.length === 2) {
      found.push({ label: '반' + label, chars: hits.map((h) => h[0]), half: true });
    }
  }
  return found;
}

/**
 * @param {object} input
 *  year, month, day, hour, minute, unknownTime, gender('남'|'여'),
 *  calendar('solar'|'lunar'|'leap'), koreaTime(bool), lon(number),
 *  yajasi(bool), jeolgi('ipchun'|'dongji'), name
 */
export function calculate(input) {
  const {
    year, month, day, gender, name = '',
    calendar = 'solar', koreaTime = true, lon = 127.0,
    yajasi = true, jeolgi = 'ipchun', unknownTime = false,
  } = input;
  let hour = unknownTime ? 12 : Number(input.hour);
  let minute = unknownTime ? 0 : Number(input.minute || 0);

  if (![year, month, day, hour, minute].every(Number.isInteger) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || !['solar', 'lunar', 'leap'].includes(calendar)) {
    throw new Error('Invalid birth input');
  }
  if (calendar === 'solar' && day > new Date(Date.UTC(year, month, 0)).getUTCDate()) throw new Error('Invalid calendar date');

  // 1) 입력을 양력으로 정규화
  let solarBirth;
  if (calendar === 'solar') {
    solarBirth = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  } else {
    const m = calendar === 'leap' ? -month : month;
    const lunarInput = Lunar.fromYmdHms(year, m, day, hour, minute, 0);
    solarBirth = lunarInput.getSolar();
    const roundTrip = solarBirth.getLunar();
    if (roundTrip.getYear() !== year || roundTrip.getMonth() !== m || roundTrip.getDay() !== day) throw new Error('Invalid lunar date');
  }

  // 2) 한국시 보정(경도차: 4분/도) → 진태양시 근사
  let calc = solarBirth;
  let correctionMin = 0;
  if (koreaTime && !unknownTime) {
    const std = standardMeridian(solarBirth.getYear(), solarBirth.getMonth(), solarBirth.getDay());
    correctionMin = Math.round((lon - std) * 4);
    const jd = solarBirth.getJulianDay() + correctionMin / 1440;
    calc = Solar.fromJulianDay(jd);
  }

  const lunar = calc.getLunar();
  const ec = lunar.getEightChar();
  // sect 2: 야자시(23시~) 일주는 당일, 시주는 다음날 기준 / sect 1: 23시부터 다음날 일주
  ec.setSect(yajasi ? 2 : 1);

  let yearGZ = ec.getYear();
  // 동지 기준 년주: 동지~입춘 사이면 다음 해 간지
  if (jeolgi === 'dongji') {
    const dj = lunar.getJieQiTable()['冬至'];
    const lc = lunar.getJieQiTable()['立春'];
    const t = calc.toYmdHms();
    if (dj && t >= dj.toYmdHms()) {
      yearGZ = lunar.getYearInGanZhiByLiChun ? nextYearGZ(yearGZ) : nextYearGZ(yearGZ);
    } else if (lc && t < lc.toYmdHms()) {
      // 입춘 이전이면서 동지 이후(전년도 동지)면 이미 다음해 처리됨(입춘 기준과 동일)
    }
  }

  const pillars = {
    year: gz(yearGZ),
    month: gz(ec.getMonth()),
    day: gz(ec.getDay()),
    time: unknownTime ? null : gz(ec.getTime()),
  };
  const dayStem = pillars.day.stem;
  const order = ['time', 'day', 'month', 'year'];
  const posKo = { time: '시', day: '일', month: '월', year: '년' };

  // 3) 기둥별 상세
  const detail = {};
  for (const pos of order) {
    const p = pillars[pos];
    if (!p) { detail[pos] = null; continue; }
    const hidden = T.HIDDEN_STEMS[p.branch].map((h) => ({
      stem: h, ko: T.STEM_KO[h], el: T.STEM_ELEMENT[h], god: T.tenGod(dayStem, h),
    }));
    detail[pos] = {
      ...p, pos, posKo: posKo[pos],
      stemGod: pos === 'day' ? '일간' : T.tenGod(dayStem, p.stem),
      branchGod: T.tenGod(dayStem, T.BRANCH_MAIN_STEM[p.branch]),
      stage: T.twelveStage(dayStem, p.branch),
      salYear: T.twelveSal(pillars.year.branch, p.branch),
      salDay: T.twelveSal(pillars.day.branch, p.branch),
      hidden,
      stemYang: T.isYangStem(p.stem), branchYang: T.isYangBranch(p.branch),
    };
  }

  // 4) 오행 분포 (천간+지지 8자)
  const elements = Object.fromEntries(T.ELEMENTS.map((e) => [e, 0]));
  const present = order.filter((k) => pillars[k]);
  for (const k of present) { elements[pillars[k].stemEl]++; elements[pillars[k].branchEl]++; }
  const missing = T.ELEMENTS.filter((e) => elements[e] === 0);
  const strongest = T.ELEMENTS.reduce((a, b) => (elements[b] > elements[a] ? b : a));

  // 5) 합충형파해
  const stems = present.map((k) => ({ pos: k, posKo: posKo[k], ch: pillars[k].stem, kind: 'stem' }));
  const branches = present.map((k) => ({ pos: k, posKo: posKo[k], ch: pillars[k].branch, kind: 'branch' }));
  const relations = {
    stemHap: pairsIn(stems, T.STEM_HAP, '천간합').map((r) => ({ ...r, result: T.STEM_HAP_RESULT[r.chars.map((c) => c.ch).sort((a, b) => T.STEMS.indexOf(a) - T.STEMS.indexOf(b)).join('')] })),
    stemChung: pairsIn(stems, T.STEM_CHUNG, '천간충'),
    yukhap: pairsIn(branches, T.BRANCH_YUKHAP, '육합'),
    samhap: pairsIn(branches, T.BRANCH_SAMHAP, '삼합'),
    banghap: pairsIn(branches, T.BRANCH_BANGHAP, '방합'),
    chung: pairsIn(branches, T.BRANCH_CHUNG, '충'),
    hyeong: [
      ...(() => {
        // 삼형이 성립하면 그 안의 쌍(寅巳·巳申 등)은 따로 세지 않는다
        const full = pairsIn(branches, T.BRANCH_SAMHYEONG, '삼형').filter((r) => r.full);
        const inFull = new Set(full.flatMap((r) => r.chars.map((c) => c.ch)));
        const pairs = pairsIn(branches, T.BRANCH_HYEONG_PAIRS, '형').filter((r) => !r.chars.every((c) => inFull.has(c.ch)));
        return [...full, ...pairs];
      })(),
      ...pairsIn(branches, T.BRANCH_SANGHYEONG, '상형'),
      ...T.BRANCH_JAHYEONG.flatMap((b) => {
        const hits = branches.filter((x) => x.ch === b);
        return hits.length >= 2 ? [{ label: '자형', chars: hits.slice(0, 2) }] : [];
      }),
    ],
    pa: pairsIn(branches, T.BRANCH_PA, '파'),
    hae: pairsIn(branches, T.BRANCH_HAE, '해'),
    wonjin: pairsIn(branches, T.BRANCH_WONJIN, '원진'),
    gwimun: pairsIn(branches, T.BRANCH_GWIMUN, '귀문'),
  };

  // 6) 신살 (기둥별로 붙는 이름 목록)
  const sinsal = {}; // pos -> [{name, on:'stem'|'branch'|'pillar'}]
  const add = (pos, name, on = 'branch') => {
    if (!pillars[pos]) return;
    (sinsal[pos] ||= []);
    if (!sinsal[pos].some((s) => s.name === name)) sinsal[pos].push({ name, on });
  };
  const monthBranch = pillars.month.branch;
  const dayBranch = pillars.day.branch;
  const yearBranch = pillars.year.branch;
  for (const k of present) {
    const { stem, branch, text } = pillars[k];
    if (T.CHEONEUL[dayStem].includes(branch)) add(k, '천을귀인');
    if (T.TAEGEUK[dayStem].includes(branch)) add(k, '태극귀인');
    if (T.BOKSEONG[dayStem].includes(branch)) add(k, '복성귀인');
    if (T.MUNCHANG[dayStem] === branch) add(k, '문창귀인');
    if (T.GEUMYEO[dayStem] === branch) add(k, '금여록');
    if (T.GEONROK[dayStem] === branch) add(k, '건록');
    if (T.YANGIN[dayStem] === branch) add(k, '양인');
    if (T.HONGYEOM[dayStem] === branch) add(k, '홍염');
    if (T.CHEONDEOK[monthBranch] === stem || T.CHEONDEOK[monthBranch] === branch) add(k, '천덕귀인', 'pillar');
    if (T.WOLDEOK[monthBranch] === stem) add(k, '월덕귀인', 'stem');
    if (T.BAEKHO.includes(text)) add(k, '백호대살', 'pillar');
    if (T.GOEGANG.includes(text)) add(k, '괴강', 'pillar');
    if (T.GORAN.includes(text)) add(k, '고란살', 'pillar');
    if (T.GANYEOJIDONG.includes(text)) add(k, '간여지동', 'pillar');
    if (T.HYEONCHIM.includes(stem) || T.HYEONCHIM.includes(branch)) add(k, '현침살', 'pillar');
    if (T.PYEONGDU.includes(stem) || T.PYEONGDU.includes(branch)) add(k, '평두살', 'pillar');
    // 삼합 기준 도화·역마·화개 (년지·일지 기준 모두)
    for (const base of [yearBranch, dayBranch]) {
      const s = T.twelveSal(base, branch);
      if (s === '년살') add(k, '도화');
      if (s === '역마') add(k, '역마');
      if (s === '화개') add(k, '화개');
    }
  }
  // 학당귀인 = 일간 장생지
  const hakdang = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' }[dayStem];
  for (const k of present) if (pillars[k].branch === hakdang) add(k, '학당귀인');
  // 공망 (일주 기준 순중공망)
  const gongmang = ec.getDayXunKong().split('');
  const gongmangYear = ec.getYearXunKong().split('');
  for (const k of present) if (gongmang.includes(pillars[k].branch)) add(k, '공망');
  for (const r of relations.wonjin) for (const c of r.chars) add(c.pos, '원진살');
  for (const r of relations.gwimun) for (const c of r.chars) add(c.pos, '귀문관살');

  // 7) 육친
  const yukchin = {};
  for (const k of present) {
    const d = detail[k];
    yukchin[k] = {
      stem: k === 'day' ? ['일간(나)'] : T.YUKCHIN[gender][d.stemGod] || [],
      branch: T.YUKCHIN[gender][d.branchGod] || [],
    };
  }

  // 8) 대운 · 세운 · 월운
  const yun = ec.getYun(gender === '남' ? 1 : 0, 2);
  const startSolar = yun.getStartSolar();
  const birthY = solarBirth.getYear();
  const daeun = yun.getDaYun().slice(1).map((d) => {
    const g = gz(d.getGanZhi());
    return {
      index: d.getIndex(), startYear: d.startYear ?? d.getStartYear(), endYear: d.getEndYear(),
      age: d.getStartYear() - birthY, ...g,
      stemGod: T.tenGod(dayStem, g.stem), branchGod: T.tenGod(dayStem, T.BRANCH_MAIN_STEM[g.branch]),
      stage: T.twelveStage(dayStem, g.branch), sal: T.twelveSal(yearBranch, g.branch),
      seun: d.getLiuNian().map((l) => {
        const lg = gz(l.getGanZhi());
        return {
          year: l.getYear(), age: l.getYear() - birthY + 1, ...lg,
          stemGod: T.tenGod(dayStem, lg.stem), branchGod: T.tenGod(dayStem, T.BRANCH_MAIN_STEM[lg.branch]),
          stage: T.twelveStage(dayStem, lg.branch), sal: T.twelveSal(yearBranch, lg.branch),
          samjae: T.SAMJAE_YEARS[T.triadGroup(yearBranch)].includes(lg.branch),
          wolun: wolunOfYear(lg.stem).map((s, i) => {
            const mg = gz(s);
            return {
              monthNo: i + 1, ...mg,
              stemGod: T.tenGod(dayStem, mg.stem), branchGod: T.tenGod(dayStem, T.BRANCH_MAIN_STEM[mg.branch]),
              stage: T.twelveStage(dayStem, mg.branch), sal: T.twelveSal(yearBranch, mg.branch),
            };
          }),
        };
      }),
    };
  });
  const forward = yun.isForward();

  // 9) 현재 운
  const now = new Date();
  const nowLunar = Solar.fromDate(now).getLunar();
  const nowYearGZ = nowLunar.getYearInGanZhi();
  const nowMonthGZ = nowLunar.getMonthInGanZhi();
  const nowYear = now.getFullYear();
  const currentDaeun = daeun.find((d) => nowYear >= d.startYear && nowYear <= d.endYear);
  const currentSeun = currentDaeun?.seun.find((s) => s.year === nowYear);
  const curG = (s) => {
    const g = gz(s);
    return { ...g, stemGod: T.tenGod(dayStem, g.stem), branchGod: T.tenGod(dayStem, T.BRANCH_MAIN_STEM[g.branch]), stage: T.twelveStage(dayStem, g.branch), sal: T.twelveSal(yearBranch, g.branch) };
  };

  // 10) 나이·기타
  const koreanAge = nowYear - birthY + 1;
  let manAge = nowYear - birthY;
  const bm = solarBirth.getMonth(), bd = solarBirth.getDay();
  if (now.getMonth() + 1 < bm || (now.getMonth() + 1 === bm && now.getDate() < bd)) manAge--;
  const birthLunar = solarBirth.getLunar();

  return {
    input: { ...input, name },
    meta: {
      name, gender, koreanAge, manAge,
      solar: `${solarBirth.getYear()}.${pad(solarBirth.getMonth())}.${pad(solarBirth.getDay())}`,
      weekday: ['일', '월', '화', '수', '목', '금', '토'][solarBirth.getWeek()],
      time: unknownTime ? '시간 모름' : `${pad(hour)}:${pad(minute)}`,
      lunarText: `${birthLunar.getYear()}.${pad(Math.abs(birthLunar.getMonth()))}.${pad(birthLunar.getDay())}${birthLunar.getMonth() < 0 ? ' (윤달)' : ''}`,
      correctionMin, correctedTime: koreaTime && !unknownTime ? `${pad(calc.getHour())}:${pad(calc.getMinute())}` : null,
      options: [koreaTime ? '한국시 적용' : '표준시', yajasi ? '야자시/조자시' : '정자시', jeolgi === 'ipchun' ? '입춘' : '동지'],
      zodiac: T.BRANCH_ANIMAL[pillars.year.branch],
      prevJieqi: { name: lunar.getPrevJieQi(true).getName(), time: lunar.getPrevJieQi(true).getSolar().toYmdHms() },
      nextJieqi: { name: lunar.getNextJieQi(true).getName(), time: lunar.getNextJieQi(true).getSolar().toYmdHms() },
      daeunStart: startSolar.toYmd(),
      daeunStartText: `출생일부터 ${yun.getStartYear()}년 ${yun.getStartMonth()}개월 ${yun.getStartDay()}일`,
      forward,
      nayin: ec.getDayNaYin(),
      taewon: gz(ec.getTaiYuan()), myeonggung: gz(ec.getMingGong()),
      gongmang, gongmangYear,
    },
    pillars, detail, order, dayStem,
    dayStemDesc: T.STEM_DESC[dayStem],
    elements, missing, strongest,
    relations, sinsal, yukchin, daeun,
    current: {
      daeun: currentDaeun, seun: currentSeun,
      year: curG(nowYearGZ), month: curG(nowMonthGZ), nowYear, nowMonth: now.getMonth() + 1,
    },
  };
}

/**
 * 달력 연도 기준 12개월 월주 (1월 = 전년도 丑월, 2월 = 寅월 … 12월 = 子월)
 * 寅월 천간: 甲己→丙, 乙庚→戊, 丙辛→庚, 丁壬→壬, 戊癸→甲
 */
function wolunOfYear(yearStem) {
  const first = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
  const seq = (ys) => { // 寅~丑 12개월
    const s0 = T.STEMS.indexOf(first[ys]);
    return Array.from({ length: 12 }, (_, i) => T.STEMS[(s0 + i) % 10] + T.BRANCHES[(2 + i) % 12]);
  };
  const prevStem = T.STEMS[(T.STEMS.indexOf(yearStem) + 9) % 10];
  const thisYear = seq(yearStem), prevYear = seq(prevStem);
  return [prevYear[11], ...thisYear.slice(0, 11)];
}

function nextYearGZ(s) {
  const si = (T.STEMS.indexOf(s[0]) + 1) % 10, bi = (T.BRANCHES.indexOf(s[1]) + 1) % 12;
  return T.STEMS[si] + T.BRANCHES[bi];
}
const pad = (n) => String(n).padStart(2, '0');
