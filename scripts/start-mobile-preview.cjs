// Share one Expo server and local API across Android, iOS, and web previews.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { parseArgs } = require('node:util');

const root = path.resolve(__dirname, '..');
const serverRoot = path.join(root, 'server');
const children = [];
let stopping = false;
let apiProxy;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  apiProxy?.closeAllConnections();
  apiProxy?.close();
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    } else child.kill('SIGTERM');
  }
}

function launch(entry, args, cwd, env) {
  const child = spawn(process.execPath, [entry, ...args], { cwd, env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
  return child;
}

async function checkPort(port) {
  // Windows may allow a separate IPv4 and IPv6 listener on the same port.
  // Check both so existing Metro and Express servers are detected.
  for (const host of ['0.0.0.0', '::']) {
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', error => {
        if (host === '::' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) resolve();
        else reject(new Error(`Port ${port} is busy. Choose another --port or --api-port.`));
      });
      probe.listen({ port, host, exclusive: true }, () => probe.close(resolve));
    });
  }
}

async function isHealthy(url) {
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok && (await response.json()).status === 'ok';
  } catch { return false; }
}

function proxyExistingApi(target, apiPort, webUrl, webPort) {
  const origins = [webUrl, `http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`];
  apiProxy = http.createServer((request, response) => {
    const origin = request.headers.origin;
    if (origin && !origins.includes(origin)) {
      response.writeHead(403).end('Origin is not allowed');
      return;
    }
    // The existing API already permits localhost browser origins. Keep its JWT
    // authentication and rate limits; expose only the chosen preview origins.
    const upstream = http.request(`${target}${request.url}`, {
      method: request.method,
      headers: { ...request.headers, host: new URL(target).host, origin: `http://127.0.0.1:${webPort}` },
    }, result => {
      const headers = { ...result.headers };
      delete headers['access-control-allow-origin'];
      if (origin) headers['access-control-allow-origin'] = origin;
      response.writeHead(result.statusCode, headers);
      result.pipe(response);
      result.on('error', () => response.destroy());
    });
    upstream.setTimeout(120000, () => upstream.destroy());
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502).end('Local API is unavailable');
      else response.destroy();
    });
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => upstream.destroy());
    request.pipe(upstream);
  });
  return new Promise((resolve, reject) => {
    apiProxy.once('error', reject);
    apiProxy.listen(apiPort, '0.0.0.0', resolve);
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    host: { type: 'string' },
    port: { type: 'string' },
    'api-port': { type: 'string' },
    'web-only': { type: 'boolean' },
    android: { type: 'boolean' },
    ios: { type: 'boolean' },
    offline: { type: 'boolean' },
    check: { type: 'boolean' },
    help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('Usage: npm run preview -- [--host LAN_IP] [--port 8082] [--api-port 3002] [--web-only] [--android] [--ios] [--offline] [--check]');
    console.log('Use the native Expo QR code on Android or a compatible iOS Expo Go client; open the HTTP link in either phone browser.');
    return;
  }
  const addresses = Object.values(os.networkInterfaces()).flat().filter(entry =>
    entry && entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.')
  ).map(entry => entry.address);
  const host = values.host || (addresses.length === 1 ? addresses[0] : undefined);
  if (!host || !addresses.includes(host)) {
    throw new Error(`Choose your computer's Wi-Fi address with --host. Available addresses: ${addresses.join(', ') || 'none; connect to Wi-Fi first'}`);
  }
  if (values.ios && process.platform !== 'darwin') {
    throw new Error('--ios opens the iOS simulator and requires a Mac. Use npm run preview for physical phones or browser previews.');
  }
  if (values['web-only'] && (values.android || values.ios)) {
    throw new Error('Choose --web-only or a native --android/--ios launch.');
  }
  let port = Number(values.port || 8082);
  let apiPort = Number(values['api-port'] || 3002);
  if (![port, apiPort].every(p => Number.isInteger(p) && p >= 1024 && p <= 65535) || port === apiPort) {
    throw new Error('Use two different port numbers between 1024 and 65535.');
  }
  const expoCli = require.resolve('expo/bin/cli');
  const dotenv = require(require.resolve('dotenv', { paths: [serverRoot] }));
  const envPath = path.join(serverRoot, '.env');
  const serverEnv = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  // Keep explicit ports strict; let the default preview coexist with other
  // Expo/API servers that are already running on this computer.
  if (values.port) await checkPort(port);
  else {
    while (port <= 8092) {
      try { await checkPort(port); break; } catch { port++; }
    }
    if (port > 8092) throw new Error('No preview port is free. Choose --port.');
  }
  if (values['api-port']) await checkPort(apiPort);
  else {
    while (apiPort <= 3012) {
      try { await checkPort(apiPort); break; } catch { apiPort++; }
    }
    if (apiPort > 3012) throw new Error('No API preview port is free. Choose --api-port.');
  }
  if (port === apiPort) throw new Error('Use different preview and API ports.');
  const webUrl = `http://${host}:${port}`;
  const apiUrl = `http://${host}:${apiPort}`;
  const corsOrigins = [...new Set([
    ...(process.env.CORS_ORIGINS ?? serverEnv.CORS_ORIGINS ?? '').split(',').map(origin => origin.trim()).filter(Boolean),
    webUrl,
  ])].join(',');
  console.log(`\nAndroid and iPhone browser preview (same Wi-Fi):\n  ${webUrl}\n`);
  if (!values['web-only']) {
    console.log(`Native Expo Go link:\n  exp://${host}:${port}\n`);
    console.log('Android: scan the Expo QR code in Expo Go. iOS: use a compatible installed Expo Go client.');
    console.log('SDK 57 Expo Go on a physical iPhone requires Apple membership; the browser preview is free on both platforms.');
  }
  if (values.offline) console.log('Expo offline mode skips Expo account requests. Android/browser previews work over LAN; physical iOS Expo Go account matching requires online mode.');
  console.log('This browser preview needs no Apple account. Keep this terminal open. Ctrl+C stops the preview.');
  console.log('Local HTTP preview supports screens and API features; GPS and microphone access need HTTPS.');
  console.log('Native background transit alarms require an installed mobile app.\n');
  if (values.check) {
    require.resolve('ts-node/dist/bin.js', { paths: [serverRoot] });
    if (!(process.env.MONGODB_URI || serverEnv.MONGODB_URI) || !(process.env.JWT_SECRET || serverEnv.JWT_SECRET)) {
      throw new Error('Configure MONGODB_URI and JWT_SECRET in server/.env first. See README.md.');
    }
    console.log('Setup check passed. No services started and no environment files changed.');
    return;
  }
  const existingPort = Number(process.env.PORT || serverEnv.PORT || 3001);
  const existingUrl = `http://127.0.0.1:${existingPort}`;
  if (await isHealthy(existingUrl)) {
    await proxyExistingApi(existingUrl, apiPort, webUrl, port);
    console.log(`Reusing your running API on port ${existingPort} through the preview API on port ${apiPort}.`);
  } else {
    if (!(process.env.MONGODB_URI || serverEnv.MONGODB_URI) || !(process.env.JWT_SECRET || serverEnv.JWT_SECRET)) {
      throw new Error('Configure MONGODB_URI and JWT_SECRET in server/.env first. See README.md.');
    }
    const tsNode = require.resolve('ts-node/dist/bin.js', { paths: [serverRoot] });
    const backend = launch(tsNode, ['src/index.ts'], serverRoot, {
      ...process.env, NODE_ENV: 'development', VERCEL: '0', PORT: String(apiPort), CORS_ORIGINS: corsOrigins,
    });
    console.log('Waiting for the local API and database...');
    let ready = false;
    const deadline = Date.now() + 60000;
    while (!stopping && Date.now() < deadline && backend.exitCode === null) {
      try {
        const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`, {
          headers: { Origin: webUrl }, signal: AbortSignal.timeout(2000),
        });
        if (response.ok && response.headers.get('access-control-allow-origin') === webUrl) {
          ready = true;
          break;
        }
      } catch { /* Wait for the API to finish starting. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (stopping) return;
    if (!ready) throw new Error('The API did not become ready. Check server/.env, MongoDB connectivity, and Atlas Network Access.');
  }
  const expoArgs = ['start', '--go', '--web', values.offline ? '--offline' : '--lan', '--port', String(port)];
  if (values.android) expoArgs.push('--android');
  if (values.ios) expoArgs.push('--ios');
  launch(expoCli, expoArgs, root, {
    ...process.env, NODE_ENV: 'development', BROWSER: 'none', REACT_NATIVE_PACKAGER_HOSTNAME: host, EXPO_PUBLIC_API_URL: apiUrl,
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
main().catch(error => { console.error(`\n${error.message}`); stop(1); });
