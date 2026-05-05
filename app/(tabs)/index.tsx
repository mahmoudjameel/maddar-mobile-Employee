import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { changeLanguage, type SupportedLanguage } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";
import { getOptionalCurrentCoordinates } from "@/lib/location";

type QuickStat = { key: string; label: string; value: number; hint?: string };
type Overview = {
  generatedAt: string;
  employee?: { id: string; fullName?: string; jobTitle?: string; departmentName?: string };
  latestRequests?: Array<{ id: string; typeName?: string; status?: string; createdAt?: string }>;
  quickStats?: QuickStat[];
};

type ShiftStatus = "upcoming" | "ongoing" | "finished";
type NormalizedShift = {
  label: string;
  start: Date;
  end: Date;
  durationMs: number;
  status: ShiftStatus;
  startsInMs: number;
  endsInMs: number; // time left till end if ongoing, otherwise <=0
};

const TIME_ONLY_RE = /^(\d{1,2}):(\d{2})$/;

function parseDateLike(value: any, baseNow: Date): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== "string") return null;

  const s = value.trim();
  const asDate = new Date(s);
  if (!Number.isNaN(asDate.getTime())) return asDate;

  const m = s.match(TIME_ONLY_RE);
  if (m) {
    const [_, hh, mm] = m;
    const d = new Date(baseNow);
    d.setHours(Number(hh), Number(mm), 0, 0);
    return d;
  }

  return null;
}

function getFirst(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function extractShiftArray(raw: any): any[] {
  const candidates = [
    raw?.shifts,
    raw?.shiftTimes,
    raw?.duties,
    raw?.schedule?.shifts,
    raw?.calendar?.shifts,
    raw?.data?.shifts,
    raw?.items,
    raw?.data?.items,
  ];
  const found = candidates.find((c) => Array.isArray(c));
  if (found) return found;

  // Some backends return a single "current shift" object instead of an array.
  const singleCandidates = [
    raw?.currentShift,
    raw?.activeShift,
    raw?.todayShift,
    raw?.current?.shift,
    raw?.current?.duty,
    // `/attendance/work-hours` may return a single schedule object.
    raw,
  ];
  const single = singleCandidates.find(
    (c) =>
      c &&
      typeof c === "object" &&
      (getFirst(c, ["startAt", "startsAt", "startTime", "start"]) ||
        getFirst(c, ["endAt", "endsAt", "endTime", "end"])),
  );
  return single ? [single] : [];
}

function normalizeShift(raw: any, baseNow: Date): NormalizedShift | null {
  const startVal = getFirst(raw, [
    "startAt",
    "startsAt",
    "start",
    "from",
    "begin",
    "beginAt",
    "startTime",
    "start_time",
    "startDateTime",
    "startDate",
  ]);
  const endVal = getFirst(raw, [
    "endAt",
    "endsAt",
    "end",
    "to",
    "finish",
    "finishAt",
    "endTime",
    "end_time",
    "endDateTime",
    "endDate",
  ]);

  const start = parseDateLike(startVal, baseNow);
  const end = parseDateLike(endVal, baseNow);
  if (!start || !end) return null;

  const status: ShiftStatus =
    baseNow.getTime() < start.getTime()
      ? "upcoming"
      : baseNow.getTime() <= end.getTime()
        ? "ongoing"
        : "finished";

  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const startsInMs = start.getTime() - baseNow.getTime();
  const endsInMs = end.getTime() - baseNow.getTime();

  const label =
    getFirst(raw, ["label", "name", "title", "type", "shiftName", "dutyName"]) ||
    (status === "ongoing" ? "الدّوام" : status === "upcoming" ? "موعد الدوام" : "دوام سابق");

  return { label, start, end, durationMs, status, startsInMs, endsInMs };
}

function formatTime12h(date: Date, rtl: boolean) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value || "AM").toUpperCase();
  const suffix = rtl ? (period === "AM" ? "ص" : "م") : period;
  return `${hour}:${minute} ${suffix}`;
}

function formatHoursShort(ms: number, rtl: boolean): string {
  const safe = Math.max(0, ms);
  const hours = safe / 3_600_000;
  const rounded = Math.round(hours * 10) / 10; // 1 decimal
  const intOrOneDecimal = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return rtl ? `${intOrOneDecimal}س` : `${intOrOneDecimal}h`;
}

