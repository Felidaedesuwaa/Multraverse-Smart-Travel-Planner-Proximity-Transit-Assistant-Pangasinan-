import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ChevronRight, MapPin, RefreshCw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminPage from '../components/AdminPage';
import StatusBadge from '../components/StatusBadge';
import { FeedbackPressable } from '../components/WorkspaceMotion';
import { useApprovalCounts } from '../components/ApprovalCountsProvider';
import PendingReviewBadge from '../components/PendingReviewBadge';
import { api } from '../lib/api';
import { lguResources } from '../data/lguResources';
import { useAppTheme } from '../theme/useAppTheme';

const submissionName = row => row.name || row.location || `${row.from || ''} → ${row.to || ''}`;
const formatDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString() : 'Not available';
const hiddenFields = new Set(['photo', 'id', '_id', '__v', 'submittedBy', 'reviewedBy', 'reviewRevision', 'pendingDeletion', 'approvalStatus', 'municipality']);

export default function AdminApprovals() {
  const { palette: p } = useAppTheme();
  const { counts, total, error, refresh } = useApprovalCounts();
  const [resource, setResource] = useState('places');
  return <AdminPage title="LGU approvals" subtitle={`${total} pending submissions · Review municipal information before publishing to Explorers`}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={styles.categoryRow}>
      {Object.entries(lguResources).map(([key, value]) => <FeedbackPressable key={key} accessibilityRole="button" accessibilityLabel={`${value.label}, ${counts[key] || 0} pending submissions`} accessibilityState={{ selected: resource === key }} onPress={() => setResource(key)} style={({ hovered, pressed }) => [styles.category, { backgroundColor: resource === key || hovered || pressed ? p.tint : p.surface, borderColor: resource === key ? p.primary : p.line }]}>
        <Text style={{ color: p.ink, fontWeight: '600' }}>{value.label}</Text>
        <PendingReviewBadge count={counts[key] || 0} />
      </FeedbackPressable>)}
    </ScrollView>
    {!!error && <Text accessibilityRole="alert" style={{ color: p.muted, marginBottom: 12 }}>{error}</Text>}
    <ApprovalQueue key={resource} resource={resource} pendingCount={counts[resource]} refreshCounts={refresh} />
  </AdminPage>;
}

function ApprovalQueue({ resource, pendingCount, refreshCounts }) {
  const { palette: p } = useAppTheme();
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState([]), [selected, setSelected] = useState(null);
  const [reasons, setReasons] = useState({});
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const busyRef = useRef(false), current = useRef(0), controller = useRef(null);
  const refresh = useCallback(async () => {
    const revision = ++current.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    setLoading(true);
    try {
      const result = await api.getApprovals(resource, { signal: request.signal });
      if (revision === current.current) { setRows(result); setError(''); }
    } catch (err) {
      if (revision === current.current) setError(err.message || 'Could not load pending submissions.');
    } finally { clearTimeout(timeout); if (revision === current.current) setLoading(false); }
  }, [resource]);
  useEffect(() => { refresh(); }, [refresh, pendingCount]);
  useEffect(() => () => { current.current++; controller.current?.abort(); }, []);
  const review = async decision => {
    if (busyRef.current || !selected || (decision === 'reject' && !reasons[selected.id]?.trim())) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await api.reviewSubmission(resource, selected.id, decision, reasons[selected.id], selected.reviewRevision);
      setRows(previous => previous.filter(row => row.id !== selected.id));
      setSelected(null);
      setMessage(decision === 'approve' ? 'Submission approved successfully.' : 'Submission rejected successfully.');
      await Promise.all([refresh(), refreshCounts()]);
    } catch (err) { setError(err.message || 'Could not review this submission. Please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <View style={{ gap: 16 }}>
    <View style={styles.queueHeader}>
      <Text accessibilityRole="header" style={{ color: p.ink, fontSize: 18, fontWeight: '700', flex: 1 }}>{lguResources[resource].label}</Text>
      <FeedbackPressable lift accessibilityRole="button" accessibilityLabel="Refresh approval queue" disabled={loading || busy} onPress={() => Promise.all([refresh(), refreshCounts()])} style={({ hovered }) => [styles.refresh, { backgroundColor: hovered ? p.tint : p.surface, opacity: loading || busy ? 0.5 : 1 }]}><RefreshCw size={20} color={p.ink} /></FeedbackPressable>
    </View>
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: p.ink }}>{message}</Text>}
    {!!error && !selected && <Text accessibilityRole="alert" style={{ color: p.ink }}>{error}</Text>}
    {loading && <ActivityIndicator color={p.primary} />}
    <View style={styles.grid}>
      {rows.map(row => <FeedbackPressable key={row.id} accessibilityRole="button" accessibilityLabel={`Review submission ${submissionName(row)}`} accessibilityHint="Open the full submission and review actions" onPress={() => { setError(''); setSelected(row); }} style={({ hovered, pressed }) => [styles.card, width < 768 && { width: '100%', maxWidth: '100%', flexBasis: 'auto' }, { backgroundColor: hovered || pressed ? p.tint : p.surface, borderColor: p.line }]}>
        <View style={styles.cardContent}>
          <StatusBadge status={row.approvalStatus} />
          <Text style={{ color: p.ink, fontSize: 18, fontWeight: '700' }} numberOfLines={2}>{submissionName(row)}</Text>
          <View style={styles.meta}><MapPin size={14} color={p.muted} /><Text style={{ color: p.muted, flexShrink: 1 }}>{row.municipality || 'Municipality not provided'}</Text></View>
          <Text style={{ color: p.muted, fontSize: 12 }}>Submitted {formatDate(row.submittedAt)}</Text>
          {row.pendingDeletion && <Text style={{ color: p.ink, fontWeight: '600' }}>Deletion request</Text>}
        </View>
        <ChevronRight size={28} color={p.ink} />
      </FeedbackPressable>)}
    </View>
    {!loading && !rows.length && !error && <Text style={{ color: p.muted }}>No pending submissions.</Text>}
    <ApprovalReviewDialog row={selected} resource={resource} busy={busy} reason={selected ? reasons[selected.id] || '' : ''} error={error} onReasonChange={value => setReasons(previous => ({ ...previous, [selected.id]: value }))} onClose={() => { if (!busyRef.current) { setSelected(null); setError(''); } }} onReview={review} />
  </View>;
}

