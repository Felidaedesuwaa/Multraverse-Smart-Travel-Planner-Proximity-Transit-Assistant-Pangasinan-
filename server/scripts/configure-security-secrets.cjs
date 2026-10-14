// Add local secrets without printing them or replacing existing keys.
const fs = require('node:fs'), path = require('node:path');
const { randomBytes } = require('node:crypto');
const { parse } = require('dotenv');
const serverFile = path.resolve(__dirname, '../.env');
const aiFile = path.resolve(__dirname, '../../ai-service/.env');
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const serverText = read(serverFile), aiText = read(aiFile);
const serverEnv = parse(serverText), aiEnv = parse(aiText);
if (serverEnv.MFA_ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(serverEnv.MFA_ENCRYPTION_KEY)) throw new Error('Existing MFA_ENCRYPTION_KEY is invalid; it was not changed.');
if (serverEnv.AI_SERVICE_TOKEN && aiEnv.AI_SERVICE_TOKEN && serverEnv.AI_SERVICE_TOKEN !== aiEnv.AI_SERVICE_TOKEN) throw new Error('Existing AI service tokens differ; neither was changed.');
const token = serverEnv.AI_SERVICE_TOKEN || aiEnv.AI_SERVICE_TOKEN || randomBytes(32).toString('hex');
if (token.length < 32 || /[\r\n]/.test(token)) throw new Error('Existing AI service token is invalid; it was not changed.');
function append(file, text, values) {
  const additions = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n');
  if (additions) fs.writeFileSync(file, text + (text.endsWith('\n') || !text ? '' : '\n') + additions + '\n');
}
append(serverFile, serverText, {
  ...(!serverEnv.MFA_ENCRYPTION_KEY ? { MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex') } : {}),
  ...(!serverEnv.AI_SERVICE_TOKEN ? { AI_SERVICE_TOKEN: token } : {}),
});
append(aiFile, aiText, !aiEnv.AI_SERVICE_TOKEN ? { AI_SERVICE_TOKEN: token } : {});
console.log('Local security keys configured. Existing keys were preserved; no secrets were printed. Restart the API and AI service.');
