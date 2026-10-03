"""Split oversized responses without discarding source text."""
import re


def response_chunks(prompt, response, token_count, max_length):
    if token_count(prompt + response) <= max_length:
        return [response]
    if token_count(prompt) >= max_length:
        raise ValueError('Training prompt leaves no room for its response')
    words = re.findall(r'\s*\S+', response)
    # Preserve trailing whitespace too, so joining chunks reconstructs the source.
    if words:
        words[-1] += response[len(''.join(words)):]
    chunks = []
    offset = 0
    while offset < len(words):
        low, high, fits = 1, len(words) - offset, 0
        while low <= high:
            middle = (low + high) // 2
            part = ''.join(words[offset:offset + middle])
            if token_count(prompt + part) <= max_length:
                fits = middle
                low = middle + 1
            else:
                high = middle - 1
        if not fits:
            raise ValueError('A training word exceeds the response token budget')
        chunks.append(''.join(words[offset:offset + fits]))
        offset += fits
    return chunks
