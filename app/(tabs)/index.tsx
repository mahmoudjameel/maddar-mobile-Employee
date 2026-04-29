import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  styles as s,
  theme,
} from "@/components/UI";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type QuickStat = { key: string; label: string; value: number; hint?: string };
type Overview = {
  generatedAt: string;
  employee?: { id: string; fullName?: string; jobTitle?: string; departmentName?: string };
  latestRequests?: Array<{ id: string; typeName?: string; status?: string; createdAt?: string }>;
  quickStats?: QuickStat[];
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const statusKey = (s?: string) =>
    ({
      in_review: "requests.statusPending",
      pending: "requests.statusAwaiting",
      approved: "requests.statusApproved",
      rejected: "requests.statusRejected",
      returned: "requests.statusReturned",
      cancelled: "requests.statusCanceled",
      completed: "requests.statusCompleted",
    })[s || ""] || null;

  const q = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const r = await api.get<Overview>("/api/employee/overview");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const data = q.data;
  const fullName = data?.employee?.fullName || me?.email?.split("@")[0] || "";
  const now = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const isEvening = hour >= 18 || hour < 6;
  const isMorning = hour >= 6 && hour < 12;
  const periodTitle = isMorning
    ? t("home.greetingMorning")
    : isEvening
      ? t("home.greetingEvening")
      : t("home.greetingDay");
  const heroBg = isEvening ? "#11307A" : "#0f766e";
  const heroSecondaryBg = isEvening ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.16)";
  const periodIcon: keyof typeof Feather.glyphMap = isEvening ? "moon" : "sun";
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(rtl ? "ar-SA" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [rtl],
  );
  const nowLabel = useMemo(
    () =>
      new Date().toLocaleTimeString(rtl ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [rtl],
  );
  const requests = data?.latestRequests?.slice(0, 4) || [];
  const quickPunch = useMutation({
    mutationFn: async () => {
      let lat: number | undefined;
      let lng: number | undefined;

      if (Platform.OS !== "web") {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } else if (typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              lat = p.coords.latitude;
              lng = p.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 4000 },
          );
        });
      }

      const r = await api.post<{ action?: string; message?: string }>(
        "/api/employee/attendance",
        {
          latitude: lat,
          longitude: lng,
          client: Platform.OS === "web" ? "browser" : "native",
        },
      );
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (d) => {
      showAlert(t("newRequest.successTitle"), d?.message || t("attendance.checkInSuccess"));
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: any) => {
      showAlert(t("attendance.checkInError"), e?.message || t("newRequest.errorMsg"));
    },
  });

  const actionCards: Array<{
    key: string;
    title: string;
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
  }> = [
    {
      key: "attendance-fix",
      title: t("home.quickAttendanceFix"),
      icon: "target",
      onPress: () => router.push("/attendance"),
    },
    {
      key: "leave",
      title: t("home.quickLeaveRequest"),
      icon: "clock",
      onPress: () =>
        router.push({
          pathname: "/request/new",
          params: { quickType: "leave" },
        }),
    },
    {
      key: "overtime",
      title: t("home.quickOvertimeRequest"),
      icon: "clock",
      onPress: () => router.push("/request/new"),
    },
  ];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[
        s.scrollContent,
        {
          paddingTop: insets.top + 8,
          // Keep last card clear from floating + button and tab bar.
          paddingBottom: Math.max(s.scrollContent.paddingBottom || 0, 120),
        },
      ]}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          alignSelf: "stretch",
        }}
      >
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10 }}>
          {(
            [
              {
                key: "user",
                icon: "user" as keyof typeof Feather.glyphMap,
                onPress: () => {
                  if (me?.sub) {
                    router.push(`/employee/${me.sub}`);
                    return;
                  }
                  router.push("/settings");
                },
              },
              {
                key: "bell",
                icon: "bell" as keyof typeof Feather.glyphMap,
                onPress: () => router.push("/notifications"),
              },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={item.icon} size={15} color={theme.mutedForeground} />
            </Pressable>
          ))}
        </View>
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 11,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
          }}
        >
          {todayLabel}
        </Text>
      </View>

      <View style={{ alignSelf: "stretch", alignItems: rtl ? "flex-end" : "flex-start", gap: 2 }}>
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 14,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {periodTitle}
        </Text>
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Inter_700Bold",
            color: theme.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {fullName}
        </Text>
        {data?.employee?.departmentName ? (
          <Text
            style={{
              color: theme.primary,
              marginTop: 2,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {data.employee.departmentName}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          alignSelf: "stretch",
          borderRadius: 22,
          padding: 12,
          backgroundColor: heroBg,
          gap: 10,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.18)",
              maxWidth: "78%",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium" }} numberOfLines={1}>
              {data?.employee?.departmentName || t("home.defaultDepartment")}
            </Text>
          </View>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: rtl ? "row-reverse" : "row",
              gap: 6,
            }}
          >
            <Feather name={periodIcon} size={13} color="#fff" />
          </View>
        </View>

        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <Text style={{ color: "#fff", fontSize: 30, fontFamily: "Inter_700Bold" }}>{nowLabel}</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 6 }}>06:00</Text>
        </View>

        <Pressable
          onPress={() => quickPunch.mutate()}
          disabled={quickPunch.isPending}
          style={{
            borderRadius: 14,
            backgroundColor: heroSecondaryBg,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            opacity: quickPunch.isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
            {quickPunch.isPending ? t("home.quickPunchLoading") : t("home.quickPunchAction")}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8, alignSelf: "stretch" }}>
        {actionCards.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 10,
              alignItems: "center",
              gap: 5,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={item.icon} size={14} color={theme.primary} />
            </View>
            <Text
              style={{
                color: theme.foreground,
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ alignSelf: "stretch", gap: 10 }}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            style={{
              color: theme.foreground,
              fontSize: 22,
              fontFamily: "Inter_700Bold",
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("home.myRequestsTitle")}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/requests")}
            style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
          >
            <Feather name={rtl ? "arrow-left" : "arrow-right"} size={14} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold" }}>
              {t("home.viewAll")}
            </Text>
          </Pressable>
        </View>

        {requests.length === 0 && !q.isLoading ? (
          <View
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              padding: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.mutedForeground }}>{t("home.noRequests")}</Text>
          </View>
        ) : null}

        {requests.map((r) => {
          const k = statusKey(r.status);
          return (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/request/${r.id}`)}
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                padding: 13,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text
                  style={{
                    color: theme.foreground,
                    fontSize: 18,
                    fontFamily: "Inter_700Bold",
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {r.typeName || t("home.defaultRequest")}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: `${theme.warning}22`,
                  }}
                >
                  <Text
                    style={{
                      color: theme.warning,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {k ? t(k) : r.status || t("requests.statusPending")}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: rtl ? "row-reverse" : "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 13,
                    textAlign: alignStart(rtl),
                    writingDirection: "ltr",
                  }}
                >
                  {`#${r.id}`}
                </Text>
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 13,
                    textAlign: rtl ? "left" : "right",
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {r.createdAt ? formatDateTime(r.createdAt) : ""}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
