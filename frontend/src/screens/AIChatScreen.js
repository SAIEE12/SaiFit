import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import QuickChips from '../components/chat/QuickChips';

const COACH_NAMES = {
  hydration_coach: 'AI Hydration Coach',
  sleep_advisor: 'AI Sleep & Recovery Advisor',
  workout_coach: 'AI Workout Coach',
  progression_coach: 'AI Progression Coach'
};

const COACH_TAGLINES = {
  hydration_coach: 'Optimizing daily fluid intake & workout hydration scheduling',
  sleep_advisor: 'Maximizing physical recovery, sleep hygiene & fatigue management',
  workout_coach: 'Personalizing training routines, exercise form & schedules',
  progression_coach: 'Guiding fitness indexing, strengths & target weight timelines'
};

export default function AIChatScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  const { coachType } = route.params || { coachType: 'workout_coach' };

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [token, setToken] = useState('');

  const flatListRef = useRef(null);

  // Load Auth Token & Chat History
  useEffect(() => {
    const initChat = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) {
          setToken(storedToken);
        }
        await fetchHistory();
      } catch (e) {
        console.error('Failed to initialize chat:', e);
      }
    };
    initChat();
  }, [coachType]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/chat/history?coach_type=${coachType}`);
      setMessages(res.data || []);
    } catch (e) {
      console.error('Failed to fetch chat history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // 1. Append User Message Locally
    const userMsg = { role: 'user', message: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setStreamingText('');

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // 2. Setup XMLHttpRequest for SSE Streaming
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.167:5000/api';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/chat/send`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    let seenBytes = 0;
    let assistantMessageAccumulated = '';

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newData = xhr.responseText.substring(seenBytes);
        seenBytes = xhr.responseText.length;

        const lines = newData.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawJson = line.substring(6).trim();
            if (!rawJson) continue;
            try {
              const parsed = JSON.parse(rawJson);
              if (parsed.text) {
                assistantMessageAccumulated += parsed.text;
                setStreamingText(assistantMessageAccumulated);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
              }
              if (parsed.done) {
                // Done streaming, save message to state history
                const assistantMsg = {
                  role: 'assistant',
                  message: assistantMessageAccumulated,
                  created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMsg]);
                setStreamingText('');
                setLoading(false);
              }
              if (parsed.error) {
                Alert.alert('Error', parsed.error);
                setLoading(false);
              }
            } catch (e) {
              // Ignore partial JSON parsing errors during raw chunk transfer
            }
          }
        }
      }
    };

    xhr.onerror = (err) => {
      console.error('XHR Stream error:', err);
      Alert.alert('Connection Error', 'Could not stream response from AI Coach.');
      setLoading(false);
    };

    xhr.send(JSON.stringify({ coach_type: coachType, message: text }));
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear your conversation history with this coach?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/chat/clear', { coach_type: coachType });
              setMessages([]);
              setStreamingText('');
            } catch (e) {
              console.error('Failed to clear conversation history:', e);
              Alert.alert('Error', 'Could not clear history.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{COACH_NAMES[coachType]}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{COACH_TAGLINES[coachType]}</Text>
          </View>
          <TouchableOpacity onPress={handleClearHistory} style={styles.headerBtn}>
            <Feather name="trash-2" size={18} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              message={item.message}
              timestamp={item.created_at}
            />
          )}
          ListFooterComponent={
            streamingText ? (
              <ChatBubble
                role="assistant"
                message={streamingText}
              />
            ) : loading ? (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Generating expert advice...</Text>
              </View>
            ) : null
          }
        />

        {/* Quick Chips suggestions (only if not loading/streaming) */}
        {!loading && !streamingText && (
          <QuickChips
            coachType={coachType}
            onChipPress={handleSendMessage}
          />
        )}

        {/* Chat Input */}
        <ChatInput onSend={handleSendMessage} loading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerBtn: {
    padding: theme.spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  listContent: {
    paddingVertical: theme.spacing.md,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.xl,
    borderBottomLeftRadius: theme.radii.xs,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    marginLeft: theme.spacing.xl,
    marginVertical: theme.spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.md,
  },
});
