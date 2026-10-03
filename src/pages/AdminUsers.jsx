import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { RefreshCw, Search, ShieldCheck, Users, UserPlus, Route } from 'lucide-react-native';
import AdminPage from '../components/AdminPage';
import Card from '../components/Card';
import WovenDivider from '../components/WovenDivider';
import { useAppTheme } from '../theme/useAppTheme';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import AccountActionButton from '../components/AccountActionButton';
import ExplorerAccountAction from '../components/ExplorerAccountAction';

const columns = [['USER', 0.22], ['EMAIL', 0.23], ['ROLE', 0.10], ['TRIPS', 0.07], ['EMAIL STATUS', 0.14], ['JOINED', 0.10], ['ACTIONS', 0.14]];
const number = value => Number.isFinite(value) ? value.toLocaleString('en-PH') : '—';
const date = (value, full = false) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: full ? 'long' : 'short', ...(full ? { day: 'numeric' } : {}), year: 'numeric' }) : 'Not recorded';
const initials = name => (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const avatarColor = id => [colors.sunsetCoral, colors.oceanBlue, colors.palmGreen, colors.gold, '#A1D0DB', '#7A9BAB'][[...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 6];

export default function AdminUsers() {
  const { themeStyle: t, themeColor } = useAppTheme();
  const { width } = useWindowDimensions();
  const canDelete = useAuthStore(state => state.user?.role === 'SUPERADMIN');
  const [users, setUsers] = useState([]), [summary, setSummary] = useState(null), [total, setTotal] = useState(0);
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [accountAction, setAccountAction] = useState(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setPage(1); setSearch(query.trim()); }, 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.getExplorerDashboard({ page, search, signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setUsers(data.users.filter(user => user.role === 'EXPLORER')); setSummary(data.summary); setTotal(data.total);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message || 'Unable to load Explorer accounts.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, search, refresh]);
  const tableWidth = Math.max(1100, width - (width >= 768 ? 356 : 96));
  const pages = Math.max(1, Math.ceil(total / 20));
  const growth = summary ? summary.newLastWeek ? ((summary.newThisWeek - summary.newLastWeek) / summary.newLastWeek * 100).toFixed(0) + '% vs last week' : 'No new accounts last week' : '';
  const metrics = [
    { label: 'Total Explorers', value: summary?.total, detail: summary ? summary.newThisWeek + ' joined this week' : '', Icon: Users, color: colors.oceanBlue, tint: colors.oceanBlueLight },
    { label: 'Verified emails', value: summary?.verified, detail: summary ? (summary.total - summary.verified) + ' awaiting verification' : '', Icon: ShieldCheck, color: colors.palmGreen, tint: colors.palmGreenLight },
    { label: 'New this week', value: summary?.newThisWeek, detail: growth, Icon: UserPlus, color: colors.sunsetCoral, tint: colors.coralLight },
    { label: 'Explorer trips', value: summary?.totalTrips, detail: summary ? summary.completedTrips + ' completed trips' : '', Icon: Route, color: colors.gold, tint: colors.goldLight },
  ];
  function action(label, Icon, onPress, tint = colors.oceanBlueLight, color = colors.oceanBlue) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [t(styles.action), { backgroundColor: themeColor(tint, 'backgroundColor'), opacity: pressed ? 0.65 : 1 }]}><Icon size={15} color={themeColor(color, 'color')} /></Pressable>;
  }
  return <AdminPage title="User Management" subtitle="Explorer accounts and their recorded travel activity" actions={action('Refresh Explorer accounts', RefreshCw, () => setRefresh(v => v + 1))}>
    {!!notice && <Text accessibilityRole="alert" style={[t(styles.muted), { marginBottom: 16 }]}>{notice}</Text>}
    <View style={styles.stats}>{metrics.map(({ label, value, detail, Icon, color, tint }) => <Card key={label} style={t(styles.stat)}>
      <WovenDivider color={themeColor(color, 'color')} count={20} />
      <View style={styles.statRow}><View><Text style={t(styles.statLabel)}>{label.toUpperCase()}</Text>{!summary && loading ? <ActivityIndicator style={{ alignSelf: 'flex-start', marginVertical: 10 }} color={themeColor(colors.oceanBlue, 'color')} /> : <Text style={t(styles.statValue)}>{number(value)}</Text>}</View><View style={[styles.statIcon, t({ backgroundColor: tint })]}><Icon size={20} color={themeColor(color, 'color')} /></View></View>
      <Text style={t(styles.statDetail)}>{detail}</Text>
    </Card>)}</View>
    {!!error && <View accessibilityRole="alert" style={t(styles.errorBox)}><Text style={t(styles.error)}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRefresh(v => v + 1)}><Text style={t(styles.retry)}>Retry</Text></Pressable></View>}
    <Card style={t(styles.tableCard)}>
      <View style={styles.toolbar}>
        <View style={t(styles.tabs)}><View style={t(styles.activeTab)}><Text style={styles.activeTabText}>Explorer</Text></View><Text style={t(styles.scope)}>Registered travelers</Text></View>
        <View style={t(styles.search)}><Search size={16} color={themeColor(colors.slate, 'color')} /><TextInput accessibilityLabel="Search Explorer names or emails" placeholder="Search users..." placeholderTextColor={themeColor(colors.slate, 'color')} value={query} onChangeText={setQuery} maxLength={120} style={t(styles.searchInput)} /></View>
      </View>
      {loading ? <View style={styles.empty}><ActivityIndicator color={themeColor(colors.oceanBlue, 'color')} /><Text style={t(styles.muted)}>Loading Explorer accounts...</Text></View> : error ? <Text style={[t(styles.muted), { padding: 24 }]}>Account data could not be refreshed. Select Retry to load it.</Text> : <>
        <ScrollView horizontal showsHorizontalScrollIndicator><View style={{ width: tableWidth }}>
          <View style={t(styles.tableHead)}>{columns.map(([label, ratio]) => <Text key={label} style={[t(styles.columnLabel), { width: (tableWidth - 48) * ratio }]}>{label}</Text>)}</View>
          {users.map(user => <View key={user.id} style={t(styles.tableRow)}>
            <View style={[styles.userCell, { width: (tableWidth - 48) * columns[0][1] }]}><View style={[styles.avatar, { backgroundColor: avatarColor(user.id) }]}><Text style={styles.avatarText}>{initials(user.name)}</Text></View><Text style={t(styles.userName)}>{user.name}</Text></View>
            <Text selectable style={[t(styles.email), { width: (tableWidth - 48) * columns[1][1] }]}>{user.email}</Text>
            <View style={{ width: (tableWidth - 48) * columns[2][1] }}><Text style={t(styles.roleBadge)}>Explorer</Text></View>
            <Text style={[t(styles.tripCount), { width: (tableWidth - 48) * columns[3][1] }]}>{number(user.tripCount)}</Text>
            <View style={{ width: (tableWidth - 48) * columns[4][1] }}><Text style={t([styles.badge, user.emailVerifiedAt ? styles.verified : styles.unverified])}>{user.emailVerifiedAt ? 'Verified' : 'Not verified'}</Text></View>
            <Text style={[t(styles.joined), { width: (tableWidth - 48) * columns[5][1] }]}>{date(user.createdAt)}</Text>
            <View style={[styles.actions, { width: (tableWidth - 48) * columns[6][1] }]}><AccountActionButton mode="edit" label={'Edit information for ' + user.name} onPress={() => { setNotice(''); setAccountAction({ account: user, mode: 'edit' }); }} />{canDelete && <AccountActionButton mode="delete" label={'Delete account ' + user.name} onPress={() => { setNotice(''); setAccountAction({ account: user, mode: 'delete' }); }} />}</View>
          </View>)}
        </View></ScrollView>
        {!users.length && <View style={styles.empty}><Users size={28} color={themeColor(colors.slate, 'color')} /><Text style={t(styles.userName)}>{search ? 'No matching Explorers' : 'No Explorer accounts yet'}</Text><Text style={t(styles.muted)}>{search ? 'Try a different name or email.' : 'Registered Explorer accounts will appear here.'}</Text></View>}
        <View style={t(styles.footer)}><Text style={t(styles.muted)}>{total ? ((page - 1) * 20 + 1) + '–' + Math.min(page * 20, total) + ' of ' + number(total) + ' Explorers' : '0 Explorers'}</Text><View style={styles.pagination}><Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage(v => v - 1)} style={[t(styles.pageButton), page <= 1 && styles.disabled]}><Text style={t(styles.pageText)}>Previous</Text></Pressable><Text style={t(styles.muted)}>Page {page} of {pages}</Text><Pressable accessibilityRole="button" disabled={page >= pages} onPress={() => setPage(v => v + 1)} style={[t(styles.pageButton), page >= pages && styles.disabled]}><Text style={t(styles.pageText)}>Next</Text></Pressable></View></View>
      </>}
    </Card>
    <Text style={[t(styles.muted), { marginTop: 12, fontSize: 11 }]}>Status reflects recorded email verification. Weekly totals use Monday to Sunday in Philippine time.</Text>
    {accountAction && <ExplorerAccountAction key={accountAction.account.id + accountAction.mode} {...accountAction} onClose={() => setAccountAction(null)} onSaved={message => { setAccountAction(null); setNotice(message); setPage(1); setRefresh(v => v + 1); }} />}

  </AdminPage>;
}
const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 24 }, stat: { flex: 1, minWidth: 210, borderRadius: 22, padding: 22 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 }, statLabel: { color: colors.slate, fontFamily: 'DMSans', fontSize: 11, letterSpacing: 0.5 },
  statValue: { color: colors.oceanBlue, fontFamily: 'Poppins', fontSize: 29, marginTop: 8 }, statIcon: { width: 48, height: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, statDetail: { color: colors.palmGreen, fontFamily: 'DMSans', fontSize: 11, marginTop: 12 },
  tableCard: { padding: 0, borderRadius: 22, overflow: 'hidden' }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 24 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 26, padding: 5, paddingRight: 16, backgroundColor: '#F5F7F8' }, activeTab: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.oceanBlue }, activeTabText: { color: '#fff', fontFamily: 'DMSans', fontWeight: '700', fontSize: 13 }, scope: { color: colors.oceanBlue, fontFamily: 'DMSans', fontSize: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.oceanBlueLight, borderRadius: 17, paddingHorizontal: 14, width: 220 }, searchInput: { flex: 1, paddingVertical: 10, color: colors.oceanBlue, fontFamily: 'DMSans', fontSize: 12 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, backgroundColor: '#F8FAFB' }, columnLabel: { color: colors.slate, fontFamily: 'DMSans', fontSize: 10, letterSpacing: 1.1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F4F6F7' }, userCell: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 14 }, avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, avatarText: { color: '#fff', fontFamily: 'DMSans', fontWeight: '700', fontSize: 13 },
  userName: { color: colors.oceanBlue, fontFamily: 'DMSans', fontSize: 14, fontWeight: '700', flexShrink: 1 }, email: { color: colors.slate, fontFamily: 'DMSans', fontSize: 12, paddingRight: 12 }, tripCount: { color: colors.oceanBlue, fontFamily: 'DMSans', fontWeight: '700', fontSize: 13 },
  roleBadge: { color: colors.oceanBlue, backgroundColor: '#E1F0F6', borderColor: '#A1D4E6', borderWidth: 1, fontFamily: 'DMSans', fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, alignSelf: 'flex-start', overflow: 'hidden' },
  badge: { borderWidth: 1, fontFamily: 'DMSans', fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, alignSelf: 'flex-start', overflow: 'hidden' }, verified: { color: colors.palmGreen, backgroundColor: '#EBF4EE', borderColor: '#ACDDBB' }, unverified: { color: '#AA711B', backgroundColor: '#FFF8EC', borderColor: '#E8D5AD' }, joined: { color: colors.slate, fontFamily: 'DMSans', fontSize: 12 }, actions: { flexDirection: 'row', gap: 9 }, action: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: 12, padding: 36 }, muted: { color: colors.slate, fontFamily: 'DMSans', fontSize: 12 }, errorBox: { padding: 16, marginBottom: 16, borderRadius: 14, backgroundColor: colors.coralLight, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, error: { color: '#B42318', fontFamily: 'DMSans' }, retry: { color: colors.oceanBlue, fontFamily: 'DMSans', fontWeight: '700' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 20, borderTopWidth: 1, borderTopColor: colors.border }, pagination: { flexDirection: 'row', gap: 12, alignItems: 'center' }, pageButton: { borderWidth: 1, borderColor: colors.oceanBlueLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }, pageText: { color: colors.oceanBlue, fontFamily: 'DMSans', fontSize: 12 }, disabled: { opacity: 0.4 },
  overlay: { flex: 1, backgroundColor: '#082C4488', padding: 24, justifyContent: 'center' }, dialog: { padding: 24, borderRadius: 22, backgroundColor: colors.white, width: '100%', maxWidth: 540, alignSelf: 'center', gap: 14 }, dialogHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, dialogTitle: { color: colors.oceanBlue, fontFamily: 'Poppins', fontSize: 20 }, dialogUser: { flexDirection: 'row', gap: 14, alignItems: 'center', marginVertical: 8 }, detailRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, detailValue: { color: colors.oceanBlue, fontFamily: 'DMSans', fontSize: 13 }, compose: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 14, backgroundColor: colors.oceanBlueLight },
});
