import unittest

from kokoro_engine import resolve_language_behavior, synthesize_to_wav
from schemas import TtsChunkRequest


class KokoroLanguageBehaviorTests(unittest.TestCase):
    def test_spanish_maps_to_native_e(self) -> None:
        behavior = resolve_language_behavior("es")
        self.assertTrue(behavior["native"])
        self.assertEqual(behavior["pipeline_code"], "e")
        self.assertEqual(behavior["processed_language"], "es")

    def test_german_is_not_silently_mapped_to_american_english(self) -> None:
        behavior = resolve_language_behavior("de")
        self.assertFalse(behavior["native"])
        self.assertIsNone(behavior["pipeline_code"])
        self.assertIsNone(behavior["processed_language"])

    def test_german_fails_clearly_without_fallback(self) -> None:
        request = TtsChunkRequest(text="Guten Tag", voice="default", language="de", baseSpeed=1.0)
        with self.assertRaisesRegex(RuntimeError, "German is not natively supported by Kokoro"):
            synthesize_to_wav(request, output_path=__import__("pathlib").Path("ignored.wav"))


if __name__ == "__main__":
    unittest.main()

