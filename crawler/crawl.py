# -*- coding: utf-8 -*-
"""
YouTube 채널 자막(스크립트) 일괄 크롤러
- videos(롱폼)와 shorts를 구분해서 저장
- 채널별로 ../data/<채널핸들>/ 폴더에 저장
- 이어받기 지원: 이미 받은 항목은 건너뛰고 실패분만 재시도

사용법:
    python crawl.py https://www.youtube.com/@dohwadore_saju          # videos + shorts 전부
    python crawl.py @dohwadore_saju videos                            # 롱폼만
    python crawl.py @dohwadore_saju shorts                            # 쇼츠만

결과:
    data/<핸들>/videos/*.txt, shorts/*.txt, videos_index.json, shorts_index.json
"""
import io, json, os, re, sys, time, threading
from concurrent.futures import ThreadPoolExecutor

from yt_dlp import YoutubeDL

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_ROOT = os.path.join(os.path.dirname(HERE), "data")

# 한국어 자막 우선순위 (ko-orig = 원본 자동자막)
SUB_PREF = ["ko-orig", "ko", "ko-KR"]
WORKERS = 2
SLEEP = 0.6   # 요청 간 지연 (봇 차단 방지)

# 기본 추출 옵션. 자막만 필요하므로 포맷 선택을 생략한다.
# (포맷 선택을 켜두면 일부 클라이언트에서 "Requested format is not available" 로 실패)
BASE_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noprogress": True,
    "ignore_no_formats_error": True,
    "format": None,
}

# 유튜브가 클라이언트별로 자막 목록을 불안정하게 반환하고,
# 기본 클라이언트는 "Sign in to confirm you're not a bot" 차단에 걸리므로 순차 폴백한다.
CLIENTS = ["web_safari", "ios", "web", "mweb"]

_print_lock = threading.Lock()


def log(msg):
    with _print_lock:
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()


def sanitize(name, maxlen=70):
    """Windows 파일명으로 안전하게 변환"""
    name = re.sub(r'[\\/:*?"<>|\r\n\t]', " ", name)
    name = re.sub(r"\s+", " ", name).strip().rstrip(". ")
    return name[:maxlen].strip() or "untitled"


def parse_channel(arg):
    """'@handle' 또는 채널 URL -> (채널 기본 URL, 핸들)"""
    m = re.search(r"@([\w.\-]+)", arg)
    if m:
        handle = m.group(1)
        return "https://www.youtube.com/@%s" % handle, handle
    # /channel/UCxxxx 형태
    m = re.search(r"(https?://[^\s]+?/channel/[\w\-]+)", arg)
    if m:
        url = m.group(1)
        return url, url.rstrip("/").split("/")[-1]
    raise SystemExit("채널 URL 또는 @핸들을 입력하세요. 예) @dohwadore_saju")


def json3_to_text(raw):
    """YouTube json3 자막 -> 평문 텍스트"""
    data = json.loads(raw)
    lines = []
    for ev in data.get("events", []):
        segs = ev.get("segs")
        if not segs:
            continue
        text = "".join(s.get("utf8", "") for s in segs)
        text = text.replace("\n", " ").strip()
        if text:
            lines.append(text)
    # 자동자막 롤링 중복 제거 (직전 줄과 동일하면 skip)
    out = []
    for l in lines:
        if not out or out[-1] != l:
            out.append(l)
    return "\n".join(out)


def pick_sub(info):
    """(url, lang, source, ext) 반환. json3 우선, 없으면 vtt."""
    for source in ("subtitles", "automatic_captions"):
        table = info.get(source) or {}
        for lang in SUB_PREF:
            fmts = table.get(lang)
            if not fmts:
                continue
            for want in ("json3", "vtt"):
                for f in fmts:
                    if f.get("ext") == want and f.get("url"):
                        return f["url"], lang, source, want
    return None


def _ydl(client):
    opts = dict(BASE_OPTS)
    opts["extractor_args"] = {"youtube": {"player_client": [client]}}
    return YoutubeDL(opts)


