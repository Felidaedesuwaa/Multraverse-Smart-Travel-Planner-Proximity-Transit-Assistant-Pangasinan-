import 'dotenv/config'
import places from '../knowledge/pangasinan-places.json'
import { connectDatabase, disconnectDatabase } from '../src/lib/db'
import { Place } from '../src/models'
import { areaIdFor } from '../src/lib/planner'

async function main() {
  await connectDatabase()
  for (const place of places) {
    const areaId = areaIdFor(place)
    if (!areaId) throw new Error(`Unknown Pangasinan municipality: ${place.municipality}`)
    await Place.findOneAndUpdate({ name: place.name, municipality: place.municipality }, {
      $set: { ...place, areaId, entryFee: null, feeBasis: 'person', visitMinutes: 90, bestTime: 'Confirm locally', accessibility: 'unknown', verifiedAt: new Date(), tags: ['tourism-knowledge'] },
    }, { upsert: true, new: true, runValidators: true })
  }
  console.log(`Imported ${places.length} source-linked Pangasinan places.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(disconnectDatabase)
