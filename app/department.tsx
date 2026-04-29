import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge, Card, EmptyState, Loading, SectionHeader, StatCard, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type Dept = {
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  managerName?: string | null;
  isDepartmentManager?: boolean;
  colleagues?: Array<{ id: string; fullName?: string; jobTitle?: string; status?: string }>;
  departmentTasks?: Array<{ id: string; title?: string; status?: string }>;
};

export default function DepartmentScreen() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const q = useQuery({
    queryKey: ["department"],
    queryFn: async () => {
      const r = await api.get<Dept>("/api/employee/department");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const d = q.data;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <SectionHeader title={t("department.title")} subtitle={t("department.subtitle")} />

      {q.isLoading ? <Loading /> : null}

      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("department.name")} value={d?.departmentName || "—"} icon="briefcase" tone="primary" />
      </View>
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("department.code")} value={d?.departmentCode || "—"} icon="hash" />
        <StatCard label={t("department.colleagueCount")} value={d?.colleagues?.length ?? 0} icon="users" />
      </View>

      <Card style={{ gap: 8, alignSelf: "stretch" }}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <Feather name="award" size={16} color={theme.primary} />
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              color: theme.foreground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("department.manager")}
          </Text>
          {d?.isDepartmentManager ? <Badge text={t("department.youAreManager")} tone="primary" /> : null}
        </View>
        {d?.managerName ? (
          <Text
            style={{
              color: theme.foreground,
              fontFamily: "Inter_600SemiBold",
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              marginTop: 4,
            }}
          >
            {d.managerName}
          </Text>
        ) : (
          <Text
            style={{
              color: theme.mutedForeground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("department.noManager")}
          </Text>
        )}
      </Card>

      <Card style={{ gap: 12, alignSelf: "stretch" }}>
        <SectionHeader title={t("department.colleagues")} />
        {!d?.colleagues || d.colleagues.length === 0 ? (
          <EmptyState icon="users" title={t("department.noColleagues")} />
        ) : (
          d.colleagues.map((c, idx) => (
            <View
              key={c.id}
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: idx === (d.colleagues!.length - 1) ? 0 : 1,
                borderBottomColor: theme.border,
                alignSelf: "stretch",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold" }}>
                  {(c.fullName || "?").trim().charAt(0)}
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
                  {c.fullName || "—"}
                </Text>
                {c.jobTitle ? (
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
                    {c.jobTitle}
                  </Text>
                ) : null}
              </View>
              <Badge
                text={
                  c.status === "active"
                    ? t("department.active")
                    : c.status === "leave"
                      ? t("department.onLeave")
                      : c.status || "—"
                }
                tone={c.status === "active" ? "success" : c.status === "leave" ? "warning" : "default"}
              />
            </View>
          ))
        )}
      </Card>

      {d?.departmentTasks && d.departmentTasks.length > 0 ? (
        <Card style={{ gap: 8, alignSelf: "stretch" }}>
          <SectionHeader title={t("department.departmentTasks")} />
          {d.departmentTasks.map((task, idx) => (
            <View
              key={task.id}
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                borderBottomWidth: idx === d.departmentTasks!.length - 1 ? 0 : 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: theme.foreground,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                }}
              >
                {task.title || "—"}
              </Text>
              <Badge text={task.status || "—"} />
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}
