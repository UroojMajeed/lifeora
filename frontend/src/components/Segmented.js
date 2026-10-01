import { Pressable, Text, View } from 'react-native';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius } from '../theme';

/** Two-or-more option toggle. Each option can name a theme color for its highlight. */
export default function Segmented({ options, value, onChange, accessibilityLabel }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.option, selected && { backgroundColor: colors[o.color || 'primary'] }]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: { flex: 1, minHeight: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  labelSelected: { color: colors.onColor },
});
