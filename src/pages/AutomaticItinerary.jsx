import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ArrowLeft, Sparkles, Check } from 'lucide-react-native';
import { api } from '../lib/api';
import { itineraryFailureMessage } from '../lib/itineraryValidation';
import { TRANSPORT_MODES } from '../hooks/useItineraryPlanner';
import { useAppTheme } from '../theme/useAppTheme';
import AIToolHeader from '../components/AIToolHeader';
import ItineraryResults from '../components/ItineraryResults';
import { Button, Card, Choices, Copy, Select, styles } from '../components/planner/NativeItineraryUI';

export default function AutomaticItinerary({ navigation }) {
  const { palette } = useAppTheme();
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ areaId: '', travelers: '2', transportMode: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [reload, setReload] = useState(0);
  const pending = useRef(null);
  const scroll = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api.getItineraryCatalog({ signal: controller.signal }).then(setCatalog).catch(err => {
      if (!controller.signal.aborted) setError(itineraryFailureMessage(err, 'Unable to load destinations. Please retry.'));
    });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { if (plan) scroll.current?.scrollTo({ y: 0, animated: false }); }, [plan]);
  const change = (key, value) => { setForm(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: '' })); setReview(false); setError(''); };
  const validate = () => {
    const next = {};
    if (!catalog?.areas.some(area => area.id === form.areaId)) next.areaId = 'Choose a city or municipality.';
    if (!/^\d+$/.test(form.travelers.trim()) || Number(form.travelers) < 1 || Number(form.travelers) > 30) next.travelers = 'Enter a whole number from 1 to 30.';
    if (!TRANSPORT_MODES.includes(form.transportMode)) next.transportMode = 'Choose your transportation.';
    setErrors(next);
    return !Object.keys(next).length;
  };
  const generate = async () => {
    if (pending.current || !validate()) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError('');
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const result = await api.generateAutomaticItinerary({ ...form, travelers: Number(form.travelers) }, { signal: controller.signal });
      setPlan(result); setReview(false);
    } catch (err) { if (!controller.signal.aborted) setError(itineraryFailureMessage(err, 'Unable to generate your plan. Please try again.')); else setError('Generation timed out. Please try again.'); }
    finally { clearTimeout(timeout); pending.current = null; setBusy(false); }
  };
  const save = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try { await api.saveItinerary(plan.id, true); navigation.navigate('MyTrips', { successMessage: 'Your automatic itinerary was saved to My Trips.' }); }
    catch (err) { setError(itineraryFailureMessage(err, 'Unable to save your plan. Please retry.')); }
    finally { setSaving(false); }
  };
  const area = catalog?.areas.find(item => item.id === form.areaId);
  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={styles.content}>
    <Button Icon={ArrowLeft} onPress={() => navigation.navigate('AIItinerary')}>Back to AI itinerary</Button>
    <AIToolHeader eyebrow="LESS INPUT. MORE EXPLORING." title="Let AI plan your day" subtitle="Three details are all it takes. Discover local highlights with the same verified guides and budget calculations as the detailed planner." Icon={Sparkles} badges={[{ label: 'Automatic planning' }, { label: 'Verified local data' }]} compact />
    {!!error && <Copy alert>{error}</Copy>}
    {!catalog && !error && <ActivityIndicator accessibilityLabel="Loading destinations" color={palette.primary} />}
    {!catalog && !!error && <Button onPress={() => setReload(value => value + 1)}>Retry loading destinations</Button>}
    {plan ? <>
      <Copy heading>Your itinerary is ready</Copy><Copy>Review your suggested schedule and estimates, then save it to My Trips.</Copy>
      <ItineraryResults plan={plan} fareTables={catalog?.fareTables || []} areaName={area?.name} onEdit={() => { setPlan(null); setError(''); }} onSave={save} saving={saving} saved={false} />
    </> : busy ? <Card><ActivityIndicator color={palette.primary} /><Copy heading>Building your day in Pangasinan</Copy><Copy>Choosing local experiences and calculating your estimated costs. This may take a moment.</Copy></Card> : review ? <Card>
      <Copy heading>Ready to plan your day?</Copy>
      <Copy>{area?.name} · {form.travelers} travelers · {form.transportMode}</Copy>
      <Copy>Today · 1 day · 7:00 AM · balanced pace · return to starting point · no overnight stay.</Copy>
      <Copy>Suggested budget: PHP {(2000 * Number(form.travelers)).toLocaleString()} total (PHP 2,000 per person). Meals: PHP 300 per person. A 10% emergency reserve is included in the budget.</Copy>
      <Copy muted>Transport starts with two rides at the first listed fare distance. Where no matrix applies, we allow PHP 150 per person per ride. These are planning assumptions; confirm actual distances, availability and prices before traveling.</Copy>
      <Button primary Icon={Check} onPress={generate}>Confirm and generate itinerary</Button>
      <Button onPress={() => setReview(false)}>Edit details</Button>
    </Card> : !!catalog && <>
      <Card><Copy heading>Your trip, three simple details</Copy>
        <Select label="City or municipality" searchable placeholder="Where would you like to explore?" options={catalog.areas.map(item => ({ id: item.id, label: item.name })).sort((a, b) => a.label.localeCompare(b.label))} value={form.areaId} onChange={value => change('areaId', value)} error={errors.areaId} />
        <Select label="Number of travelers" value={form.travelers} onChange={value => change('travelers', value)} options={Array.from({ length: 30 }, (_, index) => ({ id: String(index + 1), label: `${index + 1} traveler${index ? 's' : ''}` }))} error={errors.travelers} />
        <Choices label="Transportation" options={TRANSPORT_MODES} values={form.transportMode} onChange={value => change('transportMode', value)} error={errors.transportMode} />
        <Button primary Icon={Sparkles} onPress={() => { if (validate()) setReview(true); }}>Review automatic plan</Button>
      </Card>
      <View style={{ gap: 8, padding: 8 }}><Copy heading>Thoughtfully planned for you</Copy><Copy muted>AI selects experiences from your destination's published guide. We use a balanced day trip and a standard budget, with every assumption shown before you confirm.</Copy></View>
    </>}
  </ScrollView>;
}
