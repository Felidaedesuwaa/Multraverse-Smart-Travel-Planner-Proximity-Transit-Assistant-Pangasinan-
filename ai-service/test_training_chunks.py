import unittest
from training_chunks import response_chunks


class TrainingChunkTests(unittest.TestCase):
    def test_small_response_is_unchanged(self):
        self.assertEqual(response_chunks('P:', 'hello', len, 20), ['hello'])

    def test_oversized_response_preserves_all_text(self):
        response = '  Beach access.\nFee PHP 250.  Bring water.\n'
        chunks = response_chunks('P:', response, len, 20)
        self.assertGreater(len(chunks), 1)
        self.assertEqual(''.join(chunks), response)
        self.assertTrue(all(len('P:' + chunk) <= 20 for chunk in chunks))

    def test_impossible_prompt_and_word_fail(self):
        with self.assertRaises(ValueError):
            response_chunks('too long prompt', 'reply', len, 5)
        with self.assertRaises(ValueError):
            response_chunks('P:', 'unbreakable', len, 5)
