import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ──────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 10)
  const travelerHash = await bcrypt.hash('Traveler123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@multraverse.ph' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@multraverse.ph',
      passwordHash: adminHash,
      role: 'ADMIN',
      location: 'Lingayen, Pangasinan',
    },
  })

  const traveler = await prisma.user.upsert({
    where: { email: 'traveler@multraverse.ph' },
    update: {},
    create: {
      name: 'Juan dela Cruz',
      email: 'traveler@multraverse.ph',
      passwordHash: travelerHash,
      role: 'EXPLORER',
      location: 'Dagupan City',
    },
  })

  console.log('✅ Users seeded')

  // ── Transit Routes ─────────────────────────────────────
  await prisma.transitRoute.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Dagupan - Alaminos Express', type: 'BUS', stops: 6, frequency: '30 min', passengers: 1180, status: 'ACTIVE' },
      { name: 'Dagupan - Lingayen Line', type: 'BUS', stops: 4, frequency: '20 min', passengers: 940, status: 'ACTIVE' },
      { name: 'Alaminos - Bolinao Route', type: 'JEEPNEY', stops: 8, frequency: '45 min', passengers: 760, status: 'ACTIVE' },
      { name: 'Dagupan - Manaoag Line', type: 'JEEPNEY', stops: 5, frequency: '25 min', passengers: 610, status: 'ACTIVE' },
      { name: 'Urdaneta - Dagupan Bus', type: 'BUS', stops: 7, frequency: '35 min', passengers: 430, status: 'ACTIVE' },
      { name: 'Sual - Dagupan Jeepney', type: 'JEEPNEY', stops: 6, frequency: '60 min', passengers: 300, status: 'INACTIVE' },
      { name: 'Dagupan City Loop', type: 'TRICYCLE', stops: 10, frequency: '10 min', passengers: 850, status: 'ACTIVE' },
      { name: 'Lingayen - San Carlos', type: 'BUS', stops: 9, frequency: '40 min', passengers: 520, status: 'ACTIVE' },
    ],
  })

  console.log('✅ Transit routes seeded')

  // ── Geofences ──────────────────────────────────────────
  await prisma.geofence.createMany({
    skipDuplicates: true,
    data: [
      { location: 'Alaminos Terminal', zone: 'Hundred Islands', radius: '200 m', coord: '16.1567° N, 119.9820° E', x: 22, y: 55, active: true, alerts: 124 },
      { location: 'Dagupan Central', zone: 'City Core', radius: '150 m', coord: '16.0433° N, 120.3330° E', x: 42, y: 58, active: true, alerts: 89 },
      { location: 'Manaoag Shrine', zone: 'Pilgrimage', radius: '100 m', coord: '15.9833° N, 120.4833° E', x: 55, y: 65, active: false, alerts: 0 },
      { location: 'Patar Beach', zone: 'Bolinao Coast', radius: '300 m', coord: '16.3833° N, 119.8833° E', x: 15, y: 35, active: true, alerts: 67 },
      { location: 'Lingayen Capitol', zone: 'Provincial Gov.', radius: '250 m', coord: '16.0167° N, 120.2333° E', x: 38, y: 52, active: true, alerts: 45 },
      { location: 'Hundred Islands NP', zone: 'Nature Park', radius: '500 m', coord: '16.1833° N, 119.9833° E', x: 20, y: 45, active: true, alerts: 93 },
      { location: 'Urdaneta Interchange', zone: 'Transport Hub', radius: '200 m', coord: '15.9756° N, 120.5714° E', x: 68, y: 70, active: true, alerts: 38 },
    ],
  })

  console.log('✅ Geofences seeded')

  // ── Saved Places ───────────────────────────────────────
  await prisma.savedPlace.createMany({
    skipDuplicates: true,
    data: [
      { userId: traveler.id, name: 'Hundred Islands National Park', category: 'Nature Park', description: 'A national park with 124 islands in Alaminos.', icon: 'waves' },
      { userId: traveler.id, name: 'Patar Beach', category: 'Beach', description: 'White sand beach in Bolinao with crystal clear waters.', icon: 'waves' },
      { userId: traveler.id, name: 'Our Lady of Manaoag', category: 'Religious', description: 'Famous pilgrimage church in Manaoag.', icon: 'church' },
      { userId: traveler.id, name: 'Lingayen Gulf', category: 'Landmark', description: 'Historic gulf and scenic waterfront in Lingayen.', icon: 'anchor' },
      { userId: traveler.id, name: 'Bolinao Falls', category: 'Nature Park', description: 'Beautiful waterfalls in Bolinao, Pangasinan.', icon: 'trees' },
      { userId: traveler.id, name: 'Dagupan Bangus Festival', category: 'Landmark', description: 'Famous milkfish capital of the Philippines.', icon: 'building' },
    ],
  })

  console.log('✅ Saved places seeded')

  // ── Trips ──────────────────────────────────────────────
  const trip1 = await prisma.trip.create({
    data: {
      userId: traveler.id,
      title: 'Hundred Islands Adventure',
      location: 'Alaminos, Pangasinan',
      date: 'Aug 20–22, 2026',
      status: 'UPCOMING',
      budget: 3500,
      spent: 1200,
      stops: 4,
      icon: 'waves',
    },
  })

  const trip2 = await prisma.trip.create({
    data: {
      userId: traveler.id,
      title: 'Bolinao Beach Trip',
      location: 'Bolinao, Pangasinan',
      date: 'Jul 10–11, 2026',
      status: 'COMPLETED',
      budget: 2000,
      spent: 1850,
      stops: 3,
      icon: 'anchor',
    },
  })

  console.log('✅ Trips seeded')

  // ── Budget Entries ─────────────────────────────────────
  await prisma.budgetEntry.createMany({
    data: [
      { userId: traveler.id, tripId: trip1.id, label: 'Transport', amount: 450, color: '#0B3C5D' },
      { userId: traveler.id, tripId: trip1.id, label: 'Food', amount: 380, color: '#F16B4E' },
      { userId: traveler.id, tripId: trip1.id, label: 'Entrance Fees', amount: 250, color: '#2A7B4C' },
      { userId: traveler.id, tripId: trip1.id, label: 'Accommodation', amount: 120, color: '#C89B3C' },
      { userId: traveler.id, tripId: trip2.id, label: 'Transport', amount: 600, color: '#0B3C5D' },
      { userId: traveler.id, tripId: trip2.id, label: 'Food', amount: 750, color: '#F16B4E' },
      { userId: traveler.id, tripId: trip2.id, label: 'Activities', amount: 500, color: '#2A7B4C' },
    ],
  })

  console.log('✅ Budget entries seeded')
  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })