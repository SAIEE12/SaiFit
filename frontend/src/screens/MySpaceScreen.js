import React from 'react';
import DashboardScreen from './DashboardScreen';

/**
 * MySpaceScreen
 * Serves as the wrapper container for the Dashboard screen, rendering it directly.
 */
export default function MySpaceScreen({ navigation }) {
  return <DashboardScreen navigation={navigation} />;
}
