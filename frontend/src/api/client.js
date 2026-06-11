import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Read API URL from environment variables, fallback to local development IP if undefined
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.167:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = async (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await AsyncStorage.setItem('userToken', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    await AsyncStorage.removeItem('userToken');
  }
};

export const loadAuthToken = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        }
        return null;
    } catch(e) {
        console.error("Failed to load token", e);
        return null;
    }
};

export default apiClient;
