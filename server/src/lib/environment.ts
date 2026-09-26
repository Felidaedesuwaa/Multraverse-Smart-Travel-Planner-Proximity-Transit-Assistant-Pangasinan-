import path from 'node:path'
import { config } from 'dotenv'

// Both src/lib and dist/lib resolve to server/.env. Never depend on the
// terminal's working directory (the frontend has a different .env file).
// Deployment-provided environment variables retain precedence.
config({ path: path.resolve(__dirname, '../../.env'), quiet: true })
