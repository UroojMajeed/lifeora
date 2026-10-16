import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** The audit's totals, big and clear: how many tasks you've added, and how many hours a day they take. */
export default function AuditStats({ items = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const hours = items.reduce((t, it) => t + (it.hours || 0), 0);
  const tiles = [
    { icon: 'list', value: String(items.length), label: items.length === 1 ? 'task added' : 'tasks added', tint: colors.primary },
    { icon: 'time', value: formatHours(hours), label: 'a day', tint: colors.accentText },
  ];

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={`${items.length} tasks added, ${formatHours(hours)} a day`}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.tile}>
          <View style={styles.top}>
            <Text style={[styles.value, { color: t.tint }]}>{t.value}</Text>
            <Ionicons name={t.icon} size={16} color={t.tint} />
          </View>
          <Text style={styles.label}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  row: { flexDirection: 'row', gap: spacing.sm + 2 },
  tile: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
});