def fetch_one(vid, idx, outdir):
    """클라이언트를 순회하며 한국어 자막이 잡히는 응답을 찾아 저장한다."""
    url = "https://www.youtube.com/watch?v=%s" % vid
    rec = {"index": idx, "video_id": vid, "url": url}

    info = None
    picked = None
    last_err = None

    for client in CLIENTS:
        time.sleep(SLEEP)
        try:
            with _ydl(client) as ydl:
                cand = ydl.extract_info(url, download=False)
        except Exception as e:
            msg = " ".join(str(e).split())
            last_err = msg
            # 멤버십 전용은 어떤 클라이언트로도 못 받으므로 즉시 종료
            if "members" in msg or "멤버" in msg:
                rec.update(status="members_only", error=msg[:300])
                log("[%3d] SKIP %s (members_only)" % (idx, vid))
                return rec
            continue

        if info is None:
            info = cand
        got = pick_sub(cand)
        if got:
            info, picked = cand, got
            break

    if info is None:
        rec.update(status="extract_failed", error=(last_err or "")[:300])
        log("[%3d] FAIL %s" % (idx, vid))
        return rec

    title = info.get("title") or vid
    rec.update(
        title=title,
        upload_date=info.get("upload_date"),
        duration=info.get("duration"),
        view_count=info.get("view_count"),
        like_count=info.get("like_count"),
        description=info.get("description") or "",
    )

    if not picked:
        rec["status"] = "no_korean_subtitle"
        log("[%3d] NOSUB %s" % (idx, vid))
        return rec

    sub_url, lang, source, ext = picked
    rec.update(sub_lang=lang, sub_source=source, sub_ext=ext)

    raw = None
    for attempt in range(3):
        try:
            with _ydl(CLIENTS[0]) as dl:
                raw = dl.urlopen(sub_url).read().decode("utf-8", "replace")
            break
        except Exception as e:
            last_err = " ".join(str(e).split())
            time.sleep(1.5 * (attempt + 1))
    if raw is None:
        rec.update(status="subtitle_download_failed", error=(last_err or "")[:300])
        log("[%3d] SUBFAIL %s" % (idx, vid))
        return rec

    if ext == "json3":
        text = json3_to_text(raw)
    else:  # vtt 폴백
        text = "\n".join(
            l for l in raw.splitlines()
            if l.strip() and "-->" not in l
            and not l.startswith(("WEBVTT", "Kind:", "Language:"))
        )

    fname = "%03d_%s.txt" % (idx, sanitize(title))
    fpath = os.path.join(outdir, fname)
    header = (
        "제목: %s\n영상 ID: %s\nURL: %s\n업로드: %s\n길이(초): %s\n조회수: %s\n자막: %s (%s)\n%s\n\n"
        % (title, vid, url, rec.get("upload_date"), rec.get("duration"),
           rec.get("view_count"), lang, source, "-" * 60)
    )
    with io.open(fpath, "w", encoding="utf-8") as f:
        f.write(header + text + "\n")

    rec.update(status="ok", file=fname, chars=len(text), lines=text.count("\n") + 1)
    log("[%3d] OK   %s  (%d자)" % (idx, vid, len(text)))
    return rec


def list_ids(channel_url, tab):
    opts = dict(BASE_OPTS, extract_flat="in_playlist", ignoreerrors=True)
    opts["extractor_args"] = {"youtube": {"player_client": [CLIENTS[0]]}}
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info("%s/%s" % (channel_url, tab), download=False)
    if not info:  # 해당 탭이 없는 채널(예: 쇼츠 없음)이면 None 이 돌아온다
        log("[%s] 탭을 찾을 수 없어 건너뜁니다." % tab)
        return []
    return [e["id"] for e in (info.get("entries") or []) if e and e.get("id")]


def run(channel_url, chan_dir, tab):
    outname = tab
    outdir = os.path.join(chan_dir, outname)
    if not os.path.isdir(outdir):
        os.makedirs(outdir)

    log("\n===== [%s] 목록 수집 중 =====" % outname)
    ids = list_ids(channel_url, tab)
    log("총 %d개" % len(ids))

    # --- 이어받기: 기존 index.json 에서 완료된 항목 재사용 ---
    index_path = os.path.join(chan_dir, "%s_index.json" % outname)
    done = {}
    if os.path.exists(index_path):
        try:
            for r in json.load(io.open(index_path, encoding="utf-8")):
                if not r:
                    continue
                st = r.get("status")
                if st == "members_only":
                    done[r["video_id"]] = r
                elif st == "ok" and r.get("file") and os.path.exists(os.path.join(outdir, r["file"])):
                    done[r["video_id"]] = r
        except Exception as e:
            log("기존 index 읽기 실패(무시): %s" % e)
    if done:
        log("이어받기: 이미 완료된 %d개 건너뜀" % len(done))

    results = [None] * len(ids)
    todo = []
    for i, vid in enumerate(ids):
        if vid in done:
            r = dict(done[vid])
            r["index"] = i + 1
            results[i] = r
        else:
            todo.append((i, vid))
    log("이번에 처리할 항목: %d개" % len(todo))

    def work(pair):
        i, vid = pair
        results[i] = fetch_one(vid, i + 1, outdir)

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(work, todo))

    with io.open(index_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(results, ensure_ascii=False, indent=2))

    ok = sum(1 for r in results if r and r.get("status") == "ok")
    log("\n[%s] 완료: %d/%d 성공 -> %s" % (outname, ok, len(ids), outdir))
    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    channel_url, handle = parse_channel(sys.argv[1])
    which = sys.argv[2] if len(sys.argv) > 2 else "all"
    chan_dir = os.path.join(DATA_ROOT, handle)
    if not os.path.isdir(chan_dir):
        os.makedirs(chan_dir)
    log("채널: %s  ->  %s" % (channel_url, chan_dir))

    t0 = time.time()
    if which in ("all", "videos"):
        run(channel_url, chan_dir, "videos")
    if which in ("all", "shorts"):
        run(channel_url, chan_dir, "shorts")
    log("\n총 소요: %.1f분" % ((time.time() - t0) / 60))
