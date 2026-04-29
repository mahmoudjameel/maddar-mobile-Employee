import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { theme } from "@/components/UI";

export default function Index() {
  const { me, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }
  if (!me) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
