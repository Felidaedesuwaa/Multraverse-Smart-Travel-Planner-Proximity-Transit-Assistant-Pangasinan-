import { itinerarySummary } from '../lib/itinerarySummary';
import { calculateTransport, finiteNumber } from '../../server/src/lib/fareCalculation';
import { downloadItineraryPdf } from '../lib/itineraryPdf';
import { useState } from 'react';
import { Bus, Utensils, BedDouble, Wallet, Users, CalendarDays, MapPin, Clock, Info, BookmarkPlus, Download, Pencil, Compass } from 'lucide-react-native';

const money = n => n == null || !Number.isFinite(Number(n)) ? 'Pending' : `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const detailCopy = value => String(value || '').replace(/Source:\s*.*?(?:,\s*page\s*\d+\.?|$)/gi, '').replace(/Guide states verified[^.]*\.?/gi, '').trim();
const range = (min, max) => min === max ? money(min) : `${money(min)}–${money(max)}`;

export default function ItineraryResults({ plan, fareTables = [], areaName, onEdit, onSave, saved, saving }) {
  const r = plan.request;
  const stored = plan.costEstimate;
  const transport = fareTables.length ? calculateTransport(r, fareTables) : stored?.transport;
  const transportTotal = transport?.reduce((sum, item) => sum + finiteNumber(item.total), 0) ?? 0;
  const c = itinerarySummary({ ...plan, costEstimate: { ...stored, transport: transport || [], transportTotal } });
  const [exportMessage, setExportMessage] = useState('');
  const [exportFailed, setExportFailed] = useState(false);
  const exportPlan = () => {
    try { downloadItineraryPdf({ ...plan, costEstimate: c }, areaName); setExportFailed(false); setExportMessage('Your itinerary PDF download has started.'); }
    catch { setExportFailed(true); setExportMessage('The PDF could not be downloaded. Please try again.'); }
  };
  return <section className="air-results">
    <style>{styles}</style>
    {exportMessage && <p role={exportFailed ? 'alert' : 'status'} className={exportFailed ? 'aip-error' : 'aip-success'}>{exportMessage}</p>}
    <header className="air-header">
      <div><span className="air-eyebrow">YOUR TRIP PLAN</span><h2>{areaName || r.areaId}</h2><p>{[...r.tripTypes, ...r.activities].join(' · ') || 'Explore local highlights'}</p></div>
      <div className="air-actions"><button className="aip-btn aip-btn-outline" onClick={onEdit}><Pencil size={16} />Edit trip</button><button className="aip-btn aip-btn-outline" onClick={exportPlan}><Download size={16} />Export PDF</button></div>
    </header>
    <div className="air-meta"><span><CalendarDays size={16} />{r.date} · {r.days} day{r.days === 1 ? '' : 's'}</span><span><Users size={16} />{r.travelers} traveler{r.travelers === 1 ? '' : 's'}</span><span><Bus size={16} />{r.transportModes.join(' + ') || 'Transport pending'}</span></div>
    <div className="air-stats">
      <Stat Icon={Wallet} label="Trip budget" value={money(r.budget)} />
      <Stat Icon={Compass} label="Planned total" value={c ? range(c.min, c.max) : 'Pending'} note="Meals + transport + hotel + listed entry fees + emergency reserve" />
      <Stat Icon={Users} label="Per person · full trip" value={c ? range(c.perPersonMin, c.perPersonMax) : 'Pending'} />
      <Stat Icon={Wallet} label={c?.remainingMin < 0 ? 'Budget shortfall' : 'Available after estimates'} value={c ? c.remainingMin < 0 ? `Up to ${money(-c.remainingMin)}` : range(c.remainingMin, c.remainingMax) : 'Pending'} note="After trip costs and the 10% emergency reserve" alert={c?.remainingMin < 0} />
    </div>
    <p className="air-notice"><Info size={16} /><span>{c?.note || 'Unpriced costs are not included.'}</span></p>
    {plan.foodOptions?.length > 0 && <section className="air-panel air-food-options">
      <h3><Utensils size={18} />All local foods to try in {areaName || r.areaId} ({plan.foodOptions.length})</h3>
      <p>Choose tastings within your {money(r.mealBudget)} per person daily meal allowance. This list includes every listed local food; the schedule below highlights a few to try.</p>
      <div className="air-food-grid">{plan.foodOptions.map(food => <article key={food.id} className="air-food-card"><h4>{food.name}</h4><p>{detailCopy(food.description)}</p>{food.where && <p><strong>Where:</strong> {detailCopy(food.where)}</p>}<p>{food.listedAveragePrice == null ? 'Menu price to confirm' : `Listed average: ${money(food.listedAveragePrice)} · confirm portions and current price`}</p></article>)}</div>
    </section>}
    <div className="air-layout">
      <div className="air-days">
        {Array.from({ length: r.days }, (_, i) => i + 1).map(day => <section className="air-day" key={day}>
          <h3><CalendarDays size={18} />Day {day}<span>Suggested schedule</span></h3>
          {plan.stops.filter(stop => stop.day === day).map((stop, i) => {
            const Icon = stop.tag === 'Transit' ? Bus : stop.tag === 'Food' ? Utensils : stop.tag === 'Lodging' ? BedDouble : MapPin;
            const summary = stop.tag === 'Food' ? 'Try this local specialty. Meals use your daily allowance.' : stop.tag === 'Lodging' ? 'Your selected overnight stay.' : stop.tag === 'Transit' ? `${r.transportModes.join(' / ')} · Confirm route and travel time.` : detailCopy(stop.subtitle).split(' Leave ')[0];
            return <article className="air-stop" key={`${stop.entryId || stop.tag}-${i}`}>
              <div className={`air-stop-icon air-${stop.tag.toLowerCase()}`}><Icon size={20} /></div>
              <div className="air-stop-main"><div className="air-stop-top"><span><Clock size={12} />{stop.time.replace(/^Day \d+\s*·\s*/, '')}</span><span>{stop.tag === 'Food' ? 'Meal allowance' : stop.tag === 'Transit' ? 'See transport fares' : stop.tag === 'Lodging' ? 'Estimated stay' : stop.price == null ? 'Entry fee to confirm' : `${money(stop.price)} group entry estimate`}</span></div>
                <h4>{stop.title}</h4><p>{summary}</p>
                <details><summary>Details</summary><p>{detailCopy(stop.subtitle)}</p></details>
              </div>
            </article>;
          })}
        </section>)}
      </div>
      <aside className="air-sidebar">
        <section className="air-panel"><h3><Wallet size={18} />Cost breakdown</h3>
          <Cost Icon={Utensils} label="Meals" value={money(c?.meals ?? plan.mealAllocation)} note={`${money(r.mealBudget)} × ${r.travelers} people × ${r.days} days`} />
          <Cost Icon={Bus} label="Transport" value={c?.transport.some(t => t.total != null) ? money(c.transportTotal) : 'Not priced'} note="Entered rides for the entire trip" />
          <Cost Icon={BedDouble} label="Hotel" value={c?.lodging ? range(c.lodging.min, c.lodging.max) : r.days === 1 ? 'No overnight stay' : 'Not priced'} note={c?.lodging ? `${c.lodging.nights} nights × ${c.lodging.rooms} rooms · approximate` : undefined} />
          <Cost Icon={Wallet} label="Emergency allowance" value={money(c?.emergency ?? 0)} note={`${money(r.budget)} - 10% reserved; ${money(Number(r.budget) - (c?.emergency ?? 0))} available before trip costs`} />
          <Cost Icon={MapPin} label="Listed entry fees" value={c?.entryFees > 0 ? money(c.entryFees) : 'No priced entries'} note="Only listed fees included; unpriced visits and extras need confirmation" />
          <div className="air-total"><span>Planned total</span><strong>{c ? range(c.min, c.max) : 'Pending'}</strong></div>
          <button className="aip-btn aip-btn-dark aip-btn-block" disabled={saved || saving} onClick={onSave}><BookmarkPlus size={16} />{saved ? 'Saved to My Trips' : saving ? 'Saving…' : 'Save plan'}</button>
        </section>
        <section className="air-panel"><h3><Bus size={18} />Transport fares</h3>
          {c?.transport.map(t => <div className="air-fare" key={t.mode}><div><strong>{t.mode}</strong><strong>{t.total == null ? 'Not priced' : money(t.total)}</strong></div>
            {t.total != null && <p>{money(t.perRide)} / person / ride × {t.rides} rides × {r.travelers} people</p>}
            <span className="air-fare-badge">{t.basis === 'reference' ? 'Fare matrix' : t.basis === 'allowance' ? 'Your allowance' : 'Needs local fare'}</span>

          </div>)}
          {!r.transportModes.length && <p>No transport selected.</p>}
          <p className="air-small">Total rides include outbound, local transfers and return rides. A selected mode does not imply an available route.</p>
        </section>
        <details className="air-panel air-notes"><summary><Info size={16} />Plan notes ({plan.warnings.length})</summary><ul>{plan.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul><p>{plan.mode === 'model-assisted' ? 'AI-ranked catalog matches' : 'Catalog-matched plan · AI ranking unavailable or disabled'}</p></details>
      </aside>
    </div>
  </section>;
}
function Stat({ Icon, label, value, note, alert }) { return <div className={`air-stat ${alert ? 'air-alert' : ''}`}><span><Icon size={16} />{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }
function Cost({ Icon, label, value, note }) { return <div className="air-cost"><Icon size={17} /><div><span>{label}</span>{note && <small>{note}</small>}</div><strong>{value}</strong></div>; }
const styles = `
.air-food-options { margin-bottom:24px; }.air-food-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); gap:12px; margin-top:16px; }.air-food-card { background:#F5F8F4; border:1px solid #E4E9DF; border-radius:12px; padding:16px; }.air-food-card h4 { margin:0 0 8px; font-size:15px; }
.air-results { color: #16324A; }
.air-header, .air-actions, .air-meta { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }
.air-header { justify-content:space-between; margin:0 0 16px; }
.air-eyebrow { font-size:11px; letter-spacing:.12em; color:#657B88; font-weight:700; }
.air-header h2 { font-size:28px; margin:4px 0; }
.air-header p { font-size:13px; color:#5C6D7A; margin:0; }
.air-actions .aip-btn { font-size:13px; padding:10px 16px; min-height:42px; }
.air-meta { gap:12px 22px; margin-bottom:20px; font-size:12px; color:#5C6D7A; }
.air-meta span, .air-stat > span { display:flex; align-items:center; gap:7px; }
.air-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr)); gap:12px; }
.air-stat { padding:18px; border:1px solid #E4E1D8; border-radius:14px; background:#fff; display:flex; flex-direction:column; gap:10px; }
.air-stat > span { font-size:12px; color:#5C6D7A; }
.air-stat > strong { font-size:21px; line-height:1.35; overflow-wrap:anywhere; }
.air-stat small { font-size:11px; color:#5C6D7A; }
.air-alert { background:#FFF2EC; border-color:#EBC6B6; }
.air-notice { display:flex; gap:8px; font-size:12px; color:#5C6D7A; margin:16px 0 24px; }
.air-layout { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(290px,1fr); gap:22px; align-items:start; }
.air-day { margin-bottom:24px; }
.air-day h3,.air-panel h3 { display:flex; align-items:center; gap:8px; font-size:16px; margin:0 0 14px; }
.air-day h3 > span { font-size:11px; font-weight:400; color:#657B88; margin-left:auto; }
.air-stop { display:flex; gap:12px; padding:18px; margin-bottom:12px; background:#fff; border:1px solid #E4E1D8; border-radius:14px; }
.air-stop-icon { width:38px; height:38px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:#EDF3F5; border-radius:11px; color:#123A5E; }
.air-food { background:#EDF6F0; color:#2E7D5B; }.air-attraction { background:#FFF1E9; color:#B7472B; }
.air-stop-main { flex:1; min-width:0; }
.air-stop-top { display:flex; flex-wrap:wrap; gap:6px 12px; justify-content:space-between; font-size:10px; color:#657B88; }
.air-stop-top > span:first-child { display:flex; align-items:center; gap:4px; }
.air-stop h4 { margin:7px 0; font-size:15px; line-height:1.5; }
.air-stop p, .air-panel p { margin:5px 0; font-size:12px; color:#5C6D7A; line-height:1.65; overflow-wrap:anywhere; }
.air-results details summary { cursor:pointer; font-size:11px; color:#123A5E; padding:8px 0; }
.air-results details summary:focus-visible { outline:2px solid #123A5E; outline-offset:2px; }
.air-panel { background:#fff; border:1px solid #E4E1D8; border-radius:14px; padding:20px; margin-bottom:16px; min-width:0; }
.air-cost { display:flex; gap:8px; align-items:flex-start; padding:13px 0; border-bottom:1px solid #EFF1EF; font-size:12px; }
.air-cost > div { flex:1; min-width:0; }.air-cost small { display:block; font-size:10px; color:#657B88; margin-top:4px; }.air-cost > strong { max-width:48%; text-align:right; overflow-wrap:anywhere; }
.air-total { display:flex; justify-content:space-between; gap:12px; font-size:13px; padding:18px 0; }.air-total strong { text-align:right; }
.air-fare { padding:12px 0; border-top:1px solid #EFF1EF; }.air-fare > div { display:flex; justify-content:space-between; font-size:13px; gap:10px; }
.air-fare-badge { display:inline-block; border-radius:6px; background:#F6F1E7; padding:3px 7px; font-size:10px; }
.air-panel .air-small { font-size:11px; }.air-notes summary { display:flex; align-items:center; gap:8px; }.air-notes li { font-size:12px; margin:10px 0; color:#5C6D7A; }.air-notes ul { padding-left:18px; }
@media(max-width:1100px) { .air-layout { grid-template-columns:1fr; }.air-sidebar { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)); gap:16px; }.air-panel { margin:0; } }
@media(max-width:480px) { .air-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }.air-stat { padding:12px; }.air-stat > strong { font-size:17px; }.air-stop { padding:14px; }.air-stop-top { flex-direction:column; } }
`;
