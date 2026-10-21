import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CardHeader, { homeCard } from './CardHeader';
import ReinvestSheet, { KIND_ICONS, h, iconFor, useCheer } from './ReinvestSheet';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * Reinvest, version A (calm): what's free, a plain list of where your freed hours went, and one
 * button that opens the picking sheet. `free` is hours a day bought back.
 */
export default function ReinvestCalm({ free, fills = [], role, schedule = [], onSave, nudge, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [cheer, setCheer] = useCheer();

  const used = fills.reduce((t, f) => t + f.hours, 0);
  const left = Math.max(0, Math.round((free - used) * 100) / 100);
  const allUsed = left < 0.25;

  return (
    <View style={[styles.card, style]}>
      <CardHeader
        icon="leaf"
        iconColor={colors.chart.production}
        title="Reinvest Your Time"
        sub={nudge || (allUsed ? 'Every freed hour has a new job' : `${h(left)} a day is free again`)}
      />

      {fills.length ? (
        <View style={styles.list}>
          {fills.map((x, i) => (
            <View key={x.activity} style={[styles.row, i > 0 && styles.rowLine]}>
              <View style={[styles.rowIcon, { backgroundColor: `${colors.chart[x.quadrant]}1F` }]}>
                <Ionicons name={iconFor(x.activity)} size={14} color={colors.chart[x.quadrant]} />
              </View>
              <Text style={styles.rowName} numberOfLines={1}>
                {x.activity}
              </Text>
              <Ionicons name={KIND_ICONS[x.quadrant]} size={12} color={colors.chart[x.quadrant]} />
              <Text style={styles.rowHours}>{h(x.hours)} a day</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Nothing yet. Freed time fills up with busywork unless you give it a job.</Text>
      )}

      {cheer ? (
        <Animated.View entering={ZoomIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.cheer}>
          <Text style={styles.cheerText}>
            <Text style={styles.cheerStrong}>Nice! </Text>
            {h(cheer.hours)} a day for {cheer.activity.toLowerCase()} 🎉
          </Text>
        </Animated.View>
      ) : null}

      {!allUsed ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && { opacity: 0.85 }]}>
          <Ionicons name="add" size={18} color={colors.onColor} />
          <Text style={styles.addText}>Give {h(left)} a new job</Text>
        </Pressable>
      ) : null}

      <ReinvestSheet
        visible={open}
        left={left}
        fills={fills}
        role={role}
        schedule={schedule}
        onSave={onSave}
        onDone={setCheer}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.tintReinvest },
  list: { marginTop: spacing.md, paddingHorizontal: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.calmTrack },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowName: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: colors.text },
  rowHours: { fontSize: 13, fontWeight: '800', color: colors.text },
  empty: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: spacing.sm + 2 },
  cheer: { marginTop: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.successSoft },
  cheerText: { fontSize: 13, color: colors.text },
  cheerStrong: { fontWeight: '800' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.primary },
  addText: { fontSize: 15, fontWeight: '800', color: colors.onColor },
});
