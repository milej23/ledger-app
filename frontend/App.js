import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen      from './src/screens/HomeScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen  from './src/screens/SettingsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import AuthScreen      from './src/screens/AuthScreen';
import SplitScreen     from './src/screens/SplitScreen';
import SplitGroupScreen from './src/screens/SplitGroupScreen';
import CalendarScreen  from './src/screens/CalendarScreen';

const Stack = createStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0d0d0f', card: '#0d0d0f' },
};

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0d0d0f' } }}>
        <Stack.Screen name="Home"      component={HomeScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="Split"     component={SplitScreen} />
        <Stack.Screen name="SplitGroup" component={SplitGroupScreen} />
        <Stack.Screen name="Calendar"  component={CalendarScreen} />
        <Stack.Screen name="Settings"  component={SettingsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Auth"      component={AuthScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
