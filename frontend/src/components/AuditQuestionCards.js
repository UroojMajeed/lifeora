import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, MONEY_CAPTION, MONEY_LEVELS, dollars, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const short = (h) => (h < 1 ? `${h * 60}m` : `${h}h`);
const spoken = (h) => (h < 1 ? `${h * 60} minutes` : `${h} ${h === 1 ? 'hour' : 'hours'}`);
const ENERGY = [
  { key: 'draining', label: 'Drains', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes', icon: 'flash', tone: 'success' },
];

/**
 * The add-a-task questions as three cards, one open at a time: how long it takes a day, what it pays,
 * how it feels. An answered card folds to one line with its answer and a tick; tapping a card's
 * header opens it (or closes it when it's the open one). `item` is the task so far, `open` the open
 * card ('hours' | 'money' | 'energy' | null), `onOpen(field)` opens one, `onChange(patch)` sets an answer.
 */
export default function AuditQuestionCards({ item, open, onOpen, onChange }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const usual = usualHours(item.activity);
  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(patch);
  };

  const feel = ENERGY.find((e) => e.key === item.energy);
  const cards = [
    {
      key: 'hours',
      icon: 'time-outline',
      iconColor: colors.primary,
      tile: colors.primarySoft,
      question: 'How long, a day',
      answer: item.hours ? short(item.hours) : null,
      spokenAnswer: item.hours ? spoken(item.hours) : null,
      answerColor: colors.primary,
    },
    {
      key: 'money',
      icon: 'cash-outline',
      iconColor: colors.accentText,
      tile: colors.accentSoft,
      question: 'What it pays',
      answer: item.money ? `${dollars(item.money)} · ${MONEY_CAPTION[item.money]}` : null,
      spokenAnswer: item.money ? `${dollars(item.money)}, ${MONEY_CAPTION[item.money]}` : null,
      answerColor: colors.accentText,
    },
    {
      key: 'energy',
      icon: feel ? feel.icon : 'flash',
      iconColor: feel ? colors[feel.tone] : colors.success,
      tile: feel?.tone === 'error' ? colors.errorSoft : colors.successSoft,
      question: 'How it feels',
      answer: feel ? feel.label : null,
      spokenAnswer: feel ? feel.label : null,
      answerColor: feel ? colors[feel.tone] : colors.text,
    },
  ];

  const options = (key) => {
    if (key === 'hours') {
      return (
        <View style={styles.wrap}>
          {HOUR_OPTIONS.map((h) => {
            const on = h === item.hours;
            const hint = !item.hours && h === usual;
            return (
              <Pressable
                key={h}
                onPress={() => pick({ hours: h, per: 'day' })}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${spoken(h)} a day`}
                hitSlop={4}
                style={[styles.pill, on && styles.hourOn, hint && styles.hint]}
              >
                <Text style={[styles.pillText, on && styles.textOn]}>{short(h)}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }
    if (key === 'money') {
      return (
        <View>
          {/* Fills like a rating up to your pick. */}
          <View style={styles.row}>
            {MONEY_LEVELS.map((m) => {
              const on = item.money === m;
              const under = Boolean(item.money) && m < item.money;
              return (
                <Pressable
                  key={m}
                  onPress={() => pick({ money: m })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${dollars(m)}: ${MONEY_CAPTION[m]}`}
                  hitSlop={4}
                  style={[styles.pill, styles.coin, under && styles.coinUnder, on && styles.coinOn]}
                >
                  {on ? <LinearGradient colors={colors.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} /> : null}
                  <Text style={[styles.coinText, on && styles.coinTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                    {dollars(m)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.caption, !item.money && styles.captionIdle]}>{item.money ? MONEY_CAPTION[item.money] : 'Tap to rate'}</Text>
        </View>
      );
    }
    return (
      <View style={styles.row}>
        {ENERGY.map((e) => {
          const on = item.energy === e.key;
          return (
            <Pressable
              key={e.key}
              onPress={() => pick({ energy: e.key })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={e.key === 'draining' ? 'Drains me' : 'Energizes me'}
              hitSlop={4}
              style={[styles.pill, styles.feel, { borderColor: colors[e.tone] }, on && { backgroundColor: colors[e.tone] }]}
            >
              <Ionicons name={e.icon} size={15} color={on ? colors.onColor : colors[e.tone]} />
              <Text style={[styles.pillText, { color: on ? colors.onColor : colors[e.tone] }]}>{e.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.list}>
      {cards.map((c) => {
        const isOpen = open === c.key;
        const answered = Boolean(c.answer);
        return (
          <View key={c.key} style={[styles.card, answered && !isOpen && styles.cardDone, isOpen && styles.cardOpen]}>
            <Pressable
              onPress={() => onOpen(isOpen ? null : c.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${c.question}: ${c.spokenAnswer || 'not answered'}`}
              hitSlop={6}
              style={styles.head}
            >
              <View style={[styles.tile, { backgroundColor: c.tile }]}>
                <Ionicons name={c.icon} size={16} color={c.iconColor} />
              </View>
              <Text style={styles.question} numberOfLines={1}>
                {c.question}
              </Text>
              {answered && !isOpen ? (
                <>
                  <Text style={[styles.answer, { color: c.answerColor }]} numberOfLines={1}>
                    {c.answer}
                  </Text>
                  <View style={styles.tick}>
                    <Ionicons name="checkmark" size={12} color={colors.onColor} />
                  </View>
                </>
              ) : null}
            </Pressable>
            {isOpen ? options(c.key) : null}
          </View>
        );
      })}
    </View>
  );
}

// Cards 8 apart; inside, a 30 tile, a 14 question and a 13 answer. Options: 36-tall pills
// (48 touch areas with hitSlop), the time pills wrapping onto two lines.
const makeStyles = (colors, isDark) => ({
  list: { gap: spacing.sm },
  card: { gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardDone: { borderColor: colors.primary },
  cardOpen: { borderWidth: 2, borderColor: colors.primary, padding: 11, ...cardShadow(colors, isDark) },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tile: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  question: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  answer: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  tick: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  pill: { height: 36, minWidth: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: colors.text },
  textOn: { color: colors.onColor, fontWeight: '800' },
  hourOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  hint: { borderStyle: 'dashed', borderColor: colors.primary },
  // Pay
  coin: { flex: 1, minWidth: 0, paddingHorizontal: 2, overflow: 'hidden', borderColor: colors.goldLine },
  coinUnder: { borderColor: colors.gold[0], backgroundColor: colors.accentSoft },
  coinOn: { borderColor: colors.gold[1] },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coinText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: colors.accentText },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  caption: { marginTop: spacing.sm, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.accentText },
  captionIdle: { color: colors.muted },
  // Feel
  feel: { flex: 1, flexDirection: 'row', gap: 5 },
});
