import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import DripGraph from './DripGraph';
import ZoneTitle from './ZoneTitle';
import { DRIP } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

// The four quadrants in the book's layout, for the small icon on the row.
const MINI = [
  ['replacement', 'production'],
  ['delegation', 'investment'],
];

/**
 * The DRIP Matrix on Home as one compact row ("You live in Replacement"). Tapping it opens the full
 * graph right here (the same cream graph as onboarding); tapping again folds it away.
 * `items` is the routine as it is now; `summary` is summarizeSchedule() of it.
 */
export default function DripRow({ items, summary, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
    setSelected(null);
  };

  return (
    <Card style={[styles.card, style]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Your DRIP Matrix. Tap to show the graph."
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.mini}>
          {MINI.map((row) => (
            <View key={row[0]} style={styles.miniRow}>
              {row.map((key) => (
                <View
                  key={key}
                  style={[styles.miniCell, { backgroundColor: colors[DRIP[key].color] }, summary?.dominant !== key && styles.miniFaint]}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>Your DRIP Matrix</Text>
          {summary?.dominant ? <ZoneTitle summary={summary} style={styles.zone} /> : <Text style={styles.zone}>Rate your routine to see it</Text>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={styles.graph}>
          <DripGraph items={items} selected={selected} onSelect={setSelected} height={280} />
        </View>
      ) : null}
    </Card>
  );
}

const CELL = 11;

const makeStyles = (colors) => ({
  card: { paddingVertical: spacing.sm + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  mini: { gap: 2 },
  miniRow: { flexDirection: 'row', gap: 2 },
  miniCell: { width: CELL, height: CELL, borderRadius: 3 },
  miniFaint: { opacity: 0.25 },
  text: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  zone: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },
  graph: { marginTop: spacing.md },
});
