import { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import CardHeader, { homeCard } from './CardHeader';
import Button from './Button';
import { useHandoffs } from '../context/HandoffsContext';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/**
 * The settle-in check on Home: on day 3 and day 10 after a handover, "Is it going OK?" in two taps.
 * "Going well" closes it; "Needs a hand" offers a quick fix (tighten the brief, message them or check
 * the setup), and the answer saves when they pick one. `due` is { task, day } from settleDue().
 * `onOpen(activity, kind)` opens the road at that step.
 */
export default function SettleInCard({ due, onOpen }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { update } = useHandoffs();
  const [help, setHelp] = useState(false);
  const { task, day } = due;
  const automate = task.method === 'automate';
  const who = task.who || (automate ? 'it' : 'them');
  const name = task.activity.toLowerCase();

  const answer = (value) => {
    Haptics.selectionAsync().catch(() => {});
    setHelp(false);
    return update(task.activity, { [day === 3 ? 'settleDay3' : 'settleDay10']: value }).catch((err) => Alert.alert("Couldn't save that", err.message));
  };
  const message = () => {
    answer('help');
    const first = task.who ? task.who.split(' ')[0] : 'there';
    Share.share({ message: `Hi ${first}! How is ${name} going? Anything you need from me?` }).catch(() => {});
  };

  return (
    <View style={styles.card}>
      <CardHeader icon="leaf" iconColor={colors.primary} title="Settling In" sub={`Day ${day} · ${task.activity}${task.who ? ` with ${task.who}` : ''}`} />
      <Text style={styles.ask}>{automate ? `Is ${who} running OK?` : 'Is it going OK?'}</Text>
      {help ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={styles.tip}>Most early bumps come from an unclear brief.</Text>
          <View style={styles.row}>
            <Button title="Tighten the brief" size="small" onPress={() => answer('help').then(() => onOpen(task.activity, 'brief'))} style={styles.half} />
            {automate ? (
              <Button title="Check the setup" size="small" variant="secondary" onPress={() => answer('help').then(() => onOpen(task.activity, 'who'))} style={styles.half} />
            ) : (
              <Button title={task.who ? `Message ${task.who.split(' ')[0]}` : 'Message them'} size="small" variant="secondary" onPress={message} style={styles.half} />
            )}
          </View>
        </Animated.View>
      ) : (
        <View style={styles.row}>
          <Button title="Going well" icon="thumbs-up" size="small" onPress={() => answer('well')} style={styles.half} />
          <Button title="Needs a hand" size="small" variant="secondary" onPress={() => setHelp(true)} style={styles.half} />
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.surface },
  ask: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  tip: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm + 2 },
  half: { flex: 1 },
});
