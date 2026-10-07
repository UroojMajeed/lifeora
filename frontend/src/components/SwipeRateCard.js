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

/**
 * Swipe card for rating one activity: tap how much money it makes ($ to $$$$$), then swipe right if
 * it energizes you or left if it drains you. Swiping before picking $ bounces back with a nudge.
 */
export default function SwipeRateCard({ item, nextItem, money, onMoney, onSwipe, onNeedMoney, topRight, meta }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const position = useRef(new Animated.ValueXY()).current;
  const crossed = useRef(false);
  const moneyRef = useRef(money);
  moneyRef.current = money;

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
    Animated.timing(position, {
      toValue: { x: direction * SCREEN_WIDTH * 1.4, y: 40 },
      duration: FLY_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipe(direction > 0 ? 'energizing' : 'draining'));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only clear sideways drags, so the $ buttons on the card still take taps.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          position.setValue({ x: g.dx, y: g.dy * 0.2 });
          const past = Math.abs(g.dx) > SWIPE_THRESHOLD;
          if (past !== crossed.current) {
            crossed.current = past;
            if (past) Haptics.selectionAsync().catch(() => {});
          }
        },
        onPanResponderRelease: (_, g) => {
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
  const yes = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const no = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = position.x.interpolate({ inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });

  return (
    <View>
      <View style={styles.deck}>
        {nextItem ? (
          <Animated.View style={[styles.card, styles.behind, { transform: [{ scale: nextScale }] }]} pointerEvents="none">
            <Text style={styles.name} numberOfLines={1}>
              {nextItem.activity}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View
          {...responder.panHandlers}
          style={[styles.card, { transform: [...position.getTranslateTransform(), { rotate }] }]}
          accessibilityHint="Pick how much money it makes, then swipe right if it energizes you or left if it drains you"
        >
          <Animated.View style={[styles.stamp, styles.stampYes, { opacity: yes }]}>
            <Text style={[styles.stampText, { color: colors.success }]}>ENERGIZES</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNo, { opacity: no }]}>
            <Text style={[styles.stampText, { color: colors.error }]}>DRAINS</Text>
          </Animated.View>

          <View style={styles.top}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.activity}
              </Text>
              <Text style={styles.meta}>
                {formatHours(item.hours)} a day{meta ? ` · ${meta}` : ''}
              </Text>
            </View>
            {topRight}
          </View>

          <Text style={styles.question}>How much money does it make?</Text>
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
                  accessibilityLabel={`${m} of 5`}
                  style={({ pressed }) => [styles.money, on && styles.moneyOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.moneyText, on && styles.moneyTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                    {dollars(m)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.scale}>
            <Text style={styles.scaleText}>Anyone could do it</Text>
            <Text style={styles.scaleText}>Only you, makes money</Text>
          </View>

          <View style={styles.swipeHint}>
            <Ionicons name="arrow-back" size={14} color={colors.error} />
            <Text style={styles.swipeText}>
              {money ? 'Swipe: drains me · energizes me' : 'Pick the $ first, then swipe'}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.success} />
          </View>
        </Animated.View>
      </View>

      {/* Buttons do the same as swiping (and work with screen readers). */}
      <View style={styles.controls}>
        <Pressable
          onPress={() => flyOut(-1)}
          accessibilityRole="button"
          accessibilityLabel="Drains me"
          style={({ pressed }) => [styles.control, { backgroundColor: colors.errorSoft }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="battery-dead" size={18} color={colors.error} />
          <Text style={[styles.controlText, { color: colors.error }]}>Drains me</Text>
        </Pressable>
        <Pressable
          onPress={() => flyOut(1)}
          accessibilityRole="button"
          accessibilityLabel="Energizes me"
          style={({ pressed }) => [styles.control, { backgroundColor: colors.successSoft }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="flash" size={18} color={colors.success} />
          <Text style={[styles.controlText, { color: colors.success }]}>Energizes me</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  deck: { minHeight: 196 },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  behind: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 19, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  question: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  moneyRow: { flexDirection: 'row', gap: 6 },
  money: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moneyOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  moneyText: { fontSize: 15, fontWeight: '800', color: colors.text },
  moneyTextOn: { color: colors.onColor },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleText: { fontSize: 11, color: colors.muted },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md },
  swipeText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  stamp: { position: 'absolute', top: 14, zIndex: 2, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2.5, borderRadius: 8 },
  stampYes: { left: 14, borderColor: colors.success, transform: [{ rotate: '-10deg' }] },
  stampNo: { right: 14, borderColor: colors.error, transform: [{ rotate: '10deg' }] },
  stampText: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  control: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md },
  controlText: { fontSize: 14, fontWeight: '800' },
});
