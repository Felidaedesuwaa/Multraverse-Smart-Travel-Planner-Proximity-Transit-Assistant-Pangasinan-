import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding phrasebook...')

  await prisma.phrasebook.createMany({
    skipDuplicates: true,
    data: [
      // Greetings
      { filipino: 'Magandang umaga', pangasinan: 'Maong ya bigla', english: 'Good morning', category: 'Greetings' },
      { filipino: 'Magandang hapon', pangasinan: 'Maong ya ngarem', english: 'Good afternoon', category: 'Greetings' },
      { filipino: 'Magandang gabi', pangasinan: 'Maong ya labi', english: 'Good evening', category: 'Greetings' },
      { filipino: 'Kumusta ka?', pangasinan: 'Mabuti ka?', english: 'How are you?', category: 'Greetings' },
      { filipino: 'Mabuti naman', pangasinan: 'Mabuti ak', english: 'I am fine', category: 'Greetings' },
      { filipino: 'Paalam', pangasinan: 'Paalam', english: 'Goodbye', category: 'Greetings' },
      { filipino: 'Salamat', pangasinan: 'Salamat', english: 'Thank you', category: 'Greetings' },
      { filipino: 'Walang anuman', pangasinan: 'Anggapoy kakanaan', english: 'You are welcome', category: 'Greetings' },
      { filipino: 'Oo', pangasinan: 'Wen', english: 'Yes', category: 'Greetings' },
      { filipino: 'Hindi', pangasinan: 'Anggapo', english: 'No', category: 'Greetings' },
      { filipino: 'Paumanhin', pangasinan: 'Paki-abet', english: 'Excuse me', category: 'Greetings' },
      { filipino: 'Patawad', pangasinan: 'Patawaren mo ak', english: 'I am sorry', category: 'Greetings' },

      // Transport
      { filipino: 'Nasaan ang terminal?', pangasinan: 'Iner so terminal?', english: 'Where is the terminal?', category: 'Transport' },
      { filipino: 'Magkano ang pamasahe?', pangasinan: 'Magkano so pamasahe?', english: 'How much is the fare?', category: 'Transport' },
      { filipino: 'Saan pupunta ang jeep na ito?', pangasinan: 'Iner so laen na jeep?', english: 'Where does this jeep go?', category: 'Transport' },
      { filipino: 'Pakitigil dito', pangasinan: 'Ipagel mo ak diad', english: 'Please stop here', category: 'Transport' },
      { filipino: 'Gaano katagal ang biyahe?', pangasinan: 'Agano so biyahe?', english: 'How long is the trip?', category: 'Transport' },
      { filipino: 'Pwede ba akong sumakay?', pangasinan: 'Nayari ak ya sumakay?', english: 'Can I ride?', category: 'Transport' },
      { filipino: 'Nasaan ang bus stop?', pangasinan: 'Iner so bus stop?', english: 'Where is the bus stop?', category: 'Transport' },

      // Food
      { filipino: 'Masarap', pangasinan: 'Masamit', english: 'Delicious', category: 'Food' },
      { filipino: 'Gutom na ako', pangasinan: 'Narasan ak la', english: 'I am hungry', category: 'Food' },
      { filipino: 'Ano ang masarap dito?', pangasinan: 'Anto so masamit diad?', english: 'What is delicious here?', category: 'Food' },
      { filipino: 'Isang plato ng kanin', pangasinan: 'Sakey a plato na bigas', english: 'One plate of rice', category: 'Food' },
      { filipino: 'Tubig lamang', pangasinan: 'Danum labat', english: 'Just water', category: 'Food' },
      { filipino: 'Magkano ang pagkain?', pangasinan: 'Magkano so makan?', english: 'How much is the food?', category: 'Food' },
      { filipino: 'Kumain na tayo', pangasinan: 'Mangan tayo la', english: 'Let us eat', category: 'Food' },

      // Emergency
      { filipino: 'Tulong!', pangasinan: 'Abigan mo ak!', english: 'Help!', category: 'Emergency' },
      { filipino: 'Nasaan ang ospital?', pangasinan: 'Iner so ospital?', english: 'Where is the hospital?', category: 'Emergency' },
      { filipino: 'Nasaan ang pulis?', pangasinan: 'Iner so pulis?', english: 'Where is the police?', category: 'Emergency' },
      { filipino: 'May sakit ako', pangasinan: 'Masakit ak', english: 'I am sick', category: 'Emergency' },
      { filipino: 'Nawala ako', pangasinan: 'Naandi ak', english: 'I am lost', category: 'Emergency' },
      { filipino: 'Tawagan ang ambulansya', pangasinan: 'Tawagen so ambulansya', english: 'Call an ambulance', category: 'Emergency' },
      { filipino: 'Kailangan ko ng doktor', pangasinan: 'Kaukolan ko so doktor', english: 'I need a doctor', category: 'Emergency' },

      // Shopping
      { filipino: 'Magkano ito?', pangasinan: 'Magkano iya?', english: 'How much is this?', category: 'Shopping' },
      { filipino: 'Mahal naman', pangasinan: 'Lalon maaro', english: 'That is expensive', category: 'Shopping' },
      { filipino: 'Mura ba?', pangasinan: 'Barato?', english: 'Is it cheap?', category: 'Shopping' },
      { filipino: 'Bibilhin ko ito', pangasinan: 'Galaen ko iya', english: 'I will buy this', category: 'Shopping' },
      { filipino: 'Nasaan ang palengke?', pangasinan: 'Iner so palengke?', english: 'Where is the market?', category: 'Shopping' },
      { filipino: 'Puwede bang mag-tawad?', pangasinan: 'Nayari ak ya manpababa?', english: 'Can I bargain?', category: 'Shopping' },

      // Accommodation
      { filipino: 'Nasaan ang hotel?', pangasinan: 'Iner so hotel?', english: 'Where is the hotel?', category: 'Accommodation' },
      { filipino: 'Mayroon bang bakanteng kwarto?', pangasinan: 'Wala so bakante ya kuarto?', english: 'Is there a vacant room?', category: 'Accommodation' },
      { filipino: 'Magkano ang isang gabi?', pangasinan: 'Magkano so sakey ya labi?', english: 'How much for one night?', category: 'Accommodation' },
      { filipino: 'Gusto ko ng check-in', pangasinan: 'Labay ko so check-in', english: 'I want to check in', category: 'Accommodation' },
    ],
  })

  console.log('✅ Phrasebook seeded with', 44, 'phrases')
  console.log('🎉 Done!')
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })