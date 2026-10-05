import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { LOOP_STEPS } from '../constants/home';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** The book's Buyback Loop as three steps, showing which one you're on. `status` comes from loopStatus(). */
export default function LoopTracker({ status, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const current = LOOP_STEPS.find((s) => status[s.key] === 'current');

  return (
    <Card style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>Your Buyback Loop</Text>
        {current ? <Text style={styles.now}>Now: {current.label}</Text> : null}
      </View>
      <View style={styles.row} accessible accessibilityLabel={`Buyback Loop. Current step: ${current?.label || 'none'}`}>
        {LOOP_STEPS.map((step, i) => {
          const s = status[step.key];
          return (
            <Fragment key={step.key}>
              {i > 0 ? (
                <View style={[styles.line, status[LOOP_STEPS[i - 1].key] === 'done' && styles.lineOn]} />
              ) : null}
              <View style={styles.step}>
                <View style={[styles.node, s === 'done' && styles.nodeDone, s === 'current' && styles.nodeCurrent]}>
                  {s === 'done' ? <Ionicons name="checkmark" size={16} color={colors.onColor} /> : null}
                  {s === 'current' ? <View style={styles.spark} /> : null}
                </View>
                <Text style={[styles.label, s === 'next' && styles.labelNext]}>{step.label}</Text>
                <Text style={styles.caption} numberOfLines={2}>
                  {step.caption}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
    </Card>
  );
}

const NODE = 30;

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  title: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  now: { fontSize: 13, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { width: 88, alignItems: 'center' },
  line: { flex: 1, height: 2, marginTop: NODE / 2 - 1, backgroundColor: colors.border, borderRadius: 1 },
  lineOn: { backgroundColor: colors.primary },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nodeDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  nodeCurrent: { borderColor: colors.primary, borderWidth: 3 },
  spark: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  label: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  labelNext: { color: colors.muted },
  caption: { fontSize: 11, lineHeight: 15, color: colors.muted, textAlign: 'center', marginTop: 2 },
});
