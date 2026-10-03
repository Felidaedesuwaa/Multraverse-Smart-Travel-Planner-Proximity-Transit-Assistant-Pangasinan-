import 'dotenv/config'
import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../src/lib/db'
import { LocalFood } from '../src/models/LocalFood'
import reference from '../src/data/localFoodReference.json'

const normalize = (value: string) => value.toLowerCase().replace(/ city$/, '').replace(/sta\./g, 'santa').replace(/[^a-z0-9]+/g, ' ').trim()
async function main() {
  const rows = reference.foods.flatMap(food => food.localities.map(locality => ({
    name: food.name, category: food.category,
    municipality: locality.replace(/ City$/, '').replace('Sta. Barbara', 'Santa Barbara'),
    where: `${locality} (documented association; vendor and availability unconfirmed)`,
    description: `${food.description} Source: ${reference.source_file}, page ${food.source_page}. ${reference.note}`,
    avgPrice: null,
  })))
  for (const row of rows) await new LocalFood(row).validate()
  console.log(`Validated ${reference.foods.length} foods / ${rows.length} locality records.`)
  if (process.argv.includes('--dry-run')) return
  await connectDatabase()
  const existing = await LocalFood.find({}).lean()
  let added = 0, updated = 0
  for (const row of rows) {
    const match = existing.find(f => normalize(f.name) === normalize(row.name) && normalize(f.municipality || '') === normalize(row.municipality))
    if (match) {
      // Keep IDs, prices, photos and moderation decisions already maintained by the LGU.
      await LocalFood.updateOne({ _id: match._id }, { $set: { description: row.description, category: row.category } }, { runValidators: true })
      updated++
    } else {
      const _id = new mongoose.Types.ObjectId(createHash('sha256').update(`local-food-reference:${normalize(row.municipality)}:${normalize(row.name)}`).digest('hex').slice(0, 24))
      await LocalFood.updateOne({ _id }, { $setOnInsert: { ...row, approvalStatus: 'approved', pendingDeletion: false, reviewRevision: 0, createdAt: new Date() } }, { upsert: true, runValidators: true })
      added++
    }
  }
  console.log(`localfoods: ${added} added, ${updated} existing records refreshed; no records deleted.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(disconnectDatabase)
