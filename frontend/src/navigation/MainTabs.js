import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HomeScreen from '../screens/HomeScreen';
import HandoffsScreen from '../screens/HandoffsScreen';
import CheckInsScreen from '../screens/CheckInsScreen';
import MyDayScreen from '../screens/MyDayScreen';
import MeScreen from '../screens/MeScreen';
import { useHandoffs } from '../context/HandoffsContext';
import { checkInStatus } from '../constants/checkin';
import { useTheme } from '../theme/ThemeContext';
import { brand } from '../theme';
import { fontFamilyFor } from '../theme/fonts';

const Tab = createBottomTabNavigator();

// [route, label, icon (outline when idle, filled when active)]. Home sits in the middle.
const TABS = [
  ['Handoffs', 'Handoffs', 'swap-horizontal'],
  ['CheckIns', 'Check-ins', 'pulse'],
  ['Home', 'Home', 'home'],
  ['MyDay', 'Routine', 'pie-chart'],
  ['Me', 'Me', 'person'],
];

const SCREENS = { Home: HomeScreen, Handoffs: HandoffsScreen, CheckIns: CheckInsScreen, MyDay: MyDayScreen, Me: MeScreen };

/** The app after onboarding: five tabs. Check-ins shows a badge when this week's check-in is ready. */
export default function MainTabs() {
  const { colors, isDark } = useTheme();
  const { handoffs, fills, checkIns } = useHandoffs();
  const remaining = handoffs.filter((h) => h.status !== 'done').length;
  const checkInDue = checkInStatus({ checkIns, handoffs, fills }).state === 'due';

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="initialRoute"
      screenOptions={({ route }) => {
        const [, label, icon] = TABS.find(([name]) => name === route.name);
        return {
          headerShown: false,
          tabBarLabel: label,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            ...(isDark ? {} : { shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 }),
          },
          tabBarLabelStyle: { fontFamily: fontFamilyFor('600'), fontSize: 11 },
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onColor, fontFamily: fontFamilyFor('700'), fontSize: 10 },
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={focused ? icon : `${icon}-outline`} size={22} color={color} />
              {/* The apricot spark marks where you are. */}
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  marginTop: 2,
                  backgroundColor: focused ? brand.apricot : 'transparent',
                }}
              />
            </View>
          ),
        };
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}
    >
      {TABS.map(([name]) => (
        <Tab.Screen
          key={name}
          name={name}
          component={SCREENS[name]}
          options={
            name === 'Handoffs' && remaining
              ? { tabBarBadge: remaining }
              : name === 'CheckIns' && checkInDue
                ? {
                    tabBarBadge: '1',
                    tabBarBadgeStyle: { backgroundColor: brand.apricot, color: brand.ink, fontFamily: fontFamilyFor('700'), fontSize: 10 },
                  }
                : undefined
          }
        />
      ))}
    </Tab.Navigator>
  );
}
