import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  loadMotivation,
  removeMotivation,
  saveMotivationCaption,
  saveMotivationPhoto,
} from '../storage/motivation';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** "Your why": an optional photo (and a few words) of what the user is buying back time for. */
export default function MotivationCard({ style }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [motivation, setMotivation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    loadMotivation().then(setMotivation);
  }, []);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setBusy(true);
    try {
      const saved = await saveMotivationPhoto(result.assets[0].uri, motivation);
      setMotivation(saved);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Fresh photo with no words yet: invite a caption right away.
      if (!saved.caption) {
        setDraft('');
        setEditing(true);
      }
    } catch {
      Alert.alert("Couldn't save that photo", 'Please try another one.');
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = async () => {
    setMotivation(await saveMotivationCaption(draft, motivation));
    setEditing(false);
  };

  const openMenu = () => {
    Alert.alert('Your why', undefined, [
      { text: 'Change photo', onPress: pickPhoto },
      {
        text: motivation?.caption ? 'Edit words' : 'Add words',
        onPress: () => {
          setDraft(motivation?.caption || '');
          setEditing(true);
        },
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setMotivation(await removeMotivation(motivation));
          setEditing(false);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!motivation) return null;

  if (!motivation.uri) {
    return (
      <Pressable
        onPress={pickPhoto}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Add a photo that motivates you"
        style={({ pressed }) => [styles.empty, style, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.emptyIcon}>
          {busy ? <ActivityIndicator color={colors.primaryDark} /> : <Ionicons name="image-outline" size={26} color={colors.primaryDark} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyTitle}>Add your why</Text>
          <Text style={styles.emptyBody}>
            A photo that motivates you: your family, a dream home, a trip. Whatever you're buying back time for.
          </Text>
        </View>
        <Ionicons name="add-circle" size={26} color={colors.primary} />
      </Pressable>
    );
  }

  return (
    <View style={style}>
      <Pressable onPress={openMenu} accessibilityRole="button" accessibilityLabel="Your why photo. Tap to change." style={styles.photoWrap}>
        <Image source={{ uri: motivation.uri }} style={styles.photo} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']} style={styles.shade} />
        <View style={styles.badge}>
          <Ionicons name="heart" size={12} color="#FFFFFF" />
          <Text style={styles.badgeText}>YOUR WHY</Text>
        </View>
        <View style={styles.editBtn}>
          {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="create-outline" size={18} color="#FFFFFF" />}
        </View>
        {motivation.caption && !editing ? <Text style={styles.caption}>{motivation.caption}</Text> : null}
      </Pressable>

      {editing ? (
        <View style={styles.captionRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="A few words, e.g. More evenings with my kids"
            placeholderTextColor={colors.muted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            maxLength={80}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveCaption}
            style={styles.captionInput}
          />
          <Pressable onPress={saveCaption} accessibilityRole="button" accessibilityLabel="Save words" style={styles.saveBtn}>
            <Ionicons name="checkmark" size={20} color={colors.onColor} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyBody: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 2 },
  photoWrap: { borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: colors.surfaceAlt },
  photo: { width: '100%', height: '100%' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  editBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  caption: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: 6,
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  captionInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 },
  saveBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
});
