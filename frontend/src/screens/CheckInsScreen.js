import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import Logo from '../components/Logo';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const POINTS = [
  { icon: 'notifications-outline', text: 'A few gentle check-ins a day: what are you doing right now?' },
  { icon: 'flash-outline', text: 'One tap to say if it energizes or drains you.' },
  { icon: 'pie-chart-outline', text: 'After two weeks, your DRIP Matrix is built from real days, not estimates.' },
];

/** Placeholder tab for the daily Time & Energy Audit (coming later). */
export default function CheckInsScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Screen edges={['top']}>
      <PageHeader
        eyebrow="Coming soon"
        title="Daily check-ins"
        subtitle="The book's two-week Time & Energy Audit, made effortless."
      />

      {/* A preview of what a check-in will look like. */}
      <Card style={styles.preview}>
        <View style={styles.notifTop}>
          <Logo size={22} />
          <Text style={styles.notifApp}>lifeora</Text>
          <Text style={styles.notifTime}>now</Text>
        </View>
        <Text style={styles.notifTitle}>What are you doing right now?</Text>
        <View style={styles.answers}>
          <View style={[styles.answer, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="flash" size={16} color={colors.success} />
            <Text style={[styles.answerText, { color: colors.success }]}>Energizes me</Text>
          </View>
          <View style={[styles.answer, { backgroundColor: colors.errorSoft }]}>
            <Ionicons name="battery-dead" size={16} color={colors.error} />
            <Text style={[styles.answerText, { color: colors.error }]}>Drains me</Text>
          </View>
        </View>
      </Card>

      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p.text} style={styles.point}>
            <View style={styles.pointIcon}>
              <Ionicons name={p.icon} size={18} color={colors.primaryDark} />
            </View>
            <Text style={styles.pointText}>{p.text}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  preview: { marginBottom: spacing.lg },
  notifTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifApp: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  notifTime: { fontSize: 12, color: colors.muted },
  notifTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  answers: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  answer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  answerText: { fontSize: 13, fontWeight: '700' },
  points: { gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  pointText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
});
