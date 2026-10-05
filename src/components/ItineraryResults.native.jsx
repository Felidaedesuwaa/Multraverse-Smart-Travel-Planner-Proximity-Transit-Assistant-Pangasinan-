import { useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { BookmarkPlus, Check, Download, Pencil, Share2 } from 'lucide-react-native';
import { itinerarySummary } from '../lib/itinerarySummary';
import { downloadItineraryPdf } from '../lib/itineraryPdf';
import { Button, Card, Copy, money, range, styles } from './planner/NativeItineraryUI';

export default function ItineraryResults({ plan, fareTables = [], areaName, onEdit, onSave, saved, saving }) {
  const request = plan.request;
  const costs = itinerarySummary(plan, fareTables);
  const [shareError, setShareError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportFailed, setExportFailed] = useState(false);
  const exportInProgress = useRef(false);
  const exportPlan = async () => {
    if (exportInProgress.current) return;
    exportInProgress.current = true;
    setExporting(true);
    setExportMessage('');
    setExportFailed(false);
    try {
      await downloadItineraryPdf({ ...plan, costEstimate: costs }, areaName);
      setExportMessage('Your PDF is ready. Use the save/share options to keep a copy.');
    } catch {
      setExportFailed(true);
      setExportMessage('The PDF could not be exported. Please try again.');
    } finally {
      exportInProgress.current = false;
      setExporting(false);
    }
  };
  const sharePlan = async () => {
    setShareError('');
    const title = `${areaName || request.areaId} itinerary`;
    const message = [title, `${request.date} | ${request.days} days | ${request.travelers} travelers`, `Budget: ${money(request.budget)}`, `Planned total: ${range(costs.min, costs.max)}`, ...plan.stops.map(stop => `Day ${stop.day} ${stop.time} | ${stop.title}\n${stop.subtitle || ''}`), ...(plan.warnings || [])].join('\n\n');
    try { await Share.share({ title, message }); }
    catch { setShareError('The itinerary could not be shared. Please try again.'); }
  };
  return <View style={{ gap: 18 }}>
    <Card>
      <Copy muted>YOUR TRIP PLAN</Copy><Copy heading>{areaName || request.areaId}</Copy>
      <Copy>{request.date} · {request.days} days · {request.travelers} travelers</Copy>
      <Copy muted>{[...request.tripTypes, ...request.activities].join(' · ')}</Copy>
      <View style={styles.row}>
        <Button Icon={Pencil} onPress={onEdit}>Edit trip</Button>
        <Button Icon={Download} disabled={exporting} busy={exporting} onPress={exportPlan}>{exporting ? 'Preparing PDF…' : 'Download PDF'}</Button>
        <Button Icon={Share2} onPress={sharePlan}>Share itinerary</Button>
      </View>
      <Copy muted>Download PDF opens your phone's save/share options. On iPhone, choose Save to Files.</Copy>
      {!!exportMessage && <Copy alert={exportFailed}>{exportMessage}</Copy>}
      {!!shareError && <Copy alert>{shareError}</Copy>}
      <Copy>Trip budget: {money(request.budget)}</Copy>
      <Copy heading>Planned total: {range(costs.min, costs.max)}</Copy>
      <Copy>Per person: {range(costs.perPersonMin, costs.perPersonMax)}</Copy>
      <Copy alert={costs.remainingMin < 0}>Remaining after estimates: {range(costs.remainingMin, costs.remainingMax)}</Copy>
      <Copy muted>{costs.note || 'Unpriced costs are not included. Confirm local rates and availability.'}</Copy>
    </Card>
    <Card>
      <Copy heading>Cost breakdown</Copy>
      <Copy>Meals: {money(costs.meals)} ({money(request.mealBudget)} × {request.travelers} people × {request.days} days)</Copy>
      <Copy>Transport: {costs.transport.some(item => item.total != null) ? money(costs.transportTotal) : 'Not priced'}</Copy>
      <Copy>Hotel: {costs.lodging ? `${range(costs.lodging.min, costs.lodging.max)} (${costs.lodging.nights} nights × ${costs.lodging.rooms} rooms)` : request.lodgingId ? 'Not priced' : 'No overnight stay'}</Copy>
      <Copy>Emergency reserve (10%): {money(costs.emergency)}</Copy>
      <Copy>Listed entry fees: {money(costs.entryFees)}</Copy>
    </Card>
    <Card><Copy heading>Transport fares</Copy>{costs.transport.map(fare => <View key={fare.mode} style={{ gap: 4 }}><Copy>{fare.mode}: {money(fare.total)}</Copy><Copy muted>{fare.total == null ? fare.note : `${money(fare.perRide)} / person / ride × ${fare.rides} rides × ${request.travelers} people`}</Copy></View>)}<Copy muted>Total rides include outbound, local transfers and return rides. Confirm routes and travel times locally.</Copy></Card>
    {Array.from({ length: Number(request.days) }, (_, index) => index + 1).map(day => <Card key={day}><Copy heading>Day {day}</Copy>{plan.stops.filter(stop => stop.day === day).map((stop, index) => <View key={`${stop.entryId || stop.tag}-${index}`} style={{ gap: 6, paddingVertical: 8 }}><Copy muted>{stop.time} · {stop.tag}</Copy><Copy heading>{stop.title}</Copy><Copy>{stop.subtitle}</Copy>{stop.tag === 'Attraction' && <Copy muted>{stop.price == null ? 'Entry fee to confirm' : `${money(stop.price)} group entry estimate`}</Copy>}</View>)}</Card>)}
    {!!plan.foodOptions?.length && <Card><Copy heading>Local foods to try</Copy><Copy muted>Choose tastings within your {money(request.mealBudget)} daily meal allowance per person.</Copy>{plan.foodOptions.map(food => <View key={food.id} style={{ gap: 6 }}><Copy heading>{food.name}</Copy><Copy>{food.description}</Copy>{!!food.where && <Copy muted>Where: {food.where}</Copy>}<Copy muted>{food.listedAveragePrice == null ? 'Menu price to confirm' : `Listed average: ${money(food.listedAveragePrice)}; confirm portions and price`}</Copy></View>)}</Card>}
    {!!plan.warnings?.length && <Card><Copy heading>Plan notes</Copy>{plan.warnings.map((warning, index) => <Copy key={index}>{warning}</Copy>)}</Card>}
    <Card>
      <Copy heading>Keep this itinerary</Copy>
      <Copy muted>Save your plan to revisit it in My Trips.</Copy>
      <Button primary Icon={saved ? Check : BookmarkPlus} disabled={saved || saving} busy={saving} onPress={onSave}>{saved ? 'Saved to My Trips' : saving ? 'Saving…' : 'Save plan'}</Button>
    </Card>
  </View>;
}
