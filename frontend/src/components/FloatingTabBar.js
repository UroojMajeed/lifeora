import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

/**
 * The tab bar as a floating pill: rounded, lifted off the bottom with a soft shadow. The active tab
 * shows its name in a soft teal pill (which widens smoothly on a switch); the others show just their
 * icon. `tabs` is { [routeName]: [label, icon] } (Ionicons, outline when idle, filled when active).
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
              LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'scaleXY'));
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
              style={[styles.tab, focused && styles.tabOn]}
              hitSlop={4}
            >
              <View style={[styles.pill, focused && styles.pillOn]}>
                <View>
                  <Ionicons name={focused ? icon : `${icon}-outline`} size={21} color={focused ? colors.primary : colors.muted} />
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
                {focused ? (
                  <Text style={styles.label} numberOfLines={1}>
                    {label}
                  </Text>
                ) : null}
              </View>
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
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'rgba(18,60,58,0.06)',
    shadowColor: '#0A1716',
    shadowOpacity: isDark ? 0 : 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabOn: { flex: 2.2 }, // the active tab makes room for its name
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: radius.pill },
  pillOn: { backgroundColor: colors.primarySoft },
  label: { fontSize: 13, fontWeight: '800', color: colors.primary },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.onColor },
  dot: { position: 'absolute', top: -2, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: brand.apricot, borderWidth: 2, borderColor: colors.surface },
});
