import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import SwipeDeck from '../../components/SwipeDeck';
import { useOnboarding } from '../../context/OnboardingContext';
import { stepNumber } from '../../constants/content';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

export default function SwipeScreen({ navigation, route }) {
  // editing: after changing your day, only the new (unsorted) activities get a card.
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  const [items, setItems] = useState(() =>
    (onboarding?.schedule || [])
      .map(({ activity, hours, value, energy }) => ({ activity, hours, value, energy: energy ?? null }))
      .filter((it) => !editing || !it.energy)
  );
  // Resume at the first card they haven't swiped yet.
  const [index, setIndex] = useState(() => {
    const first = items.findIndex((i) => !i.energy);
    return first === -1 ? items.length : first;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = useCallback(
    async (list) => {
      setError('');
      setSaving(true);
      try {
        if (editing) {
          // Put the newly sorted cards back into the full day, in its original order.
          const sorted = new Map(list.map((it) => [it.activity, it]));
          const day = (onboarding?.schedule || []).map(({ activity, hours, value, energy }) =>
            sorted.get(activity) || { activity, hours, value, energy: energy ?? null }
          );
          await saveStep({ schedule: day }, 'done');
          navigation.popTo('Main');
          return;
        }
        await saveStep({ schedule: list }, 'drip');
        navigation.navigate('Drip');
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [saveStep, navigation, editing, onboarding]
  );

  const onSwipe = useCallback(
    (energy) => {
      const list = items.map((it, i) => (i === index ? { ...it, energy } : it));
      setItems(list);
      setIndex(index + 1);
      if (index + 1 >= list.length) save(list);
    },
    [items, index, save]
  );

  const onSetValue = (value) => setItems((list) => list.map((it, i) => (i === index ? { ...it, value } : it)));

  const onUndo = () => {
    if (index === 0) return;
    setItems((list) => list.map((it, i) => (i === index - 1 ? { ...it, energy: null } : it)));
    setIndex(index - 1);
  };

  const done = index >= items.length;

  return (
    <Screen
      scroll={false}
      footer={
        done ? (
          <Button
            title={editing ? 'Save my day' : 'See my DRIP Matrix'}
            icon={editing ? 'checkmark' : 'arrow-forward'}
            onPress={() => save(items)}
            loading={saving}
          />
        ) : null
      }
    >
      <StepHeader
        step={stepNumber('swipe')}
        editing={editing}
        eyebrow={done ? 'All sorted' : `Card ${index + 1} of ${items.length}`}
        title={done ? 'Nice, that was quick.' : 'Swipe your day'}
        subtitle={
          done
            ? `Your DRIP Matrix is ${editing ? 'updated' : 'ready'}.`
            : 'Right if it energizes you, left if it drains you.'
        }
      />

      {done ? (
        <View style={styles.doneWrap}>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={72} color={colors.success} />
              <Text style={styles.doneText}>{items.length} activities sorted</Text>
              <Button title="Swipe again" variant="ghost" onPress={() => {
                setItems((list) => list.map((it) => ({ ...it, energy: null })));
                setIndex(0);
              }} />
            </>
          )}
        </View>
      ) : (
        <SwipeDeck
          items={items}
          index={index}
          rate={onboarding?.buybackRate}
          currency={onboarding?.currency || 'USD'}
          onSwipe={onSwipe}
          onSetValue={onSetValue}
          onUndo={onUndo}
        />
      )}

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xxl },
  doneText: { fontSize: 18, fontWeight: '700', color: colors.text },
});
