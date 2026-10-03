import { Modal, Pressable, Text, View } from 'react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import { useAppTheme } from '../theme/useAppTheme';
const savedTripActionStyle = { width:160, minHeight:46, padding:12, borderRadius:10, alignItems:'center', justifyContent:'center' };

export default function TripActionConfirmation({ action, busy, onDismiss, onConfirm }) {
  const { themeStyle } = useAppTheme();
  if (!action) return null;
  return <Modal transparent visible animationType="fade" onRequestClose={() => !busy && onDismiss()}><Pressable onPress={() => !busy && onDismiss()} style={{flex:1,backgroundColor:'#00000070',alignItems:'center',justifyContent:'center',padding:20}}><Pressable onPress={() => {}} style={themeStyle({width:'100%',maxWidth:440,padding:24,borderRadius:18,backgroundColor:'#fff',gap:16})}><Text style={themeStyle({fontSize:20,fontWeight:'700',color:'#16324A'})}>{action.title}</Text><Text style={themeStyle({fontSize:14,lineHeight:22,color:'#4A6880'})}>{action.message}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}><FeedbackPressable disabled={busy} onPress={onDismiss} style={themeStyle({...savedTripActionStyle,backgroundColor:'#EAF3F8'})}><Text style={themeStyle({color:'#16324A',fontWeight:'600'})}>Go back</Text></FeedbackPressable><FeedbackPressable disabled={busy} onPress={onConfirm} style={themeStyle({...savedTripActionStyle,backgroundColor:action.destructive?'#B83C2A':'#0B3C5D',opacity:busy?.6:1})}><Text style={{color:'#fff',fontWeight:'600'}}>{busy?'Working...':action.label || 'Confirm'}</Text></FeedbackPressable></View></Pressable></Pressable></Modal>;
}
