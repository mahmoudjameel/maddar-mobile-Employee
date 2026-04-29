import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, Loading, SectionHeader, StatCard, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type Reports = {
  periodLabel?: string;
  tasksDone?: number;
  tasksOpen?: number;
  requestsApproved?: number;
  requestsInReview?: number;
  attendancePresentDays?: number;
  attendanceLateDays?: number;
};

export default function ReportsScreen() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const q = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const r = await api.get<Reports>("/api/employee/reports");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const d = q.data || {};

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <SectionHeader
        title={t("reports.section")}
        subtitle={d.periodLabel || t("reports.subtitle")}
      />

      {q.isLoading ? <Loading /> : null}

      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("reports.approved")} value={d.requestsApproved ?? 0} icon="check-circle" tone="success" />
        <StatCard label={t("reports.pending")} value={d.requestsInReview ?? 0} icon="loader" tone="warning" />
      </View>
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("reports.tasksDone")} value={d.tasksDone ?? 0} icon="check-square" tone="success" />
        <StatCard label={t("reports.tasksOpen")} value={d.tasksOpen ?? 0} icon="circle" tone="primary" />
      </View>
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("reports.presentDays")} value={d.attendancePresentDays ?? 0} icon="calendar" />
        <StatCard label={t("reports.lateDays")} value={d.attendanceLateDays ?? 0} icon="clock" tone="warning" />
      </View>

      <Card style={{ alignSelf: "stretch" }}>
        <Text
          style={{
            color: theme.mutedForeground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {t("reports.footer")}
        </Text>
      </Card>
    </ScrollView>
  );
}