function formatCountdown(ms: number, rtl: boolean): string {
  const safe = Math.max(0, ms);
  const totalMinutes = Math.ceil(safe / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return rtl ? `${m}د` : `${m}m`;
  if (m === 0) return rtl ? `${h}س` : `${h}h`;
  return rtl ? `${h}س ${m}د` : `${h}h ${m}m`;
}

function toNumberOrNull(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toMsFromUnknownHours(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Assume hours when numeric in API docs for work-hours.
    return Math.max(0, value) * 3_600_000;
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, n) * 3_600_000;
  }
  return null;
}

function toMsFromUnknownMinutes(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value) * 60_000;
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, n) * 60_000;
  }
  return null;
}

function parseWorkHoursSummary(raw: any, baseNow: Date): { workMs: number; remainingMs: number } | null {
  if (!raw || typeof raw !== "object") return null;

  const workHours = getFirst(raw, [
    "workHours",
    "work_hours",
    "dailyWorkHours",
    "daily_work_hours",
    "totalHours",
    "total_hours",
  ]);
  const remainingHours = getFirst(raw, [
    "remainingHours",
    "remaining_hours",
    "hoursLeft",
    "hours_left",
    "leftHours",
  ]);

  const workMinutes = getFirst(raw, ["workMinutes", "work_minutes", "totalMinutes", "total_minutes"]);
  const remainingMinutes = getFirst(raw, [
    "remainingMinutes",
    "remaining_minutes",
    "minutesLeft",
    "minutes_left",
    "remainingToCompleteMinutes",
  ]);
  const requiredMinutes = getFirst(raw, ["requiredMinutes", "required_minutes"]);
  const status = String(getFirst(raw, ["status"]) || "").toLowerCase();

  const workMs =
    toMsFromUnknownMinutes(workMinutes) ??
    toMsFromUnknownMinutes(requiredMinutes) ??
    toMsFromUnknownHours(workHours);

  let remainingMs =
    toMsFromUnknownMinutes(remainingMinutes) ?? toMsFromUnknownHours(remainingHours);

  // API can return remainingToCompleteMinutes = null before check-in starts.
  if (remainingMs === null && workMs !== null && status === "not_started") {
    remainingMs = workMs;
  }

  // If API returns start/end only, derive from normalized active shift fallback elsewhere.
  if (workMs === null && remainingMs === null) return null;
  return { workMs: workMs ?? 0, remainingMs: remainingMs ?? 0 };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const rtl = useIsRTL();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const { resolved, setMode } = useThemeMode();

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

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

  const workHoursQ = useQuery({
    queryKey: ["attendance-work-hours"],
    queryFn: async () => {
      const r = await api.get<any>("/api/employee/attendance/work-hours");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const data = q.data;
  const fullName = data?.employee?.fullName || me?.email?.split("@")[0] || "";
  const now = useMemo(() => new Date(nowTick), [nowTick]);
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
      now.toLocaleTimeString(rtl ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [rtl, nowTick],
  );
  const requests = data?.latestRequests?.slice(0, 4) || [];

  const isDark = resolved === "dark";
  const currentLang: SupportedLanguage = i18n.language?.startsWith("en") ? "en" : "ar";

  const shifts = useMemo(() => {
    const raw = workHoursQ.data;
    if (!raw) return [];
    const arr = extractShiftArray(raw);
    return arr
      .map((item) => normalizeShift(item, now))
      .filter((s): s is NormalizedShift => Boolean(s))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [workHoursQ.data, nowTick, now]);

  const activeShift = useMemo<NormalizedShift | null>(() => {
    if (!shifts.length) return null;
    const ongoing = shifts.find((s) => s.status === "ongoing");
    if (ongoing) return ongoing;
    const upcoming = shifts.find((s) => s.status === "upcoming");
    if (upcoming) return upcoming;
    // If all are finished, show the last shift.
    return shifts[shifts.length - 1];
  }, [shifts]);

  const fallbackRemainingMs = activeShift
    ? activeShift.status === "upcoming"
      ? activeShift.startsInMs
      : activeShift.status === "ongoing"
        ? activeShift.endsInMs
        : 0
    : 0;
  const summary = useMemo(() => parseWorkHoursSummary(workHoursQ.data, now), [workHoursQ.data, nowTick]);
  const hasSummary = summary !== null;
  const workMs = summary?.workMs ?? (activeShift ? activeShift.durationMs : 0);
  const remainingMs = summary?.remainingMs ?? fallbackRemainingMs;
  const workHoursLabel = hasSummary || activeShift ? formatHoursShort(workMs, rtl) : "—";
  const remainingLabel = hasSummary || activeShift ? formatHoursShort(remainingMs, rtl) : "—";
  const workHoursRaw = workHoursQ.data || {};
  const dayLabel = getFirst(workHoursRaw, ["dayLabel"]) || "—";
  const sourceLabel = getFirst(workHoursRaw, ["source"]) || "—";
  const timezoneLabel = getFirst(workHoursRaw, ["timezone"]) || "—";
  const scheduleNameLabel = getFirst(workHoursRaw, ["scheduleName"]) || "—";
  const isWorkDay = Boolean(getFirst(workHoursRaw, ["isWorkDay"]));
  const statusValue = String(getFirst(workHoursRaw, ["status"]) || "").toLowerCase();
  const statusText =
    statusValue === "not_started"
      ? t("attendance.shiftStatusUpcoming")
      : statusValue === "completed"
        ? t("attendance.shiftStatusFinished")
        : statusValue === "in_progress" || statusValue === "ongoing"
          ? t("attendance.shiftStatusOngoing")
          : "—";

  const requiredMinutesNum = toNumberOrNull(getFirst(workHoursRaw, ["requiredMinutes", "required_minutes"]));
  const workedMinutesNum = toNumberOrNull(getFirst(workHoursRaw, ["workedMinutes", "worked_minutes"])) ?? 0;
  const remainingMinutesNumRaw = toNumberOrNull(
    getFirst(workHoursRaw, ["remainingToCompleteMinutes", "remaining_minutes"]),
  );
  const remainingMinutesNum =
    remainingMinutesNumRaw !== null
      ? remainingMinutesNumRaw
      : statusValue === "not_started" && requiredMinutesNum !== null
        ? requiredMinutesNum
        : 0;

  const requiredLabel =
    requiredMinutesNum !== null ? formatHoursShort(requiredMinutesNum * 60_000, rtl) : "—";
  const workedLabel = formatHoursShort(Math.max(0, workedMinutesNum) * 60_000, rtl);
  const remainingWorkLabel = formatHoursShort(Math.max(0, remainingMinutesNum) * 60_000, rtl);

  const checkInDate = parseDateLike(getFirst(workHoursRaw, ["checkInAt", "check_in_at"]), now);
  const checkOutDate = parseDateLike(getFirst(workHoursRaw, ["checkOutAt", "check_out_at"]), now);
  const checkInLabel = checkInDate ? formatTime12h(checkInDate, rtl) : "—";
  const checkOutLabel = checkOutDate ? formatTime12h(checkOutDate, rtl) : "—";
  const shiftStartDate = useMemo(() => {
    if (activeShift?.start) return activeShift.start;
    return parseDateLike(
      getFirst(workHoursQ.data, ["startTime", "start_time", "startAt", "startsAt", "start"]),
      now,
    );
  }, [activeShift, workHoursQ.data, nowTick]);
  const shiftEndDate = useMemo(() => {
    if (activeShift?.end) return activeShift.end;
    return parseDateLike(
      getFirst(workHoursQ.data, ["endTime", "end_time", "endAt", "endsAt", "end"]),
      now,
    );
  }, [activeShift, workHoursQ.data, nowTick]);
  const scheduleStartLabel = shiftStartDate ? formatTime12h(shiftStartDate, rtl) : "—";
  const scheduleEndLabel = shiftEndDate ? formatTime12h(shiftEndDate, rtl) : "—";
  const scheduleRangeTitle = t("attendance.scheduleRangeTitle", {
    defaultValue: rtl ? "وقت الدوام" : "Work time",
  });
  const remainingTitle = t("attendance.remainingTime", {
    defaultValue: rtl ? "المتبقي" : "Remaining",
  });

  const [langBusy, setLangBusy] = useState(false);

  const toggleTheme = () => void setMode(isDark ? "light" : "dark");
  const toggleLanguage = async () => {
    if (langBusy) return;
    const nextLang: SupportedLanguage = currentLang === "ar" ? "en" : "ar";
    setLangBusy(true);
    try {
      await changeLanguage(nextLang);
    } finally {
      setLangBusy(false);
    }
  };

  const quickPunch = useMutation({
    mutationFn: async () => {
      const coords = await getOptionalCurrentCoordinates();
      if (!coords) throw new Error("LOCATION_NOT_AVAILABLE");

      const lat = coords.latitude;
      const lng = coords.longitude;
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
      qc.invalidateQueries({ queryKey: ["attendance-work-hours"] });
    },
    onError: (e: any) => {
      const msg =
        e?.message === "LOCATION_NOT_AVAILABLE"
          ? t("attendance.locationRequired")
          : e?.message || t("newRequest.errorMsg");
      showAlert(t("attendance.checkInError"), msg);
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
      <Modal
        visible={scheduleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.30)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Pressable
            style={{ position: "absolute", inset: 0 }}
            onPress={() => setScheduleModalOpen(false)}
          />
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.foreground,
                  fontSize: 16,
                  fontFamily: "Inter_700Bold",
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                  flex: 1,
                }}
              >
                {t("attendance.scheduleTitle")}
              </Text>
              <Pressable onPress={() => setScheduleModalOpen(false)} style={{ padding: 8 }}>
                <Feather name="x" size={18} color={theme.mutedForeground} />
              </Pressable>
            </View>

            <View style={{ padding: 14, gap: 10 }}>
              {workHoursQ.isLoading ? (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : workHoursQ.isError ? (
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 13,
                    lineHeight: 20,
                    fontFamily: "Inter_500Medium",
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {String(workHoursQ.error instanceof Error ? workHoursQ.error.message : t("newRequest.errorMsg"))}
                </Text>
              ) : workHoursQ.data ? (
                <View style={{ gap: 10 }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 14,
                      padding: 12,
                      gap: 8,
                      backgroundColor: theme.card,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 14,
                        textAlign: alignStart(rtl),
                        writingDirection: writeDir(rtl),
                      }}
                    >
                      {dayLabel}
                    </Text>
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        textAlign: alignStart(rtl),
                        writingDirection: writeDir(rtl),
                      }}
                    >
                      {t("attendance.scheduleTitle")}: {scheduleNameLabel}
                    </Text>
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        textAlign: alignStart(rtl),
                        writingDirection: writeDir(rtl),
                      }}
                    >
                      {t("attendance.status")}: {statusText}
                    </Text>
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        textAlign: alignStart(rtl),
                        writingDirection: "ltr",
                      }}
                    >
                      {timezoneLabel} - {sourceLabel} - {isWorkDay ? "Work day" : "Off day"}
                    </Text>
                  </View>

                  <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.muted }}>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {t("attendance.in")}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2, textAlign: alignStart(rtl), writingDirection: "ltr" }}>
                        {shiftStartDate ? formatTime12h(shiftStartDate, rtl) : "—"}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.muted }}>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {t("attendance.out")}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2, textAlign: alignStart(rtl), writingDirection: "ltr" }}>
                        {shiftEndDate ? formatTime12h(shiftEndDate, rtl) : "—"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.muted }}>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {t("attendance.workHours")}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2, textAlign: alignStart(rtl), writingDirection: "ltr" }}>
                        {requiredLabel}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.muted }}>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {remainingTitle}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2, textAlign: alignStart(rtl), writingDirection: "ltr" }}>
                        {remainingWorkLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.muted }}>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {t("attendance.checkIn")}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2, textAlign: alignStart(rtl), writingDirection: "ltr" }}>
                        {checkInLabel}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.muted }}>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {t("attendance.out")}
                      </Text>
                      <Text style={{ color: theme.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2, textAlign: alignStart(rtl), writingDirection: "ltr" }}>
                        {checkOutLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : shifts.length ? (
                <ScrollView style={{ maxHeight: 320 }}>
                  {shifts.map((s, idx) => {
                    const statusText =
                      s.status === "upcoming"
                        ? t("attendance.shiftStatusUpcoming")
                        : s.status === "ongoing"
                          ? t("attendance.shiftStatusOngoing")
                          : t("attendance.shiftStatusFinished");

                    const startLine =
                      s.status === "upcoming"
                        ? `${t("attendance.startsIn")} ${formatCountdown(s.startsInMs, rtl)}`
                        : s.status === "ongoing"
                          ? `${t("attendance.startedAt")} ${formatTime12h(s.start, rtl)}`
                          : `${t("attendance.endsAt")} ${formatTime12h(s.end, rtl)}`;

                    return (
                      <View
                        key={`${s.start.getTime()}-${idx}`}
                        style={{
                          backgroundColor: theme.card,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 14,
                          padding: 12,
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.foreground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 14,
                            textAlign: alignStart(rtl),
                            writingDirection: writeDir(rtl),
                          }}
                        >
                          {s.label}
                        </Text>
                        <Text
                          style={{
                            color: theme.mutedForeground,
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            textAlign: alignStart(rtl),
                            writingDirection: "ltr",
                          }}
                        >
                          {formatTime12h(s.start, rtl)} - {formatTime12h(s.end, rtl)}
                        </Text>
                        <Text
                          style={{
                            color: theme.mutedForeground,
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            textAlign: alignStart(rtl),
                            writingDirection: writeDir(rtl),
                          }}
                        >
                          {startLine}
                        </Text>
                        <Text
                          style={{
                            color: s.status === "ongoing" ? theme.primary : theme.mutedForeground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                            alignSelf: rtl ? "flex-end" : "flex-start",
                            backgroundColor: s.status === "ongoing" ? theme.secondary : theme.muted,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                          }}
                        >
                          {statusText}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : hasSummary ? (
                <View
                  style={{
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 14,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: theme.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      textAlign: alignStart(rtl),
                      writingDirection: writeDir(rtl),
                    }}
                  >
                    {t("attendance.scheduleTitle")}
                  </Text>
                  <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        backgroundColor: theme.muted,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.mutedForeground,
                          fontSize: 11,
                          fontFamily: "Inter_500Medium",
                          textAlign: alignStart(rtl),
                          writingDirection: writeDir(rtl),
                        }}
                      >
                        {t("attendance.workHours")}
                      </Text>
                      <Text
                        style={{
                          color: theme.foreground,
                          fontSize: 14,
                          fontFamily: "Inter_700Bold",
                          marginTop: 2,
                          textAlign: alignStart(rtl),
                          writingDirection: "ltr",
                        }}
                      >
                        {workHoursLabel}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        backgroundColor: theme.muted,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.mutedForeground,
                          fontSize: 11,
                          fontFamily: "Inter_500Medium",
                          textAlign: alignStart(rtl),
                          writingDirection: writeDir(rtl),
                        }}
                      >
                        {remainingTitle}
                      </Text>
                      <Text
                        style={{
                          color: theme.foreground,
                          fontSize: 14,
                          fontFamily: "Inter_700Bold",
                          marginTop: 2,
                          textAlign: alignStart(rtl),
                          writingDirection: "ltr",
                        }}
                      >
                        {remainingLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 13,
                    lineHeight: 20,
                    fontFamily: "Inter_500Medium",
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {t("attendance.noSchedule")}
                </Text>
              )}
            </View>

            <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Pressable
                onPress={() => {
                  setScheduleModalOpen(false);
                  quickPunch.mutate();
                }}
                disabled={quickPunch.isPending}
                style={{
                  backgroundColor: quickPunch.isPending ? `${theme.primary}80` : theme.primary,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: quickPunch.isPending ? 0.7 : 1,
                }}
              >
                <Text style={{ color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  {quickPunch.isPending ? t("home.quickPunchLoading") : t("home.quickPunchAction")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          alignSelf: "stretch",
        }}
      >
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              if (me?.sub) {
                router.push(`/employee/${me.sub}`);
                return;
              }
              router.push("/settings");
            }}
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
            <Feather name="user" size={15} color={theme.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={toggleTheme}
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
            <Feather name={isDark ? "moon" : "sun"} size={15} color={theme.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={() => void toggleLanguage()}
            disabled={langBusy}
            style={{
              height: 34,
              paddingHorizontal: 10,
              borderRadius: 17,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: rtl ? "row-reverse" : "row",
              gap: 6,
              opacity: langBusy ? 0.6 : 1,
            }}
          >
            <Feather name="globe" size={14} color={theme.mutedForeground} />
            <Text style={{ color: theme.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              {currentLang === "ar" ? "AR" : "EN"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/notifications")}
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
            <Feather name="bell" size={15} color={theme.mutedForeground} />
          </Pressable>
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
          gap: 12,
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

        <View style={{ alignItems: rtl ? "flex-end" : "flex-start", gap: 6 }}>
          <View style={{ gap: 4, alignSelf: "stretch" }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 11,
                fontFamily: "Inter_500Medium",
                textAlign: alignStart(rtl),
                writingDirection: writeDir(rtl),
              }}
            >
              {scheduleRangeTitle}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: rtl ? "flex-end" : "flex-start",
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 30,
                  fontFamily: "Inter_700Bold",
                  writingDirection: "ltr",
                }}
              >
                {scheduleStartLabel}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 24, fontFamily: "Inter_600SemiBold" }}>
                /
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 30,
                  fontFamily: "Inter_700Bold",
                  writingDirection: "ltr",
                }}
              >
                {scheduleEndLabel}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => setScheduleModalOpen(true)}
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
