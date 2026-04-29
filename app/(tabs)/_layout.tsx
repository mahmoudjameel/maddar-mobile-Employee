import { Feather } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/components/UI";
import { useAuth } from "@/lib/auth";
import { useIsRTL } from "@/lib/i18n-direction";

export default function TabLayout() {
  const { me, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const rtl = useIsRTL();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }
  if (!me) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.mutedForeground,
          headerShown: false,
          tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            ...(isWeb ? { height: 84 } : {}),
            ...(rtl ? { direction: "rtl" } : { direction: "ltr" }),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: t("tabs.attendance"),
            tabBarIcon: ({ color }) => <Feather name="clock" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: t("tabs.requests"),
            tabBarIcon: ({ color }) => <Feather name="file-text" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: t("tabs.tasks"),
            tabBarIcon: ({ color }) => <Feather name="check-square" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t("tabs.more"),
            tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} />,
          }}
        />
      </Tabs>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("newRequest.title")}
        onPress={() => router.push("/request/new")}
        style={{
          position: "absolute",
          bottom: (isWeb ? 84 : 62) + insets.bottom,
          ...(rtl ? { left: 18 } : { right: 18 }),
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: theme.card,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Feather name="plus" size={28} color={theme.primaryForeground} />
      </Pressable>
    </View>
  );
}
