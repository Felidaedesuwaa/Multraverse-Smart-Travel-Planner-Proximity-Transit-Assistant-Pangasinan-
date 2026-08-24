import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding knowledge base...')

  // ── Places ─────────────────────────────────────────────
  await prisma.place.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'Hundred Islands National Park',
        description: 'A national park consisting of 124 islands and islets at low tide in the Lingayen Gulf. Popular for island hopping, snorkeling, kayaking, and swimming.',
        location: 'Alaminos City',
        municipality: 'Alaminos',
        category: 'Nature Park',
        entryFee: 50,
        openHours: '6:00 AM - 5:00 PM',
        tips: 'Hire a boat at Lucap Wharf. Bring sunscreen and water. Visit Quezon, Governor, and Children\'s Island for the best experience.',
        highlights: 'Island hopping, snorkeling, kayaking, cliff jumping at Governor Island',
      },
      {
        name: 'Patar Beach',
        description: 'A pristine white sand beach in Bolinao known for its crystal clear waters, fine white sand, and beautiful sunsets. One of the best beaches in Pangasinan.',
        location: 'Barangay Patar, Bolinao',
        municipality: 'Bolinao',
        category: 'Beach',
        entryFee: 30,
        openHours: 'Open 24 hours',
        tips: 'Best visited during low tide. Rent a cottage for ₱300-500. Avoid weekends for a quieter experience.',
        highlights: 'White sand beach, clear waters, sunset view, stargazing at night',
      },
      {
        name: 'Bolinao Falls',
        description: 'A series of beautiful waterfalls in Bolinao surrounded by lush greenery. Bolinao Falls 1, 2, and 3 each offer unique experiences.',
        location: 'Barangay Binabalian, Bolinao',
        municipality: 'Bolinao',
        category: 'Nature',
        entryFee: 50,
        openHours: '7:00 AM - 5:00 PM',
        tips: 'Visit all 3 falls in one trip. Wear non-slip footwear. Bring packed lunch as there are limited food stalls.',
        highlights: 'Three waterfalls, natural pool for swimming, picnic area',
      },
      {
        name: 'Our Lady of Manaoag Shrine',
        description: 'A famous Roman Catholic pilgrimage church dedicated to the Our Lady of the Rosary of Manaoag. One of the most visited religious sites in Northern Luzon.',
        location: 'Manaoag, Pangasinan',
        municipality: 'Manaoag',
        category: 'Religious',
        entryFee: 0,
        openHours: '5:00 AM - 8:00 PM',
        tips: 'Dress modestly. Visit early morning to avoid crowds. The novena mass is held every hour.',
        highlights: 'Historic church, miraculous image of Our Lady, pilgrimage site',
      },
      {
        name: 'Lingayen Beach',
        description: 'A historic beachfront in the provincial capital of Lingayen. Known for its role in World War II and its scenic views of the Lingayen Gulf.',
        location: 'Lingayen, Pangasinan',
        municipality: 'Lingayen',
        category: 'Beach',
        entryFee: 0,
        openHours: 'Open 24 hours',
        tips: 'Visit the Lingayen Gulf War Landing Memorial nearby. Best for a leisurely walk and sunset viewing.',
        highlights: 'Historic beach, war memorial, sunset views, Lingayen Gulf',
      },
      {
        name: 'Cape Bolinao Lighthouse',
        description: 'One of the oldest and tallest lighthouses in the Philippines, standing at 35 meters. Offers panoramic views of the West Philippine Sea.',
        location: 'Cape Bolinao, Bolinao',
        municipality: 'Bolinao',
        category: 'Landmark',
        entryFee: 20,
        openHours: '8:00 AM - 5:00 PM',
        tips: 'Climb to the top for a 360-degree view. Combine with a visit to Patar Beach nearby.',
        highlights: 'Historic lighthouse, panoramic sea views, photography spot',
      },
      {
        name: 'Pangasinan Capitol Building',
        description: 'The seat of the provincial government of Pangasinan. A historic building surrounded by well-maintained gardens and parks.',
        location: 'Lingayen, Pangasinan',
        municipality: 'Lingayen',
        category: 'Landmark',
        entryFee: 0,
        openHours: '8:00 AM - 5:00 PM (weekdays)',
        tips: 'Walk around the capitol grounds and the nearby Lingayen public beach.',
        highlights: 'Historic architecture, government center, scenic grounds',
      },
      {
        name: 'Lucap Wharf',
        description: 'The main gateway to Hundred Islands National Park. A bustling wharf where boats depart for island hopping tours.',
        location: 'Lucap, Alaminos City',
        municipality: 'Alaminos',
        category: 'Landmark',
        entryFee: 0,
        openHours: '6:00 AM - 5:00 PM',
        tips: 'Negotiate boat rental prices before boarding. Standard boat fits 8-10 persons for ₱1,500-2,000.',
        highlights: 'Boat rentals, Hundred Islands access, seafood restaurants nearby',
      },
      {
        name: 'Tara Falls',
        description: 'A hidden gem waterfall in Alaminos surrounded by lush tropical forest. Less crowded than other falls in Pangasinan.',
        location: 'Alaminos City',
        municipality: 'Alaminos',
        category: 'Nature',
        entryFee: 30,
        openHours: '7:00 AM - 5:00 PM',
        tips: 'Hire a local guide for ₱150. Wear waterproof footwear. The trail takes about 30 minutes to walk.',
        highlights: 'Waterfall, natural pool, forest trail, wildlife',
      },
      {
        name: 'Dagupan City Public Market',
        description: 'The main public market of Dagupan City, famous for its fresh bangus (milkfish), seafood, and local Pangasinan products.',
        location: 'Dagupan City',
        municipality: 'Dagupan',
        category: 'Market',
        entryFee: 0,
        openHours: '4:00 AM - 6:00 PM',
        tips: 'Visit early morning for the freshest bangus. Try the smoked bangus (tinapa) as a pasalubong.',
        highlights: 'Fresh bangus, seafood, local delicacies, pasalubong items',
      },
    ],
  })

  console.log('✅ Places seeded')

  // ── Route Prices ───────────────────────────────────────
  await prisma.routePrice.createMany({
    skipDuplicates: true,
    data: [
      // From Dagupan
      { from: 'Dagupan', to: 'Alaminos', vehicle: 'Bus', price: 95, duration: '2 hours', notes: 'Victory Liner or Five Star bus. Terminal at Perez Blvd, Dagupan.' },
      { from: 'Dagupan', to: 'Lingayen', vehicle: 'Jeepney', price: 25, duration: '30 minutes', notes: 'Jeepney from Dagupan terminal. Frequent trips daily.' },
      { from: 'Dagupan', to: 'Manaoag', vehicle: 'Jeepney', price: 35, duration: '45 minutes', notes: 'Jeepney from Dagupan. Drop off at Manaoag church.' },
      { from: 'Dagupan', to: 'San Carlos', vehicle: 'Bus', price: 85, duration: '1.5 hours', notes: 'Five Star bus from Dagupan terminal.' },
      { from: 'Dagupan', to: 'Urdaneta', vehicle: 'Bus', price: 65, duration: '1 hour', notes: 'Frequent buses from Dagupan to Urdaneta.' },
      { from: 'Dagupan', to: 'Bolinao', vehicle: 'Bus', price: 130, duration: '3 hours', notes: 'Direct bus from Dagupan. Limited trips, check schedule.' },

      // From Alaminos
      { from: 'Alaminos', to: 'Lucap Wharf', vehicle: 'Tricycle', price: 30, duration: '15 minutes', notes: 'Tricycle from Alaminos town proper to Lucap Wharf.' },
      { from: 'Alaminos', to: 'Bolinao', vehicle: 'Jeepney', price: 45, duration: '1 hour', notes: 'Jeepney from Alaminos to Bolinao. Frequent trips.' },
      { from: 'Alaminos', to: 'Dagupan', vehicle: 'Bus', price: 95, duration: '2 hours', notes: 'Return trip to Dagupan via Victory Liner.' },
      { from: 'Alaminos', to: 'Manila', vehicle: 'Bus', price: 380, duration: '5 hours', notes: 'Victory Liner overnight bus. Book in advance.' },

      // Hundred Islands Boat Rates
      { from: 'Lucap Wharf', to: 'Hundred Islands', vehicle: 'Boat (Small)', price: 1200, duration: '10 minutes', notes: 'Fits 1-5 persons. Good for 3-4 island stops.' },
      { from: 'Lucap Wharf', to: 'Hundred Islands', vehicle: 'Boat (Big)', price: 1800, duration: '10 minutes', notes: 'Fits 6-10 persons. Recommended for groups.' },

      // From Bolinao
      { from: 'Bolinao', to: 'Patar Beach', vehicle: 'Tricycle', price: 80, duration: '20 minutes', notes: 'Tricycle from Bolinao town to Patar Beach.' },
      { from: 'Bolinao', to: 'Bolinao Falls', vehicle: 'Tricycle', price: 60, duration: '15 minutes', notes: 'Tricycle from Bolinao town to the falls.' },
      { from: 'Bolinao', to: 'Cape Bolinao Lighthouse', vehicle: 'Tricycle', price: 100, duration: '25 minutes', notes: 'Tricycle hire to the lighthouse.' },

      // From Lingayen
      { from: 'Lingayen', to: 'Dagupan', vehicle: 'Jeepney', price: 25, duration: '30 minutes', notes: 'Frequent jeepney trips between Lingayen and Dagupan.' },
      { from: 'Lingayen', to: 'Manaoag', vehicle: 'Jeepney', price: 30, duration: '40 minutes', notes: 'Jeepney from Lingayen to Manaoag.' },

      // From Manila
      { from: 'Manila', to: 'Dagupan', vehicle: 'Bus', price: 350, duration: '4.5 hours', notes: 'Victory Liner or Five Star from Cubao or Pasay.' },
      { from: 'Manila', to: 'Alaminos', vehicle: 'Bus', price: 380, duration: '5 hours', notes: 'Victory Liner from Cubao. Direct to Alaminos.' },
    ],
  })

  console.log('✅ Route prices seeded')

  // ── Local Food ─────────────────────────────────────────
  await prisma.localFood.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'Bangus (Milkfish)',
        description: 'Dagupan is the bangus capital of the Philippines. The milkfish here is boneless, tender, and has a unique flavor due to the brackish water ponds.',
        avgPrice: 180,
        where: 'Dagupan City restaurants, Dagupan Public Market',
        category: 'Main Dish',
      },
      {
        name: 'Pigar-Pigar',
        description: 'A popular Dagupan street food made of thin slices of carabao or beef meat stir-fried with onions. Best eaten with hot rice.',
        avgPrice: 60,
        where: 'A.B. Fernandez Avenue night market, Dagupan City',
        category: 'Street Food',
      },
      {
        name: 'Longganisang Calasiao',
        description: 'Small, sweet, and garlicky sausages from Calasiao town. A Pangasinan breakfast staple sold in strings.',
        avgPrice: 80,
        where: 'Calasiao town market, various restaurants in Pangasinan',
        category: 'Breakfast',
      },
      {
        name: 'Tupig',
        description: 'A grilled rice cake made of glutinous rice, coconut milk, and sugar wrapped in banana leaves. A popular Pangasinan delicacy.',
        avgPrice: 15,
        where: 'Along national highways, Mangaldan, Pangasinan',
        category: 'Snack',
      },
      {
        name: 'Pancit Palabok',
        description: 'Pangasinan is known for its version of pancit palabok with thick rice noodles topped with shrimp sauce, shrimp, pork, and calamansi.',
        avgPrice: 80,
        where: 'Restaurants throughout Pangasinan',
        category: 'Noodles',
      },
      {
        name: 'Bolinao Seafood',
        description: 'Fresh seafood including grilled fish, shrimp, and crab caught from the West Philippine Sea. Best eaten at Patar Beach restaurants.',
        avgPrice: 250,
        where: 'Patar Beach restaurants, Bolinao town restaurants',
        category: 'Seafood',
      },
      {
        name: 'Inabraw',
        description: 'A traditional Ilocano-Pangasinan vegetable stew made with fermented fish (bagoong) and various local vegetables.',
        avgPrice: 60,
        where: 'Local carinderias and restaurants throughout Pangasinan',
        category: 'Main Dish',
      },
      {
        name: 'Bibingka',
        description: 'A traditional rice cake made with glutinous rice and coconut milk, cooked in clay pots lined with banana leaves.',
        avgPrice: 25,
        where: 'Near Manaoag church, local markets',
        category: 'Dessert',
      },
      {
        name: 'Hundred Islands Grilled Seafood',
        description: 'Fresh grilled fish, squid, and shellfish served at Lucap Wharf restaurants after your island hopping tour.',
        avgPrice: 200,
        where: 'Lucap Wharf restaurants, Alaminos City',
        category: 'Seafood',
      },
      {
        name: 'Bagoong Balayan',
        description: 'Fermented fish paste that is a staple condiment in Pangasinan cooking. Used in many local dishes and sold as pasalubong.',
        avgPrice: 40,
        where: 'Public markets throughout Pangasinan',
        category: 'Condiment',
      },
    ],
  })

  console.log('✅ Local food seeded')
  console.log('🎉 Knowledge base seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })