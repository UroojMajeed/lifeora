import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';

import LandingScreen from '../screens/LandingScreen';
import ProfileScreen from '../screens/onboarding/ProfileScreen';
import JourneyScreen from '../screens/onboarding/JourneyScreen';
import BuybackRateScreen from '../screens/onboarding/BuybackRateScreen';
import AuditScreen from '../screens/onboarding/AuditScreen';
import ScheduleScreen from '../screens/onboarding/ScheduleScreen';
import SwipeScreen from '../screens/onboarding/SwipeScreen';
import HandoffDetailScreen from '../screens/HandoffDetailScreen';
import AccountScreen from '../screens/AccountScreen';
import FillScreen from '../screens/FillScreen';
import CheckInScreen from '../screens/CheckInScreen';
import HandoffJourneyScreen from '../screens/HandoffJourneyScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

// Onboarding steps first, then the app itself (Main = the five tabs). The onboarding screens are
// reused with { editing: true } to change answers later; they then open on top of the tabs.
export default function AppNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Journey" component={JourneyScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="BuybackRate" component={BuybackRateScreen} />
      <Stack.Screen name="Audit" component={AuditScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Swipe" component={SwipeScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
      <Stack.Screen name="HandoffDetail" component={HandoffDetailScreen} />
      <Stack.Screen name="Fill" component={FillScreen} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HandoffJourney" component={HandoffJourneyScreen} />
    </Stack.Navigator>
  );
}
