import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { WELCOME_SLIDES } from '../../constants/content';
import { colors, radius, spacing, type } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === WELCOME_SLIDES.length - 1;

  const goToAuth = () => navigation.navigate('Auth', { mode: 'signup' });

  const next = () => {
    if (isLast) return goToAuth();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <Screen
      scroll={false}
      contentStyle={styles.noPad}
      footer={
        <>
          <View style={styles.dots}>
            {WELCOME_SLIDES.map((s, i) => (
              <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button title={isLast ? 'Create my account' : 'Next'} onPress={next} />
        </>
      }
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>‹ Back</Text>
        </Pressable>
        {!isLast ? (
          <Pressable onPress={goToAuth} hitSlop={12} accessibilityRole="button">
            <Text style={styles.link}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={WELCOME_SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{i + 1}</Text>
            </View>
            <Text style={[type.label, styles.eyebrow]}>{item.eyebrow}</Text>
            <Text style={type.hero}>{item.title}</Text>
            <Text style={[type.subtitle, styles.body]}>{item.body}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  link: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  slide: { paddingHorizontal: spacing.lg, justifyContent: 'center' },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeText: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  eyebrow: { color: colors.accent, marginBottom: spacing.sm },
  body: { marginTop: spacing.md, fontSize: 17, lineHeight: 25 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
});
