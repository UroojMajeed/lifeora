import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HeroCard } from './Card';
import { WORKDAYS_PER_WEEK, WORKDAYS_PER_YEAR } from '../constants/home';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 184;
const STROKE = 14;
const R = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
// Inner ring: how much of the bought-back time has a new job (Fill).
const INNER_STROKE = 8;
const R_IN = R - STROKE / 2 - 6 - INNER_STROKE / 2;
const C_IN = 2 * Math.PI * R_IN;

const BURST_COLORS = [brand.apricot, brand.mint, brand.white];
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2,
  color: BURST_COLORS[i % BURST_COLORS.length],
  size: i % 2 ? 8 : 6,
}));

/** One dot of the celebration burst: flies out from the ring and fades. */
function Particle({ t, angle, color, size }) {
  const style = useAnimatedStyle(() => {
    const d = RING / 2 + 6 + t.value * 34;
    return {
      opacity: t.value === 0 ? 0 : 1 - t.value,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - t.value * 0.4 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

/**
 * Home's headline (one number, like a readiness score): hours bought back a week, as an apricot ring
 * that fills toward all the hours that drain you. The inner mint ring shows how much of that time has
 * a new job (Fill). `share` is energyShare(); `celebrate` bumps when the number goes up.
 */
export default function BuybackRingCard({ summary, share, effectiveHourlyRate = 0, buybackRate = 0, currency, streak, celebrate, onPress }) {
  const styles = useStyles(makeStyles);
  const progress = useSharedValue(0);
  const filledProgress = useSharedValue(0);
  const pulse = useSharedValue(1);
  const burst = useSharedValue(0);

  const draining = summary?.drainingHours || 0;
  const bought = summary?.boughtBackHours || 0;
  // This round's goal: every draining hour except the tasks kept for the next round.
  const laterHours = summary?.laterHours || 0;
  const roundDraining = Math.max(0, draining - laterHours);
  const target = summary ? (roundDraining ? bought / roundDraining : draining ? 0 : 1) : 0;
  const nothingDrains = Boolean(summary) && !summary.total;
  const filledTarget = bought ? Math.min(1, (summary?.filledHours || 0) / bought) : 0;

  useEffect(() => {
    progress.value = withTiming(target, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [target, progress]);

  useEffect(() => {
    filledProgress.value = withTiming(filledTarget, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [filledTarget, filledProgress]);

  useEffect(() => {
    if (!celebrate) return;
    pulse.value = withSequence(withTiming(1.06, { duration: 180 }), withSpring(1, { damping: 8 }));
    burst.value = 0;
    burst.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }, () => {
      burst.value = 0;
    });
  }, [celebrate, pulse, burst]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.value) }));
  const innerProps = useAnimatedProps(() => ({ strokeDashoffset: C_IN * (1 - filledProgress.value) }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const perWeek = bought * WORKDAYS_PER_WEEK;
  const targetWeek = roundDraining * WORKDAYS_PER_WEEK;
  const valueYear = bought * effectiveHourlyRate * WORKDAYS_PER_YEAR;
  const potentialYear = draining * effectiveHourlyRate * WORKDAYS_PER_YEAR;

  let valueLine = 'Your numbers are loading…';
  if (nothingDrains) valueLine = 'Nothing in your routine drains you. Keep it that way.';
  else if (summary && bought > 0) valueLine = `≈ ${formatMoney(valueYear, currency, { decimals: 0 })} a year of your time, back in your hands.`;
  else if (summary) valueLine = `${formatMoney(potentialYear, currency, { decimals: 0 })} a year of your time goes to work that drains you.`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Time bought back: ${formatHours(perWeek)} of ${formatHours(targetWeek)} a week. Open your handoffs.`}
      style={({ pressed }) => pressed && { opacity: 0.95 }}
    >
      <HeroCard>
        <View style={styles.top}>
          <Text style={styles.label}>Time bought back</Text>
          {streak?.weeks ? (
            <View style={styles.streak}>
              <Ionicons name="flame" size={14} color={brand.apricot} />
              <Text style={styles.streakText}>
                {streak.weeks} {streak.weeks === 1 ? 'week' : 'weeks'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.ringWrap}>
          {PARTICLES.map((p, i) => (
            <Particle key={i} t={burst} {...p} />
          ))}
          <Animated.View style={[styles.ring, pulseStyle]}>
            <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
              <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.14)" strokeWidth={STROKE} fill="none" />
              <AnimatedCircle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={brand.apricot}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                animatedProps={ringProps}
                rotation={-90}
                origin={`${RING / 2}, ${RING / 2}`}
              />
              {bought > 0 ? (
                <>
                  <Circle cx={RING / 2} cy={RING / 2} r={R_IN} stroke="rgba(255,255,255,0.08)" strokeWidth={INNER_STROKE} fill="none" />
                  <AnimatedCircle
                    cx={RING / 2}
                    cy={RING / 2}
                    r={R_IN}
                    stroke={brand.mint}
                    strokeWidth={INNER_STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${C_IN} ${C_IN}`}
                    animatedProps={innerProps}
                    rotation={-90}
                    origin={`${RING / 2}, ${RING / 2}`}
                  />
                </>
              ) : null}
            </Svg>
            {nothingDrains ? (
              <>
                <Ionicons name="sunny" size={40} color={brand.apricot} />
                <Text style={styles.ringSub}>All energizing</Text>
              </>
            ) : (
              <>
                <Text style={styles.ringBig} adjustsFontSizeToFit numberOfLines={1}>
                  {summary ? formatHours(perWeek) : '–'}
                </Text>
                <Text style={styles.ringSub}>
                  {roundDraining || !draining ? `of ${formatHours(targetWeek)} a week` : 'All kept for later'}
                </Text>
              </>
            )}
          </Animated.View>
        </View>

        <Text style={styles.value}>{valueLine}</Text>
        {summary?.pastBoughtBackHours ? (
          <Text style={styles.share}>
            Since you started: {formatHours((summary.pastBoughtBackHours + bought) * WORKDAYS_PER_WEEK)} a week bought back
          </Text>
        ) : null}
        {laterHours ? (
          <Text style={styles.share}>+{formatHours(laterHours)} a day kept for the next round</Text>
        ) : null}
        {share && share.now !== share.start ? (
          <Text style={styles.share}>
            {share.now}% of your routine now energizes you (was {share.start}%)
          </Text>
        ) : null}
        {bought > 0 ? (
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: brand.apricot }]} />
            <Text style={styles.legendText}>Bought back</Text>
            <View style={[styles.legendDot, { backgroundColor: brand.mint, marginLeft: spacing.md }]} />
            <Text style={styles.legendText}>Filled {formatHours(summary?.filledHours || 0)} of {formatHours(bought)} a day</Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Draining a day</Text>
            <Text style={styles.statValue}>
              {bought > 0 ? `${formatHours(draining)} → ${formatHours(draining - bought)}` : formatHours(draining)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Handed off</Text>
            <Text style={styles.statValue}>
              {summary?.done || 0} of {(summary?.total || 0) - (summary?.later || 0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Buyback Rate</Text>
            <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
              {formatMoney(buybackRate, currency)}/hr
            </Text>
          </View>
        </View>
      </HeroCard>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.heroChip,
  },
  streakText: { color: colors.heroText, fontSize: 12, fontWeight: '700' },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md, height: RING },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center', paddingHorizontal: STROKE + 12 },
  ringBig: { color: colors.heroText, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  share: { color: colors.heroMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: spacing.xs },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.heroFaint, fontSize: 12, fontWeight: '600' },
  ringSub: { color: colors.heroMuted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  value: { color: colors.heroText, fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.heroDivider,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.heroDivider },
  statLabel: { color: colors.heroFaint, fontSize: 11, fontWeight: '600' },
  statValue: { color: colors.heroText, fontSize: 15, fontWeight: '800' },
});
