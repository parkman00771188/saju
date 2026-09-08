# -*- coding: utf-8 -*-
import unittest

from asr_fixes import normalize
from clean_transcripts import clean_text


class AsrFixesTest(unittest.TestCase):
    def test_requested_term_examples(self):
        source = "귀문 관사이라 가지고 귀신이 문을 열고 왔다 갔다 왕내한다는 살인데"
        self.assertEqual(normalize(source), "귀문관살이라 가지고 귀신이 문을 열고 왔다 갔다 왕래한다는 살인데")

    def test_ganji_variants(self):
        self.assertEqual(
            normalize("병원년 갑보월의 김요일주와 신의일주, 병수일주"),
            "병오년 갑오월의 계묘일주와 신해일주, 병술일주",
        )

    def test_common_homonyms_are_preserved(self):
        source = "병원에 가서 개수를 세고 이메일 주세요. 이미 몇 년 전 일입니다. 일제 강점기에 일제히 움직였습니다. 미투 운동과 오아시스, 정제된 소금과 정제 과정, 연지곤지도 언급했습니다."
        self.assertEqual(normalize(source), source)
        self.assertEqual(normalize("정재된 상황"), "정제된 상황")

    def test_repeated_position_terms(self):
        source = "일제와 일제히 중심, 월제, 월재, 천관·청관을 보고 오아와 미투, 심금과 축도를 확인합니다."
        self.assertEqual(normalize(source), "일지와 일지에 중심, 월지, 월지, 천간·천간을 보고 오화와 미토, 신금과 축토를 확인합니다.")

    def test_normalize_is_idempotent(self):
        once = normalize("감목일관과 귀문관사를 설명합니다")
        self.assertEqual(once, "갑목 일간과 귀문관살을 설명합니다")
        self.assertEqual(normalize(once), once)

    def test_special_body_uses_video_id(self):
        source = "제목: 예시\n영상 ID: xWXCYxTpaEc\n" + "-" * 60 + "\n\n근데 구사들이"
        fixed = clean_text(source, {})
        self.assertIn("94년생들이", fixed)
        self.assertNotIn("구사들이", fixed)

    def test_zodiac_intro_uses_title_and_cycle(self):
        source = (
            "제목: 2026년 말띠 신년운세 총정리\n영상 ID: sample\n"
            + "-" * 60
            + "\n\n2026년 말대 신년 운세 총정리\n7,8년생 90년생 공인연생 1년생\n말대들아 축하해."
        )
        fixed = clean_text(source, {})
        self.assertIn("66년생, 78년생, 90년생, 02년생, 14년생 말띠들아", fixed)
        self.assertNotIn("말대", fixed)


if __name__ == "__main__":
    unittest.main()
