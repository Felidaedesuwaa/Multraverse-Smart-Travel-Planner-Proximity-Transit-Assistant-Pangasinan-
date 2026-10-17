import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import BudgetDropdown from './BudgetDropdown';
import { useAppTheme } from '../theme/useAppTheme';
import { api } from '../lib/api';
const categories = ['Transport', 'Food', 'Accommodation', 'Entrance Fees', 'Activities', 'Shopping', 'Emergency', 'Others'];
export default function TripExpenseAudit({ trip, onClose, onCompleted }) {
  const { palette: p } = useAppTheme();
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
  const valid = rows.length > 0 && rows.every(row => row.reviewed && row.label.trim() && /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(row.amount) && Number(row.amount) <= 1e9);
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const complete = async () => {
    if (!valid || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { const result = await api.completeTrip(id, rows.map(({ key, entryId, label, category, amount, reviewed }) => ({ key, ...(entryId ? { entryId } : {}), label, category, amount: Number(amount), reviewed }))); onCompleted(result); }
    catch (cause) { setError(cause.message || 'Could not complete this trip. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const button = { padding: 14, borderRadius: 10, backgroundColor: p.tint, minHeight: 44 };
  const text = { color: p.ink, fontSize: 14 };
  const input = { borderWidth: 1, borderColor: p.line, borderRadius: 8, padding: 12, color: p.ink, backgroundColor: p.background };
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!saving.current) onClose(); }}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <View accessibilityViewIsModal style={{ backgroundColor: p.surface, borderRadius: 18, padding: 20, width: '100%', maxWidth: 650, maxHeight: '90%', gap: 16 }}>
        <Text accessibilityRole="header" style={{ ...text, fontSize: 22, fontWeight: '700' }}>Audit trip expenses</Text>
        <Text style={text}>Review every cost breakdown item and enter the actual group amount in PHP. Enter 0 for unused allowances or costs already covered by a recorded expense. Only actual spending counts against your monthly budget.</Text>
        {loading && <ActivityIndicator color={p.primary} />}
        <ScrollView style={{ flexShrink: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
          {rows.map((row, index) => <View key={row.key} style={{ gap: 8, borderWidth: 1, borderColor: p.line, borderRadius: 10, padding: 12 }}>
            {row.extra ? <><TextInput accessibilityLabel={`Expense name ${index + 1}`} editable={!busy} value={row.label} maxLength={120} onChangeText={label => update(index, { label, reviewed: false })} placeholder="Other expense name" placeholderTextColor={p.muted} style={input} /><BudgetDropdown value={row.category} disabled={busy} onChange={category => update(index, { category, reviewed: false })} options={categories.map(value => ({ value, label: value }))} /></> : <Text style={{ ...text, fontWeight: '700' }}>{row.label}</Text>}
            <Text style={{ color: p.muted }}>{row.entryId ? 'Already recorded' : 'Planned'}: {row.estimate == null ? 'Unconfirmed' : `PHP ${row.estimate.toFixed(2)}`} ? {row.category}</Text>
            <TextInput accessibilityLabel={`Actual amount: ${row.label || 'Other expense'}`} editable={!busy} value={row.amount} keyboardType="decimal-pad" placeholder="Actual PHP amount (0 if unused)" placeholderTextColor={p.muted} onChangeText={amount => update(index, { amount, reviewed: false })} style={input} />
            <FeedbackPressable accessibilityRole="checkbox" accessibilityState={{ checked: row.reviewed }} disabled={busy} onPress={() => update(index, { reviewed: !row.reviewed })} style={button}><Text style={text}>{row.reviewed ? '? Reviewed' : 'Confirm this expense'}</Text></FeedbackPressable>
            {row.extra && <FeedbackPressable disabled={busy} onPress={() => setRows(previous => previous.filter((_, i) => i !== index))} style={button}><Text style={text}>Remove other expense</Text></FeedbackPressable>}
          </View>)}
          {!loading && rows.length > 0 && <FeedbackPressable disabled={busy || rows.length >= 300} onPress={() => setRows(previous => [...previous, { key: `extra-${Date.now()}-${previous.length}`, extra: true, label: '', category: 'Others', estimate: null, amount: '', reviewed: false }])} style={button}><Text style={text}>Add other expense</Text></FeedbackPressable>}
        </ScrollView>
        {!!error && <Text accessibilityRole="alert" style={{ color: p.ink }}>{error}</Text>}
        {!!error && !loading && rows.length === 0 && <FeedbackPressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={button}><Text style={text}>Retry loading expenses</Text></FeedbackPressable>}
        <Text style={{ ...text, fontWeight: '700' }}>Audited trip spending: PHP {total.toFixed(2)}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <FeedbackPressable disabled={busy} onPress={onClose} style={{ ...button, flex: 1 }}><Text style={text}>Go back</Text></FeedbackPressable>
          <FeedbackPressable accessibilityRole="button" disabled={loading || busy || !valid} onPress={complete} style={{ ...button, backgroundColor: p.primary, opacity: loading || busy || !valid ? 0.5 : 1, flex: 1 }}><Text style={{ color: p.onPrimary }}>{busy ? 'Saving expenses?' : 'Confirm expenses & complete'}</Text></FeedbackPressable>
        </View>
      </View>
    </View>
  </Modal>;
}
