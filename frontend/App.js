import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import MealsScreen from './src/screens/MealsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ChoosePathScreen from './src/screens/ChoosePathScreen';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black
} from '@expo-google-fonts/inter';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProfileStack() {
  const { logout } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {(props) => <ProfileScreen {...props} onLogout={logout} />}
      </Stack.Screen>
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="ChoosePathEdit">
        {(props) => <ChoosePathScreen {...props} isEdit={true} onComplete={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tabHeight = 52 + bottomPadding;
  const { theme } = useTheme();

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
        <Tab.Screen name="My Space" component={DashboardScreen} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} />
        <Tab.Screen name="Meals" component={MealsScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
  );
}

function AppContent() {
  const { isAuthenticated, needsOnboarding, loading, login, completeOnboarding } = useAuth();
  const { theme } = useTheme();

  if (loading) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: theme.colors.background}}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
      );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
         needsOnboarding ? (
           <ChoosePathScreen onComplete={completeOnboarding} />
         ) : (
           <MainTabs />
         )
      ) : (
         <LoginScreen onLoginSuccess={(user) => login(user, user.token)} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <AppContent />
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
