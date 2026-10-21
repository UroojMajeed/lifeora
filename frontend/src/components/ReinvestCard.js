import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CardHeader, { homeCard } from './CardHeader';
import ReinvestSheet, { KINDS, KIND_ICONS, h, iconFor, useCheer } from './ReinvestSheet';
import { FILL_KINDS } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const SHORT = { production: 'business', investment: 'you' }; // the word inside the bar
const LINES = { production: 'More of the work you love that makes money', investment: 'Time for your health, family and growth' };

/** A kind word for where you are: nothing yet, some, or all of it reinvested. */
function cheerLine(used, allUsed) {
  if (allUsed) return 'Every freed hour has a new job';
  if (used) return 'Great start. Keep going!';
  return 'Your freed time is waiting for a new job';
}

/**
 * Reinvest (the book's Fill): a bar of your freed time (business, you, and what's still free; tap a
 * part to see what's in it), and the two ways to spend it as boxes. Tapping a box slides up the
 * picking sheet for it. Once every freed hour is reinvested, a tile per new job takes the boxes' place.
 * `free` is hours a day bought back.
 */
export default function ReinvestCard({ free, fills = [], role, schedule = [], onSave, nudge, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [shown, setShown] = useState(null); // the bar part whose list is open
  const [sheet, setSheet] = useState({ open: false, kind: null, id: 0 }); // the picking sheet
  const [cheer, setCheer] = useCheer();

  const used = fills.reduce((t, f) => t + f.hours, 0);
  const left = Math.max(0, Math.round((free - used) * 100) / 100);
  const allUsed = left < 0.25;
  const color = (k) => colors.chart[k];

  const parts = KINDS.filter((k) => fills.some((x) => x.quadrant === k)).length + (left > 0 ? 1 : 0);
  const crowded = parts >= 3; // three parts: icon + hours, no word

  return (
    <View style={[styles.card, style]}>
      <CardHeader icon="leaf" iconColor={colors.chart.production} title="Reinvest Your Time" sub={nudge || cheerLine(used, allUsed)} />

      {/* How much of the freed time has a new job, said inside the bar. */}
      <View style={styles.track}>
        {KINDS.map((k) => {
          const part = fills.filter((x) => x.quadrant === k).reduce((t, x) => t + x.hours, 0);
          return part ? (
            <Pressable
              key={k}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShown((cur) => (cur === k ? null : k));
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: shown === k }}
              accessibilityLabel={`${h(part)} a day ${k === 'production' ? 'in the business' : 'in you'}. Tap to see where.`}
              style={({ pressed }) => [styles.part, crowded && styles.partTight, { flex: part, backgroundColor: color(k) }, pressed && styles.pressed]}
            >
              <Ionicons name={KIND_ICONS[k]} size={12} color="#FFFFFF" />
              <Text style={styles.partText} numberOfLines={1}>
                {crowded ? h(part) : `${h(part)} ${SHORT[k]}`}
              </Text>
              <Ionicons name={shown === k ? 'chevron-up' : 'chevron-down'} size={12} color="#FFFFFF" />
            </Pressable>
          ) : null;
        })}
        {left > 0 ? (
          <View style={[styles.part, crowded && styles.partTight, styles.free, { flex: left }]}>
            <Ionicons name="hourglass-outline" size={12} color={colors.accentText} />
            <Text style={styles.freeText} numberOfLines={1}>
              {h(left)} free
            </Text>
          </View>
        ) : null}
      </View>

      {/* Where your time went: tap a part of the bar to see its list. */}
      {shown && fills.some((x) => x.quadrant === shown) ? (
        <Animated.View key={shown} entering={FadeIn.duration(250)} style={styles.list}>
          {fills
            .filter((x) => x.quadrant === shown)
            .map((x, i) => (
              <View key={x.activity} style={[styles.row, i > 0 && styles.rowLine]}>
                <View style={[styles.rowIcon, { backgroundColor: `${color(x.quadrant)}1F` }]}>
                  <Ionicons name={iconFor(x.activity)} size={14} color={color(x.quadrant)} />
                </View>
                <Text style={styles.rowName} numberOfLines={1}>
                  {x.activity}
                </Text>
                <Text style={styles.rowHours}>{h(x.hours)} a day</Text>
              </View>
            ))}
        </Animated.View>
      ) : null}

      {/* A moment to enjoy it, right after each reinvest. */}
      {cheer ? (
        <Animated.View entering={ZoomIn.duration(300)} exiting={FadeOut.duration(300)} style={[styles.cheer, { backgroundColor: `${color(cheer.kind)}14` }]}>
          <View style={[styles.cheerIcon, { backgroundColor: color(cheer.kind) }]}>
            <Ionicons name={iconFor(cheer.activity)} size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.cheerText}>
            <Text style={styles.cheerStrong}>Nice! </Text>
            {h(cheer.hours)} a day for {cheer.activity.toLowerCase()}
          </Text>
          <Text style={styles.cheerEmoji}>🎉</Text>
        </Animated.View>
      ) : null}

      {/* Two ways to spend it: tap one to choose what. */}
      {!allUsed ? (
        <View style={styles.kinds}>
          {KINDS.map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSheet((s) => ({ open: true, kind: k, id: s.id + 1 }));
              }}
              accessibilityRole="button"
              accessibilityLabel={`${FILL_KINDS[k].title}. ${LINES[k]}. Tap to choose.`}
              style={({ pressed }) => [styles.kind, pressed && styles.pressed]}
            >
              <View style={[styles.kindIcon, { backgroundColor: `${color(k)}1F` }]}>
                <Ionicons name={KIND_ICONS[k]} size={18} color={color(k)} />
              </View>
              <Text style={styles.kindTitle}>{FILL_KINDS[k].title}</Text>
              <Text style={styles.kindSub}>{LINES[k]}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        /* All of it reinvested: a tile for each new job, in place of the boxes. */
        <View style={styles.tiles}>
          {fills.map((x) => (
            <View key={x.activity} style={[styles.tile, { borderColor: `${color(x.quadrant)}55` }]}>
              <View style={[styles.kindIcon, { backgroundColor: `${color(x.quadrant)}1F` }]}>
                <Ionicons name={iconFor(x.activity)} size={17} color={color(x.quadrant)} />
              </View>
              <Text style={styles.tileName} numberOfLines={2}>
                {x.activity}
              </Text>
              <View style={styles.tileFoot}>
                <Ionicons name={KIND_ICONS[x.quadrant]} size={12} color={color(x.quadrant)} />
                <Text style={[styles.tileHours, { color: color(x.quadrant) }]}>{h(x.hours)} a day</Text>
              </View>
            </View>
          ))}
        </View>
      )}

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
  pressed: { opacity: 0.8 },
  // The bar
  track: { flexDirection: 'row', gap: 2, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.calmTrack, marginTop: spacing.md },
  part: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, minWidth: 104 }, // wide enough for its words
  partTight: { minWidth: 72, paddingHorizontal: 6 },
  partText: { flexShrink: 1, fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  free: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent, borderRadius: 15 }, // still free: warm apricot, waiting for a job
  freeText: { flexShrink: 1, fontSize: 12, fontWeight: '800', color: colors.accentText },
  // Where your time went
  list: { marginTop: spacing.sm + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowName: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: colors.text },
  rowHours: { fontSize: 13, fontWeight: '800', color: colors.text },
  // The cheer after each reinvest
  cheer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm + 4, padding: spacing.sm + 2, borderRadius: radius.md },
  cheerIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cheerText: { flex: 1, fontSize: 13, color: colors.text },
  cheerStrong: { fontWeight: '800' },
  cheerEmoji: { fontSize: 20 },
  // The two boxes
  kinds: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  kind: { flex: 1, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  kindIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  kindTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  kindSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  // Once it's all reinvested: a tile per new job, two to a row.
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tile: { width: '48%', flexGrow: 1, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, backgroundColor: colors.surface },
  tileName: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tileHours: { fontSize: 12, fontWeight: '800' },
});
