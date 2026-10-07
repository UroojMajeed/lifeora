import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MONEY_LEVELS, dollars, timeText } from '../constants/content';
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
          style={[styles.cardShell, { transform: [...position.getTranslateTransform(), { rotate }] }]}
          accessibilityHint="Pick how much money it makes, then swipe right if it energizes you or left if it drains you"
        >
          {/* A soft tint: white into aqua (dark: surface into a deeper surface). */}
          <LinearGradient colors={[colors.surface, colors.surfaceAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <Animated.View style={[styles.stamp, styles.stampYes, { opacity: yes }]}>
              <Ionicons name="flash" size={13} color={colors.success} />
              <Text style={[styles.stampText, { color: colors.success }]}>ENERGIZES</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampNo, { opacity: no }]}>
              <Ionicons name="battery-dead" size={13} color={colors.error} />
              <Text style={[styles.stampText, { color: colors.error }]}>DRAINS</Text>
            </Animated.View>

            <View style={styles.top}>
              {topLeft || <View />}
              {topRight || <View />}
            </View>

            <Text style={styles.name} numberOfLines={1}>
              {item.activity}
            </Text>
            <Text style={styles.hoursText}>{timeText(item)}</Text>

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

            {/* Same as swiping; off until a $ is picked. */}
            <View style={[styles.controls, !ready && styles.controlsOff]}>
              <Pressable
                onPress={() => flyOut(-1)}
                accessibilityRole="button"
                accessibilityLabel="Drains me"
                accessibilityState={{ disabled: !ready }}
                style={({ pressed }) => [styles.energy, { backgroundColor: colors.errorSoft }, pressed && ready && styles.pressed]}
              >
                <Ionicons name="arrow-back" size={14} color={colors.error} />
                <Ionicons name="battery-dead" size={16} color={colors.error} />
                <Text style={[styles.energyText, { color: colors.error }]}>Drains me</Text>
              </Pressable>
              <Pressable
                onPress={() => flyOut(1)}
                accessibilityRole="button"
                accessibilityLabel="Energizes me"
                accessibilityState={{ disabled: !ready }}
                style={({ pressed }) => [styles.energy, { backgroundColor: colors.successSoft }, pressed && ready && styles.pressed]}
              >
                <Ionicons name="flash" size={16} color={colors.success} />
                <Text style={[styles.energyText, { color: colors.success }]}>Energizes me</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.success} />
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  // The shell carries the shadow; the gradient inside carries the tint and rounded corners.
  cardShell: { borderRadius: radius.lg, ...cardShadow(colors, isDark) },
  card: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md - 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    backgroundColor: colors.surface,
  },
  behind: { position: 'absolute', left: 10, right: 10, top: -6, bottom: 6, opacity: 0.5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 2 },
  hoursText: { fontSize: 13, fontWeight: '600', color: colors.muted, textAlign: 'center', marginTop: 2 },
  moneyRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: spacing.sm + 4 },
  money: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  moneyOn: { backgroundColor: colors.primary, borderColor: colors.primary, transform: [{ scale: 1.06 }] },
  moneyText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  moneyTextOn: { color: colors.onColor },
  caption: { fontSize: 13, fontWeight: '600', color: colors.muted, textAlign: 'center', marginTop: 6 },
  captionOn: { color: colors.primaryDark, fontWeight: '800' },
  stamp: {
    position: 'absolute',
    top: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  stampYes: { left: 10, borderColor: colors.success, transform: [{ rotate: '-8deg' }] },
  stampNo: { right: 10, borderColor: colors.error, transform: [{ rotate: '8deg' }] },
  stampText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm + 4 },
  controlsOff: { opacity: 0.4 },
  energy: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.pill },
  energyText: { fontSize: 14, fontWeight: '800' },
  pressed: { transform: [{ scale: 0.96 }] },
});
