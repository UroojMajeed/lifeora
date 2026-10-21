import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CardHeader, { homeCard } from './CardHeader';
import ReinvestSheet, { KINDS, KIND_ICONS, h, useCheer } from './ReinvestSheet';
import { FILL_KINDS } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const LINES = { production: 'More of the work you love that makes money', investment: 'Time for your health, family and growth' };

/**
 * Reinvest: the two ways to spend freed time as two boxes, Grow the business and Invest in yourself.
 * Each says what it means and its hours so far, with a filled Add time pill; tapping it opens the picking sheet. Free
 * hours sit in an apricot chip by the title. `free` is hours a day bought back.
 */
export default function ReinvestBoxes({ free, fills = [], role, schedule = [], onSave, nudge, style }) {
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

      <View style={styles.boxes}>
        {KINDS.map((k) => {
          const mine = fills.filter((x) => x.quadrant === k);
          const hours = mine.reduce((t, x) => t + x.hours, 0);
          return (
            <Pressable
              key={k}
              onPress={() => setSheet((s) => ({ open: true, kind: k, id: s.id + 1 }))}
              disabled={allUsed}
              accessibilityRole="button"
              accessibilityLabel={`${FILL_KINDS[k].title}: ${hours ? `${h(hours)} a day so far` : 'nothing yet'}.${allUsed ? '' : ' Tap to add time.'}`}
              style={({ pressed }) => [styles.box, pressed && styles.pressed]}
            >
              <View style={styles.boxTop}>
                <View style={[styles.icon, { backgroundColor: `${colors.chart[k]}1F` }]}>
                  <Ionicons name={KIND_ICONS[k]} size={18} color={colors.chart[k]} />
                </View>
                {/* What's in it so far: just the hours. */}
                {hours ? (
                  <View style={[styles.badge, { backgroundColor: colors.chart[k] }]}>
                    <Text style={styles.badgeText}>{h(hours)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.title}>{FILL_KINDS[k].title}</Text>
              <Text style={styles.line}>{LINES[k]}</Text>
              {/* The way in: a filled pill, so the box reads as a button. */}
              {!allUsed ? (
                <View style={[styles.add, { backgroundColor: colors.chart[k] }]}>
                  <Text style={styles.addText}>Add time</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
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
  boxes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  box: { flex: 1, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.surface, ...cardShadow(colors, isDark) },
  boxTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  line: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 2, marginBottom: spacing.sm + 4 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 'auto', paddingVertical: 8, borderRadius: radius.pill }, // at the bottom, so both pills line up
  addText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  cheer: { marginTop: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.successSoft },
  cheerText: { fontSize: 13, color: colors.text },
  cheerStrong: { fontWeight: '800' },
});
