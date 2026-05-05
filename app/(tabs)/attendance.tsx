import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import { Button, Card, Loading, SectionHeader, StatCard, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";
import { getOptionalCurrentCoordinates } from "@/lib/location";

type AttendanceDay = {
  date: string;
  status: "present" | "late" | "absent" | "leave" | "not_recorded";
  checkIn?: string | null;
  checkOut?: string | null;
  workedMinutes?: number | null;
  notes?: string | null;
};
type AttendanceResp = { days: AttendanceDay[] };

const statusBg: Record<AttendanceDay["status"], string> = {
  present: "#dcfce7",
  late: "#fef3c7",
  absent: "#fee2e2",
  leave: "#dbeafe",
  not_recorded: "#f1f5f9",
};
const statusColor: Record<AttendanceDay["status"], string> = {
  present: "#15803d",
  late: "#b45309",
  absent: "#b91c1c",
  leave: "#1d4ed8",
  not_recorded: "#64748b",
};

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(today.toISOString().slice(0, 10));

  const months = t("attendance.months", { returnObjects: true }) as string[];
  const weekdays = t("attendance.weekdays", { returnObjects: true }) as string[];

  const statusLabel: Record<AttendanceDay["status"], string> = {
    present: t("attendance.statusPresent"),
    late: t("attendance.statusLate"),
    absent: t("attendance.statusAbsent"),
    leave: t("attendance.statusLeave"),
    not_recorded: "—",
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["attendance", year, month],
    queryFn: async () => {
      const r = await api.get<AttendanceResp>(`/api/employee/attendance?year=${year}&month=${month}`);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const fingerprintQ = useQuery({
    queryKey: ["fingerprint-mode"],
    queryFn: async () => {
      const r = await api.get<{ enabled: boolean }>("/api/employee/attendance/fingerprint-mode");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const punch = useMutation({
    mutationFn: async () => {
      const coords = await getOptionalCurrentCoordinates();
      if (!coords) {
        // Avoid surfacing raw CoreLocation errors; show a clear UX message instead.
        throw new Error("LOCATION_NOT_AVAILABLE");
      }

      const lat = coords.latitude;
      const lng = coords.longitude;

      const r = await api.post<{ action: string; recordedAt: string; message: string }>(
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(t("newRequest.successTitle"), d.message || t("attendance.checkInSuccess"));
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg =
        e?.message === "LOCATION_NOT_AVAILABLE"
          ? t("attendance.locationRequired")
          : e?.message || t("newRequest.errorMsg");
      showAlert(t("attendance.checkInError"), msg);
    },
  });

  const grid = useMemo(() => buildGrid(year, month, data?.days || []), [year, month, data]);
  const selectedDay = data?.days.find((d) => d.date === selected) || null;

  const stats = useMemo(() => {
    const days = data?.days || [];
    return {
      total: days.length,
      present: days.filter((d) => d.status === "present").length,
      late: days.filter((d) => d.status === "late").length,
      absent: days.filter((d) => d.status === "absent").length,
    };
  }, [data]);

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

  const rtl = useIsRTL();
  const prevIcon = rtl ? "chevron-right" : "chevron-left";
  const nextIcon = rtl ? "chevron-left" : "chevron-right";

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => refetch()} tintColor={theme.primary} />}
    >
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <SectionHeader title={t("attendance.title")} subtitle={t("attendance.subtitle")} />

      <Button
        title={fingerprintQ.data?.enabled ? t("attendance.checkIn") : t("attendance.checkInTest")}
        icon="check-circle"
        onPress={() => punch.mutate()}
        loading={punch.isPending}
        fullWidth
      />

      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("attendance.totalRecords")} value={stats.total} icon="calendar" />
        <StatCard label={t("attendance.presentDays")} value={stats.present} icon="check" tone="success" />
      </View>
      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("attendance.lateDays")} value={stats.late} icon="clock" tone="warning" />
        <StatCard label={t("attendance.absentDays")} value={stats.absent} icon="x" tone="destructive" />
      </View>

      <Card style={{ gap: 12, alignSelf: "stretch" }}>
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
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: theme.foreground, textAlign: alignStart(rtl), writingDirection: writeDir(rtl), width: "100%" }}>
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

        {isLoading ? (
          <Loading />
        ) : (
          grid.map((week, wi) => (
            <View key={wi} style={{ flexDirection: rtl ? "row-reverse" : "row" }}>
              {week.map((cell, ci) => {
                if (!cell) return <View key={ci} style={{ flex: 1, aspectRatio: 1, margin: 2 }} />;
                const isSelected = selected === cell.date;
                const bg = statusBg[cell.status];
                const fg = statusColor[cell.status];
                return (
                  <Pressable
                    key={ci}
                    onPress={() => setSelected(cell.date)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      margin: 2,
                      borderRadius: 10,
                      backgroundColor: bg,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: theme.primary,
                    }}
                  >
                    <Text style={{ color: fg, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{cell.day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionHeader title={t("attendance.dayDetails")} subtitle={selected || ""} />
        {!selectedDay ? (
          <Text
            style={{
              color: theme.mutedForeground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
            }}
          >
            {t("attendance.selectDay")}
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            <Row
              rtl={rtl}
              label={t("attendance.status")}
              value={statusLabel[selectedDay.status]}
              valueColor={statusColor[selectedDay.status]}
            />
            <Row rtl={rtl} label={t("attendance.in")} value={selectedDay.checkIn ? formatTime(selectedDay.checkIn) : "—"} />
            <Row rtl={rtl} label={t("attendance.out")} value={selectedDay.checkOut ? formatTime(selectedDay.checkOut) : "—"} />
            <Row
              rtl={rtl}
              label={t("attendance.workHours")}
              value={
                selectedDay.workedMinutes
                  ? `${Math.round(selectedDay.workedMinutes / 6) / 10} ${t("attendance.hour")}`
                  : "—"
              }
            />
            {selectedDay.notes ? <Row rtl={rtl} label={t("attendance.notes")} value={selectedDay.notes} /> : null}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function Row({ rtl, label, value, valueColor }: { rtl: boolean; label: string; value: string; valueColor?: string }) {
  return (
    <View
      style={{
        flexDirection: rtl ? "row-reverse" : "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Text style={{ color: theme.mutedForeground, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }}>
        {label}
      </Text>
      <Text
        style={{
          color: valueColor || theme.foreground,
          fontFamily: "Inter_600SemiBold",
          textAlign: rtl ? "left" : "right",
          writingDirection: rtl ? "rtl" : "ltr",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function buildGrid(year: number, month: number, days: AttendanceDay[]) {
  const map = new Map(days.map((d) => [d.date, d] as const));
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const startWeekday = first.getDay();
  type Cell = { day: number; date: string; status: AttendanceDay["status"] } | null;
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
