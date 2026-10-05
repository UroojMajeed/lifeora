import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import Button from './Button';
import { LOOP_STEPS } from '../constants/home';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** One small, specific next step (from todaysMove()), with a single button to do it. */
export default function TodaysMoveCard({ move, onPress, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  if (!move) return null;
  const stage = LOOP_STEPS.find((s) => s.key === move.stage);

  return (
    <Card style={style}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>Today's one move</Text>
        <Text style={styles.meta}>
          {stage?.label}
          {move.minutes ? ` · ${move.minutes} min` : ''}
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name={move.icon} size={22} color={colors.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{move.title}</Text>
          <Text style={styles.text}>{move.body}</Text>
        </View>
      </View>
      <Button title={move.cta} icon="arrow-forward" onPress={onPress} style={styles.button} />
    </Card>
  );
}

const makeStyles = (colors) => ({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { fontSize: 12, fontWeight: '700', color: colors.accentText, textTransform: 'uppercase', letterSpacing: 1 },
  meta: { fontSize: 12, fontWeight: '600', color: colors.muted },
  body: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  text: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  button: { marginTop: spacing.md },
});
