import React from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function ScreenContainer({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  edges = ['top', 'bottom'],
  keyboardAvoiding = true,
}) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  const innerContent = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle]}>{children}</View>
  );

  const container = (
    <SafeAreaView edges={edges} style={[styles.container, style]}>
      {innerContent}
    </SafeAreaView>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {container}
      </KeyboardAvoidingView>
    );
  }

  return container;
}

const stylesFactory = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.huge,
  },
});
