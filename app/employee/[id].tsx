import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Loading,
  SectionHeader,
  StatCard,
  styles as s,
  theme,
} from "@/components/UI";
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

type CalendarDay = {
  date: string;
  status?: "present" | "late" | "absent" | "leave" | "not_recorded" | string;
  checkIn?: string | null;
  checkOut?: string | null;
};

type CalendarResp =
  | { days?: CalendarDay[]; calendar?: CalendarDay[]; year?: number; month?: number }
  | CalendarDay[];

type Priority = "low" | "medium" | "high" | "urgent";

const statusBg: Record<string, string> = {
  present: "#dcfce7",
  late: "#fef3c7",
  absent: "#fee2e2",
  leave: "#dbeafe",
  not_recorded: "#f1f5f9",
};
const statusColor: Record<string, string> = {
  present: "#15803d",
  late: "#b45309",
  absent: "#b91c1c",
  leave: "#1d4ed8",
  not_recorded: "#64748b",
};

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const qc = useQueryClient();
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const months = t("attendance.months", { returnObjects: true }) as string[];
  const weekdays = t("attendance.weekdays", { returnObjects: true }) as string[];

  const q = useQuery({
    queryKey: ["my-employee", id],
    queryFn: async () => {
      const r = await api.get<EmpResp>(`/api/employee/my-employees/${id}`);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    enabled: !!id,
  });

  const calQ = useQuery({
    queryKey: ["my-employee-calendar", id, year, month],
    queryFn: async () => {
      const r = await api.get<CalendarResp>(
        `/api/employee/my-employees/${id}/attendance-calendar?year=${year}&month=${month}`,
      );
      if (!r.ok) throw new Error(r.error);
      const data: any = r.data;
      const list: CalendarDay[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.days)
          ? data.days
          : Array.isArray(data?.calendar)
            ? data.calendar
            : [];
      return list;
    },
    enabled: !!id,
  });

  const grid = useMemo(() => buildGrid(year, month, calQ.data || []), [year, month, calQ.data]);

  const assignTask = useMutation({
    mutationFn: async () => {
      const title = taskTitle.trim();
      if (!title) throw new Error(t("employee.assignTaskTitleRequired"));
      const body: Record<string, unknown> = { title };
      const desc = taskDescription.trim();
      if (desc) body.description = desc;
      if (taskPriority) body.priority = taskPriority;
      const due = taskDueDate.trim();
      if (due) body.dueDate = due;
      const r = await api.post(`/api/employee/my-employees/${id}/tasks`, body);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskDueDate("");
      qc.invalidateQueries({ queryKey: ["my-employee", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      showAlert(t("newRequest.successTitle"), t("employee.assignTaskSuccess"));
    },
    onError: (e: any) => {
      showAlert(t("employee.assignTaskError"), e?.message || t("newRequest.errorMsg"));
    },
  });

  const goPrev = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else setMonth(month + 1);
  };

  const prevIcon = rtl ? "chevron-right" : "chevron-left";
  const nextIcon = rtl ? "chevron-left" : "chevron-right";

  const e = q.data?.employee;

  const priorities: Array<{ key: Priority; labelKey: string }> = [
    { key: "low", labelKey: "tasks.priorityLow" },
    { key: "medium", labelKey: "tasks.priorityMedium" },
    { key: "high", labelKey: "tasks.priorityHigh" },
    { key: "urgent", labelKey: "tasks.priorityUrgent" },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scrollContent}>
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
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

      <Card style={{ gap: 12, alignSelf: "stretch" }}>
        <SectionHeader title={t("employee.attendanceCalendar")} />
        <View
          style={{
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable onPress={goPrev} hitSlop={8} style={{ padding: 6 }}>
            <Feather name={prevIcon} size={22} color={theme.foreground} />
          </Pressable>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: theme.foreground,
              textAlign: "center",
            }}
          >
            {months[month - 1]} {year}
          </Text>
          <Pressable onPress={goNext} hitSlop={8} style={{ padding: 6 }}>
            <Feather name={nextIcon} size={22} color={theme.foreground} />
          </Pressable>
        </View>

        <View style={{ flexDirection: rtl ? "row-reverse" : "row" }}>
          {weekdays.map((w) => (
            <View key={w} style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{w.slice(0, 3)}</Text>
            </View>
          ))}
        </View>

        {calQ.isLoading ? (
          <Loading />
        ) : grid.every((week) => week.every((cell) => !cell)) ? (
          <EmptyState icon="calendar" title={t("employee.noCalendar")} />
        ) : (
          grid.map((week, wi) => (
            <View key={wi} style={{ flexDirection: rtl ? "row-reverse" : "row" }}>
              {week.map((cell, ci) => {
                if (!cell) return <View key={ci} style={{ flex: 1, aspectRatio: 1, margin: 2 }} />;
                const status = cell.status || "not_recorded";
                const bg = statusBg[status] || statusBg.not_recorded;
                const fg = statusColor[status] || statusColor.not_recorded;
                return (
                  <View
                    key={ci}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      margin: 2,
                      borderRadius: 10,
                      backgroundColor: bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: fg, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{cell.day}</Text>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </Card>

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

      <Card style={{ gap: 12, alignSelf: "stretch" }}>
        <SectionHeader title={t("employee.assignTask")} />
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: theme.foreground,
              fontFamily: "Inter_500Medium",
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("employee.assignTaskTitle")} <Text style={{ color: theme.destructive }}>*</Text>
          </Text>
          <Input
            value={taskTitle}
            onChangeText={setTaskTitle}
            placeholder={t("employee.assignTaskTitlePh")}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: theme.foreground,
              fontFamily: "Inter_500Medium",
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("employee.assignTaskDescription")}
          </Text>
          <Input
            value={taskDescription}
            onChangeText={setTaskDescription}
            placeholder={t("employee.assignTaskDescriptionPh")}
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: theme.foreground,
              fontFamily: "Inter_500Medium",
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("employee.assignTaskPriority")}
          </Text>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
            {priorities.map((p) => {
              const active = taskPriority === p.key;
              return (
                <Pressable key={p.key} onPress={() => setTaskPriority(p.key)}>
                  <View
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.secondary : theme.card,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? theme.primary : theme.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                      }}
                    >
                      {t(p.labelKey)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: theme.foreground,
              fontFamily: "Inter_500Medium",
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("employee.assignTaskDueDate")}
          </Text>
          <Input
            value={taskDueDate}
            onChangeText={setTaskDueDate}
            placeholder={t("employee.assignTaskDueDatePh")}
            autoCapitalize="none"
          />
        </View>

        <Button
          title={t("employee.assignTaskSubmit")}
          icon="plus"
          onPress={() => assignTask.mutate()}
          loading={assignTask.isPending}
          fullWidth
        />
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

function buildGrid(year: number, month: number, days: CalendarDay[]) {
  const map = new Map(days.map((d) => [d.date, d] as const));
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const startWeekday = first.getDay();
  type Cell = { day: number; date: string; status: string } | null;
  const cells: Cell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = map.get(dateStr);
    cells.push({ day: d, date: dateStr, status: rec?.status || "not_recorded" });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
