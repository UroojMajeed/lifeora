import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import ProgressRing from './ProgressRing';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** Home's progress card: how many of the draining hours have been bought back so far. */
export default function BoughtBackCard({ summary, onPress, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  if (!summary || !summary.total) return null;

  const { boughtBackHours, drainingHours, percent, boughtBackPerWeek, done, total } = summary;
  const started = boughtBackHours > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hours bought back: ${formatHours(boughtBackHours)} of ${formatHours(drainingHours)} a day. Open your handoffs.`}
      style={({ pressed }) => [style, pressed && { opacity: 0.9 }]}
    >
      <Card>
        <View style={styles.row}>
          <ProgressRing progress={percent / 100} size={92} stroke={10}>
            <Text style={styles.percent}>{percent}%</Text>
          </ProgressRing>
          <View style={styles.text}>
            <Text style={styles.label}>Hours bought back</Text>
            <Text style={styles.big}>
              {formatHours(boughtBackHours)}
              <Text style={styles.of}> of {formatHours(drainingHours)} a day</Text>
            </Text>
            <Text style={styles.body}>
              {started
                ? `About ${formatHours(boughtBackPerWeek)} a week back for what matters.`
                : 'Hand off your first draining task to start the count.'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.count}>
            {done} of {total} handed off
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Your handoffs</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  percent: { fontSize: 18, fontWeight: '800', color: colors.text },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  big: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  of: { fontSize: 15, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  count: { fontSize: 13, fontWeight: '600', color: colors.muted },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
