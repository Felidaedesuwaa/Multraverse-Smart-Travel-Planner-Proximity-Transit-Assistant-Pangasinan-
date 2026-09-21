/** Read-only coverage report by default. --apply links known records; no fabricated attractions or fares. */
import 'dotenv/config'
import fs from 'node:fs'
import { connectDatabase, disconnectDatabase } from '../src/lib/db'
import { Place, SavedPlace } from '../src/models'
import { areaIdFor, hasPoint } from '../src/lib/planner'
import areas from '../src/data/plannerAreas.json'

async function main() {
  await connectDatabase()
  const apply = process.argv.includes('--apply')
  const fileArg = process.argv.find(arg => arg.startsWith('--reviewed='))
  if (fileArg) {
    const records = JSON.parse(fs.readFileSync(fileArg.slice('--reviewed='.length), 'utf8'))
    if (!Array.isArray(records)) throw new Error('Reviewed data must be an array.')
    // Validate the entire input before making any writes.
    for (const p of records) {
      if (!areas.some(a => a.id === p.areaId) || !p.name || !p.description || !p.location || !p.category || !hasPoint(p.coordinates) ||
          !Number.isFinite(p.entryFee) || p.entryFee < 0 || !Number.isFinite(p.visitMinutes) || p.visitMinutes < 15 || !p.bestTime ||
          !/^https:\/\//.test(p.sourceUrl || '') || !Number.isFinite(Date.parse(p.verifiedAt)) || !['person', 'group'].includes(p.feeBasis)) throw new Error(`Incomplete reviewed record: ${p.name || 'unnamed'}`)
    }
    if (apply) for (const p of records) await Place.findOneAndUpdate({ name: p.name, $or: [{ areaId: p.areaId }, { areaId: { $exists: false }, municipality: areas.find(a => a.id === p.areaId)!.name }] }, { $set: {
      name: p.name, areaId: p.areaId, municipality: areas.find(a => a.id === p.areaId)!.name, description: p.description,
      location: p.location, category: p.category, coordinates: p.coordinates, entryFee: p.entryFee, feeBasis: p.feeBasis,
      visitMinutes: p.visitMinutes, bestTime: p.bestTime, sourceUrl: p.sourceUrl, verifiedAt: p.verifiedAt,
      accessibility: p.accessibility || 'unknown', tags: p.tags || [], openingMinutes: p.openingMinutes,
      closingMinutes: p.closingMinutes, closedWeekdays: p.closedWeekdays || [],
    } }, { upsert: true, runValidators: true })
    console.log(`${apply ? 'Imported' : 'Validated'} ${records.length} reviewed attractions.`)
  }
  const places = await Place.find()
  if (apply) {
    for (const place of places) {
      const areaId = areaIdFor(place)
      if (areaId && !place.areaId) { place.areaId = areaId; await place.save() }
    }
    const saved = await SavedPlace.find({ placeId: { $exists: false } })
    for (const record of saved) {
      const matches = places.filter(p => p.name.trim().toLowerCase() === record.name.trim().toLowerCase())
      if (matches.length === 1) { record.placeId = matches[0]._id; await record.save() }
    }
  }
  console.table(areas.map(area => {
    const matched = places.filter(p => areaIdFor(p) === area.id)
    return { area: area.name, attractions: matched.length, coordinatesMissing: matched.filter(p => !hasPoint(p.coordinates)).length,
      metadataMissing: matched.filter(p => !p.verifiedAt || !p.visitMinutes || !p.bestTime || p.entryFee == null).length,
      status: matched.length ? 'Review missing fields' : 'Needs sourced attractions' }
  }))
  console.log(apply ? 'Safe catalog links updated. No legacy prices were marked verified.' : 'Read-only report. Use --apply to link legacy records; --reviewed=FILE --apply to import reviewed data.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(disconnectDatabase)
