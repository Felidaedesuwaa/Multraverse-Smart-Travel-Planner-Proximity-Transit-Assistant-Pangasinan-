const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Dummy settings only: this test never reads credentials or opens connections.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'multraverse-env-'));
try {
  const serverRoot = path.join(fixture, 'server');
  fs.mkdirSync(serverRoot);
  fs.writeFileSync(path.join(fixture, '.env'), 'SMTP_HOST=wrong-frontend.invalid\n');
  fs.writeFileSync(path.join(serverRoot, '.env'), 'SMTP_HOST=correct-server.invalid\n');
  const compiled = fs.readFileSync(path.resolve(__dirname, '../dist/lib/environment.js'));
  const baseEnv = { ...process.env, NODE_PATH: path.resolve(__dirname, '../node_modules') };
  delete baseEnv.SMTP_HOST;
  delete baseEnv.DOTENV_CONFIG_PATH;
  delete baseEnv.DOTENV_CONFIG_OVERRIDE;
  for (const directory of ['src/lib', 'dist/lib']) {
    const folder = path.join(serverRoot, directory);
    fs.mkdirSync(folder, { recursive: true });
    const loader = path.join(folder, 'environment.js');
    fs.writeFileSync(loader, compiled);
    const probe = `require(${JSON.stringify(loader)}); process.stdout.write(process.env.SMTP_HOST);`;
    for (const cwd of [fixture, serverRoot, os.tmpdir()]) {
      assert.equal(execFileSync(process.execPath, ['-e', probe], { cwd, env: baseEnv, encoding: 'utf8' }), 'correct-server.invalid');
    }
    assert.equal(execFileSync(process.execPath, ['-e', probe], {
      cwd: fixture, env: { ...baseEnv, SMTP_HOST: 'deployment.invalid' }, encoding: 'utf8',
    }), 'deployment.invalid', 'Deployment environment must retain precedence');
  }
  console.log('PASS: source/compiled server paths load server/.env from any working directory and preserve deployment overrides.');
} finally {
  const target = path.resolve(fixture);
  assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith('multraverse-env-'));
  fs.rmSync(target, { recursive: true, force: true });
}
