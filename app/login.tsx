import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, theme } from "@/components/UI";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/lib/auth";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email || !password) {
      setError(t("auth.fillFields"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await login(email.trim(), password);
      if (!r.ok) {
        setError(r.error || t("auth.loginFailed"));
        return;
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.background }}
      bottomOffset={24}
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        paddingTop: insets.top + 24 + webTop,
        paddingBottom: insets.bottom + 24,
        gap: 24,
        justifyContent: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
        <View style={{ alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 28,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("../assets/images/login-logo.jpg")}
              style={{ width: 130, height: 130, borderRadius: 20 }}
              resizeMode="contain"
            />
          </View>
          <View style={{ alignItems: "center", gap: 4, alignSelf: "stretch" }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Inter_700Bold",
                color: theme.foreground,
                textAlign: rtl ? alignStart(rtl) : "center",
                writingDirection: writeDir(rtl),
                width: "100%",
              }}
            >
              {t("auth.title")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.mutedForeground,
                textAlign: rtl ? alignStart(rtl) : "center",
                writingDirection: writeDir(rtl),
                width: "100%",
              }}
            >
              {t("auth.subtitle")}
            </Text>
          </View>
        </View>

        <Card style={{ gap: 16, alignSelf: "stretch" }}>
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: theme.foreground,
                textAlign: rtl ? "right" : "left",
                writingDirection: rtl ? "rtl" : "ltr",
                width: "100%",
              }}
            >
              {t("auth.email")}
            </Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.sa"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={{ textAlign: "left", writingDirection: "ltr" }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: theme.foreground,
                textAlign: rtl ? "right" : "left",
                writingDirection: rtl ? "rtl" : "ltr",
                width: "100%",
              }}
            >
              {t("auth.password")}
            </Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              style={{ textAlign: "left", writingDirection: "ltr" }}
            />
          </View>
          {error ? (
            <View
              style={{
                backgroundColor: `${theme.destructive}1A`,
                padding: 12,
                borderRadius: 12,
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 8,
                alignSelf: "stretch",
              }}
            >
              <Feather name="alert-circle" size={16} color={theme.destructive} />
              <Text
                style={{
                  color: theme.destructive,
                  flex: 1,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                  width: "100%",
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}
          <Button title={t("auth.signIn")} onPress={onSubmit} loading={loading} fullWidth icon="log-in" />
        </Card>

        <Text style={{ textAlign: "center", color: theme.mutedForeground, fontSize: 12 }}>
        </Text>
    </KeyboardAwareScrollViewCompat>
  );
}
