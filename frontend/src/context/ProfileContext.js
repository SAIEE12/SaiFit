import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [myTracks, setMyTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, myTracksRes] = await Promise.all([
        apiClient.get('/profile'),
        apiClient.get('/lifestyle/my-tracks')
      ]);
      setUser(profileRes.data.user);
      setProfile(profileRes.data.profile);
      setMyTracks(myTracksRes.data || []);
    } catch (e) {
      console.error('Error fetching profile context:', e);
      setError(e.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateProfile = useCallback(async (payload) => {
    setError(null);
    try {
      const res = await apiClient.put('/profile', payload);
      setProfile(res.data);
      // Re-fetch tracks in case onboarding preferences or goals updated
      const myTracksRes = await apiClient.get('/lifestyle/my-tracks');
      setMyTracks(myTracksRes.data || []);
      return res.data;
    } catch (e) {
      console.error('Error updating profile context:', e);
      setError(e.message || 'Failed to update profile.');
      throw e;
    }
  }, []);

  // Fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setProfile(null);
      setUser(null);
      setMyTracks([]);
    }
  }, [isAuthenticated, fetchProfile]);

  return (
    <ProfileContext.Provider value={{
      user,
      profile,
      myTracks,
      loading,
      error,
      fetchProfile,
      updateProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