function ApprovalReviewDialog({ row, resource, busy, reason, error, onReasonChange, onClose, onReview }) {
  const { palette: p } = useAppTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!row) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
    <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Pressable accessibilityLabel="Close submission review" style={StyleSheet.absoluteFillObject} disabled={busy} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: p.surface, maxHeight: Math.max(240, height - insets.top - insets.bottom - 32) }]}>
        <View style={styles.dialogHeader}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text accessibilityRole="header" style={{ color: p.ink, fontSize: 22, fontWeight: '700' }}>{submissionName(row)}</Text><Text style={{ color: p.muted }}>{lguResources[resource].label} · {row.municipality || 'Municipality not provided'}</Text></View>
          <FeedbackPressable accessibilityRole="button" accessibilityLabel="Close submission details" disabled={busy} onPress={onClose} style={styles.refresh}><X size={22} color={p.ink} /></FeedbackPressable>
        </View>
        <ScrollView style={{ flexShrink: 1, minHeight: 0 }} contentContainerStyle={styles.dialogBody} keyboardShouldPersistTaps="handled">
          <StatusBadge status={row.approvalStatus} />
          {row.photo && <Image source={{ uri: row.photo }} style={styles.photo} resizeMode="cover" />}
          {row.pendingDeletion && <Text style={{ color: p.ink, fontWeight: '700' }}>Deletion request: approving permanently deletes this entry.</Text>}
          {Object.entries(row).filter(([key]) => !hiddenFields.has(key)).map(([key, value]) => <View key={key} style={{ gap: 4 }}>
            <Text style={{ color: p.muted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{lguResources[resource].fields.find(([field]) => field === key)?.[1] || key.replace(/([A-Z])/g, ' $1')}</Text>
            <Text style={{ color: p.ink, fontSize: 14, lineHeight: 22 }}>{/At$/.test(key) ? formatDate(value) : typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text>
          </View>)}
          <View style={{ gap: 6 }}><Text style={{ color: p.ink, fontWeight: '600' }}>Rejection reason</Text><TextInput accessibilityLabel="Rejection reason" placeholder="Reason required for rejection" placeholderTextColor={p.muted} value={reason} onChangeText={onReasonChange} editable={!busy} multiline maxLength={1000} style={[styles.reason, { backgroundColor: p.background, color: p.ink, borderColor: p.line }]} /></View>
          {!!error && <Text accessibilityRole="alert" style={{ color: p.ink }}>{error}</Text>}
          <View style={styles.reviewActions}>
            <FeedbackPressable accessibilityRole="button" accessibilityLabel={row.pendingDeletion ? 'Approve deletion' : 'Approve publication'} disabled={busy} onPress={() => onReview('approve')} style={[styles.reviewButton, { backgroundColor: p.primary, opacity: busy ? 0.5 : 1 }]}><Text style={{ color: p.onPrimary, fontWeight: '700', textAlign: 'center' }}>{row.pendingDeletion ? 'Approve deletion' : 'Approve publication'}</Text></FeedbackPressable>
            <FeedbackPressable accessibilityRole="button" accessibilityLabel="Reject submission" disabled={busy || !reason.trim()} onPress={() => onReview('reject')} style={[styles.reviewButton, { backgroundColor: '#B42318', opacity: busy || !reason.trim() ? 0.4 : 1 }]}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Reject</Text></FeedbackPressable>
          </View>
          {busy && <ActivityIndicator accessibilityLabel="Saving review decision" color={p.primary} />}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  categories: { flexGrow: 0, marginBottom: 20 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  category: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexBasis: 300, maxWidth: 520, minWidth: 0, padding: 20, borderWidth: 1, borderRadius: 16, gap: 12 },
  cardContent: { flex: 1, minWidth: 0, gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overlay: { flex: 1, padding: 16, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 760, borderRadius: 20, overflow: 'hidden' },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 12 },
  dialogBody: { padding: 20, paddingTop: 8, gap: 16 },
  photo: { width: '100%', maxWidth: 440, height: 220, borderRadius: 12 },
  reason: { minHeight: 88, padding: 12, borderWidth: 1, borderRadius: 10, textAlignVertical: 'top' },
  reviewActions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  reviewButton: { flex: 1, minWidth: 0, minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
