import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MySpaceScreen from './src/screens/MySpaceScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import MealsScreen from './src/screens/MealsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ChoosePathScreen from './src/screens/ChoosePathScreen';
import apiClient, { loadAuthToken, setAuthToken } from './src/api/client';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProfileStack({ onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="ChoosePathEdit">
        {(props) => <ChoosePathScreen {...props} isEdit={true} onComplete={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MainTabs({ onLogout, userRole }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tabHeight = 52 + bottomPadding;

  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'My Space') iconName = 'home';
            else if (route.name === 'Workouts') iconName = 'activity';
            else if (route.name === 'Meals') iconName = 'coffee';
            else if (route.name === 'Calendar') iconName = 'calendar';
            else if (route.name === 'Profile') iconName = 'user';
            
            return <Feather name={iconName} size={22} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 15,
            shadowOffset: { width: 0, height: -5 },
            backgroundColor: theme.colors.card,
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: -5,
          }
        })}
      >
        <Tab.Screen name="My Space" component={MySpaceScreen} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} />
        <Tab.Screen name="Meals" component={MealsScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Profile">
           {() => <ProfileStack onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await loadAuthToken();
    if (token) {
        try {
            const res = await apiClient.get('/auth/me');
            setUserRole(res.data.user.role);
            
            // Check onboarding requirement
            const tracksRes = await apiClient.get('/lifestyle/my-tracks');
            if (!tracksRes.data || tracksRes.data.length === 0) {
                setNeedsOnboarding(true);
            }
            
            setIsAuthenticated(true);
        } catch (e) {
            await setAuthToken(null);
        }
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (user) => {
      setUserRole(user.role);
      try {
          const tracksRes = await apiClient.get('/lifestyle/my-tracks');
          if (!tracksRes.data || tracksRes.data.length === 0) {
              setNeedsOnboarding(true);
          }
      } catch (e) {
          console.error('Error fetching tracks:', e);
      }
      setIsAuthenticated(true);
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserRole(null);
      setNeedsOnboarding(false);
  };

  if (loading) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: theme.colors.background}}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
      );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? (
           needsOnboarding ? (
             <ChoosePathScreen onComplete={() => setNeedsOnboarding(false)} />
           ) : (
             <MainTabs onLogout={handleLogout} userRole={userRole} />
           )
        ) : (
           <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
