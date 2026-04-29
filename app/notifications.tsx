import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Loading, SectionHeader, styles as s, theme } from "@/components/UI";
import { FilterChips } from "@/components/FilterChips";
import { SearchBar } from "@/components/SearchBar";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type NotifFilter = "all" | "unread" | "read";

type Notif = {
  id: string;
  title?: string;
  body?: string;
  entityType?: string;
  readAt?: string | null;
  createdAt?: string;
};

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const rtl = useIsRTL();

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await api.get<{ notifications?: Notif[] } | Notif[]>("/api/employee/notifications");
      if (!r.ok) throw new Error(r.error);
      return Array.isArray(r.data) ? r.data : r.data?.notifications || [];
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const r = await api.patch("/api/employee/notifications");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const items = q.data || [];
  const unread = items.filter((n) => !n.readAt).length;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NotifFilter>("all");

  const filteredItems = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filter === "unread" && n.readAt) return false;
      if (filter === "read" && !n.readAt) return false;
      if (!qq) return true;
      const hay = `${n.title || ""} ${n.body || ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, search, filter]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <SectionHeader
        title={t("notifications.title")}
        subtitle={t("notifications.subtitle")}
        action={
          unread > 0 ? (
            <Pressable onPress={() => markAll.mutate()} disabled={markAll.isPending}>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: theme.muted,
                  flexDirection: rtl ? "row-reverse" : "row",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <Feather name="check" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{t("notifications.markAllRead")}</Text>
              </View>
            </Pressable>
          ) : undefined
        }
      />

      {q.isLoading ? <Loading /> : null}

      {items.length > 0 ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t("common.search")} />
          <FilterChips<NotifFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("common.all") },
              { value: "unread", label: t("notifications.filterUnread") },
              { value: "read", label: t("notifications.filterRead") },
            ]}
          />
        </>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <EmptyState icon="bell" title={t("notifications.empty")} />
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <EmptyState icon="search" title={t("common.noResults")} />
        </Card>
      ) : (
        filteredItems.map((n) => (
          <Card
            key={n.id}
            style={{
              flexDirection: rtl ? "row-reverse" : "row",
              gap: 12,
              alignItems: "flex-start",
              alignSelf: "stretch",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: n.readAt ? theme.muted : theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="bell" size={16} color={n.readAt ? theme.mutedForeground : theme.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    color: theme.foreground,
                    fontFamily: "Inter_600SemiBold",
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    flex: 1,
                    width: "100%",
                  }}
                >
                  {n.title || t("notifications.defaultName")}
                </Text>
                {!n.readAt ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} /> : null}
              </View>
              {n.body ? (
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 13,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    marginTop: 4,
                    width: "100%",
                  }}
                >
                  {n.body}
                </Text>
              ) : null}
              {n.createdAt ? (
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 11,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    marginTop: 6,
                    width: "100%",
                  }}
                >
                  {formatDateTime(n.createdAt)}
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
