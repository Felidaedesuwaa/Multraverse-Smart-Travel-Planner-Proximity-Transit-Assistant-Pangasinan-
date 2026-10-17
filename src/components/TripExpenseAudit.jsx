import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, View, StyleSheet, useWindowDimensions } from 'react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import BudgetDropdown from './BudgetDropdown';
import { useAppTheme } from '../theme/useAppTheme';
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, BedDouble, Bus, Utensils, Ticket, ShieldCheck, Plus, Trash2, X, Wallet, Info } from 'lucide-react-native';
import { api } from '../lib/api';
const money = value => `PHP ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const categoryIcons = { Food: Utensils, Emergency: ShieldCheck, 'Entrance Fees': Ticket, Accommodation: BedDouble, Transport: Bus };
const rowValid = row => row.label.trim() && /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(row.amount) && Number(row.amount) <= 1e9;
const categories = ['Transport', 'Food', 'Accommodation', 'Entrance Fees', 'Activities', 'Shopping', 'Emergency', 'Others'];
export default function TripExpenseAudit({ trip, onClose, onCompleted }) {
  const { palette: p } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 620;
  const accent = p.dark ? p.button : p.brand;
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const saving = useRef(false);
  const id = trip._id ?? trip.id;
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.getTripExpenseAudit(id).then(({ lines, entries }) => {
      if (!active) return;
      if (!Array.isArray(lines) || !Array.isArray(entries)) throw new Error('The expense audit response is incomplete. Please try again.');
      setRows([...lines.map(line => ({ ...line, amount: '', reviewed: false })), ...entries.map(entry => ({ key: `recorded-${entry._id ?? entry.id}`, entryId: entry._id ?? entry.id, label: entry.label, category: entry.category, estimate: entry.amount, amount: String(entry.amount), reviewed: false }))]);
      setLoading(false);
    }).catch(cause => { if (active) { setError(cause.code === 'API_ROUTE_NOT_FOUND' ? 'Expense auditing is not available on the connected server yet. Update the backend, then try again.' : cause.message); setLoading(false); } });
    return () => { active = false; };
  }, [id, retry]);
  const update = (index, value) => setRows(previous => previous.map((row, i) => i === index ? { ...row, ...value } : row));
  const valid = rows.length > 0 && rows.every(row => row.reviewed && rowValid(row));
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const complete = async () => {
    if (!valid || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { const result = await api.completeTrip(id, rows.map(({ key, entryId, label, category, amount, reviewed }) => ({ key, ...(entryId ? { entryId } : {}), label, category, amount: Number(amount), reviewed }))); onCompleted(result); }
    catch (cause) { setError(cause.message || 'Could not complete this trip. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const reviewed = rows.filter(row => row.reviewed && rowValid(row)).length;
  const text = { fontFamily: 'DMSans', color: p.ink };
  const muted = { ...text, color: p.muted, fontSize: 12, lineHeight: 18 };
  const field = { ...text, borderWidth: 1, borderColor: p.line, borderRadius: 10, padding: 12, backgroundColor: p.surface, minWidth: 0 };
  const close = () => { if (!saving.current) onClose(); };
  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <View style={[styles.overlay, { padding: compact ? 12 : 28 }]}>
      <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: p.surface, maxHeight: height - (compact ? 48 : 72) }]}>
        <View style={[styles.header, { padding: compact ? 18 : 26, borderBottomColor: p.line }]}>
          <View style={styles.headingRow}>
            <View style={[styles.headerIcon, { backgroundColor: p.tint }]}><ClipboardCheck size={24} color={accent} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[muted, styles.eyebrow]}>FINISH YOUR TRIP</Text>
              <Text accessibilityRole="header" style={[text, styles.title, { fontSize: compact ? 21 : 25 }]}>Audit trip expenses</Text>
            </View>
            <FeedbackPressable accessibilityRole="button" accessibilityLabel="Close expense audit" disabled={busy} onPress={close} style={[styles.iconButton, { backgroundColor: p.background }]}><X size={20} color={p.muted} /></FeedbackPressable>
          </View>
          <Text numberOfLines={1} style={[text, { fontSize: 14, marginTop: 14, fontWeight: '600' }]}>{trip.title || trip.location}</Text>
          <Text style={[muted, { marginTop: 5 }]}>Check your planned costs, enter what you actually spent, then confirm each item.</Text>
          {!loading && rows.length > 0 && <View style={{ marginTop: 16, gap: 8 }}>
            <View style={styles.between}><Text accessibilityLiveRegion="polite" style={[text, { fontSize: 12, fontWeight: '700' }]}>{reviewed} of {rows.length} expenses reviewed</Text><Text style={muted}>{valid ? 'Ready to complete' : 'Review each item below'}</Text></View>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: rows.length, now: reviewed }} style={[styles.progress, { backgroundColor: p.line }]}><View style={{ height: '100%', width: `${reviewed / rows.length * 100}%`, backgroundColor: accent, borderRadius: 4 }} /></View>
          </View>}
        </View>
        <ScrollView style={{ flexShrink: 1, minHeight: 0 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: compact ? 16 : 26, gap: 16 }}>
          {loading && <View style={styles.emptyState}><ActivityIndicator color={accent} /><Text style={muted}>Loading your cost breakdown...</Text></View>}
          {!loading && rows.length > 0 && <>
            <View style={[styles.tip, { backgroundColor: p.background }]}><Info size={17} color={p.muted} /><Text style={[muted, { flex: 1 }]}>Amounts are for your whole group in PHP. Enter 0 for unused costs. Keep expenses already recorded below out of your planned amounts.</Text></View>
            <View style={[styles.grid, compact && { flexDirection: 'column' }]}>
              {rows.map((row, index) => {
                const Icon = categoryIcons[row.category] || Wallet;
                const confirmed = row.reviewed && rowValid(row);
                const invalidAmount = row.amount !== '' && !rowValid(row) && row.label.trim();
                return <View key={row.key} style={[styles.card, { backgroundColor: p.surface, borderColor: confirmed ? accent : p.line, width: compact ? '100%' : '48.5%' }]}>
                  <View style={styles.headingRow}>
                    <View style={[styles.categoryIcon, { backgroundColor: p.tint }]}><Icon size={19} color={accent} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[text, { fontSize: 15, fontWeight: '700' }]}>{row.extra ? 'Other expense' : row.label}</Text>
                      <Text style={muted}>{row.entryId ? 'Already recorded' : row.extra ? 'Additional spending' : 'From your itinerary'}</Text>
                    </View>
                    {row.extra && <FeedbackPressable accessibilityRole="button" accessibilityLabel="Remove other expense" disabled={busy} onPress={() => setRows(previous => previous.filter((_, i) => i !== index))} style={styles.iconButton}><Trash2 size={17} color={p.accent} /></FeedbackPressable>}
                  </View>
                  {row.extra && <View style={{ gap: 10 }}>
                    <TextInput accessibilityLabel={`Expense name ${index + 1}`} editable={!busy} value={row.label} maxLength={120} onChangeText={label => update(index, { label, reviewed: false })} placeholder="e.g. Souvenirs" placeholderTextColor={p.muted} style={field} />
                    <BudgetDropdown value={row.category} disabled={busy} onChange={category => update(index, { category, reviewed: false })} options={categories.map(value => ({ value, label: value }))} />
                  </View>}
                  {!row.extra && <View style={[styles.planned, { backgroundColor: p.background }]}><Text style={muted}>{row.entryId ? 'Recorded amount' : 'Planned amount'}</Text><Text style={[text, styles.number, { fontSize: 14 }]}>{row.estimate == null ? 'Unconfirmed' : money(row.estimate)}</Text></View>}
                  <View style={{ gap: 7 }}>
                    <Text style={[text, { fontSize: 12, fontWeight: '600' }]}>Actual amount</Text>
                    <View style={[styles.amountField, { borderColor: invalidAmount ? p.accent : confirmed ? accent : p.line, backgroundColor: p.background }]}>
                      <Text style={[muted, { fontWeight: '700' }]}>PHP</Text>
                      <TextInput accessibilityLabel={`Actual amount: ${row.label || 'Other expense'}`} editable={!busy} value={row.amount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={p.muted} onChangeText={amount => {
                        if (!/^\d*(?:\.\d{0,2})?$/.test(amount)) return;
                        const normalized = amount.replace(/^0+(?=\d)/, '').replace(/^\./, '0.');
                        update(index, { amount: normalized, reviewed: false });
                      }} style={[text, styles.amountInput]} />
                    </View>
                    {!!invalidAmount && <Text style={[muted, { color: p.accent }]}>Enter a positive amount or 0, with up to 2 decimal places.</Text>}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {!row.extra && row.estimate != null && <FeedbackPressable accessibilityRole="button" accessibilityLabel={`Use planned amount for ${row.label}`} disabled={busy} onPress={() => update(index, { amount: Number(row.estimate).toFixed(2), reviewed: false })} style={styles.quickAction}><Text style={[muted, { color: accent, fontWeight: '700' }]}>{row.entryId ? 'Use recorded' : 'Use planned'}</Text></FeedbackPressable>}
                      <FeedbackPressable accessibilityRole="button" accessibilityLabel={`No expense for ${row.label || 'Other expense'}`} disabled={busy} onPress={() => update(index, { amount: '0', reviewed: false })} style={styles.quickAction}><Text style={[muted, { color: accent, fontWeight: '700' }]}>No expense</Text></FeedbackPressable>
                    </View>
                  </View>
                  <FeedbackPressable accessibilityRole="checkbox" accessibilityLabel={`Review ${row.label || 'other expense'}`} accessibilityState={{ checked: !!confirmed, disabled: busy || !rowValid(row) }} disabled={busy || !rowValid(row)} onPress={() => update(index, { reviewed: !row.reviewed })} style={[styles.review, { backgroundColor: confirmed ? p.tint : p.background, opacity: busy || !rowValid(row) ? 0.55 : 1 }]}>
                    <View style={[styles.check, { borderColor: confirmed ? accent : p.muted, backgroundColor: confirmed ? accent : 'transparent' }]}>{confirmed && <Check size={13} color={p.dark ? p.onButton : p.onPrimary} />}</View>
                    <Text style={[text, { fontSize: 13, fontWeight: '600' }]}>{confirmed ? 'Reviewed' : 'Confirm this expense'}</Text>
                    {confirmed && <CheckCircle2 size={16} color={accent} style={{ marginLeft: 'auto' }} />}
                  </FeedbackPressable>
                </View>;
              })}
            </View>
            <FeedbackPressable accessibilityRole="button" accessibilityLabel="Add other expense" disabled={busy || rows.length >= 300} onPress={() => setRows(previous => [...previous, { key: `extra-${Date.now()}-${previous.length}`, extra: true, label: '', category: 'Others', estimate: null, amount: '', reviewed: false }])} style={[styles.addButton, { borderColor: accent, backgroundColor: p.background }]}><Plus size={18} color={accent} /><Text style={[text, { fontWeight: '700', color: accent }]}>Add other expense</Text></FeedbackPressable>
          </>}
          {!!error && <View style={[styles.tip, { backgroundColor: p.background, borderWidth: 1, borderColor: p.line }]}><Info size={19} color={p.accent} /><View style={{ flex: 1, gap: 12 }}><Text accessibilityRole="alert" style={[text, { fontSize: 13, lineHeight: 20 }]}>{error}</Text>{!loading && rows.length === 0 && <FeedbackPressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[text, { color: accent, fontWeight: '700' }]}>Retry loading expenses</Text></FeedbackPressable>}</View></View>}
        </ScrollView>
        <View style={[styles.footer, { padding: compact ? 16 : 24, borderTopColor: p.line, backgroundColor: p.background }]}>
          {!loading && rows.length > 0 && <View style={[styles.between, { alignItems: 'flex-end', marginBottom: 16 }]}>
            <View style={{ flex: 1 }}><Text style={muted}>ACTUAL TRIP SPENDING</Text><Text style={[text, styles.number, { fontSize: compact ? 24 : 28, marginTop: 3 }]}>{money(total)}</Text><Text style={[muted, { marginTop: 3 }]}>Recorded in your budget when you complete.</Text></View>
            {valid && <View style={[styles.ready, { backgroundColor: p.tint }]}><CheckCircle2 size={15} color={accent} /><Text style={[muted, { color: p.ink, fontWeight: '700' }]}>All reviewed</Text></View>}
          </View>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <FeedbackPressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy} onPress={close} style={[styles.footerButton, { borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, flex: compact ? 1 : undefined, paddingHorizontal: compact ? 12 : 24 }]}><Text style={[text, { fontWeight: '700' }]}>Go back</Text></FeedbackPressable>
            <FeedbackPressable accessibilityRole="button" accessibilityLabel={busy ? 'Saving expenses...' : 'Confirm expenses & complete'} disabled={loading || busy || !valid} onPress={complete} style={[styles.footerButton, { backgroundColor: p.button, opacity: loading || busy || !valid ? 0.5 : 1, flex: compact ? 2 : 1 }]}>{busy ? <ActivityIndicator size="small" color={p.onButton} /> : <CheckCircle2 size={18} color={p.onButton} />}<Text style={[text, { color: p.onButton, fontWeight: '700' }]}>{busy ? 'Saving...' : 'Complete trip'}</Text>{!compact && !busy && <ArrowRight size={17} color={p.onButton} />}</FeedbackPressable>
          </View>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(6,24,31,0.58)', justifyContent: 'center', alignItems: 'center' },
  dialog: { width: '100%', maxWidth: 820, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.2, shadowRadius: 48, elevation: 12 },
  header: { borderBottomWidth: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontFamily: 'Poppins', fontWeight: '600', marginTop: 2 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  progress: { height: 5, borderRadius: 4, overflow: 'hidden' },
  emptyState: { paddingVertical: 32, alignItems: 'center', gap: 14 },
  tip: { padding: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  card: { borderWidth: 1, borderRadius: 17, padding: 16, gap: 14, minWidth: 0 },
  categoryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planned: { padding: 10, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  number: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  amountField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12 },
  amountInput: { flex: 1, minWidth: 0, paddingVertical: 13, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  quickAction: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  review: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, minHeight: 46, borderRadius: 10 },
  check: { width: 19, height: 19, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  addButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 50, borderWidth: 1, borderStyle: 'dashed', borderRadius: 13, padding: 12 },
  footer: { borderTopWidth: 1 },
  ready: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 10 },
  footerButton: { minHeight: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
});
