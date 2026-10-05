import TripActionConfirmation from './TripActionConfirmation';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Download, Bus, BedDouble, MapPin, Utensils, CalendarDays, Users, Clock, Wallet } from 'lucide-react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import { useAppTheme } from '../theme/useAppTheme';
import { itinerarySummary } from '../lib/itinerarySummary';
import { downloadItineraryPdf } from '../lib/itineraryPdf';
import { api } from '../lib/api';

export const savedTripActionStyle = { width: 160, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 };
const money = value => value == null || !Number.isFinite(Number(value)) ? '' : `PHP ${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const range = (min, max) => min === max ? money(min) : `${money(min)} - ${money(max)}`;
const clean = value => String(value || '').split(/Source:|Guide states verified|Approximate reference:/i)[0].replace(/\?/g, '').trim();
const stopCopy = stop => {
  if (stop.tag === 'Transit') return 'Travel using your selected transport modes.';
  if (stop.tag === 'Food') return 'Choose a local meal within your daily allowance.';
  if (stop.tag === 'Lodging') return 'Your selected hotel for the overnight stay.';
  return clean(stop.subtitle).split(/ Leave | Listed entry estimate:| Confirm access/i)[0];
};

export default function SavedItineraryDetails({ plan, areaName, compact = false, onRequestExportConfirmation }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [message, setMessage] = useState('');
  const [confirmExport, setConfirmExport] = useState(false);
  const [catalog, setCatalog] = useState(null);
  useEffect(() => { let alive = true; api.getItineraryCatalog().then(data => { if (alive) setCatalog(data); }).catch(() => {}); return () => { alive = false; }; }, []);
  const c = itinerarySummary(plan, catalog?.fareTables || []);
  if (!c) return null;
  const r = plan.request;
  const hotel = plan.stops?.find(s => s.tag === 'Lodging')?.title || catalog?.areas?.find(a => a.id === r.areaId)?.lodging?.find(h => h.id === r.lodgingId)?.name;
  const fares = c.transport.filter(f => f.total != null && Number.isFinite(Number(f.total)));
  const exportAction = {
    title: 'Export itinerary PDF?',
    message: 'Download your saved schedule, selected hotel, transport fares and cost summary as a PDF.',
    label: 'Export PDF',
    onConfirm: async () => {
      setConfirmExport(false);
      try {
        await downloadItineraryPdf({ ...plan, costEstimate: c }, areaName);
        setMessage('Your itinerary PDF is ready.');
      } catch {
        setMessage('The PDF could not be downloaded. Please try again.');
      }
    },
  };
  const text = themeStyle({ fontFamily: 'DMSans', color: '#16324A', fontSize: 13, lineHeight: 21 });
  const muted = themeStyle({ ...text, color: '#6B8CA8', fontSize: 12 });
  const heading = themeStyle({ ...text, fontSize: 18, fontWeight: '700' });
  const section = themeStyle({ padding: 20, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2EBF3', gap: 14 });
  const badge = (label, Icon = MapPin) => <View key={label} style={themeStyle({ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#EAF3F8' })}><Icon size={13} color={themeColor('#0B3C5D','color')} /><Text style={text}>{clean(label)}</Text></View>;
  const row = (label, value) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><Text style={muted}>{label}</Text><Text style={[text, { fontWeight: '600' }]}>{value}</Text></View>;
  return <View style={{ gap: 18 }}>
    <View style={section}>
      <Text style={heading}>Saved itinerary summary</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{badge(r.date,CalendarDays)}{badge(`${r.days} days`,Clock)}{badge(`${r.travelers} travelers`,Users)}{badge(`Start ${r.startTime}`,Clock)}</View>
      {!compact && <><Text style={muted}>YOUR TRAVEL PREFERENCES</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[r.travelerType, `${r.travelStyle} pace`, ...(r.tripTypes || []), ...(r.activities || []), ...(r.preferences || [])].filter(Boolean).map(label=>badge(label))}</View></>}
      <View style={themeStyle({ flexDirection: 'row', flexWrap: 'wrap', gap: 12 })}>{[['Trip budget',money(r.budget)],['Planned total',range(c.min,c.max)],['Per person',range(c.perPersonMin,c.perPersonMax)]].map(([label,value])=><View key={label} style={themeStyle({flexGrow:1,flexBasis:150,padding:16,borderRadius:12,backgroundColor:'#F4F7FB',gap:6})}><Text style={muted}>{label}</Text><Text style={[heading,{fontSize:20}]}>{value}</Text></View>)}</View>
      {row('Meals', money(c.meals))}
      {!!fares.length && row('Transport', money(c.transportTotal))}
      <View style={themeStyle({ padding: 14, borderRadius: 12, backgroundColor: '#F4F7FB', gap: 6 })}><View style={{flexDirection:'row',gap:8,alignItems:'center'}}><BedDouble size={17} color={themeColor('#0B3C5D','color')} /><Text style={[text,{fontWeight:'700'}]}>{Number(r.days) === 1 ? 'No overnight stay' : !r.lodgingId ? 'No overnight stay' : hotel || 'Selected accommodation'}</Text></View>{c.lodging && <Text style={text}>{range(c.lodging.min,c.lodging.max)} | {c.lodging.nights} nights x {c.lodging.rooms} rooms</Text>}</View>
      {row('Emergency reserve (10%)', money(c.emergency))}
      {row('Listed entry fees', money(c.entryFees))}
      {row('Remaining after plan and reserve', range(c.remainingMin,c.remainingMax))}
      <TripActionConfirmation action={!onRequestExportConfirmation && confirmExport ? exportAction : null} onDismiss={() => setConfirmExport(false)} onConfirm={exportAction.onConfirm} />
      <FeedbackPressable accessibilityRole="button" onPress={() => {
        setMessage('');
        if (onRequestExportConfirmation) onRequestExportConfirmation(exportAction);
        else setConfirmExport(true);
 }} style={themeStyle({ ...savedTripActionStyle, backgroundColor: '#0B3C5D' })}><Download size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize:13 }}>Export PDF</Text></FeedbackPressable>
      {!!message && <Text accessibilityRole="alert" style={text}>{message}</Text>}
    </View>
    {!compact && <>
      {!!fares.length && <View style={section}><Text style={heading}>Transport fares</Text>{fares.map(f => { const input = r.fareInputs?.find(v=>v.mode===f.mode); return <View key={f.mode} style={themeStyle({padding:16,borderRadius:12,backgroundColor:'#F4F7FB',gap:8})}><View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Bus size={18} color={themeColor('#0B3C5D','color')} /><Text style={[text,{fontWeight:'700'}]}>{f.mode}</Text></View><Text style={[text,{fontWeight:'700'}]}>{money(f.total)}</Text></View><Text style={muted}>{input?.km != null ? `${input.km} km per ride | ` : ''}{money(f.perRide)} per person</Text><Text style={muted}>{f.rides} rides x {r.travelers} travelers</Text></View>; })}</View>}
      {Array.from({length:Number(r.days)},(_,i)=>i+1).map(day=><View key={day} style={section}><Text style={heading}>Day {day}</Text>{(plan.stops || []).filter(s=>s.day===day).map((s,i)=>{const Icon=s.tag==='Transit'?Bus:s.tag==='Food'?Utensils:s.tag==='Lodging'?BedDouble:MapPin; return <View key={i} style={{flexDirection:'row',gap:12,paddingVertical:10}}><View style={themeStyle({padding:10,alignSelf:'flex-start',borderRadius:12,backgroundColor:'#EAF3F8'})}><Icon size={18} color={themeColor('#0B3C5D','color')} /></View><View style={{flex:1,gap:4}}><Text style={muted}>{clean(s.time).replace(/^Day d+s*[?|]s*/, '')} | {s.tag}</Text><Text style={[text,{fontWeight:'700',fontSize:15}]}>{s.title}</Text><Text style={text} numberOfLines={3}>{stopCopy(s)}</Text>{s.tag==='Attraction' && s.price != null && <Text style={muted}>Group entry: {money(s.price)}</Text>}</View></View>;})}</View>)}
      {!!plan.foodOptions?.length && <View style={section}><Text style={heading}>Local foods to try</Text><Text style={muted}>{money(r.mealBudget)} daily meal allowance per person</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{plan.foodOptions.map(f=><View key={f.id} style={themeStyle({flexBasis:220,flexGrow:1,padding:14,borderRadius:12,backgroundColor:'#F4F7FB',gap:6})}><Text style={[text,{fontWeight:'700'}]}>{f.name}</Text><Text style={text} numberOfLines={2}>{clean(f.description)}</Text>{!!f.where && <Text style={muted}>{clean(f.where)}</Text>}{f.listedAveragePrice != null && <Text style={muted}>Listed average: {money(f.listedAveragePrice)}</Text>}</View>)}</View></View>}
    </>}
  </View>;
}
