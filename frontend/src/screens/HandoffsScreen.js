import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import HandoffRow from '../components/HandoffRow';
import ErrorBanner from '../components/ErrorBanner';
import Button from '../components/Button';
import { Card } from '../components/Card';
import { useHandoffs } from '../context/HandoffsContext';
import { DRIP } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const SECTIONS = [
  { key: 'delegation', hint: 'Start here: the cheapest hours to buy back.' },
  { key: 'replacement', hint: 'Record a playbook first, then hand them over.' },
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

  const open = (item) => navigation.navigate('HandoffDetail', { activity: item.activity });

  return (
    <Screen edges={['top']}>
      <PageHeader
        eyebrow="Transfer"
        title="Your handoffs"
        subtitle="Hand off what drains you, one task at a time. Every task you hand off buys those hours back."
      />

      {summary && summary.total ? (
        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryBig}>
              {formatHours(summary.boughtBackHours)}
              <Text style={styles.summaryOf}> of {formatHours(summary.drainingHours)} a day bought back</Text>
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${summary.percent}%` }]} />
          </View>
          <Text style={styles.summaryMeta}>
            {summary.done} of {summary.total} handed off
            {summary.inProgressHours ? ` · ${formatHours(summary.inProgressHours)} on the way` : ''}
          </Text>
        </Card>
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
          <Text style={styles.emptyBody}>Every activity in your day energizes you. Keep protecting that.</Text>
        </View>
      ) : null}

      {SECTIONS.map(({ key, hint }) => {
        const items = handoffs.filter((h) => h.quadrant === key);
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
    </Screen>
  );
}

const makeStyles = (colors) => ({
  summary: { marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline' },
  summaryBig: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  summaryOf: { fontSize: 14, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.success },
  summaryMeta: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
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
