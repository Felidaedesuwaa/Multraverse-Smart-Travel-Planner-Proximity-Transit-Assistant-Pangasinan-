import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from '../src/lib/db'
import { User } from '../src/models'
import { lguSeedAccounts } from '../src/data/lguSeedAccounts'
import { isLGUMunicipality, normalizeLGUMunicipality } from '../src/lib/lguMunicipalities'

async function main() {
  const password = process.env.LGU_SEED_PASSWORD || 'Lgu123!'
  if (process.env.NODE_ENV === 'production' && !process.env.LGU_SEED_PASSWORD) throw new Error('Set LGU_SEED_PASSWORD in production')
  const email = process.env.LGU_SEED_EMAIL?.trim().toLowerCase()
  const municipality = normalizeLGUMunicipality(process.env.LGU_SEED_MUNICIPALITY)
  if ((email || municipality) && (!email || !isLGUMunicipality(municipality))) throw new Error('Provide both LGU_SEED_EMAIL and a valid LGU_SEED_MUNICIPALITY')
  const accounts = email && isLGUMunicipality(municipality) ? [{ email, municipality }] : lguSeedAccounts
  await connectDatabase()
  const passwordHash = await bcrypt.hash(password, 12)
  for (const account of accounts) {
    const user = await User.findOneAndUpdate({ email: account.email }, { $setOnInsert: {
      name: `${account.municipality} Tourism Officer`, ...account, passwordHash,
      role: 'lgu', location: `${account.municipality}, Pangasinan`, emailVerifiedAt: new Date(),
    } }, { upsert: true, returnDocument: 'after', runValidators: true })
    // User's existing role setter stores uppercase LGU, preserving all app guards.
    if (user.role !== 'LGU' || user.municipality !== account.municipality) throw new Error(`Existing ${account.email} has a different role or municipality; no account was overwritten`)
    console.log(`LGU account ready: ${account.email} (${account.municipality}); existing credentials preserved.`)
  }
  // The earlier lgu@multraverse.ph account is never renamed, reset, or removed.
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(disconnectDatabase)
