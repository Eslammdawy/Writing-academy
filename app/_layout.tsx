import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '../src/context/AppStateContext';
import { COLORS } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash screen is already hidden
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'NotoSansArabic-Regular': require('../assets/fonts/NotoSansArabic-Regular.ttf'),
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStateProvider>
          <StatusBar style="dark" backgroundColor={COLORS.background} />
          <View style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.background },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(child)" />
              <Stack.Screen name="(parent)" />
            </Stack>
          </View>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
