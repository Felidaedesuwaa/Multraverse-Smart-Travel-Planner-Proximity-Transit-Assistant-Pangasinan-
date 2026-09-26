import { useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import SuperAdminSidebar from '../components/SuperAdminSidebar'
import SuperAdminDashboard from '../pages/SuperAdminDashboard'
import SuperAdminUsers from '../pages/SuperAdminUsers'
import SuperAdminCreateLGU from '../pages/SuperAdminCreateLGU'
import SuperAdminCreateAdmin from '../pages/SuperAdminCreateAdmin'
import SuperAdminAuditLog from '../pages/SuperAdminAuditLog'
const Stack = createNativeStackNavigator()
export default function SuperAdminLayout({ navigation }) {
  const { width } = useWindowDimensions()
  const [activeScreen, setActiveScreen] = useState('SuperAdminDashboard')
  return <View style={{ flex: 1, flexDirection: width >= 768 ? 'row' : 'column' }}>
    <SuperAdminSidebar compact={width < 768} activeScreen={activeScreen} onNavigate={screen => navigation.navigate('SuperAdmin', { screen })} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }} screenListeners={({ route }) => ({ focus: () => setActiveScreen(route.name) })}>
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
        <Stack.Screen name="SuperAdminUsers" component={SuperAdminUsers} />
        <Stack.Screen name="SuperAdminCreateLGU" component={SuperAdminCreateLGU} />
        <Stack.Screen name="SuperAdminCreateAdmin" component={SuperAdminCreateAdmin} />
        <Stack.Screen name="SuperAdminAuditLog" component={SuperAdminAuditLog} />
      </Stack.Navigator>
    </View>
  </View>
}
