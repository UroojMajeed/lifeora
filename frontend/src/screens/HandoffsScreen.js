import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import HandoffRow, { rowStatus } from '../components/HandoffRow';
import CardHeader, { homeCard } from '../components/CardHeader';
import ErrorBanner from '../components/ErrorBanner';
import Button from '../components/Button';
import { useHandoffs } from '../context/HandoffsContext';
import { DRIP } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const SECTIONS = [
  { key: 'delegation', hint: 'Start here: the cheapest hours to buy back.' },
  { key: 'replacement', hint: 'Write the brief first, then hand them over.' },
];

export default function HandoffsScreen({ navigation }) {
  const { handoffs, summary, loading, error, refresh } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const open = (item) => navigation.navigate('HandoffJourney', { activity: item.activity });
  const count = (state) => handoffs.filter((x) => rowStatus(x) === state).length;
  const [doneN, goingN, todoN] = [count('done'), count('going'), count('todo')];

  return (
    <Screen edges={['top']} tinted="dawn">
      <PageHeader
        eyebrow="Transfer"
        title="Your handoffs"
        subtitle="Hand off what drains you, one task at a time."
      />

      {summary && summary.total ? (
        <View style={styles.summary}>
          <CardHeader
            icon="trending-up"
            iconColor={colors.accentText}
            title="Hours Bought Back"
            sub={`${formatHours(summary.boughtBackHours)} of ${formatHours(summary.drainingHours)} a day`}
          />
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${summary.percent}%` }]} />
          </View>
          <View style={styles.chips}>
            {[
              [doneN, 'handed off', 'checkmark-circle', colors.success],
              [goingN, 'on the way', 'swap-horizontal', colors.warm],
              [todoN, 'to go', 'ellipse-outline', colors.muted],
            ]
              .filter(([n]) => n)
              .map(([n, label, icon, color]) => (
                <View key={label} style={styles.chip}>
                  <Ionicons name={icon} size={13} color={color} />
                  <Text style={styles.chipText}>
                    {n} {label}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      ) : null}

      {loading && !handoffs.length ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {error && !handoffs.length ? (
        <>
          <ErrorBanner message={error} />
          <Button title="Try again" variant="secondary" onPress={refresh} style={styles.retry} />
        </>
      ) : null}

      {!loading && !error && summary && !summary.total ? (
        <View style={styles.empty}>
          <Ionicons name="sunny-outline" size={40} color={colors.success} />
          <Text style={styles.emptyTitle}>Nothing drains you</Text>
          <Text style={styles.emptyBody}>Every task in your routine energizes you. Keep protecting that.</Text>
        </View>
      ) : null}

      {SECTIONS.map(({ key, hint }) => {
        const items = handoffs.filter((h) => h.quadrant === key && h.status !== 'later');
        if (!items.length) return null;
        const q = DRIP[key];
        return (
          <View key={key} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.dot, { backgroundColor: colors[q.color] }]} />
              <Text style={[styles.sectionTitle, { color: colors[q.color] }]}>{q.name}</Text>
            </View>
            <Text style={styles.sectionHint}>{hint}</Text>
            <View style={styles.list}>
              {items.map((item) => (
                <HandoffRow key={item.activity} item={item} onPress={() => open(item)} />
              ))}
            </View>
          </View>
        );
      })}
      {handoffs.some((h) => h.status === 'later') ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>Next round</Text>
          </View>
          <Text style={styles.sectionHint}>Kept for later, so they don't hold up this round.</Text>
          <View style={styles.list}>
            {handoffs
              .filter((h) => h.status === 'later')
              .map((item) => (
                <HandoffRow key={item.activity} item={item} onPress={() => open(item)} />
              ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors, isDark) => ({
  summary: { ...homeCard(colors, isDark), backgroundColor: colors.tintMove, marginBottom: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.calmTrack, overflow: 'hidden', marginTop: spacing.md },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm + 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  loader: { marginTop: spacing.xl },
  retry: { marginTop: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptyBody: { fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  section: { marginTop: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  sectionHint: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
});
