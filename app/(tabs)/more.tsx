import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import { Card, SectionHeader, styles as s, theme } from "@/components/UI";
import { useAuth } from "@/lib/auth";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";
import { listChevronIcon } from "@/lib/rtl";

type Item = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href?: string;
  onPress?: () => void;
};

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me, logout } = useAuth();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const items: Item[] = [
    { label: t("more.department"), icon: "users", href: "/department" },
    { label: t("more.team"), icon: "user-check", href: "/team" },
    { label: t("more.notifications"), icon: "bell", href: "/notifications" },
    { label: t("more.reports"), icon: "bar-chart-2", href: "/reports" },
    { label: t("more.settings"), icon: "settings", href: "/settings" },
  ];

  const onLogout = () => {
    showAlert(t("more.logout"), t("more.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("more.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const chevron = listChevronIcon(rtl);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12 }]}
    >
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <Card style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 14, alignSelf: "stretch" }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22 }}>
            {(me?.email?.[0] || "?").toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: theme.foreground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {me?.email || "—"}
          </Text>
          <Text
            style={{
              color: theme.mutedForeground,
              fontSize: 13,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              marginTop: 2,
              width: "100%",
            }}
          >
            {me?.role ? t(`roles.${me.role}`, { defaultValue: me.role }) : ""}
          </Text>
        </View>
      </Card>

      <SectionHeader title={t("more.sectionsHeader")} />
      <Card style={{ padding: 0 }}>
        {items.map((it, idx) => (
          <Pressable
            key={it.label}
            onPress={() => (it.href ? router.push(it.href as any) : it.onPress?.())}
            style={({ pressed }) => ({
              flexDirection: rtl ? "row-reverse" : "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: idx === items.length - 1 ? 0 : 1,
              borderBottomColor: theme.border,
              opacity: pressed ? 0.6 : 1,
              gap: 12,
              alignSelf: "stretch",
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={it.icon} size={18} color={theme.primary} />
            </View>
            <Text
              style={{
                flex: 1,
                color: theme.foreground,
                fontFamily: "Inter_500Medium",
                textAlign: alignStart(rtl),
                writingDirection: writeDir(rtl),
                minWidth: 0,
                width: "100%",
              }}
            >
              {it.label}
            </Text>
            <Feather name={chevron} size={18} color={theme.mutedForeground} />
          </Pressable>
        ))}
      </Card>

      <Pressable onPress={onLogout}>
        <Card
          style={{
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: `${theme.destructive}10`,
            borderColor: `${theme.destructive}30`,
            alignSelf: "stretch",
          }}
        >
          <Feather name="log-out" size={18} color={theme.destructive} />
          <Text
            style={{
              color: theme.destructive,
              fontFamily: "Inter_600SemiBold",
              flex: 1,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("more.logout")}
          </Text>
        </Card>
      </Pressable>

      <Text style={{ textAlign: "center", color: theme.mutedForeground, fontSize: 12, marginTop: 8 }}>
        {t("more.version")}
      </Text>
    </ScrollView>
  );
}
