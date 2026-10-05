import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ArrowLeft, ArrowRight, BedDouble, ChevronDown, ChevronUp, Home, Info, MapPin, Sparkles, Utensils, Wallet } from 'lucide-react-native';
import { useAppTheme } from '../theme/useAppTheme';
import { useItineraryPlanner, TRIP_TYPES, ACTIVITIES, TRAVELER_TYPES, TRAVEL_STYLES, TRANSPORT_MODES, BUDGET_PACKAGES, todayInManila, hotelBudget } from '../hooks/useItineraryPlanner';
import AIToolHeader from '../components/AIToolHeader';
import ItineraryFareInputs from '../components/ItineraryFareInputs';
import ItineraryResults from '../components/ItineraryResults';
import { Button, Card, Choices, Copy, Field, Select, money, range, styles } from '../components/planner/NativeItineraryUI';
import { dagupanPhotos } from '../lib/dagupanPhotos';
import { alaminosPhotos } from '../lib/alaminosPhotos';
import { sanCarlosPhotos } from '../lib/sanCarlosPhotos';
import { urdanetaPhotos } from '../lib/urdanetaPhotos';
import { EXPERIENCE_DETAILS, TRANSPORT_ICONS } from '../lib/itineraryIcons';

const photoGuides = { dagupan: dagupanPhotos, alaminos: alaminosPhotos, 'san-carlos': sanCarlosPhotos, urdaneta: urdanetaPhotos };

function Lodging({ lodging, selected, onSelect, comparison }) {
  const [expanded, setExpanded] = useState(false);
  const details = lodging.lodgingDetails;
  const rate = details?.reference_rate;
  return <Card>
    <Button Icon={BedDouble} selected={selected} disabled={details?.overnight_supported === false} onPress={onSelect}>{lodging.name}{selected ? ' · Selected' : ''}</Button>
    <Copy>{rate ? `${range(rate.min, rate.max)} / ${rate.period} · Approx.` : lodging.price == null ? 'Rate unconfirmed' : `${money(lodging.price)} / night`}</Copy>
    {!!details?.address && <Copy muted>{details.address}</Copy>}
    {!!lodging.amenities?.length && <Copy muted>{lodging.amenities.join(' · ')}</Copy>}
    {details?.overnight_supported === false && <Copy alert>Day-use / events only. Overnight stay unavailable.</Copy>}
    {comparison.status !== 'day-trip' && <Copy alert={comparison.blocked}>{comparison.min == null ? 'Confirm hotel cost.' : `${comparison.status === 'over' ? 'Over budget' : comparison.status === 'possible' ? 'May exceed budget' : 'Hotel estimate'}: ${range(comparison.min, comparison.max)} total.`}</Copy>}
    {!!details && <Button Icon={Info} TrailingIcon={expanded ? ChevronUp : ChevronDown} onPress={() => setExpanded(value => !value)}>{expanded ? 'Hide hotel details' : 'View hotel details'}</Button>}
    {expanded && <View style={{ gap: 8 }}>{[['Room types', details.room_types], ['Capacity', details.capacity_note], ['Facilities', details.amenities_description], ['Additional fees', details.additional_fees], ['Rate details', details.rate_note], ['Getting there', details.transport_access], ['Nearby', details.nearby_attractions], ['Contact', details.contact], ['Booking', details.booking_url], ['Check-in', details.check_in], ['Check-out', details.check_out]].filter(([, value]) => value).map(([label, value]) => <Copy key={label}>{label}: {value}</Copy>)}</View>}
  </Card>;
}

function Discovery({ name, photo, entry, Icon }) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <View style={{ gap: 8 }}>
    {!!photo && !failed && <Image source={photo.asset} accessibilityLabel={photo.alt || name} resizeMode="cover" style={{ width: '100%', height: 180, borderRadius: 12 }} onError={() => setFailed(true)} />}
    <Button Icon={Icon} TrailingIcon={expanded ? ChevronUp : ChevronDown} onPress={() => setExpanded(value => !value)}>{name}{expanded ? ' · Hide details' : ' · View details'}</Button>
    {expanded && <Copy>{entry?.description || `${name} is listed in this destination's local travel guide. Confirm visiting details locally.`}</Copy>}
    {expanded && !!entry?.location && <Copy muted>Where: {entry.location}</Copy>}
  </View>;
}

