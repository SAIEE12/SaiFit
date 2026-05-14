import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from './src/screens/DashboardScreen';
import FoodScannerScreen from './src/screens/FoodScannerScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E1E1E',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ title: 'SaiFit' }} 
        />
        <Stack.Screen 
          name="FoodScanner" 
          component={FoodScannerScreen} 
          options={{ title: 'Scan Food' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
