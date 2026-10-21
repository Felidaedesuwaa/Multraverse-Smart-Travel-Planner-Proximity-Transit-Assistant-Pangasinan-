const fs = require('node:fs');

function getArtifact(result, expectedCommit) {
  const build = Array.isArray(result) ? result[0] : result;
  if (build?.status !== 'FINISHED' || build.platform !== 'ANDROID') {
    throw new Error('Expected a finished Android build; the public APK was not changed.');
  }
  if (expectedCommit && build.gitCommitHash !== expectedCommit) {
    throw new Error('Build commit does not match this workflow.');
  }
  const url = new URL(build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl);
  if (url.protocol !== 'https:') throw new Error('Expected an HTTPS APK artifact.');
  return url;
}

async function main() {
  const [input, output] = process.argv.slice(2);
  const url = getArtifact(JSON.parse(fs.readFileSync(input, 'utf8')), process.env.GITHUB_SHA);
  const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
  if (!response.ok) throw new Error(`APK download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Downloaded artifact is not an APK/ZIP archive.');
  }
  fs.writeFileSync(output, bytes);
  console.log(`Saved ${output} (${bytes.length} bytes).`);
}
module.exports = { getArtifact };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
