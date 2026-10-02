import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { ArrowRight, Building2, ClipboardList, RefreshCw, ShieldCheck, Users } from 'lucide-react-native'
import { FeedbackPressable } from '../components/WorkspaceMotion'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'

const destinations = [
  { key: 'lgu', label: 'LGU accounts', description: 'Manage municipality officers and local access.', screen: 'SuperAdminUsers', Icon: Building2 },
  { key: 'admins', label: 'Admin accounts', description: 'Manage administrators and content reviewers.', screen: 'SuperAdminCreateAdmin', Icon: Users },
  { key: 'events', label: 'Audit events', description: 'Review account and content activity.', screen: 'SuperAdminAuditLog', Icon: ClipboardList },
]

export default function SuperAdminDashboard({ navigation }) {
  const { palette } = useAppTheme()
  const { width } = useWindowDimensions()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let mounted = true
    let request = 0
    const load = async () => {
      const current = ++request
      setLoading(true)
      setError('')
      try {
        const [lgu, admins, audit] = await Promise.all([api.getManagedAccounts('lgu'), api.getManagedAccounts('admin'), api.getAuditLogs()])
        if (mounted && current === request) setData({ lgu: lgu.length, admins: admins.length, events: audit.total, recent: audit.items.slice(0, 5) })
      } catch (err) {
        if (mounted && current === request) setError(err.message)
      } finally {
        if (mounted && current === request) setLoading(false)
      }
    }
    load()
    const unsubscribe = navigation.addListener('focus', load)
    return () => { mounted = false; unsubscribe() }
  }, [navigation, refresh])

  const ink = { color: palette.ink }
  const muted = { color: palette.muted }
  const panel = { backgroundColor: palette.surface, borderColor: palette.line }
  const link = (label, onPress) => <FeedbackPressable accessibilityRole="button" onPress={onPress} style={({ hovered, pressed }) => [styles.link, (hovered || pressed) && { backgroundColor: palette.tint }]}><Text style={[styles.linkText, ink]}>{label}</Text><ArrowRight size={16} color={palette.ink} /></FeedbackPressable>

  return <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={[styles.page, width < 768 && styles.mobilePage]}>
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, muted]}>SUPER ADMIN WORKSPACE</Text>
          <Text style={[styles.title, ink]}>Overview</Text>
          <Text style={[styles.body, muted]}>A clear view of your accounts and platform activity.</Text>
        </View>
        <FeedbackPressable accessibilityRole="button" accessibilityLabel="Refresh overview" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={() => setRefresh(value => value + 1)} style={({ hovered, pressed }) => [styles.refresh, panel, (hovered || pressed) && { backgroundColor: palette.tint }]}>
          {loading ? <ActivityIndicator size="small" color={palette.ink} /> : <RefreshCw size={16} color={palette.ink} />}<Text style={[styles.linkText, ink]}>{loading ? 'Refreshing' : 'Refresh'}</Text>
        </FeedbackPressable>
      </View>

      {error ? <View accessibilityRole="alert" style={[styles.error, { backgroundColor: palette.paper, borderColor: palette.line }]}><Text style={[styles.body, ink]}>{data ? 'Unable to refresh. Showing the last loaded data. ' : 'Unable to load the overview. '}{error}</Text>{link('Try again', () => setRefresh(value => value + 1))}</View> : null}

      <View style={styles.grid}>
        {destinations.map(({ key, label, Icon }) => <View key={key} style={[styles.stat, panel, { flexBasis: width >= 1100 ? '30%' : '100%' }]}>
          <View style={styles.row}><Text style={[styles.statLabel, muted]}>{label}</Text><View style={[styles.icon, { backgroundColor: palette.tint }]}><Icon size={20} color={palette.ink} /></View></View>
          <Text style={[styles.value, ink]}>{data ? data[key].toLocaleString() : '—'}</Text>
          <Text style={[styles.caption, muted]}>{key === 'lgu' ? 'Municipality-scoped officers' : key === 'admins' ? 'Platform content reviewers' : 'Recorded account and review actions'}</Text>
        </View>)}
      </View>

      <View style={[styles.columns, width < 1200 && styles.stacked]}>
        <View style={[styles.panel, styles.activity, panel]}>
          <View style={styles.sectionHeader}><View style={styles.headerCopy}><Text style={[styles.heading, ink]}>Recent activity</Text><Text style={[styles.caption, muted]}>Latest events from the audit log</Text></View>{link('View all', () => navigation.navigate('SuperAdminAuditLog'))}</View>
          {!data ? <View style={styles.empty}>{loading ? <ActivityIndicator color={palette.ink} /> : <ClipboardList size={28} color={palette.muted} />}<Text style={[styles.body, muted]}>{loading ? 'Loading recent activity…' : 'Activity is currently unavailable.'}</Text></View> : data.recent.length ? data.recent.map(event => <View key={event.id} style={[styles.event, { borderTopColor: palette.line }]}>
            <View style={[styles.eventIcon, { backgroundColor: palette.tint }]}><ClipboardList size={16} color={palette.ink} /></View>
            <View style={styles.headerCopy}><Text style={[styles.eventTitle, ink]}>{event.action.replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())}</Text><Text style={[styles.caption, muted]}>{event.actor?.email || 'Deleted account'}</Text><Text style={[styles.timestamp, muted]}>{new Date(event.createdAt).toLocaleString()}</Text></View>
          </View>) : <View style={styles.empty}><ClipboardList size={28} color={palette.muted} /><Text style={[styles.eventTitle, ink]}>No activity yet</Text><Text style={[styles.caption, muted]}>Account and review actions will appear here.</Text></View>}
        </View>

        <View style={[styles.panel, styles.management, panel]}>
          <View style={styles.sectionHeader}><View style={styles.headerCopy}><Text style={[styles.heading, ink]}>Manage workspace</Text><Text style={[styles.caption, muted]}>Your essential administration tools</Text></View></View>
          {destinations.slice(0, 2).map(({ key, label, description, screen, Icon }) => <FeedbackPressable key={key} accessibilityRole="button" accessibilityLabel={`Manage ${label}`} onPress={() => navigation.navigate(screen)} style={({ hovered, pressed }) => [styles.destination, { borderTopColor: palette.line }, (hovered || pressed) && { backgroundColor: palette.tint }]}>
            <Icon size={20} color={palette.ink} /><View style={styles.headerCopy}><Text style={[styles.eventTitle, ink]}>{label}</Text><Text style={[styles.caption, muted]}>{description}</Text></View><ArrowRight size={17} color={palette.muted} />
          </FeedbackPressable>)}
          <View style={[styles.security, { backgroundColor: palette.tint }]}><ShieldCheck size={20} color={palette.ink} /><View style={styles.headerCopy}><Text style={[styles.eventTitle, ink]}>Account security</Text><Text style={[styles.caption, muted]}>Manage your password in Settings.</Text>{link('Open settings', () => navigation.navigate('SuperAdminSettings'))}</View></View>
        </View>
      </View>
    </View>
  </ScrollView>
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 32 }, mobilePage: { padding: 18 },
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 26 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { fontFamily: 'DMSans', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { fontFamily: 'Poppins', fontSize: 30, fontWeight: '700', marginTop: 4 },
  body: { fontFamily: 'DMSans', fontSize: 14, lineHeight: 22 },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stat: { flexGrow: 1, minWidth: 0, padding: 22, borderWidth: 1, borderRadius: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statLabel: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '600' },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: 'Poppins', fontSize: 36, fontWeight: '700' },
  caption: { fontFamily: 'DMSans', fontSize: 12, lineHeight: 19 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 }, stacked: { flexDirection: 'column', alignItems: 'stretch' },
  panel: { borderWidth: 1, borderRadius: 16, padding: 22, minWidth: 0 },
  activity: { flex: 1.4 }, management: { flex: 1 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 },
  heading: { fontFamily: 'Poppins', fontSize: 17, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 8, minHeight: 44 },
  linkText: { fontFamily: 'DMSans', fontSize: 12, fontWeight: '700' },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderTopWidth: 1 },
  eventIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  timestamp: { fontFamily: 'DMSans', fontSize: 11, marginTop: 3 },
  destination: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20, borderTopWidth: 1 },
  security: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  error: { padding: 16, borderWidth: 1, borderRadius: 12, gap: 4 },
})
