import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Loading, SectionHeader, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type Resp = {
  canManage?: boolean;
  employees?: Array<{ id: string; fullName?: string; jobTitle?: string; departmentName?: string }>;
};

export default function TeamScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const rtl = useIsRTL();

  const q = useQuery({
    queryKey: ["my-employees"],
    queryFn: async () => {
      const r = await api.get<Resp>("/api/employee/my-employees");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <SectionHeader title={t("team.title")} subtitle={t("team.subtitle")} />

      {q.isLoading ? <Loading /> : null}

      {q.data && q.data.canManage === false ? (
        <Card>
          <EmptyState icon="users" title={t("team.noPermissions")} subtitle={t("team.noPermissionsHint")} />
        </Card>
      ) : !q.data?.employees || q.data.employees.length === 0 ? (
        <Card>
          <EmptyState icon="users" title={t("team.noMembers")} />
        </Card>
      ) : (
        q.data.employees.map((e) => (
          <Pressable key={e.id} onPress={() => router.push(`/employee/${e.id}`)}>
            <Card
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 12,
                alignSelf: "stretch",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold" }}>
                  {(e.fullName || "?").trim().charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: theme.foreground,
                    fontFamily: "Inter_600SemiBold",
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    width: "100%",
                  }}
                >
                  {e.fullName || "—"}
                </Text>
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 12,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    marginTop: 2,
                    width: "100%",
                  }}
                >
                  {[e.jobTitle, e.departmentName].filter(Boolean).join(" · ") || "—"}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
