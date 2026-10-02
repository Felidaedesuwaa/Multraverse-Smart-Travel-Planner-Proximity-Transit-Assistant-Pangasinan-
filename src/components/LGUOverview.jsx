import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { ArrowRight, CheckCircle2, Clock3, FileText, AlertCircle, RefreshCw, MapPin, Utensils, Wallet, Radio, Route } from 'lucide-react-native'
import LGUPage from './LGUPage'
import LGUMunicipalityMap from './LGUMunicipalityMap'
import MunicipalStatCard from './MunicipalStatCard'
import Card from './Card'
import { api } from '../lib/api'
import { lguResources } from '../data/lguResources'
import { colors } from '../theme/colors'
import { useAppTheme } from '../theme/useAppTheme'

const icons = { places: MapPin, foods: Utensils, 'route-prices': Wallet, geofences: Radio, 'transit-routes': Route }
export default function LGUOverview({ municipality, onNavigate }) {
  const { themeStyle, themeColor } = useAppTheme()
  const { width } = useWindowDimensions()
  const [resources, setResources] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const entries = await Promise.all(Object.keys(lguResources).map(async key => [key, await api.getLGUResources(key)]))
      setResources(Object.fromEntries(entries))
    } catch (err) { setError(err.message || 'Unable to load municipal records. Please try again.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const rows = Object.values(resources).flat()
  const count = status => rows.filter(row => (row.approvalStatus || 'approved') === status).length
  return <LGUPage title="Dashboard" subtitle={`Your overview of local information and submissions in ${municipality.name}.`} actions={<Pressable accessibilityRole="button" accessibilityLabel="Refresh dashboard" disabled={loading} onPress={refresh} style={themeStyle(styles.refresh)}><RefreshCw size={16} color={themeColor(colors.oceanBlue, 'color')} /><Text style={themeStyle(styles.link)}>Refresh</Text></Pressable>}>
    <View style={styles.stack}>
      {error ? <View accessibilityRole="alert" style={themeStyle(styles.error)}><AlertCircle size={18} color={themeColor(colors.sunsetCoral, 'color')} /><Text style={themeStyle(styles.body)}>{error}</Text></View> : null}
      <View style={styles.grid}>{[
        ['Total entries', rows.length, 'Across all five categories', FileText, colors.oceanBlueLight],
        ['Pending review', count('pending'), 'Awaiting Admin approval', Clock3, colors.goldLight],
        ['Approved', count('approved'), 'Published local information', CheckCircle2, colors.palmGreenLight],
        ['Needs attention', count('rejected'), 'Review feedback and resubmit', AlertCircle, colors.coralLight],
      ].map(([label, value, delta, Icon, bg]) => <View key={label} style={[styles.stat, { flexBasis: width >= 1200 ? '22%' : width >= 540 ? '45%' : '100%' }]}><MunicipalStatCard label={label} value={loading || error ? '—' : value} delta={delta} icon={<Icon size={18} color={themeColor(colors.oceanBlue, 'color')} />} iconBg={bg} /></View>)}</View>
      <View style={[styles.columns, width < 1100 && styles.vertical]}>
        <Card style={styles.management}><Text style={themeStyle(styles.heading)}>Manage local information</Text><Text style={themeStyle(styles.caption)}>Select a category to add, edit, or request deletion of an entry.</Text>
          {loading ? <ActivityIndicator style={styles.loader} color={themeColor(colors.oceanBlue, 'color')} /> : Object.entries(lguResources).map(([key, definition]) => {
            const Icon = icons[key]
            const entries = resources[key] || []
            const pending = entries.filter(row => row.approvalStatus === 'pending').length
            return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Manage ${definition.label}`} onPress={() => onNavigate(key)} style={({ pressed, hovered }) => themeStyle([styles.category, (pressed || hovered) && styles.hover])}>
              <View style={themeStyle(styles.categoryIcon)}><Icon size={20} color={themeColor(colors.oceanBlue, 'color')} /></View>
              <View style={styles.grow}><Text style={themeStyle(styles.name)}>{definition.label}</Text><Text style={themeStyle(styles.caption)}>{error ? 'Open category to load entries' : `${entries.length} entries · ${pending} pending review`}</Text></View><ArrowRight size={18} color={themeColor(colors.textMuted, 'color')} />
            </Pressable>
          })}
        </Card>
        <View style={styles.map}><LGUMunicipalityMap municipality={municipality} /><Card style={styles.note}><Text style={themeStyle(styles.heading)}>Publication workflow</Text><Text style={themeStyle(styles.body)}>Submit accurate local information. An Admin reviews new entries and changes before travelers can see them. Rejected entries include feedback in their category.</Text></Card></View>
      </View>
    </View>
  </LGUPage>
}
const styles = StyleSheet.create({
  stack: { gap: 24 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, stat: { flexGrow: 1 },
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }, vertical: { flexDirection: 'column', alignItems: 'stretch' },
  management: { flex: 1, width: '100%', gap: 10, shadowOpacity: 0, elevation: 0, padding: 24 }, map: { flex: 1, width: '100%', gap: 20 }, note: { gap: 10, shadowOpacity: 0, elevation: 0 },
  heading: { fontFamily: 'Poppins', fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  caption: { fontFamily: 'DMSans', fontSize: 12, color: colors.textMuted, lineHeight: 20 },
  body: { fontFamily: 'DMSans', fontSize: 13, color: colors.textPrimary, lineHeight: 22, flexShrink: 1 },
  category: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 18, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: 8 },
  categoryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.oceanBlueLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '700', color: colors.textPrimary }, grow: { flex: 1, minWidth: 0 }, hover: { backgroundColor: colors.oceanBlueLight },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 10, padding: 12 }, link: { fontFamily: 'DMSans', fontSize: 13, fontWeight: '600', color: colors.oceanBlue },
  error: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, backgroundColor: colors.coralLight, borderRadius: 12 }, loader: { padding: 40 },
})
