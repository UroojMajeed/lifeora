import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { HeroCard } from './Card';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const week = (hoursADay) => formatHours(hoursADay * WORKDAYS_PER_WEEK);

const RING = 92;
const STROKE = 9;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

/** One progress ring that draws itself once, quietly, with the percentage in the middle. */
function Ring({ share, color, label, detail }) {
  const styles = useStyles(makeStyles);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.min(1, share), { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [share, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));

  return (
    <View style={styles.ringCol}>
      <View style={styles.ring}>
        <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.12)" strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            animatedProps={props}
            rotation={-90}
            origin={`${RING / 2}, ${RING / 2}`}
          />
        </Svg>
        <Text style={styles.pct}>{Math.round(Math.min(1, share) * 100)}%</Text>
      </View>
      <View style={styles.ringLabel}>
        <View style={[styles.key, { backgroundColor: color }]} />
        <Text style={styles.ringName}>{label}</Text>
      </View>
      <Text style={styles.ringDetail}>{detail}</Text>
    </View>
  );
}

/**
 * Home's progress card: the hours bought back a week, big, with the journey's promise, then two rings
 * for the last two steps: Delegated (of everything that drains you) and Reinvested (of the time you
 * freed). Tapping opens your handoffs.
 */
export default function HoursBackCard({ summary, onPress }) {
  const styles = useStyles(makeStyles);
  const draining = summary?.drainingHours || 0;
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const filled = Math.min(summary?.filledHours || 0, bought);
  const round = summary?.round || 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hours back: ${week(bought)} a week. Delegated ${week(bought)} of ${week(draining)}; reinvested ${week(filled)} of ${week(bought)}. Open your handoffs.`}
      style={({ pressed }) => pressed && { opacity: 0.95, transform: [{ scale: 0.995 }] }}
    >
      <HeroCard style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Hours back</Text>
          <View style={styles.round}>
            <Text style={styles.roundText}>Round {round}</Text>
          </View>
        </View>
        <Text style={styles.big}>
          {summary ? week(bought) : '–'}
          <Text style={styles.per}> a week</Text>
        </Text>
        <Text style={styles.promise}>for the work and life you love</Text>

        <View style={styles.rings}>
          <Ring share={draining ? bought / draining : 0} color={brand.apricot} label="Delegated" detail={`${week(bought)} of ${week(draining)}`} />
          <View style={styles.divider} />
          <Ring share={bought ? filled / bought : 0} color={brand.mint} label="Reinvested" detail={`${week(filled)} of ${week(bought)}`} />
        </View>
      </HeroCard>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  card: { padding: spacing.md + 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.heroMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  round: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.heroChip },
  roundText: { color: colors.heroText, fontSize: 12, fontWeight: '700' },
  big: { color: colors.heroText, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  per: { fontSize: 18, fontWeight: '700', color: colors.heroMuted, letterSpacing: 0 },
  promise: { color: brand.apricot, fontSize: 14, fontWeight: '800' },
  // The two rings, side by side, split by a hairline.
  rings: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.heroDivider,
  },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.heroDivider },
  ringCol: { flex: 1, alignItems: 'center' },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  pct: { color: colors.heroText, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  ringLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  key: { width: 8, height: 8, borderRadius: 4 },
  ringName: { color: colors.heroText, fontSize: 13, fontWeight: '700' },
  ringDetail: { color: colors.heroMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
});
