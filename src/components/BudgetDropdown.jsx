import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import { useAppTheme } from '../theme/useAppTheme';

export default function BudgetDropdown({ value, options, onChange, placeholder = 'Select an option' }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [open,setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return <View style={{gap:6}}><FeedbackPressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={themeStyle({padding:12,borderWidth:1,borderColor:'#E2EBF3',borderRadius:10,flexDirection:'row',alignItems:'center',gap:10})}><Text style={themeStyle({flex:1,color:'#16324A',fontSize:14})}>{selected?.label || placeholder}</Text><ChevronDown size={16} color={themeColor('#6B8CA8','color')} /></FeedbackPressable>{open && <ScrollView nestedScrollEnabled style={themeStyle({maxHeight:240,borderWidth:1,borderColor:'#E2EBF3',borderRadius:10,backgroundColor:'#fff'})}>{options.map(option=><FeedbackPressable key={String(option.value)} onPress={()=>{onChange(option.value);setOpen(false);}} style={themeStyle({padding:12,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:option.value===value?'#EAF3F8':'#fff'})}><Text style={themeStyle({flex:1,fontSize:13,lineHeight:20,color:'#16324A'})}>{option.label}</Text>{option.value===value && <Check size={16} color={themeColor('#0B3C5D','color')} />}</FeedbackPressable>)}</ScrollView>}</View>;
}