export default function AIItinerary({ navigation }) {
  const { palette } = useAppTheme();
  const scroll = useRef(null);
  const planner = useItineraryPlanner({ navigation, onInvalid: () => requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: true })) });
  // Wait for the new results to commit before resetting the old review offset.
  useEffect(() => {
    if (planner.showForm || !planner.plan) return;
    Keyboard.dismiss();
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [planner.plan, planner.showForm]);
  const { form, set, step, fieldErrors, area, lodgingList, lodging, stayBudget } = planner;
  const fieldError = key => !!fieldErrors[key] && <Copy alert>{fieldErrors[key]}</Copy>;
  const photos = photoGuides[form.areaId] || {};
  const advance = () => { planner.goNext(); scroll.current?.scrollTo({ y: 0, animated: true }); };
  const back = () => { planner.goBack(); scroll.current?.scrollTo({ y: 0, animated: true }); };
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <AIToolHeader eyebrow="PANGASINAN TRIP PLANNER" title="AI Itinerary" subtitle="Build a practical trip plan using verified places, transport fares, and local food guides." badges={[{ label: 'Verified local data' }, { label: 'Budget-aware planning' }]} Icon={Sparkles} compact />
      {!!planner.error && <Copy alert>{planner.error}</Copy>}
      {!!planner.notice && <Copy>{planner.notice}</Copy>}
      {planner.showForm && <>
        <Copy heading>Plan step {step} of 3</Copy><Copy muted>{planner.stepLabel}</Copy>
        <View style={styles.row}>{[1, 2, 3].map(number => <View key={number} style={{ flex: 1, height: 6, borderRadius: 6, backgroundColor: number <= step ? palette.accent : palette.line }} />)}</View>
        {step === 1 && <Card>
          <Copy heading>Choose your destination</Copy>
          <Select label="Where in Pangasinan?" placeholder="Choose a city or municipality" searchable options={planner.AREAS.map(item => ({ id: item.id, label: `${item.name}${item.group === 'Cities' ? ' City' : ''}` }))} value={form.areaId} onChange={value => set('areaId', value)} error={fieldErrors.areaId} />
          <Copy muted>4 cities and 44 municipalities</Copy>
          <Choices label="What kind of trip do you want?" multiple limit={3} options={TRIP_TYPES.map(label => ({ id: label, label, Icon: EXPERIENCE_DETAILS[label].Icon }))} values={form.tripTypes} onChange={value => set('tripTypes', value)} error={fieldErrors.tripTypes} />
          <Choices label="What activities do you want?" multiple limit={3} options={ACTIVITIES.map(label => ({ id: label, label, Icon: EXPERIENCE_DETAILS[label].Icon }))} values={form.activities} onChange={value => set('activities', value)} error={fieldErrors.activities} />
          <Choices label="Who are you traveling with?" options={TRAVELER_TYPES} values={form.travelerType} onChange={value => set('travelerType', value)} error={fieldErrors.travelerType} />
          <Choices label="What's your travel style?" options={TRAVEL_STYLES.map(item => ({ ...item, label: `${item.label} · ${item.desc}` }))} values={form.travelStyle} onChange={value => set('travelStyle', value)} error={fieldErrors.travelStyle} />
          <Button primary Icon={ArrowRight} onPress={advance}>Next: trip details</Button>
        </Card>}
        {step === 2 && <>
          <Card>
            <Copy heading>Trip details</Copy>
            <Field label="Travel date (YYYY-MM-DD)" value={form.date} onFocus={() => planner.setToday(todayInManila())} onChange={value => set('date', value)} error={fieldErrors.date} placeholder={planner.today} />
            <Field label="Travelers" numeric value={form.travelers} onChange={value => set('travelers', value)} error={fieldErrors.travelers} />
            <Select label="How many days?" options={[1, 2, 3, 4, 5, 6, 7].map(number => ({ id: number, label: `${number} day${number === 1 ? '' : 's'}` }))} value={form.days} onChange={value => set('days', value)} error={fieldErrors.days} />
            <Choices label="Total trip budget" options={BUDGET_PACKAGES.map(tier => ({ id: tier.id, Icon: tier.Icon, label: `${tier.label} · ${range(tier.min, tier.max ?? tier.min)}${tier.max == null ? '+' : ''} / person / day` }))} values={planner.budgetTier} onChange={id => planner.chooseBudget(BUDGET_PACKAGES.find(tier => tier.id === id))} error={fieldErrors.budget} />
            <Copy>{planner.selectedBudget ? `${planner.selectedBudget.label}: ${money(form.budget)} for ${form.travelers} travelers × ${form.days} days` : 'Choose a budget above.'}</Copy>
          </Card>
          <Card>
            <Copy heading>Where will you stay?</Copy><Copy muted>Hotels and accommodations in {area?.name || 'your destination'}</Copy>
            {!!form.lodgingId && <Field label="Rooms needed" numeric value={planner.hotelRooms} onChange={planner.setHotelRooms} error={fieldErrors.hotelRooms} />}
            <Copy muted>{Number(form.days) === 1 ? 'Day trip: no overnight stay. Choose 2 or more days to include a hotel.' : `Nightly rate × ${form.days - 1} nights × ${planner.hotelRooms} rooms. Confirm room capacity with the hotel.`}</Copy>
            <Button Icon={Home} selected={form.lodgingId === null} onPress={() => set('lodgingId', null)}>{Number(form.days) === 1 ? 'Day trip – no lodging' : 'No lodging – I will arrange my own stay'}</Button>
            {fieldError('lodgingId')}
            {lodgingList.map(item => <Lodging key={item.id} lodging={item} comparison={hotelBudget(item, form.budget, form.days, planner.hotelRooms)} selected={form.lodgingId === item.id} onSelect={() => set('lodgingId', item.id)} />)}
            {!lodgingList.length && <Copy muted>No verified accommodation on file for this area yet.</Copy>}
            {!!stayBudget?.blocked && <Copy alert>The hotel alone exceeds your budget. Choose a cheaper hotel, increase your budget, or remove lodging.</Copy>}
            {!!planner.higherBudget && !!stayBudget && ['over', 'possible'].includes(stayBudget.status) && <Button Icon={Wallet} onPress={() => planner.chooseBudget(planner.higherBudget)}>Use {planner.higherBudget.label} · {money(planner.higherBudget.rate * form.travelers * form.days)}</Button>}
          </Card>
          <View style={styles.row}><Button Icon={ArrowLeft} onPress={back}>Back</Button><Button primary Icon={ArrowRight} onPress={advance}>Next: review trip</Button></View>
        </>}
        {step === 3 && <>
          <Card>
            <Copy heading>Review and personalize</Copy><Copy>{area?.name} · {form.date} · {form.days} days · {form.travelers} travelers · {money(form.budget)} budget</Copy>
            <Copy muted>{[...form.tripTypes, ...form.activities].join(' · ')}</Copy>
            <Copy>{lodging ? `${lodging.name} · Confirm booking and rate` : 'No lodging'}</Copy>
            {['famousPlaces', 'foods'].map(key => !!area?.[key]?.length && <View key={key} style={{ gap: 12 }}><Copy heading>{key === 'foods' ? 'Foods to try' : 'Famous places nearby'}</Copy>{area[key].map(name => {
              const entry = area.entries.find(item => item.name === name);
              const photo = entry?.photo ? { asset: { uri: entry.photo }, alt: name } : photos[name];
              return <Discovery key={name} name={name} photo={photo} entry={entry} Icon={key === 'foods' ? Utensils : MapPin} />;
            })}</View>)}
            <Button Icon={planner.showAdvanced ? ChevronUp : ChevronDown} onPress={() => planner.setShowAdvanced(value => !value)}>{planner.showAdvanced ? 'Hide extra options' : 'Show extra options'}</Button>
            {planner.showAdvanced && <View style={{ gap: 14 }}>
              <Field label="Start time (HH:MM)" value={form.startTime} onChange={value => set('startTime', value)} error={fieldErrors.startTime} placeholder="07:00" />
              <Select label="Meals per person per day (PHP)" value={form.mealBudget} options={[200, 300, 500, 750, 1000, 1500].map(amount => ({ id: String(amount), label: `${money(amount)} / person / day` }))} onChange={value => set('mealBudget', value)} error={fieldErrors.mealBudget} />
              <Copy>Meals per person, full trip: {money(planner.mealPerPerson)}</Copy><Copy>Meals for all travelers: {money(planner.mealTotal)}</Copy><Copy alert={planner.mealRemaining < 0}>Budget after meals: {money(planner.mealRemaining)}</Copy>
              <Choices label="Transport" multiple options={TRANSPORT_MODES.map(label => ({ id: label, label, Icon: TRANSPORT_ICONS[label] }))} values={form.transportModes} onChange={value => set('transportModes', value)} error={fieldErrors.transportModes} />
              <ItineraryFareInputs modes={form.transportModes} tables={planner.fareTables} values={form.fareInputs} onChange={value => set('fareInputs', value)} areaId={form.areaId} date={form.date} travelers={Number(form.travelers)} errors={fieldErrors} />
            </View>}
            <View style={styles.row}><Button Icon={ArrowLeft} onPress={back}>Back</Button><Button primary Icon={Sparkles} busy={!!planner.phase} disabled={!!planner.phase || !planner.catalog.length} onPress={planner.generate}>{planner.phase ? `Generating… ${planner.elapsed}s` : 'Generate my itinerary'}</Button></View>
          </Card>
        </>}
      </>}
      {!!planner.phase && <Card><ActivityIndicator color={palette.accent} /><Copy>{planner.phase} · {planner.elapsed}s</Copy></Card>}
      {!planner.showForm && !!planner.plan && <ItineraryResults plan={planner.plan} fareTables={planner.fareTables} areaName={planner.AREAS.find(item => item.id === planner.plan.request.areaId)?.name} onEdit={() => planner.setShowForm(true)} onSave={planner.savePlan} saved={planner.saved} saving={planner.saving} />}
    </ScrollView>
  </KeyboardAvoidingView>;
}
