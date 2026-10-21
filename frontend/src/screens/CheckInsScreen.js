import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import CardHeader, { homeCard } from '../components/CardHeader';
import { useHandoffs } from '../context/HandoffsContext';
import { checkInStatus, checkInStreak, feelingOf, weekLabel } from '../constants/checkin';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;

/**
 * The weekly rhythm: this week's check-in (ready from Friday, done, or not yet), your streak, and
 * past weeks (hours confirmed, how the week felt, anything that slipped back).
 */
export default function CheckInsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { checkIns = [], handoffs, fills, refresh } = useHandoffs();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const status = checkInStatus({ checkIns, handoffs, fills });
  const streak = checkInStreak(checkIns);
  const past = [...checkIns].reverse();

  const STATE = {
    due: { icon: 'pulse', sub: 'Ready · about 2 minutes' },
    done: { icon: 'checkmark-circle', sub: `Done · ${h(status.entry?.confirmedHours || 0)} bought back` },
    soon: { icon: 'calendar', sub: status.daysToGo === 1 ? 'Opens tomorrow (Friday)' : `Opens on Friday, in ${status.daysToGo} days` },
    none: { icon: 'pulse', sub: 'Starts after your first handoff' },
  }[status.state];

  return (
    <Screen edges={['top']}>
      <PageHeader eyebrow="Weekly" title="Check-ins" subtitle="Once a week: did your handoffs stick, and did you use the time?" />

      {/* This week */}
      <View style={[styles.card, status.state === 'due' && styles.cardDue]}>
        <CardHeader
          icon={STATE.icon}
          iconColor={status.state === 'done' ? colors.chart.production : colors.primary}
          title="This Week's Check-in"
          sub={STATE.sub}
          right={
            streak ? (
              <View style={styles.streak}>
                <Text style={styles.streakText}>{streak} 🔥</Text>
              </View>
            ) : null
          }
        />
        {status.state === 'due' ? (
          <Button title="Start check-in" icon="arrow-forward" onPress={() => navigation.navigate('CheckIn')} style={styles.button} />
        ) : status.state === 'none' ? (
          <Text style={styles.note}>Hand off your first task on Home, and your first check-in opens that Friday.</Text>
        ) : null}
      </View>

      {/* Past weeks */}
      {past.length ? (
        <>
          <Text style={styles.section}>Past weeks</Text>
          <View style={styles.list}>
            {past.map((c, i) => {
              const feeling = feelingOf(c.feeling);
              const slipped = (c.handoffs || []).filter((a) => a.answer === 'slipped').length;
              return (
                <View key={c.week} style={[styles.row, i > 0 && styles.rowLine]}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowWeek}>{weekLabel(c.week)}</Text>
                    <Text style={styles.rowSub}>
                      {h(c.confirmedHours || 0)} bought back
                      {slipped ? ` · ${slipped} slipped back` : ''}
                    </Text>
                  </View>
                  {feeling ? (
                    <Text style={styles.rowFeeling} accessibilityLabel={`Felt ${feeling.label}`}>
                      {feeling.emoji}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.how}>
          {[
            ['checkmark-done-outline', 'Each Friday: are your handoffs still off your plate?'],
            ['leaf-outline', 'Did you use the hours you reinvested?'],
            ['happy-outline', 'One tap for how the week felt.'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.howRow}>
              <Ionicons name={icon} size={18} color={colors.primary} />
              <Text style={styles.howText}>{text}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.surface },
  cardDue: { borderColor: colors.primary, borderWidth: 1.5 },
  button: { marginTop: spacing.md },
  note: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: spacing.sm + 2 },
  streak: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.accentSoft },
  streakText: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  section: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { ...homeCard(colors, isDark), backgroundColor: colors.surface, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 4 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  rowMain: { flex: 1, minWidth: 0 },
  rowWeek: { fontSize: 15, fontWeight: '800', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  rowFeeling: { fontSize: 24 },
  how: { gap: spacing.sm + 4, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  howText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
});
