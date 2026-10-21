import { useState } from 'react';
import { Download } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { TravelButton, useSummerColors } from './SummerUI';
import { toQR } from 'toqr';

const releaseUrl = 'https://expo.dev/accounts/miguelnasurada/projects/multraverse/builds/3d325ab1-73bc-41d1-a8ef-19547b12836d';
const configuredUrl = process.env.EXPO_PUBLIC_ANDROID_DOWNLOAD_URL?.trim() || releaseUrl;
let downloadUrl;
try {
  const url = new URL(configuredUrl);
  if (url.protocol === 'https:' && !url.username && !url.password) downloadUrl = url.href;
} catch { /* Hide the download option until a valid release URL is configured. */ }

// Generate both destinations from the same setting; no third-party QR service.
let qrPath;
let qrSize;
if (downloadUrl) {
  try {
    const modules = toQR(downloadUrl);
    const side = Math.sqrt(modules.length);
    qrSize = side + 8; // Four-module white quiet zone on every side.
    qrPath = Array.from(modules, (dark, i) => dark
      ? `M${i % side + 4} ${Math.floor(i / side) + 4}h1v1h-1z` : '').join('');
  } catch { /* Keep the download link available if a URL exceeds QR capacity. */ }
}

export default function AppDownload() {
  const palette = useSummerColors();
  const [open, setOpen] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const close = () => qrExpanded ? setQrExpanded(false) : setOpen(false);
  if (!downloadUrl) return null;

  const isApk = new URL(downloadUrl).pathname.toLowerCase().endsWith('.apk');
  return <>
    <TravelButton label="Download for Android" onPress={() => setOpen(true)} secondary textColor="#23804B" Icon={Download} arrow={false} style={{ alignSelf: 'flex-start', marginTop: 18 }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(15, 40, 44, 0.45)' }}>
    <View style={{ width: '100%', maxWidth: 640, maxHeight: '90%', borderRadius: 20, overflow: 'hidden', backgroundColor: palette.surface }}>
    <ScrollView>
    <View style={{ padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface,
    gap: 16, alignItems: 'flex-start', width: '100%' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
    <Text accessibilityRole="header" style={{ fontFamily: 'Poppins', fontSize: 18, color: palette.ink, flexShrink: 1 }}>
      {qrExpanded ? 'Scan to install Multraverse' : 'Take Multraverse with you'}
    </Text>
    <Pressable accessibilityRole="button" accessibilityLabel={qrExpanded ? 'Close enlarged QR code' : 'Close Android download'} onPress={close} style={({ hovered, pressed }) => ({ minWidth: 44, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered || pressed ? palette.tint : palette.surface })}>
      <Text style={{ fontSize: 24, color: palette.ink }}>×</Text>
    </Pressable>
    </View>
    {qrExpanded ? <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${qrSize} ${qrSize}`} role="img" aria-label="Enlarged QR code for the Multraverse Android download" shapeRendering="crispEdges" style={{ display: 'block', width: '100%', maxWidth: 440, height: 'auto', aspectRatio: '1 / 1' }}>
        <rect width={qrSize} height={qrSize} fill="#fff" />
        <path d={qrPath} fill="#000" />
      </svg>
      <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: palette.muted, textAlign: 'center' }}>Scan with your Android phone's camera to open the download.</Text>
      <TravelButton label="Back to download" secondary arrow={false} onPress={() => setQrExpanded(false)} />
    </View> : <>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
    <View style={{ flexGrow: 1, flexBasis: 210, gap: 10, alignItems: 'flex-start' }}>
    <TravelButton label="Download for Android" onPress={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')} arrow={false} />
    <Text style={{ fontFamily: 'DMSans', fontSize: 12, lineHeight: 19, color: palette.muted }}>
      {isApk ? 'Download the APK on your Android phone, then open the file to install.'
        : 'Open the install page, choose the APK download, then open the file on your Android phone.'}
      {'\n'}Your phone may ask you to allow installation from your browser. Android only.
    </Text>
    </View>
    {qrPath && <View style={{ alignItems: 'center', gap: 6 }}>
      <button type="button" onClick={() => setQrExpanded(true)} aria-label="Enlarge Android download QR code" style={{ display: 'block', lineHeight: 0, borderRadius: 8, border: 0, padding: 0, background: '#fff', cursor: 'zoom-in' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="164" height="164" viewBox={`0 0 ${qrSize} ${qrSize}`} role="img" aria-label="Scan to open the Multraverse Android download" shapeRendering="crispEdges">
          <rect width={qrSize} height={qrSize} fill="#fff" />
          <path d={qrPath} fill="#000" />
        </svg>
      </button>
      <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: palette.muted }}>Scan or tap to enlarge</Text>
    </View>}
    </View>
    </>}
    </View>
    </ScrollView>
    </View>
    </View>
    </Modal>
  </>;
}
