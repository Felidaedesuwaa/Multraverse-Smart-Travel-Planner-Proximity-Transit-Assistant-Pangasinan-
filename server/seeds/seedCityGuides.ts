import 'dotenv/config'
import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../src/lib/db'
import { Place, LocalFood } from '../src/models'
import { cityGuides } from '../src/lib/cityGuides'

const idFor = (key: string) => new mongoose.Types.ObjectId(createHash('sha256').update(key).digest('hex').slice(0, 24))
const normalize = (name: string) => name.normalize('NFKC').toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9]+/g, ' ').trim()
const retired = require('../scripts/retired-tourism-ids.json') as { places: string[], localfoods: string[] }

async function main() {
  const places = cityGuides.flatMap(g => [
    ...g.attractions.map(a => ({ name: a.name, aliases: a.aliases, description: a.description, category: a.category, location: g.name, guide: g })),
    ...g.hotels.map(h => ({ name: h.name, aliases: ('aliases' in h ? h.aliases : []) as string[], description: h.description, category: 'Accommodation', location: h.location, guide: g })),
    ...g.dining.map(d => ({ name: d.name, aliases: [] as string[], description: ('description' in d ? d.description : `Named dining option in ${g.source_file}.`) as string,
      category: 'Eat and Drink', location: ('location' in d ? d.location : g.name) as string, guide: g })),
  ]).map(({ guide, aliases, ...p }) => ({ aliases, document: { ...p, _id: idFor(`city-guide:${guide.area_id}:place:${normalize(p.name)}`),
    municipality: guide.name.replace(/ City$/, ''), areaId: guide.area_id, sourceUrl: guide.source_url,
    entryFee: null, tags: [`city-guide:${guide.area_id}`] } }))
  const foods = cityGuides.flatMap(g => g.local_foods.map(f => ({ _id: idFor(`city-guide:${g.area_id}:food:${normalize(f.name)}`),
    name: f.name, description: `${f.description} Source: ${g.source_file}, page ${f.source_page}.`,
    municipality: g.name.replace(/ City$/, ''), where: g.name, category: 'Local food', avgPrice: null })))
  for (const p of places) await new Place(p.document).validate()
  for (const f of foods) await new LocalFood(f).validate()
  console.log(`Validated ${cityGuides.length} city guide(s), ${places.length} places and ${foods.length} foods.`)
  if (process.argv.includes('--dry-run')) return
  await connectDatabase()
  const existingPlaces = await Place.find({}).lean()
  let addedPlaces = 0, reusedPlaces = 0
  for (const { document, aliases } of places) {
    const existing = existingPlaces.find(p => normalize(p.municipality) === normalize(document.municipality) &&
      [document.name, ...aliases].some(n => normalize(n) === normalize(p.name)))
    // Retain IDs, fees and moderation. Replace retired source content only;
    // independently maintained catalog entries keep their existing content.
    if (existing) {
      if (retired.places.includes(String(existing._id)) && /See Pangasinan PDF snapshot/.test(existing.description || '')) {
        const { _id, entryFee, ...sourceFields } = document
        await Place.updateOne({ _id: existing._id }, { $set: sourceFields })
      }
      reusedPlaces++; continue
    }
    await Place.updateOne({ _id: document._id }, { $setOnInsert: document }, { upsert: true })
    addedPlaces++
  }
  const existingFoods = await LocalFood.find({}).lean()
  let addedFoods = 0
  for (const food of foods) {
    const existing = existingFoods.find(f => normalize(f.municipality || '') === normalize(food.municipality) && normalize(f.name) === normalize(food.name))
    if (existing) {
      if (retired.localfoods.includes(String(existing._id)) && /See Pangasinan PDF snapshot/.test(existing.description || '')) {
        const { _id, avgPrice, ...sourceFields } = food
        await LocalFood.updateOne({ _id: existing._id }, { $set: sourceFields })
      }
      continue
    }
    await LocalFood.updateOne({ _id: food._id }, { $setOnInsert: food }, { upsert: true })
    addedFoods++
  }
  console.log(`Places: ${addedPlaces} added, ${reusedPlaces} reused; foods: ${addedFoods} added.`)
  console.log('Selected guides remain in the local registry; catalog projections are ready.')
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 }).finally(disconnectDatabase)
