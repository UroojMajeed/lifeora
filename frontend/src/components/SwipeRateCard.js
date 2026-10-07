import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MONEY_LEVELS, dollars } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.26;
const FLY_DURATION = 220;

// One short line for the picked $ level, instead of a lot of text on the card.
const MONEY_CAPTION = {
  1: 'Anyone could do it',
  2: 'Low value',
  3: 'Worth your time',
  4: 'High value',
  5: 'Only you, big money',
};

/**
 * Swipe card for rating one activity: tap how much money it makes ($ to $$$$$), then swipe right if
 * it energizes you or left if it drains you. Until a $ is picked the card stays put (a small tug
 * only) and the buttons are off, so nothing gets rated by accident.
 */
export default function SwipeRateCard({ item, nextItem, money, onMoney, onSwipe, onNeedMoney, topLeft, topRight }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const position = useRef(new Animated.ValueXY()).current;
  const crossed = useRef(false);
  const moneyRef = useRef(money);
  moneyRef.current = money;
  const ready = Boolean(money);

  // A new card always starts in the middle.
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    crossed.current = false;
  }, [item?.activity, position]);

  const springBack = () => Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();

  const flyOut = (direction) => {
    if (!moneyRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      springBack();
      onNeedMoney?.();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(position, {
      toValue: { x: direction * SCREEN_WIDTH * 1.4, y: 40 },
      duration: FLY_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipe(direction > 0 ? 'energizing' : 'draining'));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only clear sideways drags, so the $ buttons still take taps.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          // No $ yet: the card only gives a little (it can't be swiped away).
          if (!moneyRef.current) {
            position.setValue({ x: g.dx * 0.12, y: 0 });
            return;
          }
          position.setValue({ x: g.dx, y: g.dy * 0.2 });
          const past = Math.abs(g.dx) > SWIPE_THRESHOLD;
          if (past !== crossed.current) {
            crossed.current = past;
            if (past) Haptics.selectionAsync().catch(() => {});
          }
        },
        onPanResponderRelease: (_, g) => {
          if (!moneyRef.current) {
            if (Math.abs(g.dx) > 30) flyOut(g.dx > 0 ? 1 : -1); // bounces back with a nudge
            else springBack();
            return;
          }
          if (g.dx > SWIPE_THRESHOLD || g.vx > 0.9) flyOut(1);
          else if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.9) flyOut(-1);
          else springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.activity, onSwipe]
  );

  if (!item) return null;

  const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], outputRange: ['-12deg', '0deg', '12deg'] });
  const yes = position.x.interpolate({ inputRange: [20, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const no = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = position.x.interpolate({ inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], outputRange: [1, 0.94, 1], extrapolate: 'clamp' });

  return (
    <View>
      <View>
        {nextItem ? <Animated.View style={[styles.card, styles.behind, { transform: [{ scale: nextScale }] }]} pointerEvents="none" /> : null}

        <Animated.View
          {...responder.panHandlers}
          style={[styles.card, { transform: [...position.getTranslateTransform(), { rotate }] }]}
          accessibilityHint="Pick how much money it makes, then swipe right if it energizes you or left if it drains you"
        >
          <Animated.View style={[styles.stamp, styles.stampYes, { opacity: yes }]}>
            <Ionicons name="flash" size={14} color={colors.success} />
            <Text style={[styles.stampText, { color: colors.success }]}>ENERGIZES</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNo, { opacity: no }]}>
            <Ionicons name="battery-dead" size={14} color={colors.error} />
            <Text style={[styles.stampText, { color: colors.error }]}>DRAINS</Text>
          </Animated.View>

          <View style={styles.top}>
            {topLeft || <View />}
            {topRight || <View />}
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {item.activity}
          </Text>
          <View style={styles.hours}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={styles.hoursText}>{formatHours(item.hours)} a day</Text>
          </View>

          <View style={styles.moneyRow}>
            {MONEY_LEVELS.map((m) => {
              const on = money === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onMoney(m);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${m} of 5: ${MONEY_CAPTION[m]}`}
                  style={({ pressed }) => [styles.money, on && styles.moneyOn, pressed && { transform: [{ scale: 0.94 }] }]}
                >
                  <Text style={[styles.moneyText, on && styles.moneyTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                    {dollars(m)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.caption, ready && styles.captionOn]}>
            {ready ? MONEY_CAPTION[money] : 'How much money does it make?'}
          </Text>
        </Animated.View>
      </View>

      {/* Same as swiping; off until a $ is picked. */}
      <View style={[styles.controls, !ready && styles.controlsOff]}>
        <Pressable
          onPress={() => flyOut(-1)}
          accessibilityRole="button"
          accessibilityLabel="Drains me"
          accessibilityState={{ disabled: !ready }}
          style={({ pressed }) => [styles.round, { backgroundColor: colors.errorSoft }, pressed && ready && styles.pressed]}
        >
          <Ionicons name="battery-dead" size={24} color={colors.error} />
        </Pressable>
        <View style={styles.swipeHint}>
          <Ionicons name="arrow-back" size={14} color={colors.muted} />
          <Text style={styles.swipeText}>{ready ? 'swipe' : 'pick $ first'}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.muted} />
        </View>
        <Pressable
          onPress={() => flyOut(1)}
          accessibilityRole="button"
          accessibilityLabel="Energizes me"
          accessibilityState={{ disabled: !ready }}
          style={({ pressed }) => [styles.round, { backgroundColor: colors.successSoft }, pressed && ready && styles.pressed]}
        >
          <Ionicons name="flash" size={24} color={colors.success} />
        </Pressable>
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.error }]}>Drains me</Text>
        <Text style={[styles.legendText, { color: colors.success }]}>Energizes me</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  behind: { position: 'absolute', left: 10, right: 10, top: -8, bottom: 8, opacity: 0.55 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4, marginTop: 2 },
  hours: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
  hoursText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  moneyRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: spacing.md },
  money: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  moneyOn: { backgroundColor: colors.primary, borderColor: colors.primary, transform: [{ scale: 1.08 }] },
  moneyText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  moneyTextOn: { color: colors.onColor },
  caption: { fontSize: 13, fontWeight: '600', color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  captionOn: { color: colors.primaryDark, fontWeight: '800' },
  stamp: {
    position: 'absolute',
    top: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2.5,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  stampYes: { left: 12, borderColor: colors.success, transform: [{ rotate: '-8deg' }] },
  stampNo: { right: 12, borderColor: colors.error, transform: [{ rotate: '8deg' }] },
  stampText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingHorizontal: spacing.lg },
  controlsOff: { opacity: 0.4 },
  round: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.92 }] },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swipeText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginTop: 4 },
  legendText: { fontSize: 12, fontWeight: '700', width: 92, textAlign: 'center' },
});
