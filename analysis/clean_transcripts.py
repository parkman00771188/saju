# -*- coding: utf-8 -*-
"""data 아래 자동자막을 문맥 제한 교정 규칙으로 일괄 정리한다.

기본 실행은 원문을 고치며, --check는 수정이 필요한 파일이 남았는지만 검사한다.
교정은 여러 번 실행해도 결과가 달라지지 않도록 설계한다.
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import subprocess
import sys
from pathlib import Path

from asr_fixes import normalize

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
REPORT_JSON = ROOT / "analysis" / "asr_cleanup_report.json"
REPORT_MD = ROOT / "analysis" / "asr_cleanup_report.md"
SEPARATOR = "-" * 60

SPECIAL_BODIES = {
    "FvbUvMl8Lx0": """귀문관살이라고 해서, 말 그대로 귀신이 문을 열고 왔다 갔다 왕래한다는 의미의 살인데요. 다 귀신 같은 의미는 아니고요. 그만큼 예리하고 민감하며, 좀 예민하다는 의미에서 귀문관살을 보통 사주에서 이야기합니다.

그런데 제가 말씀드리고 싶은 것은 무당분들의 사주팔자예요. 특징이 있긴 해요. 예를 들면 사주팔자에 불이 엄청 많거나, 물이 엄청 많거나, 사주팔자가 되게 조열하거나, 사주팔자가 토화로 이루어져 있거나, 지지로 봤을 때 사화·오화 같은 불바다가 있거나, 또는 신금이 과하게 많은 분들이 잘 불립니다.

사주팔자로 보면 나한테 맞는 종교 같은 것도 좀 있더라고요. 신기하지 않아요, 여러분? 사주팔자는 종교를 좀 품는 느낌이 있는 것 같아요. 그래서 저는 목사님도 궁금하죠. 잘되는 목사님 사주팔자는 어떨까? 이런 것도 궁금하죠.""",
    "xWXCYxTpaEc": """그런데 94년생들이 좀 사주에 관심이 많은 것 같아요. 그 이유가 있나요? 년주가 갑술이잖아요. 이 술토라는 글자가 화개살인데, 제가 이야기했잖아요. 사주팔자의 지지, 아래 칸에 술토·진토·사화·신금이 있는 분들은 사주를 볼 줄 안다고 이야기했죠. 저는 네 가지 지지 중에 이 글자가 세 개 있어요.

