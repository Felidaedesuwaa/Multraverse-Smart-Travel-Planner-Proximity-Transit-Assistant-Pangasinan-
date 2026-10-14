"""Private service boundary, independent of model and web framework imports."""
import hmac
import json
import os


class ServiceSecurity:
    def __init__(self, app, max_bytes=12 * 1024 * 1024):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)

        async def reject(status, message):
            body = json.dumps({'detail': message}).encode()
            await send({'type': 'http.response.start', 'status': status, 'headers': [
                (b'content-type', b'application/json'), (b'cache-control', b'no-store'),
                (b'x-content-type-options', b'nosniff'),
            ]})
            await send({'type': 'http.response.body', 'body': body})

        headers = dict(scope.get('headers', []))
        if not (scope.get('path') == '/health' and scope.get('method') == 'GET'):
            expected = os.getenv('AI_SERVICE_TOKEN', '')
            supplied = headers.get(b'x-service-token', b'').decode('latin1')
            if len(expected) < 32:
                return await reject(503, 'Service authentication is not configured')
            if not hmac.compare_digest(supplied.encode(), expected.encode()):
                return await reject(401, 'Service authentication required')

        length = headers.get(b'content-length')
        if length:
            try:
                if int(length) < 0 or int(length) > self.max_bytes:
                    return await reject(413, 'Request is too large')
            except ValueError:
                return await reject(400, 'Invalid request')
        messages, size = [], 0
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            size += len(message.get('body', b''))
            if size > self.max_bytes:
                return await reject(413, 'Request is too large')
            messages.append(message)
            if not message.get('more_body', False):
                break

        async def bounded_receive():
            return messages.pop(0) if messages else await receive()

        async def protected_send(message):
            if message['type'] == 'http.response.start':
                message = {**message, 'headers': [*message.get('headers', []),
                    (b'cache-control', b'no-store'), (b'x-content-type-options', b'nosniff')]}
            await send(message)

        return await self.app(scope, bounded_receive, protected_send)
