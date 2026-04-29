import { Feather } from "@expo/vector-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, Loading, SectionHeader, StatCard, styles as s, theme } from "@/components/UI";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
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

type AttendanceDay = {
  date: string;
  status: "present" | "late" | "absent" | "leave" | "not_recorded";
  workedMinutes?: number | null;
};
type AttendanceResp = { days: AttendanceDay[] };

type TasksResp = { tasks?: any[] } | any[];
type RequestsResp = { mine?: any[]; inbox?: any[] };

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export default function ReportsScreen() {
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const reportsQ = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const r = await api.get<Reports>("/api/employee/reports");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const [attQ, tasksQ, reqQ] = useQueries({
    queries: [
      {
        queryKey: ["attendance", year, month],
        queryFn: async () => {
          const r = await api.get<AttendanceResp>(
            `/api/employee/attendance?year=${year}&month=${month}`,
          );
          if (!r.ok) throw new Error(r.error);
          return r.data;
        },
      },
      {
        queryKey: ["tasks"],
        queryFn: async () => {
          const r = await api.get<TasksResp>("/api/employee/tasks");
          if (!r.ok) throw new Error(r.error);
          return r.data;
        },
      },
      {
        queryKey: ["requests"],
        queryFn: async () => {
          const r = await api.get<RequestsResp>("/api/employee/requests");
          if (!r.ok) throw new Error(r.error);
          return r.data;
        },
      },
    ],
  });

  const isRefreshing =
    reportsQ.isFetching || attQ.isFetching || tasksQ.isFetching || reqQ.isFetching;
  const refetchAll = () => {
    reportsQ.refetch();
    attQ.refetch();
    tasksQ.refetch();
    reqQ.refetch();
  };

  const d = reportsQ.data || {};

  const tasks: any[] = useMemo(() => {
    const raw = tasksQ.data;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : raw.tasks || [];
  }, [tasksQ.data]);

  const tasksDone = useMemo(
    () => tasks.filter((it) => it.status === "done" || it.status === "completed").length,
    [tasks],
  );
  const tasksOpen = useMemo(
    () => tasks.filter((it) => it.status !== "done" && it.status !== "completed").length,
    [tasks],
  );
  const tasksTotal = tasks.length;
  const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const reqMine = reqQ.data?.mine || [];
  const reqApproved = reqMine.filter((r: any) => r.status === "approved" || r.status === "completed").length;
  const reqInReview = reqMine.filter((r: any) => r.status === "in_review" || r.status === "pending").length;
  const reqRejected = reqMine.filter(
    (r: any) => r.status === "rejected" || r.status === "returned" || r.status === "cancelled",
  ).length;

  // Weekly hours: aggregate workedMinutes per weekday for the current week.
  const weeklyHours = useMemo(() => {
    const days = attQ.data?.days || [];
    const weekStart = startOfWeek(today);
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    for (const day of days) {
      const dt = new Date(day.date);
      if (dt < weekStart) continue;
      const idx = dt.getDay();
      const mins = day.workedMinutes || 0;
      buckets[idx] += mins;
    }
    return buckets.map((m) => Math.round((m / 60) * 10) / 10);
  }, [attQ.data, today]);

  const totalWeeklyHours = weeklyHours.reduce((a, b) => a + b, 0);
  const hasAttendance = (attQ.data?.days?.length || 0) > 0;

  const weekdays = t("attendance.weekdays", { returnObjects: true }) as string[];

  const presentDays = d.attendancePresentDays ?? 0;
  const lateDays = d.attendanceLateDays ?? 0;

  // Achievements
  const badges = useMemo(() => {
    const list: Array<{ key: string; title: string; hint: string; icon: keyof typeof Feather.glyphMap; color: string }> = [];
    if (presentDays > 0 && lateDays === 0) {
      list.push({
        key: "perfect",
        title: t("reports.badgePerfectAttendance"),
        hint: t("reports.badgePerfectAttendanceHint"),
        icon: "award",
        color: theme.success,
      });
    }
    if (tasksDone >= 10) {
      list.push({
        key: "taskMaster",
        title: t("reports.badgeTaskMaster"),
        hint: t("reports.badgeTaskMasterHint"),
        icon: "check-square",
        color: theme.primary,
      });
    }
    if (lateDays > 0 && lateDays < 2) {
      list.push({
        key: "onTime",
        title: t("reports.badgeOnTime"),
        hint: t("reports.badgeOnTimeHint"),
        icon: "clock",
        color: theme.info,
      });
    }
    if (totalWeeklyHours >= 40) {
      list.push({
        key: "productive",
        title: t("reports.badgeProductive"),
        hint: t("reports.badgeProductiveHint"),
        icon: "trending-up",
        color: theme.warning,
      });
    }
    return list;
  }, [presentDays, lateDays, tasksDone, totalWeeklyHours, t]);

  const isInitialLoading = reportsQ.isLoading && !reportsQ.data;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={theme.primary} />
      }
    >
      <SectionHeader
        title={t("reports.section")}
        subtitle={d.periodLabel || t("reports.subtitle")}
      />

      {isInitialLoading ? <Loading /> : null}

      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("reports.approved")} value={d.requestsApproved ?? reqApproved} icon="check-circle" tone="success" />
        <StatCard label={t("reports.pending")} value={d.requestsInReview ?? reqInReview} icon="loader" tone="warning" />
      </View>
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("reports.tasksDone")} value={d.tasksDone ?? tasksDone} icon="check-square" tone="success" />
        <StatCard label={t("reports.tasksOpen")} value={d.tasksOpen ?? tasksOpen} icon="circle" tone="primary" />
      </View>
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("reports.presentDays")} value={presentDays} icon="calendar" tone="primary" />
        <StatCard label={t("reports.lateDays")} value={lateDays} icon="clock" tone="warning" />
      </View>

      {/* Tasks donut */}
      <Card style={{ alignSelf: "stretch", gap: 12 }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 16,
            color: theme.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
          }}
        >
          {t("reports.tasksOverview")}
        </Text>
        <View
          style={{
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          <DonutChart
            size={140}
            thickness={18}
            centerValue={`${completionRate}%`}
            centerLabel={t("reports.tasksCompletionRate")}
            segments={[
              { value: tasksDone, color: theme.success, label: t("reports.legendCompleted") },
              { value: tasksOpen, color: theme.primary, label: t("reports.legendOpen") },
            ]}
          />
          <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
            <LegendRow color={theme.success} label={t("reports.legendCompleted")} value={tasksDone} />
            <LegendRow color={theme.primary} label={t("reports.legendOpen")} value={tasksOpen} />
          </View>
        </View>
      </Card>

      {/* Requests donut */}
      {(reqApproved + reqInReview + reqRejected) > 0 ? (
        <Card style={{ alignSelf: "stretch", gap: 12 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: theme.foreground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("reports.requestsOverview")}
          </Text>
          <View
            style={{
              flexDirection: rtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <DonutChart
              size={140}
              thickness={18}
              centerValue={reqMine.length}
              centerLabel={t("requests.totalMine")}
              segments={[
                { value: reqApproved, color: theme.success },
                { value: reqInReview, color: theme.warning },
                { value: reqRejected, color: theme.destructive },
              ]}
            />
            <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
              <LegendRow color={theme.success} label={t("reports.legendApproved")} value={reqApproved} />
              <LegendRow color={theme.warning} label={t("reports.legendInReview")} value={reqInReview} />
              <LegendRow color={theme.destructive} label={t("requests.statusRejected")} value={reqRejected} />
            </View>
          </View>
        </Card>
      ) : null}

      {/* Weekly hours bar chart */}
      <Card style={{ alignSelf: "stretch", gap: 12 }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 16,
            color: theme.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
          }}
        >
          {t("reports.weeklyHours")}
        </Text>
        {hasAttendance ? (
          <BarChart
            data={weeklyHours.map((h, i) => ({
              label: weekdays[i] || "",
              value: h,
            }))}
            valueFormatter={(v) => (v > 0 ? `${v}${t("reports.hourSuffix")}` : "")}
            barColor={theme.primary}
          />
        ) : (
          <Text
            style={{
              color: theme.mutedForeground,
              fontSize: 13,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("reports.noAttendanceData")}
          </Text>
        )}
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 12,
            lineHeight: 18,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
          }}
        >
          {t("reports.weeklyHoursHint")}
        </Text>
      </Card>

      {/* Achievements */}
      <Card style={{ alignSelf: "stretch", gap: 12 }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 16,
            color: theme.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
          }}
        >
          {t("reports.achievements")}
        </Text>
        {badges.length === 0 ? (
          <Text
            style={{
              color: theme.mutedForeground,
              fontSize: 13,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("reports.noBadges")}
          </Text>
        ) : (
          badges.map((b) => (
            <View
              key={b.key}
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                gap: 12,
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                backgroundColor: `${b.color}14`,
                borderWidth: 1,
                borderColor: `${b.color}33`,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${b.color}26`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={b.icon} size={18} color={b.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 14,
                    color: theme.foreground,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {b.title}
                </Text>
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 12,
                    marginTop: 2,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {b.hint}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={{ alignSelf: "stretch" }}>
        <Text
          style={{
            color: theme.mutedForeground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
            fontSize: 12,
          }}
        >
          {t("reports.footer")}
        </Text>
      </Card>
    </ScrollView>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  const rtl = useIsRTL();
  return (
    <View
      style={{
        flexDirection: rtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text
        style={{
          flex: 1,
          color: theme.foreground,
          fontSize: 13,
          fontFamily: "Inter_500Medium",
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
        }}
      >
        {label}
      </Text>
      <Text style={{ color: theme.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
        {value}
      </Text>
    </View>
  );
}
