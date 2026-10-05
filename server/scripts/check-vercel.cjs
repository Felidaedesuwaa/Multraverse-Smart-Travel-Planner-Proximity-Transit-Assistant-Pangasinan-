// No real database connection, credentials, or email delivery is used.
const assert = require('node:assert/strict');
process.env.VERCEL = '1';
process.env.CORS_ORIGINS = 'https://web.test';
process.env.MONGODB_URI = 'mongodb://unused.test/checks';
const environmentPath = require.resolve('../dist/lib/environment');
require.cache[environmentPath] = { id: environmentPath, filename: environmentPath, loaded: true, exports: {} };
const mongoose = require('mongoose');
const db = require('../dist/lib/db');
require('../dist/models/PasswordReset').preparePasswordResetStorage = async () => {};
require('../dist/models/GeofenceMonitor').prepareGeofenceStorage = async () => {};
let server;

(async () => {
  let attempts = 0;
  mongoose.connect = async () => {
    attempts++;
    if (attempts === 1) throw new Error('private connection details');
    return mongoose;
  };
  await assert.rejects(db.connectDatabase());
  await db.connectDatabase();
  assert.equal(attempts, 2, 'Connection must retry after a failure');

  let unavailable = true;
  let connectionCalls = 0;
  db.connectDatabase = async () => {
    connectionCalls++;
    if (unavailable) throw new Error('private connection details');
  };
  let indexCalls = 0;
  let layoutCalls = 0;
  let failLayout = true;
  db.verifyDatabaseLayout = async () => {
    layoutCalls++;
    if (failLayout) throw new Error('Database setup is incomplete');
  };
  let failIndexes = true;
  const models = [
    require('../dist/models').User,
    require('../dist/models').AuditLog,
    require('../dist/models/PendingRegistration').PendingRegistration,
    require('../dist/lib/authLimits').AuthLimit,
  ];
  for (const model of models) model.init = async () => {
    indexCalls++;
    await new Promise(resolve => setTimeout(resolve, 20));
    if (failIndexes) throw new Error('index initialization failed');
  };

  const app = require('../dist/index').default;
  assert.equal(connectionCalls, 0, 'Import must not connect or start the database');
  app.get('/test-client-ip', (req, res) => res.json({ ip: req.ip }));
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  let response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Database is temporarily unavailable. Please try again.' });
  unavailable = false;
  response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 503, 'Health must wait for database layout validation');
  assert.equal(indexCalls, 0, 'Models must not initialize before layout validation');
  failLayout = false;
  response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 503, 'Health must wait for indexes');
  failIndexes = false;
  const results = await Promise.all(Array.from({ length: 4 }, () => fetch(`${base}/api/health`)));
  for (const result of results) {
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { status: 'ok' });
  }
  assert.equal(indexCalls, 8, 'Concurrent requests should share the model initialization retry');
  assert.equal(layoutCalls, 3, 'Retry failed setup and share successful layout validation');
  response = await fetch(`${base}/api/health`, { headers: { Origin: 'https://web.test' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://web.test');
  assert.match(response.headers.get('access-control-expose-headers'), /Retry-After/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-powered-by'), null);
  response = await fetch(`${base}/api/health`, { headers: { Origin: 'https://untrusted.test' } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  response = await fetch(`${base}/test-client-ip`, { headers: { 'X-Forwarded-For': '203.0.113.10' } });
  assert.deepEqual(await response.json(), { ip: '203.0.113.10' });
  console.log('Vercel startup, database retry, concurrent initialization, health, CORS, and client IP checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => { if (server) { server.closeAllConnections(); server.close(); } });
