import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import { Badge, Card, EmptyState, Loading, SectionHeader, StatCard, styles as s, theme } from "@/components/UI";
import { FilterChips } from "@/components/FilterChips";
import { SearchBar } from "@/components/SearchBar";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type TaskFilter = "all" | "open" | "in_progress" | "completed";

type Task = {
  id: string;
  title?: string;
  description?: string;
  status?: "open" | "in_progress" | "done" | "completed" | "overdue";
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  updatedAt?: string;
};
type TasksResp = { tasks?: Task[] } | Task[];

const statusKey: Record<string, string> = {
  open: "tasks.statusOpen",
  in_progress: "tasks.statusInProgress",
  done: "tasks.statusCompleted",
  completed: "tasks.statusCompleted",
  overdue: "tasks.statusOverdue",
};
const statusTone: Record<string, "warning" | "primary" | "success" | "destructive" | "default"> = {
  open: "primary",
  in_progress: "warning",
  done: "success",
  completed: "success",
  overdue: "destructive",
};
const priorityKey: Record<string, string> = {
  low: "tasks.priorityLow",
  medium: "tasks.priorityMedium",
  high: "tasks.priorityHigh",
  urgent: "tasks.priorityUrgent",
};
const priorityTone: Record<string, "default" | "warning" | "destructive"> = {
  low: "default",
  medium: "default",
  high: "warning",
  urgent: "destructive",
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const rtl = useIsRTL();
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const q = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const r = await api.get<TasksResp>("/api/employee/tasks");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "in_progress" | "done" }) => {
      const r = await api.patch(`/api/employee/tasks/${id}`, { status });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: any) => {
      showAlert(t("requestDetail.actionFailed"), e?.message || t("newRequest.errorMsg"));
    },
  });

  const tasks: Task[] = Array.isArray(q.data) ? q.data : q.data?.tasks || [];
  const open = tasks.filter((t) => t.status !== "done" && t.status !== "completed").length;
  const completed = tasks.filter((t) => t.status === "done" || t.status === "completed").length;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((it) => {
      if (filter === "open" && !(it.status === "open" || it.status === "overdue")) return false;
      if (filter === "in_progress" && it.status !== "in_progress") return false;
      if (filter === "completed" && it.status !== "done" && it.status !== "completed") return false;
      if (!q) return true;
      const hay = `${it.title || ""} ${it.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, search, filter]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <SectionHeader title={t("tasks.title")} subtitle={t("tasks.subtitle")} />

      <View style={[s.row, rtl && s.rowRtl]}>
        <StatCard label={t("tasks.total")} value={tasks.length} icon="list" />
        <StatCard label={t("tasks.open")} value={open} icon="circle" tone="primary" />
        <StatCard label={t("tasks.completed")} value={completed} icon="check-circle" tone="success" />
      </View>

      {tasks.length > 0 ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t("common.search")} />
          <FilterChips<TaskFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("common.all") },
              { value: "open", label: t("tasks.statusOpen") },
              { value: "in_progress", label: t("tasks.statusInProgress") },
              { value: "completed", label: t("tasks.statusCompleted") },
            ]}
          />
        </>
      ) : null}

      {q.isLoading ? (
        <Loading />
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState icon="check-square" title={t("tasks.empty")} subtitle={t("tasks.emptyHint")} />
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <EmptyState icon="search" title={t("common.noResults")} />
        </Card>
      ) : (
        filteredTasks.map((it) => {
          const sk = statusKey[it.status || ""];
          const pk = priorityKey[it.priority || ""];
          return (
            <Card key={it.id} style={{ gap: 8, alignSelf: "stretch" }}>
              <View
                style={{
                  flexDirection: rtl ? "row-reverse" : "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: theme.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    width: "100%",
                  }}
                >
                  {it.title || t("tasks.defaultName")}
                </Text>
                <Badge text={sk ? t(sk) : it.status || "—"} tone={statusTone[it.status || ""] || "default"} />
              </View>
              {it.description ? (
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 13,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    width: "100%",
                  }}
                >
                  {it.description}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: rtl ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {it.priority ? (
                  <Badge
                    text={`${t("tasks.priorityPrefix")} ${pk ? t(pk) : it.priority}`}
                    tone={priorityTone[it.priority] || "default"}
                  />
                ) : null}
                {it.dueDate ? (
                  <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
                    {t("tasks.duePrefix")} {formatDate(it.dueDate)}
                  </Text>
                ) : null}
              </View>
              {it.status !== "done" && it.status !== "completed" ? (
                <View
                  style={{
                    flexDirection: rtl ? "row-reverse" : "row",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <Pressable
                    onPress={() => updateTask.mutate({ id: it.id, status: "in_progress" })}
                    disabled={updateTask.isPending}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.card,
                      opacity: updateTask.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: theme.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {t("tasks.markInProgress")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateTask.mutate({ id: it.id, status: "done" })}
                    disabled={updateTask.isPending}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: `${theme.success}55`,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: `${theme.success}18`,
                      opacity: updateTask.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: theme.success, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {t("tasks.markDone")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