그래서 저는 이런 일을 하게 된 거고, 갑술생들은 원래 타고난 예술성으로 이름을 알릴 수 있어요. 의사나 전문직보다는 어렸을 때부터 예술, 춤, 노래, 연기, 끼, 사주 같은 것으로 이름을 알린 사람들이 많죠.""",
}

ZODIAC_YEARS = {
    "쥐": "60년생, 72년생, 84년생, 96년생, 08년생",
    "소": "61년생, 73년생, 85년생, 97년생, 09년생",
    "호랑이": "62년생, 74년생, 86년생, 98년생, 10년생",
    "토끼": "63년생, 75년생, 87년생, 99년생, 11년생",
    "용": "64년생, 76년생, 88년생, 00년생, 12년생",
    "뱀": "65년생, 77년생, 89년생, 01년생, 13년생",
    "말": "66년생, 78년생, 90년생, 02년생, 14년생",
    "양": "67년생, 79년생, 91년생, 03년생, 15년생",
    "원숭이": "68년생, 80년생, 92년생, 04년생, 16년생",
    "닭": "69년생, 81년생, 93년생, 05년생, 17년생",
    "개": "70년생, 82년생, 94년생, 06년생, 18년생",
    "돼지": "71년생, 83년생, 95년생, 07년생, 19년생",
}

ZODIAC_BODY_NAMES = {
    "쥐": r"(?:G)?쥐띠",
    "말": r"말(?:띠|대)",
}


def metadata_value(text: str, key: str) -> str:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.+)$", text)
    return match.group(1).strip() if match else ""


def split_document(text: str) -> tuple[str, str]:
    if SEPARATOR not in text:
        return "", text
    header, body = text.split(SEPARATOR, 1)
    return header + SEPARATOR, body.lstrip("\r\n")


def fix_zodiac_intro(title: str, body: str, counter: dict[str, int]) -> str:
    if "2026년" not in title or "신년운세 총정리" not in title:
        return body
    zodiac = next((name for name in ZODIAC_YEARS if f"{name}띠" in title), None)
    if not zodiac:
        return body
    body_name = ZODIAC_BODY_NAMES.get(zodiac, re.escape(zodiac) + r"\s*띠")
    anchor = re.search(body_name + r"(?:들은|들아|에게는|는)", body)
    if not anchor:
        return body
    ending = re.search(r"(?:들은|들아|에게는|는)$", anchor.group()).group()
    intro = (
        f"2026년 {zodiac}띠 신년운세 총정리.\n"
        f"{ZODIAC_YEARS[zodiac]} {zodiac}띠{ending}"
    )
    fixed = intro + body[anchor.end():]
    if fixed != body:
        counter["띠별 신년운세 제목·출생연도 복구"] = counter.get("띠별 신년운세 제목·출생연도 복구", 0) + 1
    return fixed


def clean_text(text: str, counter: dict[str, int]) -> str:
    title = metadata_value(text, "제목")
    video_id = metadata_value(text, "영상 ID")
    header, body = split_document(text)

    if video_id in SPECIAL_BODIES and header:
        special_body = SPECIAL_BODIES[video_id]
        if special_body != body.strip():
            counter["문맥 전체 복구(사용자 제시 사례)"] = counter.get("문맥 전체 복구(사용자 제시 사례)", 0) + 1
        body = special_body
    else:
        body = fix_zodiac_intro(title, body, counter)
        body = normalize(body, counter)

    body, count = re.subn(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", body)
    if count:
        counter["제어문자 제거"] = counter.get("제어문자 제거", 0) + count
    body, count = re.subn(r"(?<=[.!?])(?=[가-힣])", " ", body)
    if count:
        counter["문장부호 뒤 띄어쓰기"] = counter.get("문장부호 뒤 띄어쓰기", 0) + count
    body, count = re.subn(r"[ \t]+(?=\r?$)", "", body, flags=re.MULTILINE)
    if count:
        counter["줄 끝 공백 제거"] = counter.get("줄 끝 공백 제거", 0) + count

    return (header + "\n\n" + body.strip() + "\n") if header else body.strip() + "\n"


def collect_suspicious(paths: list[Path]) -> dict[str, int]:
    patterns = {
        "깨진 문자(�)": re.compile("�"),
        "귀문관살 변형": re.compile(r"귀문\s?관사|기문\s?관사|김[무웅]관살"),
        "도화살 변형": re.compile(r"도아살|도와살|도화쌀"),
        "병오년 변형": re.compile(r"병[호원우어]년"),
        "일간 변형": re.compile(r"[갑을병정무기경신임계][목화토금수]\s?일관"),
        "지장간 변형": re.compile("지장관"),
    }
    counts = collections.Counter()
    for path in paths:
        value = path.read_text(encoding="utf-8")
        for label, regex in patterns.items():
            counts[label] += len(regex.findall(value))
    return dict(counts)


def write_report(payload: dict) -> None:
    REPORT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# 자동자막 일괄 교정 보고서",
        "",
        f"- 기준: {payload.get('source', '현재 작업본')}",
        f"- 검사 파일: {payload['files_scanned']:,}개",
        f"- 변경 파일: {payload['files_changed']:,}개",
        f"- 총 치환: {payload['total_replacements']:,}건",
        "",
        "## 주요 치환",
        "",
    ]
    for label, count in payload["replacements"][:80]:
        lines.append(f"- {count:,}건 — `{label}`")
    lines += ["", "## 잔여 핵심 의심 표현", ""]
    for label, count in payload["remaining_suspicious"].items():
        lines.append(f"- {label}: {count:,}건")
    if "worktree_mismatches" in payload:
        lines += ["", f"- 현재 작업본 불일치: {len(payload['worktree_mismatches']):,}개"]
    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def merge_with_previous_report(payload: dict) -> dict:
    if not REPORT_JSON.exists():
        return payload
    try:
        previous = json.loads(REPORT_JSON.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return payload
    combined = collections.Counter(dict(previous.get("replacements", [])))
    combined.update(dict(payload["replacements"]))
    payload["replacements"] = sorted(combined.items(), key=lambda item: (-item[1], item[0]))
    payload["total_replacements"] = sum(combined.values())
    payload["files_changed"] = max(payload["files_changed"], previous.get("files_changed", 0))
    payload["cleanup_passes"] = previous.get("cleanup_passes", 1) + 1
    return payload


def read_git_head(paths: list[Path]) -> dict[Path, str]:
    specs = [f"HEAD:{path.relative_to(ROOT).as_posix()}" for path in paths]
    process = subprocess.run(
        ["git", "cat-file", "--batch"],
        input=("\n".join(specs) + "\n").encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=ROOT,
        check=True,
    )
    output = process.stdout
    offset = 0
    documents: dict[Path, str] = {}
    for path in paths:
        line_end = output.index(b"\n", offset)
        header = output[offset:line_end].decode("ascii")
        offset = line_end + 1
        if header.endswith(" missing"):
            continue
        size = int(header.rsplit(" ", 1)[1])
        documents[path] = output[offset:offset + size].decode("utf-8")
        offset += size + 1
    return documents


def audit_head(paths: list[Path]) -> dict:
    counter: dict[str, int] = {}
    changed: list[str] = []
    mismatches: list[str] = []
    documents = read_git_head(paths)
    for path, original in documents.items():
        cleaned = clean_text(original, counter)
        if cleaned != original:
            changed.append(str(path.relative_to(ROOT)))
        if cleaned != path.read_text(encoding="utf-8"):
            mismatches.append(str(path.relative_to(ROOT)))
    return {
        "source": "git HEAD 원문 대비",
        "files_scanned": len(documents),
        "files_changed": len(changed),
        "total_replacements": sum(counter.values()),
        "replacements": sorted(counter.items(), key=lambda item: (-item[1], item[0])),
        "remaining_suspicious": collect_suspicious(paths),
        "changed_files_sample": changed[:100],
        "worktree_mismatches": mismatches[:100],
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="원문을 쓰지 않고 미적용 변경 유무만 검사")
    parser.add_argument("--audit-head", action="store_true", help="Git HEAD 원문과 현재 교정본을 대조해 보고서 재작성")
    args = parser.parse_args()

    paths = sorted(DATA.rglob("*.txt"))
    if args.audit_head:
        payload = audit_head(paths)
        write_report(payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 1 if payload["worktree_mismatches"] else 0
    counter: dict[str, int] = {}
    changed: list[str] = []
    for path in paths:
        original = path.read_text(encoding="utf-8")
        cleaned = clean_text(original, counter)
        if cleaned != original:
            changed.append(str(path.relative_to(ROOT)))
            if not args.check:
                path.write_text(cleaned, encoding="utf-8")

    payload = {
        "files_scanned": len(paths),
        "files_changed": len(changed),
        "total_replacements": sum(counter.values()),
        "replacements": sorted(counter.items(), key=lambda item: (-item[1], item[0])),
        "remaining_suspicious": collect_suspicious(paths),
        "changed_files_sample": changed[:100],
    }
    if not args.check and changed:
        payload = merge_with_previous_report(payload)
        write_report(payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 1 if args.check and changed else 0


if __name__ == "__main__":
    raise SystemExit(main())
