import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider, useTranslation } from "react-i18next";

import { theme } from "@/components/UI";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/auth";
import { I18nDirectionProvider, useIsRTL } from "@/lib/i18n-direction";
import i18n, { initI18n } from "@/lib/i18n";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function RootLayoutNav() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: rtl ? undefined : t("common.back"),
        headerBackVisible: !rtl,
        headerTintColor: theme.primary,
        headerTitleAlign: "center",
        headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        ...(rtl
          ? {
              headerLeft: () => <View style={{ width: 12 }} />,
              headerRight: () => (
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={12}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 17, color: theme.primary, fontFamily: "Inter_600SemiBold" }}>
                    {t("common.back")}
                  </Text>
                  <Feather name="chevron-right" size={22} color={theme.primary} style={{ marginStart: 6 }} />
                </Pressable>
              ),
            }
          : {}),
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="request/new"
        options={{ title: t("newRequest.title"), presentation: "modal" }}
      />
      <Stack.Screen name="request/[id]" options={{ title: t("requestDetail.title") }} />
      <Stack.Screen name="employee/[id]" options={{ title: t("employee.title") }} />
      <Stack.Screen name="department" options={{ title: t("department.title") }} />
      <Stack.Screen name="team" options={{ title: t("team.title") }} />
      <Stack.Screen name="notifications" options={{ title: t("notifications.title") }} />
      <Stack.Screen name="reports" options={{ title: t("reports.title") }} />
      <Stack.Screen name="settings" options={{ title: t("settings.title") }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setBackgroundColorAsync(theme.card).catch(() => {});
    NavigationBar.setButtonStyleAsync("dark").catch(() => {});
  }, []);

  if ((!fontsLoaded && !fontError) || !i18nReady) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <I18nDirectionProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <StatusBar style="dark" backgroundColor={theme.background} translucent={false} />
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </I18nDirectionProvider>
    </I18nextProvider>
  );
}
