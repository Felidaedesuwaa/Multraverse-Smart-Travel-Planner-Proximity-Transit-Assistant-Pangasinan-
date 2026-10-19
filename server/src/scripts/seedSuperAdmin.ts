import 'dotenv/config'
import { connectDatabase, disconnectDatabase, databaseStartupMessage } from '../lib/db'
import { bootstrapSuperAdmin } from '../lib/bootstrapSuperAdmin'

export async function seedSuperAdmin() {
  if (!process.env.SUPERADMIN_SEED_EMAIL?.trim() || !process.env.SUPERADMIN_SEED_PASSWORD)
    throw new Error('Set SUPERADMIN_SEED_EMAIL and SUPERADMIN_SEED_PASSWORD in the backend environment before running the seed. No default credentials are used.')
  await connectDatabase()
  const result = await bootstrapSuperAdmin(process.env.SUPERADMIN_SEED_EMAIL, process.env.SUPERADMIN_SEED_PASSWORD)
  console.log(`${result.created ? 'Created' : 'Preserved existing'} superadmin: ${result.email}`)
  console.log('Sign in through the normal login page. Authenticator setup is required for privileged accounts.')
  return result
}

export async function runSeedSuperAdmin() {
  try { await seedSuperAdmin() }
  catch (error) {
    const message = error instanceof Error && /^(Set SUPERADMIN_|SUPERADMIN_SEED_PASSWORD:|Bootstrap email belongs)/.test(error.message)
      ? error.message : databaseStartupMessage(error)
    console.error(message)
    process.exitCode = 1
  } finally { await disconnectDatabase() }
}

if (require.main === module) void runSeedSuperAdmin()
