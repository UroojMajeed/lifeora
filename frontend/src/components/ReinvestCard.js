import { useEffect, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { FILL_KINDS, fillIdeas } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const KINDS = ['production', 'investment'];
const ICONS = { production: 'briefcase', investment: 'heart' };
const SHORT = { production: 'business', investment: 'you' }; // the word inside the bar
const h = (n) => `${Math.round(n * 100) / 100} h`;

// An icon for an idea, by what it's about (a sparkle when nothing matches).
const IDEA_ICONS = [
  [/exercise|gym|health|walk|run|yoga|sport/i, 'barbell'],
  [/family|kids|home/i, 'home'],
  [/learn|read|course|study/i, 'book'],
  [/rest|recover|sleep|nap/i, 'bed'],
  [/think|plan|strateg|vision/i, 'bulb'],
  [/mentor|teach|coach|program|workshop|speak/i, 'school'],
  [/content|creat|writ|brand|design|creative/i, 'color-palette'],
  [/client|customer|sales|partner|deal/i, 'people'],
  [/product|idea|offer|build/i, 'rocket'],
  [/rate|price|money|revenue/i, 'cash'],
];
const iconFor = (name) => (IDEA_ICONS.find(([re]) => re.test(name)) || [null, 'sparkles'])[1];

/** A kind word for where you are: nothing yet, some, or all of it reinvested. */
function cheerLine(used, allUsed) {
  if (allUsed) return 'Every freed hour has a new job';
  if (used) return 'Great start. Keep going!';
  return 'Your freed time is waiting for a new job';
}

/** Hours you can give one fill: half-hour steps up to what's left, and "all of it". */
function hourChoices(left) {
  const list = [0.5, 1, 1.5, 2].filter((x) => x <= left + 0.001);
  if (left >= 0.25 && !list.some((x) => Math.abs(x - left) < 0.001)) list.push(Math.round(left * 100) / 100);
  return list;
}

/**
 * Reinvest (the book's Fill): the hours you bought back get a new job. How much is free and how much
 * is used, two ways to spend it (grow the business / invest in yourself), ideas for each, and the hours. `free` is hours a day bought back.
 */
export default function ReinvestCard({ free, fills = [], role, schedule = [], onSave, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [kind, setKind] = useState(null);
  const [idea, setIdea] = useState(null);
  const [hours, setHours] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cheer, setCheer] = useState(null); // { activity, hours, kind } just reinvested
  useEffect(() => {
    if (!cheer) return undefined;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);

  const used = fills.reduce((t, f) => t + f.hours, 0);
  const left = Math.max(0, Math.round((free - used) * 100) / 100);
  const allUsed = left < 0.25;
  const color = (k) => colors.chart[k];

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const pickKind = (k) => {
    Haptics.selectionAsync().catch(() => {});
    animate();
    setKind((cur) => (cur === k ? null : k));
    setIdea(null);
    setHours(null);
  };
  const pickIdea = (name) => {
    Haptics.selectionAsync().catch(() => {});
    animate();
    setIdea(name);
    const choices = hourChoices(left);
    setHours(choices.length === 1 ? choices[0] : null);
  };

  const save = async (next) => {
    setSaving(true);
    try {
      await onSave(next);
      return true;
    } finally {
      setSaving(false);
    }
  };
  const add = async () => {
    if (!kind || !idea || !hours) return;
    const ok = await save([...fills, { activity: idea, hours, quadrant: kind, when: null }]).catch(() => false);
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    animate();
    setCheer({ activity: idea, hours, kind });
    setKind(null);
    setIdea(null);
    setHours(null);
  };

  const ideas = kind ? fillIdeas(kind, { role, schedule, fills }).slice(0, 6) : [];

  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <Ionicons name="leaf" size={16} color={colors.chart.production} />
        </View>
        <View style={styles.headMain}>
          <Text style={styles.title}>Reinvest your time</Text>
          <Text style={styles.sub}>{cheerLine(used, allUsed)}</Text>
        </View>
        {saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      {/* How much of the freed time has a new job, said inside the bar. */}
      <View style={styles.track}>
        {KINDS.map((k) => {
          const part = fills.filter((x) => x.quadrant === k).reduce((t, x) => t + x.hours, 0);
          return part ? (
            <View key={k} style={[styles.part, { flex: part, backgroundColor: color(k) }]}>
              <Ionicons name={ICONS[k]} size={12} color="#FFFFFF" />
              <Text style={styles.partText} numberOfLines={1}>
                {h(part)} {SHORT[k]}
              </Text>
            </View>
          ) : null;
        })}
        {left > 0 ? (
          <View style={[styles.part, { flex: left }]}>
            <Text style={styles.freeText} numberOfLines={1}>
              {h(left)} free
            </Text>
          </View>
        ) : null}
      </View>

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


      {!allUsed ? (
        <>
          {/* Two ways to spend it. */}
          <View style={styles.kinds}>
            {KINDS.map((k) => {
              const on = kind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => pickKind(k)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.kind, on && { borderColor: color(k), backgroundColor: `${color(k)}14` }, pressed && styles.pressed]}
                >
                  <View style={[styles.kindIcon, { backgroundColor: `${color(k)}1F` }]}>
                    <Ionicons name={ICONS[k]} size={18} color={color(k)} />
                  </View>
                  <Text style={styles.kindTitle}>{FILL_KINDS[k].title}</Text>
                  <Text style={styles.kindSub}>{k === 'production' ? 'More of the work you love that makes money' : 'Time for your health, family and growth'}</Text>
                </Pressable>
              );
            })}
          </View>

          {kind ? (
            <Animated.View key={kind} entering={FadeIn.duration(250)}>
              <Text style={styles.label}>Spend it on</Text>
              <View style={styles.chips}>
                {ideas.map(({ name }) => {
                  const on = idea === name;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => pickIdea(name)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, styles.ideaChip, on && { backgroundColor: color(kind), borderColor: color(kind) }]}
                    >
                      <Ionicons name={iconFor(name)} size={14} color={on ? '#FFFFFF' : color(kind)} />
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {idea ? (
                <Animated.View entering={FadeIn.duration(250)}>
                  <Text style={styles.label}>How long a day</Text>
                  <View style={styles.chips}>
                    {hourChoices(left).map((x) => {
                      const on = hours === x;
                      return (
                        <Pressable
                          key={x}
                          onPress={() => setHours(x)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[styles.chip, on && { backgroundColor: color(kind), borderColor: color(kind) }]}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{h(x)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Button title="Reinvest" icon="checkmark" onPress={add} disabled={!hours} loading={saving} style={styles.button} />
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  pressed: { opacity: 0.8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  headIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  headMain: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 1 },
  track: { flexDirection: 'row', gap: 2, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.surfaceAlt, marginTop: spacing.md },
  part: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, minWidth: 92 }, // wide enough for its words
  partText: { flexShrink: 1, fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  freeText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.muted },
  kinds: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  kind: { flex: 1, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  kindIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  kindTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  kindSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: spacing.md, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextOn: { color: '#FFFFFF', fontWeight: '800' },
  button: { marginTop: spacing.md },
  ideaChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // The cheer after each reinvest.
  cheer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm + 4, padding: spacing.sm + 2, borderRadius: radius.md },
  cheerIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cheerText: { flex: 1, fontSize: 13, color: colors.text },
  cheerStrong: { fontWeight: '800' },
  cheerEmoji: { fontSize: 20 },
});
