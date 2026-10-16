import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** The audit's totals in one slim bar: how many tasks you've added, and how many hours a day they take. */
export default function AuditStats({ items = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const hours = items.reduce((t, it) => t + (it.hours || 0), 0);

  return (
    <View style={[styles.bar, style]} accessible accessibilityLabel={`${items.length} tasks, ${formatHours(hours)} a day`}>
      <Ionicons name="list" size={14} color={colors.primary} />
      <Text style={styles.text}>
        <Text style={styles.value}>{items.length}</Text> {items.length === 1 ? 'task' : 'tasks'}
      </Text>
      <Text style={styles.dot}>·</Text>
      <Ionicons name="time-outline" size={14} color={colors.primary} />
      <Text style={styles.text}>
        <Text style={styles.value}>{formatHours(hours)}</Text> a day
      </Text>
    </View>
  );
}

const makeStyles = (colors) => ({
  bar: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  text: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  value: { fontWeight: '800' },
  dot: { fontSize: 13, color: colors.primaryDark, marginHorizontal: 2 },
});
