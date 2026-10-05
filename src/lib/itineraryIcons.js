import { Waves, Wind, Compass, BedDouble, Home, Building2, Utensils, Eye, ShoppingBag, Sparkles, Bus, Bike, Car } from 'lucide-react-native';

export const EXPERIENCE_DETAILS = {
  'Beach & Sea': { Icon: Waves, detail: 'Coastal escapes', tone: 'blue' },
  Nature: { Icon: Wind, detail: 'Fresh air & green views', tone: 'green' },
  Waterfalls: { Icon: Waves, detail: 'Cascades & cool waters', tone: 'blue' },
  Adventure: { Icon: Compass, detail: 'An active getaway', tone: 'coral' },
  Relaxing: { Icon: BedDouble, detail: 'Take it slow', tone: 'green' },
  Pilgrimage: { Icon: Home, detail: 'Faith & reflection', tone: 'gold' },
  'History & Culture': { Icon: Building2, detail: 'Stories & local heritage', tone: 'gold' },
  'Food Trip': { Icon: Utensils, detail: 'Taste local favorites', tone: 'coral' },
  'Farm Experience': { Icon: Wind, detail: 'Countryside discoveries', tone: 'green' },
  'Scenic / Photography': { Icon: Eye, detail: 'Views worth capturing', tone: 'blue' },
  'Shopping & Pasalubong': { Icon: ShoppingBag, detail: 'Bring something home', tone: 'coral' },
  'Festivals & Events': { Icon: Sparkles, detail: 'Local celebrations', tone: 'gold' },
  Swimming: { Icon: Waves, detail: 'A refreshing dip', tone: 'blue' },
  Boating: { Icon: Compass, detail: 'Explore from the water', tone: 'blue' },
  'Farm Visit': { Icon: Wind, detail: 'Discover rural life', tone: 'green' },
  'Beach Relaxation': { Icon: Waves, detail: 'Unwind by the shore', tone: 'blue' },
  'Outdoor Exploration': { Icon: Compass, detail: 'Head into the outdoors', tone: 'green' },
  Photography: { Icon: Eye, detail: 'Capture your favorites', tone: 'gold' },
  'Local Food': { Icon: Utensils, detail: 'Try regional flavors', tone: 'coral' },
  'Church / Pilgrimage': { Icon: Home, detail: 'Visit sacred landmarks', tone: 'gold' },
  'Resort / Staycation': { Icon: BedDouble, detail: 'Rest & recharge', tone: 'green' },
};

export const TRANSPORT_ICONS = { Bus, Jeepney: Bus, Tricycle: Bike, Van: Car, 'Own Vehicle': Car };
