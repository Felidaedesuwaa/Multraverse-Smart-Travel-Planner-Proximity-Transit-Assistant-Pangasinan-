"""No web/model dependencies or network connections are required."""
import asyncio
import os
import unittest
from unittest.mock import patch
from service_security import ServiceSecurity


class SecurityTests(unittest.TestCase):
    def request(self, token=None, path='/translate', chunks=None, length=None, configured=True):
        output, called = [], []

        async def app(scope, receive, send):
            called.append(scope['path'])
            await receive()
            await send({'type': 'http.response.start', 'status': 200, 'headers': []})
            await send({'type': 'http.response.body', 'body': b'ok'})

        chunks = chunks or [b'{}']
        incoming = [{'type': 'http.request', 'body': body, 'more_body': index < len(chunks) - 1}
                    for index, body in enumerate(chunks)]

        async def receive():
            return incoming.pop(0)

        async def send(message):
            output.append(message)

        headers = []
        if token is not None:
            headers.append((b'x-service-token', token.encode()))
        if length is not None:
            headers.append((b'content-length', length.encode()))
        with patch.dict(os.environ, {'AI_SERVICE_TOKEN': 'a' * 64 if configured else ''}):
            asyncio.run(ServiceSecurity(app, max_bytes=10)(
                {'type': 'http', 'path': path, 'method': 'GET' if path == '/health' else 'POST', 'headers': headers}, receive, send))
        return output, called

    def test_authentication(self):
        for token in [None, '', 'wrong', 'é' * 64]:
            output, called = self.request(token)
            self.assertEqual(output[0]['status'], 401)
            self.assertFalse(called)
        output, called = self.request('a' * 64)
        self.assertEqual(output[0]['status'], 200)
        self.assertTrue(called)
        self.assertIn((b'cache-control', b'no-store'), output[0]['headers'])

    def test_fail_closed_and_health(self):
        self.assertEqual(self.request('a' * 64, configured=False)[0][0]['status'], 503)
        self.assertEqual(self.request(path='/health', configured=False)[0][0]['status'], 200)

    def test_size_and_invalid_length(self):
        for chunks, length, expected in [([b'123456', b'123456'], None, 413), ([b'{}'], '11', 413), ([b'{}'], '-1', 413), ([b'{}'], 'bad', 400)]:
            output, called = self.request('a' * 64, chunks=chunks, length=length)
            self.assertEqual(output[0]['status'], expected)
            self.assertFalse(called)


if __name__ == '__main__':
    unittest.main()
