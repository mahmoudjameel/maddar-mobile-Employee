import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  SectionHeader,
  StatCard,
  styles as s,
  theme,
} from "@/components/UI";
import { FilterChips } from "@/components/FilterChips";
import { SearchBar } from "@/components/SearchBar";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type ReqFilter = "all" | "pending" | "approved" | "rejected";

type RequestRow = {
  id: string;
  typeId?: string;
  typeName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
};
type RequestsResp = {
  inbox?: RequestRow[];
  mine?: RequestRow[];
};

const statusKey: Record<string, string> = {
  in_review: "requests.statusPending",
  pending: "requests.statusAwaiting",
  approved: "requests.statusApproved",
  rejected: "requests.statusRejected",
  returned: "requests.statusReturned",
  cancelled: "requests.statusCanceled",
  completed: "requests.statusCompleted",
};
const statusTone: Record<string, "warning" | "success" | "destructive" | "info" | "default"> = {
  in_review: "warning",
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  returned: "info",
  cancelled: "default",
  completed: "success",
};

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const [tab, setTab] = useState<"mine" | "inbox">("mine");

  const q = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const r = await api.get<RequestsResp>("/api/employee/requests");
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const list = (tab === "mine" ? q.data?.mine : q.data?.inbox) || [];
  const mineCount = q.data?.mine?.length || 0;
  const inboxCount = q.data?.inbox?.length || 0;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ReqFilter>("all");

  const filteredList = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return list.filter((r) => {
      const st = r.status || "";
      if (filter === "pending" && !(st === "in_review" || st === "pending")) return false;
      if (filter === "approved" && !(st === "approved" || st === "completed")) return false;
      if (filter === "rejected" && !(st === "rejected" || st === "cancelled" || st === "returned")) return false;
      if (!qq) return true;
      const hay = `${r.typeName || ""} ${r.typeId || ""} ${r.id}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [list, search, filter]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />}
    >
      <SectionHeader
        title={t("requests.title")}
        subtitle={t("requests.subtitle")}
        action={
          <Pressable onPress={() => router.push("/request/new")}>
            <View
              style={{
                backgroundColor: theme.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                flexDirection: rtl ? "row-reverse" : "row",
                gap: 6,
                alignItems: "center",
              }}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("requests.newRequest")}</Text>
            </View>
          </Pressable>
        }
      />

      <View style={[s.row, rtl && s.rowRtl, { alignSelf: "stretch" }]}>
        <StatCard label={t("requests.totalMine")} value={mineCount} icon="file-text" tone="primary" />
        <StatCard label={t("requests.awaitingMyReview")} value={inboxCount} icon="inbox" tone="warning" />
      </View>

      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          backgroundColor: theme.muted,
          borderRadius: 12,
          padding: 4,
          alignSelf: "stretch",
        }}
      >
        {([
          { key: "mine", label: t("requests.myRequests") },
          { key: "inbox", label: t("requests.inbox") },
        ] as const).map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: tab === item.key ? theme.card : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: tab === item.key ? theme.primary : theme.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                textAlign: "center",
                writingDirection: writeDir(rtl),
                width: "100%",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {list.length > 0 ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t("common.search")} />
          <FilterChips<ReqFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("common.all") },
              { value: "pending", label: t("requests.statusPending") },
              { value: "approved", label: t("requests.statusApproved") },
              { value: "rejected", label: t("requests.statusRejected") },
            ]}
          />
        </>
      ) : null}

      {q.isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Card style={{ alignSelf: "stretch" }}>
          <EmptyState
            icon="file-text"
            title={tab === "mine" ? t("home.noRequests") : t("requests.inbox")}
            subtitle={tab === "mine" ? t("home.noRequestsHint") : t("requests.awaitingMyReview")}
          />
        </Card>
      ) : filteredList.length === 0 ? (
        <Card style={{ alignSelf: "stretch" }}>
          <EmptyState icon="search" title={t("common.noResults")} />
        </Card>
      ) : (
        filteredList.map((r) => {
          const k = statusKey[r.status || ""];
          return (
            <Pressable key={r.id} onPress={() => router.push(`/request/${r.id}`)}>
              <Card style={{ gap: 8, alignSelf: "stretch" }}>
                <View
                  style={{
                    flexDirection: rtl ? "row-reverse" : "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                    alignSelf: "stretch",
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text
                      style={{
                        color: theme.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                        textAlign: alignStart(rtl),
                        writingDirection: writeDir(rtl),
                        width: "100%",
                      }}
                    >
                      {r.typeName || r.typeId || t("requestDetail.defaultName")}
                    </Text>
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        fontSize: 12,
                        textAlign: alignStart(rtl),
                        writingDirection: writeDir(rtl),
                        width: "100%",
                      }}
                    >
                      #{r.id}
                    </Text>
                  </View>
                  <Badge text={k ? t(k) : r.status || "—"} tone={statusTone[r.status || ""] || "default"} />
                </View>
                {r.updatedAt ? (
                  <Text
                    style={{
                      color: theme.mutedForeground,
                      fontSize: 12,
                      textAlign: alignStart(rtl),
                      writingDirection: writeDir(rtl),
                      width: "100%",
                    }}
                  >
                    {formatDate(r.updatedAt)}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        })
      )}

      <Button
        title={t("requests.newRequest")}
        icon="plus"
        onPress={() => router.push("/request/new")}
        fullWidth
      />
    </ScrollView>
  );
}
