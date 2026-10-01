import { useMemo, useRef } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const FLY_DURATION = 220;

/**
 * Tinder-style deck: swipe right if an activity energizes you, left if it drains you.
 * Each card also asks the Buyback question ("could someone else do this for your rate?").
 */
export default function SwipeDeck({ items, index, rate, currency, onSwipe, onSetValue, onUndo }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const position = useRef(new Animated.ValueXY()).current;
  const crossed = useRef(false);

  const current = items[index];
  const next = items[index + 1];

  const finish = (energy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwipe(energy);
    position.setValue({ x: 0, y: 0 });
    crossed.current = false;
  };

  const flyOut = (direction) => {
    Animated.timing(position, {
      toValue: { x: direction * SCREEN_WIDTH * 1.4, y: 40 },
      duration: FLY_DURATION,
      useNativeDriver: false,
    }).start(() => finish(direction > 0 ? 'energizing' : 'draining'));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clear horizontal drags, so the Yes/No buttons on the card still work.
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
          else Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
        },
      }),
    // flyOut reads the latest onSwipe through finish; rebuild when the card changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, onSwipe]
  );

  if (!current) return null;

  const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const rateText = `${formatMoney(rate, currency)}/hr`;

  const renderBody = (item) => (
    <>
      <View style={styles.hoursPill}>
        <Ionicons name="time-outline" size={14} color={colors.muted} />
        <Text style={styles.hoursText}>{formatHours(item.hours)} a day</Text>
      </View>
      <Text style={styles.activity}>{item.activity}</Text>
      <Text style={styles.prompt}>How does it make you feel?</Text>
    </>
  );

  return (
    <View>
      <View style={styles.deck}>
        {next ? (
          <Animated.View style={[styles.card, styles.behind, { transform: [{ scale: nextScale }] }]} pointerEvents="none">
            {renderBody(next)}
          </Animated.View>
        ) : null}

        <Animated.View
          key={index}
          {...responder.panHandlers}
          style={[styles.card, { transform: [...position.getTranslateTransform(), { rotate }] }]}
          accessibilityHint="Swipe right if it energizes you, left if it drains you"
        >
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, { color: colors.success }]}>ENERGIZES</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
            <Text style={[styles.stampText, { color: colors.error }]}>DRAINS</Text>
          </Animated.View>

          {renderBody(current)}

          <View style={styles.question}>
            <Text style={styles.questionText}>Could someone else do this for {rateText} or less?</Text>
            <View style={styles.answers}>
              {[
                { key: 'low', label: 'Yes' },
                { key: 'high', label: 'No, only me' },
              ].map((o) => {
                const on = current.value === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => onSetValue(o.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.answer, on && styles.answerOn]}
                  >
                    <Text style={[styles.answerText, on && styles.answerTextOn]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => flyOut(-1)}
          accessibilityRole="button"
          accessibilityLabel="Drains me"
          style={({ pressed }) => [styles.bigButton, { borderColor: colors.error }, pressed && styles.pressed]}
        >
          <Ionicons name="battery-dead" size={26} color={colors.error} />
          <Text style={[styles.bigLabel, { color: colors.error }]}>Drains me</Text>
        </Pressable>

        <Pressable
          onPress={onUndo}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel="Undo last swipe"
          style={({ pressed }) => [styles.undo, index === 0 && { opacity: 0.3 }, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-undo" size={20} color={colors.muted} />
        </Pressable>

        <Pressable
          onPress={() => flyOut(1)}
          accessibilityRole="button"
          accessibilityLabel="Energizes me"
          style={({ pressed }) => [styles.bigButton, { borderColor: colors.success }, pressed && styles.pressed]}
        >
          <Ionicons name="flash" size={26} color={colors.success} />
          <Text style={[styles.bigLabel, { color: colors.success }]}>Energizes me</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  deck: { height: 360 },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    padding: spacing.lg,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    justifyContent: 'center',
    ...cardShadow(colors, isDark),
    shadowOpacity: isDark ? 0 : 0.1,
  },
  behind: { top: 14, bottom: -14, opacity: 0.7 },
  hoursPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  hoursText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  activity: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginTop: spacing.md },
  prompt: { fontSize: 16, color: colors.muted, marginTop: spacing.xs },
  question: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  questionText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.text },
  answers: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  answer: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  answerOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  answerText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  answerTextOn: { color: colors.onColor },
  stamp: { position: 'absolute', top: spacing.lg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 3 },
  stampLike: { left: spacing.lg, borderColor: colors.success, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: spacing.lg, borderColor: colors.error, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl },
  bigButton: {
    width: 116,
    height: 76,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surface,
  },
  bigLabel: { fontSize: 13, fontWeight: '700' },
  undo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
