import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge, Card, EmptyState, Loading, SectionHeader, StatCard, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type EmpResp = {
  employee?: { id: string; fullName?: string; jobTitle?: string; departmentName?: string; email?: string; phone?: string };
  tasks?: Array<{ id: string; title?: string; status?: string }>;
  attendance?: { presentDays?: number; lateDays?: number; absentDays?: number };
  leaveRequests?: Array<{ id: string; startDate?: string; endDate?: string; status?: string }>;
};

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const rtl = useIsRTL();

  const q = useQuery({
    queryKey: ["my-employee", id],
    queryFn: async () => {
      const r = await api.get<EmpResp>(`/api/employee/my-employees/${id}`);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    enabled: !!id,
  });

  const e = q.data?.employee;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scrollContent}>
      {q.isLoading ? <Loading /> : null}
      {e ? (
        <Card style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 14, alignSelf: "stretch" }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.secondary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 22 }}>
              {(e.fullName || "?").trim().charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 17,
                color: theme.foreground,
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
                fontSize: 13,
                textAlign: alignStart(rtl),
                writingDirection: writeDir(rtl),
                marginTop: 2,
                width: "100%",
              }}
            >
              {[e.jobTitle, e.departmentName].filter(Boolean).join(" · ") || "—"}
            </Text>
            {e.email ? (
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
                {e.email}
              </Text>
            ) : null}
          </View>
        </Card>
      ) : null}

      <SectionHeader title={t("employee.attendanceSummary")} />
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("employee.present")} value={q.data?.attendance?.presentDays ?? 0} icon="check" tone="success" />
        <StatCard label={t("employee.late")} value={q.data?.attendance?.lateDays ?? 0} icon="clock" tone="warning" />
        <StatCard label={t("employee.absent")} value={q.data?.attendance?.absentDays ?? 0} icon="x" tone="destructive" />
      </View>

      <Card style={{ gap: 8, alignSelf: "stretch" }}>
        <SectionHeader title={t("employee.tasks")} />
        {!q.data?.tasks || q.data.tasks.length === 0 ? (
          <EmptyState icon="check-square" title={t("employee.noTasks")} />
        ) : (
          q.data.tasks.map((task) => (
            <View
              key={task.id}
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.foreground,
                  fontFamily: "Inter_500Medium",
                  flex: 1,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                }}
              >
                {task.title || "—"}
              </Text>
              <Badge text={task.status || "—"} />
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: 8, alignSelf: "stretch" }}>
        <SectionHeader title={t("employee.leaveRequests")} />
        {!q.data?.leaveRequests || q.data.leaveRequests.length === 0 ? (
          <EmptyState icon="calendar" title={t("employee.noLeaveRequests")} />
        ) : (
          q.data.leaveRequests.map((l) => (
            <View
              key={l.id}
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: theme.foreground,
                  flex: 1,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                }}
              >
                {formatDate(l.startDate)} → {formatDate(l.endDate)}
              </Text>
              <Badge text={l.status || "—"} />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
