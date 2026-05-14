import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import MySpaceScreen from './src/screens/MySpaceScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import MealsScreen from './src/screens/MealsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import apiClient, { loadAuthToken, setAuthToken } from './src/api/client';

const Tab = createBottomTabNavigator();

function MainTabs({ onLogout, userRole }) {
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'My Space') iconName = 'home';
            else if (route.name === 'Workouts') iconName = 'activity';
            else if (route.name === 'Meals') iconName = 'coffee';
            else if (route.name === 'Admin') iconName = 'shield';
            else if (route.name === 'Profile') iconName = 'user';
            
            return <Feather name={iconName} size={22} color={color} />;
          },
          tabBarActiveTintColor: '#E91E63',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 15,
            shadowOffset: { width: 0, height: -5 },
            backgroundColor: '#ffffff',
            height: 80,
            paddingBottom: 25,
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
        {userRole === 'admin' && (
           <Tab.Screen name="Admin" component={AdminScreen} />
        )}
        <Tab.Screen name="Profile">
           {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
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
            setIsAuthenticated(true);
        } catch (e) {
            await setAuthToken(null);
        }
    }
    setLoading(false);
  };

  const handleLoginSuccess = (user) => {
      setUserRole(user.role);
      setIsAuthenticated(true);
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserRole(null);
  };

  if (loading) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#121212'}}>
              <ActivityIndicator size="large" color="#E91E63" />
          </View>
      );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
         <MainTabs onLogout={handleLogout} userRole={userRole} />
      ) : (
         <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </NavigationContainer>
  );
}
