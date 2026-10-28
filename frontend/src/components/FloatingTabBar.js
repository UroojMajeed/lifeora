import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

/**
 * The tab bar as a floating white pill, lifted off the bottom with a soft shadow. Every tab shows its icon with its name under it, in equal slots; the active one
 * sits in a warm apricot pill. `tabs` is { [routeName]: [label, icon] } (Ionicons, outline when idle, filled when active).
 * Badges come from each screen's `tabBarBadge` option: a number, or `true` for a dot.
 */
export default function FloatingTabBar({ state, descriptors, navigation, tabs }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const [label, icon] = tabs[route.name];
          const badge = descriptors[route.key].options.tabBarBadge;
          const press = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={press}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={`${label}${typeof badge === 'number' ? `, ${badge}` : badge ? ', new' : ''}`}
              style={styles.tab}
              hitSlop={4}
            >
              <View style={[styles.pill, focused && styles.pillOn]}>
                <Ionicons name={focused ? icon : `${icon}-outline`} size={21} color={focused ? brand.evergreen : colors.muted} />
                {badge ? (
                  typeof badge === 'number' ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  ) : (
                    <View style={styles.dot} />
                  )
                ) : null}
              </View>
              <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  // The page's own colour around the bar, so it reads as floating.
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'rgba(18,60,58,0.06)',
    shadowColor: '#0A1716',
    shadowOpacity: isDark ? 0 : 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  // Five equal slots: nothing shifts on a switch.
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  pill: { width: 52, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  pillOn: { backgroundColor: brand.apricot },
  label: { fontSize: 11, fontWeight: '600', color: colors.muted },
  labelOn: { fontWeight: '800', color: brand.evergreen },
  // Evergreen, so it reads on the white bar and on the apricot pill alike.
  badge: {
    position: 'absolute',
    top: -3,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.evergreen,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  dot: { position: 'absolute', top: 2, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: brand.evergreen, borderWidth: 2, borderColor: colors.surface },
});
