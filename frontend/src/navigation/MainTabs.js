import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import HomeScreen from '../screens/HomeScreen';
import HandoffsScreen from '../screens/HandoffsScreen';
import CheckInsScreen from '../screens/CheckInsScreen';
import MyDayScreen from '../screens/MyDayScreen';
import MeScreen from '../screens/MeScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import { useHandoffs } from '../context/HandoffsContext';
import { checkInStatus } from '../constants/checkin';

const Tab = createBottomTabNavigator();

// [route, label, icon (outline when idle, filled when active)]. Home sits in the middle.
const TABS = [
  ['Handoffs', 'Handoffs', 'swap-horizontal'],
  ['CheckIns', 'Check-ins', 'pulse'],
  ['Home', 'Home', 'home'],
  ['MyDay', 'Routine', 'pie-chart'],
  ['Me', 'Me', 'person'],
];
const TAB_INFO = Object.fromEntries(TABS.map(([name, label, icon]) => [name, [label, icon]]));

const SCREENS = { Home: HomeScreen, Handoffs: HandoffsScreen, CheckIns: CheckInsScreen, MyDay: MyDayScreen, Me: MeScreen };

/**
 * The app after onboarding: five tabs in a floating pill bar. Handoffs shows how many are left;
 * Check-ins shows a dot when this week's check-in is ready.
 */
export default function MainTabs() {
  const { handoffs, fills, checkIns } = useHandoffs();
  const remaining = handoffs.filter((h) => h.status !== 'done').length;
  const checkInDue = checkInStatus({ checkIns, handoffs, fills }).state === 'due';

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="initialRoute"
      tabBar={(props) => <FloatingTabBar {...props} tabs={TAB_INFO} />}
      screenOptions={{ headerShown: false }}
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
          options={{
            tabBarBadge: name === 'Handoffs' && remaining ? remaining : name === 'CheckIns' && checkInDue ? true : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
