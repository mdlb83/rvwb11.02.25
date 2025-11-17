import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { isFirstLaunch, setHasLaunched } from '../utils/firstLaunch';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// Prevent the splash screen from auto-hiding before we're ready
SplashScreen.preventAutoHideAsync();

// Lock app to portrait by default (can be overridden in photo viewer)
ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {
  // Ignore if not supported
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Check if this is the first launch
        const firstLaunch = await isFirstLaunch();
        
        // Minimum splash screen display times
        const minSplashTime = firstLaunch ? 2500 : 1000; // 2.5s first launch, 1s subsequent
        
        // Wait for minimum time
        const minTimePromise = new Promise(resolve => setTimeout(resolve, minSplashTime));
        
        // Wait for both minimum time and any other initialization
        await Promise.all([minTimePromise]);
        
        // Mark as launched if it was first launch
        if (firstLaunch) {
          await setHasLaunched();
        }
      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        // App is ready, but we'll hide splash in the main screen after data loads
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Don't render until app is ready
  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

