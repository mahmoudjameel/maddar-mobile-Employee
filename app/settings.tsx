import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Card, styles as s, theme } from "@/components/UI";
import { useAuth } from "@/lib/auth";
import { useIsRTL } from "@/lib/i18n-direction";
import { changeLanguage } from "@/lib/i18n";
import { alignStart, writeDir } from "@/lib/layout";
import { ThemeMode, useThemeMode } from "@/lib/theme";

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const rtl = useIsRTL();
  return (
    <Card style={{ flex: 1, gap: 10, minWidth: 0 }}>
      <Text
        style={{
          color: theme.mutedForeground,
          fontSize: 13,
          fontFamily: "Inter_500Medium",
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
          width: "100%",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text
          style={{
            color: theme.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
            flexShrink: 1,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            flex: 1,
            width: "100%",
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Feather name={icon} size={16} color={theme.mutedForeground} />
      </View>
    </Card>
  );
}

function LanguageOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const rtl = useIsRTL();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          padding: 14,
          borderWidth: 1,
          borderColor: active ? theme.primary : theme.border,
          borderRadius: 12,
          backgroundColor: active ? theme.secondary : theme.card,
          gap: 10,
          alignSelf: "stretch",
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: active ? theme.primary : theme.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {active ? (
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }}
            />
          ) : null}
        </View>
        <Text
          style={{
            flex: 1,
            color: theme.foreground,
            fontFamily: "Inter_600SemiBold",
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);

  const onPickLanguage = async (lang: "ar" | "en") => {
    if (busy) return;
    if (i18n.language?.startsWith(lang)) return;
    setBusy(true);
    await changeLanguage(lang);
    setBusy(false);
  };

  const roleLabel = me?.role
    ? t(`roles.${me.role}`, { defaultValue: me.role })
    : "—";
  const rtl = useIsRTL();

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12 }]}
    >
      <View style={{ alignSelf: "stretch", alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 26,
            color: theme.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {t("settings.title")}
        </Text>
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 14,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            marginTop: 4,
            width: "100%",
          }}
        >
          {t("settings.subtitle")}
        </Text>
      </View>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12 }}>
        <InfoCard label={t("settings.accountType")} value={roleLabel} icon="user" />
        <InfoCard label={t("settings.email")} value={me?.email || "—"} icon="mail" />
      </View>

      <ThemeSection />

      <Card style={{ gap: 10, alignSelf: "stretch" }}>
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
          {t("settings.language")}
        </Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12 }}>
          <LanguageOption
            active={i18n.language?.startsWith("ar") ?? false}
            label={t("settings.languageArabic")}
            onPress={() => void onPickLanguage("ar")}
          />
          <LanguageOption
            active={i18n.language?.startsWith("en") ?? false}
            label={t("settings.languageEnglish")}
            onPress={() => void onPickLanguage("en")}
          />
        </View>
      </Card>

      <Card style={{ gap: 8, alignSelf: "stretch" }}>
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
          {t("settings.about")}
        </Text>
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 13,
            lineHeight: 20,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {t("settings.aboutDescription")}
        </Text>
      </Card>
    </ScrollView>
  );
}

function ThemeSection() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const { mode, setMode } = useThemeMode();

  const options: Array<{ key: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }> = [
    { key: "system", label: t("settings.themeSystem"), icon: "smartphone" },
    { key: "light", label: t("settings.themeLight"), icon: "sun" },
    { key: "dark", label: t("settings.themeDark"), icon: "moon" },
  ];

  return (
    <Card style={{ gap: 12, alignSelf: "stretch" }}>
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
        {t("settings.appearance")}
      </Text>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
        {options.map((opt) => {
          const active = mode === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => void setMode(opt.key)}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  borderRadius: 12,
                  backgroundColor: active ? theme.secondary : theme.card,
                  gap: 6,
                }}
              >
                <Feather
                  name={opt.icon}
                  size={20}
                  color={active ? theme.primary : theme.mutedForeground}
                />
                <Text
                  style={{
                    color: active ? theme.primary : theme.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={{
          color: theme.mutedForeground,
          fontSize: 12,
          lineHeight: 18,
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
          width: "100%",
        }}
      >
        {t("settings.themeHint")}
      </Text>
    </Card>
  );
}
