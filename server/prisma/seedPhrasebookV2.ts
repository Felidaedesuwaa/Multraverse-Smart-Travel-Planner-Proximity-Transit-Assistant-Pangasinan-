import mongoose from 'mongoose'
import { Phrasebook } from '../src/models/Phrasebook'
import 'dotenv/config'

const phrases = [
  // Greetings
  { filipino: 'Magandang umaga', pangasinan: 'Masantos a kabwasan', english: 'Good morning', category: 'Greetings' },
  { filipino: 'Magandang tanghali', pangasinan: 'Masantos ya ngetmavan', english: 'Good noon', category: 'Greetings' },
  { filipino: 'Magandang hapon', pangasinan: 'Masantos ya ngarem', english: 'Good afternoon', category: 'Greetings' },
  { filipino: 'Magandang gabi', pangasinan: 'Masantos a labi', english: 'Good evening', category: 'Greetings' },
  { filipino: 'Magandang araw', pangasinan: 'Masantos ya agew', english: 'Good day', category: 'Greetings' },
  { filipino: 'Kumusta ka?', pangasinan: 'Kumusta ka la? / Antoy emano?', english: 'How are you?', category: 'Greetings' },
  { filipino: 'Mabuti naman, salamat', pangasinan: 'Maong ak met, salamat', english: 'I am fine, thank you', category: 'Greetings' },
  { filipino: 'Salamat', pangasinan: 'Salamat', english: 'Thank you', category: 'Greetings' },
  { filipino: 'Maraming salamat', pangasinan: 'Balbaleg ya salamat', english: 'Thank you very much', category: 'Greetings' },
  { filipino: 'Walang anuman', pangasinan: 'Angapoy wala', english: 'You are welcome', category: 'Greetings' },
  { filipino: 'Oo', pangasinan: 'On', english: 'Yes', category: 'Greetings' },
  { filipino: 'Hindi', pangasinan: 'Andi', english: 'No', category: 'Greetings' },
  { filipino: 'Paalam', pangasinan: 'Onpatanir / Sige la', english: 'Goodbye', category: 'Greetings' },
  { filipino: 'Pakiusap', pangasinan: 'Panangasi', english: 'Please', category: 'Greetings' },
  { filipino: 'Excuse me', pangasinan: 'Magano pa', english: 'Excuse me', category: 'Greetings' },
  { filipino: 'Patawad', pangasinan: 'Pirdona', english: 'I am sorry', category: 'Greetings' },
  { filipino: 'Helo', pangasinan: 'Hilo', english: 'Hello', category: 'Greetings' },
  { filipino: 'Ikinagagalak kitang makilala', pangasinan: 'Maong a nakabat taka', english: 'Nice to meet you', category: 'Greetings' },
  { filipino: 'Ano ang pangalan mo?', pangasinan: 'Antoy ngaran mo?', english: 'What is your name?', category: 'Greetings' },
  { filipino: 'Ang pangalan ko ay ___', pangasinan: 'Say ngaran ko ___', english: 'My name is ___', category: 'Greetings' },
  { filipino: 'Hindi ko naiintindihan', pangasinan: 'Agko natalusan', english: 'I do not understand', category: 'Greetings' },
  { filipino: 'Marunong ka bang mag-Ingles?', pangasinan: 'Makapansalita kay Inglis?', english: 'Do you speak English?', category: 'Greetings' },

  // Transport
  { filipino: 'Nasaan ang terminal ng bus?', pangasinan: 'Iner so istasyon na bus?', english: 'Where is the bus station?', category: 'Transport' },
  { filipino: 'Nasaan ang terminal ng tren?', pangasinan: 'Iner so istasyon na trin?', english: 'Where is the train station?', category: 'Transport' },
  { filipino: 'Magkano ang tiket papunta sa ___?', pangasinan: 'Sampigay tiket ed ___?', english: 'How much is a ticket to ___?', category: 'Transport' },
  { filipino: 'Saan pupunta ang bus na ito?', pangasinan: 'Iner so laen to iyan bus?', english: 'Where does this bus go?', category: 'Transport' },
  { filipino: 'Tumitigil ba ang bus na ito sa ___?', pangasinan: "Saya'n bus ontunda ed ___?", english: 'Does this bus stop in ___?', category: 'Transport' },
  { filipino: 'Kailan aalis ang bus?', pangasinan: 'Kapigan so bus onpikal?', english: 'When does the bus leave?', category: 'Transport' },
  { filipino: 'Kailan darating ang bus sa ___?', pangasinan: 'Kapigan so isabi bus ___?', english: 'When will the bus arrive in ___?', category: 'Transport' },
  { filipino: 'Taksi!', pangasinan: 'Taksi!', english: 'Taxi!', category: 'Transport' },
  { filipino: 'Dalhin mo ako sa ___, pakiusap', pangasinan: "Iyakar no ak pa'd ___ kasim pa", english: 'Take me to ___, please', category: 'Transport' },
  { filipino: 'Magkano papunta sa ___?', pangasinan: 'Pigay bili to ___?', english: 'How much to get to ___?', category: 'Transport' },
  { filipino: 'Kumaliwa', pangasinan: 'Kawigi ka', english: 'Turn left', category: 'Transport' },
  { filipino: 'Kumanan', pangasinan: 'Kanan ka', english: 'Turn right', category: 'Transport' },
  { filipino: 'Diretso lang', pangasinan: 'Diritso labat', english: 'Straight ahead', category: 'Transport' },
  { filipino: 'Nasaan ang dalampasigan?', pangasinan: 'Iner so gapa / baybay?', english: 'Where is the beach?', category: 'Transport' },
  { filipino: 'Malayo ba dito?', pangasinan: 'Arawi kasi dia?', english: 'Is it far from here?', category: 'Transport' },
  { filipino: 'Gusto kong pumunta sa Hundred Islands', pangasinan: 'Labay koy onlad Hundred Islands', english: 'I want to go to Hundred Islands', category: 'Transport' },
  { filipino: 'Gusto kong magrenta ng kotse', pangasinan: 'Labay koy manrenta na kotsi', english: 'I want to rent a car', category: 'Transport' },
  { filipino: 'Paano ako makakarating sa ___?', pangasinan: 'Panon ak ya makarkar ed ___?', english: 'How do I get to ___?', category: 'Transport' },

  // Food
  { filipino: 'Kain na tayo!', pangasinan: 'Mangan tila!', english: "Let's eat!", category: 'Food' },
  { filipino: 'Masarap ang pagkain!', pangasinan: 'Masamit yan kakanen! / Mananam sikato', english: 'This food is delicious!', category: 'Food' },
  { filipino: 'Magkano ang total na bayad?', pangasinan: 'Pigay lapat to amin?', english: 'How much is the total bill?', category: 'Food' },
  { filipino: 'Nasaan ang banyo?', pangasinan: 'Iner so banyo / CR? / Kawalaan na patiang?', english: 'Where is the restroom?', category: 'Food' },
  { filipino: 'Gusto ko ng ___', pangasinan: "Labay ko'y ___", english: 'I want ___', category: 'Food' },
  { filipino: 'Vegetarian ako', pangasinan: 'Pising labat so kakanen ko', english: 'I am a vegetarian', category: 'Food' },
  { filipino: 'Hindi ako kumakain ng baboy', pangasinan: "Aga'k mamangan na baboy", english: 'I do not eat pork', category: 'Food' },
  { filipino: 'Hindi ako kumakain ng baka', pangasinan: "Aga'k mamangan na baka", english: 'I do not eat beef', category: 'Food' },
  { filipino: 'Mesa para sa dalawa', pangasinan: "Lamisaan para'd dwara'n to-o pa", english: 'A table for two please', category: 'Food' },
  { filipino: 'Patingnan mo ang menu', pangasinan: 'Sarag ton nengnengen ko so minu?', english: 'Can I see the menu?', category: 'Food' },
  { filipino: 'May espesyalidad ba kayo dito?', pangasinan: 'Walay ispicial yo ed sayan pasen?', english: 'Is there a local specialty?', category: 'Food' },
  { filipino: 'Tapos na ako', pangasinan: 'Asumpal ak la', english: 'I am finished eating', category: 'Food' },
  { filipino: 'Pakibigay ang tsit', pangasinan: 'Say chit pa', english: 'The check please', category: 'Food' },
  { filipino: 'Waiter!', pangasinan: 'Magano pa waiter', english: 'Waiter!', category: 'Food' },
  { filipino: 'Tagay!', pangasinan: 'Maninom tila!', english: 'Cheers!', category: 'Food' },
  { filipino: 'Almusal', pangasinan: 'Almusal', english: 'Breakfast', category: 'Food' },
  { filipino: 'Tanghalian', pangasinan: 'Ugto', english: 'Lunch', category: 'Food' },
  { filipino: 'Hapunan', pangasinan: 'Pandem', english: 'Dinner/Supper', category: 'Food' },
  { filipino: 'Meryenda', pangasinan: 'Meryenda', english: 'Snack/Tea time', category: 'Food' },

  // Accommodation
  { filipino: 'May bakanteng kwarto kayo?', pangasinan: 'Walay silid yo ya malaem?', english: 'Do you have any rooms available?', category: 'Accommodation' },
  { filipino: 'Magkano ang isang kwarto?', pangasinan: 'Sampigay silid kada sakey to-o?', english: 'How much is a room for one person?', category: 'Accommodation' },
  { filipino: 'Sige, kukuhanin ko ito', pangasinan: 'Sigi, alaen ko', english: 'OK I will take it', category: 'Accommodation' },
  { filipino: 'Mananatili ako ng ___ gabi', pangasinan: 'Manayam ak na ___ labi', english: 'I will stay for ___ nights', category: 'Accommodation' },
  { filipino: 'Pakiayos ang kwarto ko', pangasinan: 'Palimgas mo pa imay silid ko', english: 'Please clean my room', category: 'Accommodation' },
  { filipino: 'Gigisahin mo ba ako ng ___?', pangasinan: 'Liing mo ak pa na ___?', english: 'Can you wake me at ___?', category: 'Accommodation' },
  { filipino: 'Gusto ko nang mag-check out', pangasinan: 'Labay ko lay ompaway', english: 'I want to check out', category: 'Accommodation' },
  { filipino: 'May mas mura pa ba?', pangasinan: 'Walay mas mamura ni?', english: 'Do you have anything cheaper?', category: 'Accommodation' },
  { filipino: 'May mas malaki pa ba?', pangasinan: 'Walay mas baleg ni?', english: 'Do you have anything bigger?', category: 'Accommodation' },
  { filipino: 'Kasama ba ang almusal?', pangasinan: 'Kaiba lay almusal?', english: 'Is breakfast included?', category: 'Accommodation' },
  { filipino: 'Anong oras ang almusal?', pangasinan: 'Anton oras so almusal?', english: 'What time is breakfast?', category: 'Accommodation' },
  { filipino: 'Makita ko muna ang kwarto?', pangasinan: 'Sarag ton nanengneng ni so silid?', english: 'May I see the room first?', category: 'Accommodation' },

  // Emergency
  { filipino: 'Tulong!', pangasinan: 'Tabang!', english: 'Help!', category: 'Emergency' },
  { filipino: 'Kailangan ko ng doktor', pangasinan: 'Kaukolan koy doktor', english: 'I need a doctor', category: 'Emergency' },
  { filipino: 'Maysakit ako', pangasinan: 'Walay sasakiten ko', english: 'I am sick', category: 'Emergency' },
  { filipino: 'Nasugatan ako', pangasinan: 'Adisgo ak', english: 'I am injured', category: 'Emergency' },
  { filipino: 'Nawawala ako', pangasinan: 'Abalang ak', english: 'I am lost', category: 'Emergency' },
  { filipino: 'Nawala ang bag ko', pangasinan: 'Abalang koy bag ko', english: 'I lost my bag', category: 'Emergency' },
  { filipino: 'Nawala ang pitaka ko', pangasinan: "Abalang koy pitaka'k", english: 'I lost my wallet', category: 'Emergency' },
  { filipino: 'Tumawag ng pulis!', pangasinan: 'Mantawag ak na pulis! / Pulis!', english: 'Call the police!', category: 'Emergency' },
  { filipino: 'Hinto! Magnanakaw!', pangasinan: 'Tonda! Matakew!', english: 'Stop! Thief!', category: 'Emergency' },
  { filipino: 'Emergency ito', pangasinan: 'Tampolan ya nakaukolan', english: 'It is an emergency', category: 'Emergency' },
  { filipino: 'Kailangan kita ng tulong', pangasinan: 'Kaukolan koy tulong mo', english: 'I need your help', category: 'Emergency' },
  { filipino: 'Pwede ba akong gumamit ng telepono mo?', pangasinan: "Sarag kon usaren so telepono'm?", english: 'Can I use your phone?', category: 'Emergency' },
  { filipino: 'Huwag mo akong hawakan!', pangasinan: 'Ag no ak didiwetin!', english: 'Do not touch me!', category: 'Emergency' },
  { filipino: 'Iwanan mo ako', pangasinan: 'Taynan mo ak', english: 'Leave me alone', category: 'Emergency' },

  // Shopping
  { filipino: 'Magkano ito?', pangasinan: 'Sampiga ya? / Sampiga iya?', english: 'How much is this?', category: 'Shopping' },
  { filipino: 'Mahal naman', pangasinan: 'Anvelat so bili / Mablin maong', english: 'That is too expensive', category: 'Shopping' },
  { filipino: 'Pwede bang magpababa ng presyo?', pangasinan: 'Kasi pakulangan?', english: 'Can I get a discount?', category: 'Shopping' },
  { filipino: 'Bibilhin ko ito', pangasinan: 'Saliven ko ya / Sigi alaen ko', english: 'I will buy this', category: 'Shopping' },
  { filipino: 'May pasalubong ba kayo?', pangasinan: 'Wala ray pasalubong yo dia?', english: 'Do you have souvenirs?', category: 'Shopping' },
  { filipino: 'Hindi ko gusto', pangasinan: 'Agko labay', english: 'I do not want it', category: 'Shopping' },
  { filipino: 'Hindi ko kayang bilhin', pangasinan: 'Agko nasarag so bili', english: 'I cannot afford it', category: 'Shopping' },
  { filipino: 'Tumatanggap ba kayo ng credit card?', pangasinan: "manaawat kayo'y credit card?", english: 'Do you accept credit cards?', category: 'Shopping' },
  { filipino: 'Nasaan ang ATM?', pangasinan: 'Iner so automatik teler a makina (ATM)?', english: 'Where is the ATM?', category: 'Shopping' },
  { filipino: 'Saan pwedeng magpalit ng pera?', pangasinan: 'Iner so napansalatan ko iyay kuarta?', english: 'Where can I exchange money?', category: 'Shopping' },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB')

  await Phrasebook.deleteMany({})
  console.log('Cleared existing phrasebook')

  await Phrasebook.insertMany(phrases)
  console.log(`Seeded ${phrases.length} accurate phrases`)

  await mongoose.disconnect()
  console.log('Done!')
}

main().catch(console.error)
