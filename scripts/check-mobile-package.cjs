// EAS passes directory paths WITHOUT trailing slashes to its copy filter.
// Testing only the final filename misses excluded parent directories.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ignore = require('ignore');
const root = path.resolve(__dirname, '..');
const rules = ignore().add(fs.readFileSync(path.join(root, '.easignore'), 'utf8'));

function included(file) {
  const parts = file.split('/');
  return parts.every((_, i) => !rules.ignores(parts.slice(0, i + 1).join('/')));
}

for (const file of [
  'server/src/lib/fareCalculation.ts',
  'src/components/ItineraryFareInputs.native.jsx',
  'assets/sounds/transit_vibrate.wav',
  'app.json', 'package.json', 'package-lock.json',
]) {
  assert.ok(fs.existsSync(path.join(root, file)), `Missing build input: ${file}`);
  assert.ok(included(file), `Build input excluded by EAS directory traversal: ${file}`);
}
for (const file of [
  'server/.env', 'server/src/index.ts', 'server/node_modules/example/index.js',
  'ai-service/venv/example.py', '.tmp/build/index.js', '.env', 'src/.env',
]) assert.ok(!included(file), `Private or unnecessary file included: ${file}`);

console.log('Mobile package checks passed (including parent-directory traversal).');
