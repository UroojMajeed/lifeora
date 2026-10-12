import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOOP_STEPS } from '../constants/home';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const ICONS = { audit: 'search', transfer: 'hand-left', fill: 'sunny' };
const ICON = 26;

/**
 * The book's Buyback Loop (Audit → Transfer → Fill) as three pills, the same look as the journey's
 * steps, so Home reads as the road continuing. Done steps get a check, the current one is lit.
 * `status` comes from loopStatus().
 */
export default function LoopPills({ status, round = 1, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const current = LOOP_STEPS.find((s) => status[s.key] === 'current');

  return (
    <View style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>Buyback Loop</Text>
        <Text style={styles.round}>Round {round}</Text>
      </View>
      <View style={styles.row} accessible accessibilityLabel={`Buyback Loop, round ${round}. Now: ${current?.label || 'complete'}.`}>
        {LOOP_STEPS.map((step, i) => {
          const s = status[step.key];
          const lit = s === 'done' || s === 'current';
          return (
            <Fragment key={step.key}>
              {i > 0 ? <View style={[styles.line, status[LOOP_STEPS[i - 1].key] === 'done' && styles.lineOn]} /> : null}
              <View style={[styles.pill, s === 'current' && styles.pillCurrent, s === 'next' && styles.pillNext]}>
                <View style={[styles.icon, lit && styles.iconLit]}>
                  <Ionicons
                    name={s === 'done' ? 'checkmark' : ICONS[step.key]}
                    size={14}
                    color={lit ? colors.onColor : colors.muted}
                  />
                </View>
                <Text style={[styles.label, s === 'next' && styles.labelNext]}>{step.label}</Text>
              </View>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  title: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  round: { fontSize: 12, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, minWidth: 8, height: 2, borderRadius: 1, backgroundColor: colors.border },
  lineOn: { backgroundColor: colors.primary },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 3,
    paddingRight: 11,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillCurrent: { borderColor: colors.primary, borderWidth: 1.5 },
  pillNext: { backgroundColor: 'transparent' },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconLit: { backgroundColor: colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  labelNext: { color: colors.muted },
});
