import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from '../src/lib/db'
import { bootstrapSuperAdmin } from '../src/lib/bootstrapSuperAdmin'

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.SUPERADMIN_SEED_PASSWORD) throw new Error('Set SUPERADMIN_SEED_PASSWORD in production')
  await connectDatabase()
  const result = await bootstrapSuperAdmin(process.env.SUPERADMIN_SEED_EMAIL || 'superadmin@multraverse.ph', process.env.SUPERADMIN_SEED_PASSWORD || 'Superadmin123!')
  console.log(`${result.created ? 'Created' : 'Preserved existing'} bootstrap superadmin: ${result.email}`)
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(disconnectDatabase)
