import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CardHeader, { homeCard } from './CardHeader';
import ReinvestSheet, { KINDS, KIND_ICONS, KIND_SHORT, h, useCheer } from './ReinvestSheet';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const METER = 72; // a bucket's meter height, in px

/**
 * Reinvest, version B (two buckets): Business and You side by side, each filling up with the hours
 * you give it (a meter, the hours, what's in it), and an "Add" that opens the picking sheet for that
 * bucket. Free hours sit above as an apricot chip. `free` is hours a day bought back.
 */
export default function ReinvestBuckets({ free, fills = [], role, schedule = [], onSave, nudge, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [sheet, setSheet] = useState({ open: false, kind: null, id: 0 }); // the picking sheet
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
        sub={nudge || (allUsed ? 'Every freed hour has a new job' : 'Give your freed hours a new job')}
        right={
          !allUsed ? (
            <View style={styles.free}>
              <Ionicons name="hourglass-outline" size={12} color={colors.accentText} />
              <Text style={styles.freeText}>{h(left)} free</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.buckets}>
        {KINDS.map((k) => {
          const mine = fills.filter((x) => x.quadrant === k);
          const hours = mine.reduce((t, x) => t + x.hours, 0);
          const fill = free ? Math.min(1, hours / free) : 0;
          return (
            <View key={k} style={styles.bucket}>
              <View style={styles.bucketHead}>
                <Ionicons name={KIND_ICONS[k]} size={14} color={colors.chart[k]} />
                <Text style={styles.bucketName}>{KIND_SHORT[k]}</Text>
              </View>
              {/* The meter: how much of your freed time this bucket holds. */}
              <View style={styles.meter}>
                <View style={[styles.meterFill, { height: Math.max(hours ? 6 : 0, fill * METER), backgroundColor: colors.chart[k] }]} />
              </View>
              <Text style={styles.bucketHours}>{h(hours)}</Text>
              <Text style={styles.bucketItems} numberOfLines={2}>
                {mine.length ? mine.map((x) => x.activity).join(', ') : 'Nothing yet'}
              </Text>
              {!allUsed ? (
                <Pressable
                  onPress={() => setSheet((s) => ({ open: true, kind: k, id: s.id + 1 }))}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${KIND_SHORT[k]}`}
                  style={({ pressed }) => [styles.add, { borderColor: colors.chart[k] }, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="add" size={15} color={colors.chart[k]} />
                  <Text style={[styles.addText, { color: colors.chart[k] }]}>Add</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {cheer ? (
        <Animated.View entering={ZoomIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.cheer}>
          <Text style={styles.cheerText}>
            <Text style={styles.cheerStrong}>Nice! </Text>
            {h(cheer.hours)} a day for {cheer.activity.toLowerCase()} 🎉
          </Text>
        </Animated.View>
      ) : null}

      <ReinvestSheet
        visible={sheet.open}
        openId={sheet.id}
        presetKind={sheet.kind}
        left={left}
        fills={fills}
        role={role}
        schedule={schedule}
        onSave={onSave}
        onDone={setCheer}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.tintReinvest },
  free: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  freeText: { fontSize: 12, fontWeight: '800', color: colors.accentText },
  buckets: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md },
  bucket: { flex: 1, alignItems: 'center', padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.calmTrack },
  bucketHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bucketName: { fontSize: 14, fontWeight: '800', color: colors.text },
  meter: { width: 44, height: METER, marginTop: spacing.sm, borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  meterFill: { width: '100%', borderRadius: 12 },
  bucketHours: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  bucketItems: { fontSize: 12, lineHeight: 16, color: colors.muted, textAlign: 'center', marginTop: 2, minHeight: 32 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5 },
  addText: { fontSize: 13, fontWeight: '800' },
  cheer: { marginTop: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.successSoft },
  cheerText: { fontSize: 13, color: colors.text },
  cheerStrong: { fontWeight: '800' },
});
