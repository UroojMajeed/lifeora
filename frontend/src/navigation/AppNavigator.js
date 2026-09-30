import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';

import LandingScreen from '../screens/LandingScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import AuthScreen from '../screens/onboarding/AuthScreen';
import BuybackRateScreen from '../screens/onboarding/BuybackRateScreen';
import EnergyDrainsScreen from '../screens/onboarding/EnergyDrainsScreen';
import FeelingScreen from '../screens/onboarding/FeelingScreen';
import TimeAssassinsScreen from '../screens/onboarding/TimeAssassinsScreen';
import VisionScreen from '../screens/onboarding/VisionScreen';
import SummaryScreen from '../screens/onboarding/SummaryScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
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
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="BuybackRate" component={BuybackRateScreen} />
      <Stack.Screen name="EnergyDrains" component={EnergyDrainsScreen} />
      <Stack.Screen name="Feeling" component={FeelingScreen} />
      <Stack.Screen name="TimeAssassins" component={TimeAssassinsScreen} />
      <Stack.Screen name="Vision" component={VisionScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
