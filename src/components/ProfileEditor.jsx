import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Upload, X } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../theme/useAppTheme";
import { chooseProfilePhoto } from "../lib/profilePhoto";
import ProfileAvatar from "./ProfileAvatar";
import TravelAvatar, { travelAvatars } from "./TravelAvatar";
import LocationAutocomplete from "./LocationAutocomplete";
import { normalizeName, profileNameFields, registrationFullName, validateProfileNames } from "../utils/validation";

const nameInputs = [
  { key: "firstName", label: "First name", placeholder: "e.g. Juan", autoComplete: "given-name" },
  { key: "middleName", label: "Middle name (optional)", placeholder: "e.g. Reyes", autoComplete: "additional-name", hint: "Saved as an initial: Reyes becomes R. Leave blank if you have no middle name." },
  { key: "surname", label: "Surname", placeholder: "e.g. dela Cruz", autoComplete: "family-name" },
];

export default function ProfileEditor({ mode, onClose, onSaved }) {
  const { themeStyle, themeColor } = useAppTheme();
  const user = useAuthStore(state => state.user);
  const updateProfile = useAuthStore(state => state.updateProfile);
  const [names, setNames] = useState(() => profileNameFields(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const inputRefs = useRef({});
  const [location, setLocation] = useState(user?.location || "");
  const [photo, setPhoto] = useState(user?.photo || null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const locked = useRef(false);
  const photoMode = mode === "photo";
  const originalNames = profileNameFields(user);
  const fullName = registrationFullName(names.firstName, names.middleName, names.surname);
  const changed = photoMode ? photo !== (user?.photo || null) : nameInputs.some(({ key }) => normalizeName(names[key]) !== originalNames[key]) || location.trim() !== (user?.location || "");
  const close = () => { if (!locked.current) onClose(); };
  const changeName = (key, value) => {
    const next = { ...names, [key]: value };
    setNames(next); setError(null);
    setFieldErrors(current => ({ ...current, [key]: validateProfileNames(next)[key] }));
  };
  const showFieldErrors = errors => {
    setFieldErrors(errors);
    const first = nameInputs.find(({ key }) => errors[key]);
    if (first) requestAnimationFrame(() => {
      const input = inputRefs.current[first.key];
      input?.focus();
      if (Platform.OS === "web") input?.scrollIntoView?.({ block: "nearest" });
    });
  };

  const pick = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null);
    try {
      const selected = await chooseProfilePhoto();
      if (selected !== undefined) setPhoto(selected);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open your photos. Please try again."); }
    finally { locked.current = false; setBusy(false); }
  };
  const save = async () => {
    if (locked.current || !changed) return;
    if (!photoMode) {
      const errors = validateProfileNames(names);
      showFieldErrors(errors);
      if (Object.values(errors).some(Boolean)) { setError("Please correct the highlighted fields."); return; }
    }
    locked.current = true;
    setBusy(true); setSaving(true); setError(null);
    try {
      await updateProfile(photoMode ? { photo } : { ...Object.fromEntries(Object.entries(names).map(([key, value]) => [key, normalizeName(value)])), location: location.trim() });
      onSaved(photoMode ? "Profile photo updated." : "Profile updated.");
    } catch (cause) {
      if (cause.fieldErrors) showFieldErrors(cause.fieldErrors);
      setError(cause instanceof Error ? cause.message : "Could not save your profile. Please try again.");
    }
    finally { locked.current = false; setBusy(false); setSaving(false); }
  };

  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <SafeAreaView style={styles.overlay}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable accessibilityLabel="Dismiss profile editor" accessibilityRole="button" onPress={close} disabled={busy} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={themeStyle(styles.panel)}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={themeStyle(styles.title)}>{photoMode ? "Change Photo" : "Edit Profile"}</Text>
            <Pressable accessibilityLabel="Close profile editor" accessibilityRole="button" onPress={close} disabled={busy} style={styles.close}><X size={22} color={themeColor("#0B3C5D")} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            {photoMode ? <View style={styles.photoForm}>
              <ProfileAvatar user={{ ...user, photo }} size={112} />
              <Text style={themeStyle(styles.caption)}>Pick your travel style or upload your own photo.</Text>
              <Pressable accessibilityRole="button" onPress={pick} disabled={busy} style={themeStyle([styles.secondary, styles.upload])}><Upload size={16} color={themeColor("#0B3C5D")} /><Text style={themeStyle(styles.secondaryText)}>Upload Photo</Text></Pressable>
              <View style={styles.galleryHeading}><Text style={themeStyle(styles.label)}>TRAVEL AVATARS</Text><Text style={themeStyle(styles.caption)}>16 to explore</Text></View>
              <View style={styles.gallery}>
                {travelAvatars.map(avatar => <Pressable key={avatar.id} accessibilityRole="button" accessibilityLabel={`Choose ${avatar.name} avatar`} accessibilityState={{ selected: photo === avatar.id, disabled: busy }}
                  disabled={busy} onPress={() => { setPhoto(avatar.id); setError(null); }} style={[styles.avatarOption, themeStyle(photo === avatar.id ? styles.selectedAvatar : styles.unselectedAvatar)]}>
                  <TravelAvatar avatar={avatar} size={48} />
                  <Text style={themeStyle(styles.avatarName)}>{avatar.name}</Text>
                  {photo === avatar.id && <View style={themeStyle(styles.selectedBadge)}><Check size={12} color="#FFFFFF" /></View>}
                </Pressable>)}
              </View>
              {photo && <Pressable accessibilityRole="button" onPress={() => setPhoto(null)} disabled={busy} style={styles.remove}><Text style={themeStyle(styles.error)}>Remove photo</Text></Pressable>}
              {busy && !saving && <ActivityIndicator accessibilityLabel="Preparing photo" color={themeColor("#0B3C5D")} />}
            </View> : <>
              {typeof user?.firstName !== "string" && <Text style={themeStyle(styles.caption)}>Review the name fields below. Your existing full name has been split for editing.</Text>}
              {nameInputs.map(({ key, label, placeholder, autoComplete, hint }) => <View key={key} style={styles.field}>
                <Text style={themeStyle(styles.label)}>{label}</Text>
                <TextInput ref={input => { inputRefs.current[key] = input; }} accessibilityLabel={label} accessibilityHint={fieldErrors[key] || hint} {...(Platform.OS === "web" ? { "aria-invalid": !!fieldErrors[key] } : {})} value={names[key]} onChangeText={value => changeName(key, value)} editable={!busy} placeholder={placeholder} placeholderTextColor={themeColor("#6B7876")} autoCapitalize="words" autoComplete={autoComplete} autoCorrect={false} style={themeStyle([styles.input, fieldErrors[key] && styles.invalidInput])} />
                {hint && <Text style={themeStyle(styles.caption)}>{hint}</Text>}
                {!!fieldErrors[key] && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={themeStyle(styles.error)}>{fieldErrors[key]}</Text>}
              </View>)}
              {!!names.firstName.trim() && !!names.surname.trim() && <Text style={themeStyle(styles.caption)}>Full name: {fullName}</Text>}
              <View style={styles.field}><Text style={themeStyle(styles.label)}>Location</Text><LocationAutocomplete value={location} onChange={setLocation} disabled={busy} /></View>
              <View style={styles.field}><Text style={themeStyle(styles.label)}>Sign-in email</Text><Text style={themeStyle(styles.caption)}>{user?.email}</Text></View>
            </>}
            {error && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{error}</Text>}
          </ScrollView>
          <View style={themeStyle(styles.footer)}>
            <Pressable accessibilityRole="button" onPress={close} disabled={busy} style={themeStyle(styles.secondary)}><Text style={themeStyle(styles.secondaryText)}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={save} disabled={busy || !changed} style={themeStyle([styles.save, (busy || !changed) && styles.disabled])}>
              {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={themeStyle(styles.saveText)}>{saving ? "Saving…" : "Save Changes"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  keyboard: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  panel: { width: "100%", maxWidth: 480, maxHeight: "90%", backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 20, paddingRight: 8, paddingVertical: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#0B3C5D" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  form: { padding: 20, paddingTop: 4, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#1E2A2F" },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#E7E1D6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1E2A2F", backgroundColor: "#FDFBF7" },
  invalidInput: { borderWidth: 2, borderColor: "#F46B4E", backgroundColor: "#FFF0E8", paddingHorizontal: 11, paddingVertical: 9 },
  caption: { fontSize: 13, lineHeight: 20, color: "#6B7876" },
  photoForm: { alignItems: "center", gap: 12 },
  upload: { flexDirection: "row", alignItems: "center", gap: 8 },
  galleryHeading: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  gallery: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  avatarOption: { width: "23.5%", alignItems: "center", paddingVertical: 8, paddingHorizontal: 2, gap: 6, borderRadius: 12, borderWidth: 2 },
  unselectedAvatar: { borderColor: "transparent" },
  selectedAvatar: { borderColor: "#F46B4E", backgroundColor: "#FFF0E8" },
  avatarName: { color: "#1E2A2F", fontSize: 10, lineHeight: 13, textAlign: "center" },
  selectedBadge: { position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#0B3C5D" },
  footer: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: "#E7E1D6" },
  secondary: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: "#E7E1D6", borderRadius: 8 },
  secondaryText: { color: "#0B3C5D", fontSize: 13, fontWeight: "600" },
  save: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#0B3C5D" },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  remove: { minHeight: 44, justifyContent: "center" },
  error: { color: "#BA3928", fontSize: 13, lineHeight: 20 },
});
