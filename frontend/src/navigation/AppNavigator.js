import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';

import LandingScreen from '../screens/LandingScreen';
import ProfileScreen from '../screens/onboarding/ProfileScreen';
import BuybackRateScreen from '../screens/onboarding/BuybackRateScreen';
import ScheduleScreen from '../screens/onboarding/ScheduleScreen';
import SwipeScreen from '../screens/onboarding/SwipeScreen';
import DripScreen from '../screens/onboarding/DripScreen';
import HomeScreen from '../screens/HomeScreen';
import HandoffsScreen from '../screens/HandoffsScreen';
import HandoffDetailScreen from '../screens/HandoffDetailScreen';

const Stack = createNativeStackNavigator();

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
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="BuybackRate" component={BuybackRateScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Swipe" component={SwipeScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Drip" component={DripScreen} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Handoffs" component={HandoffsScreen} />
      <Stack.Screen name="HandoffDetail" component={HandoffDetailScreen} />
    </Stack.Navigator>
  );
}
