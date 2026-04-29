import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, ErrorState, Loading, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type AnnouncementDetail = {
  id: string;
  title?: string;
  body?: string | null;
  publishedAt?: string;
  authorName?: string | null;
  isPinned?: boolean;
  pinned?: boolean;
  viewedAt?: string | null;
};

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const qc = useQueryClient();
  const markedRef = useRef(false);

  const q = useQuery({
    queryKey: ["announcement", id],
    queryFn: async () => {
      const r = await api.get<AnnouncementDetail | { announcement?: AnnouncementDetail }>(
        `/api/employee/announcements/${id}`,
      );
      if (!r.ok) throw new Error(r.error);
      const data: any = r.data;
      return (data && typeof data === "object" && "announcement" in data && data.announcement
        ? data.announcement
        : data) as AnnouncementDetail | undefined;
    },
    enabled: !!id,
  });

  const markViewed = useMutation({
    mutationFn: async () => {
      const r = await api.post(`/api/employee/announcements/${id}/view`);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcement", id] });
    },
  });

  useEffect(() => {
    if (!id || markedRef.current) return;
    if (!q.data) return;
    if (q.data.viewedAt) {
      markedRef.current = true;
      return;
    }
    markedRef.current = true;
    markViewed.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, q.data?.id, q.data?.viewedAt]);

  if (q.isLoading) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.scrollContent}>
        <Loading />
      </ScrollView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.scrollContent}>
        <ErrorState message={(q.error as any)?.message || t("notFound.message")} onRetry={() => q.refetch()} />
      </ScrollView>
    );
  }

  const a = q.data;
  const pinned = Boolean(a.isPinned ?? a.pinned);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scrollContent}>
      <Card style={{ gap: 12, alignSelf: "stretch" }}>
        <View
          style={{
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {pinned ? (
            <View
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: `${theme.warning}22`,
              }}
            >
              <Feather name="bookmark" size={11} color={theme.warning} />
              <Text style={{ color: theme.warning, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                {t("announcements.pinned")}
              </Text>
            </View>
          ) : null}
          <Text
            style={{
              flex: 1,
              color: theme.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 20,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {a.title || t("announcements.defaultName")}
          </Text>
        </View>

        <View
          style={{
            flexDirection: rtl ? "row-reverse" : "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {a.publishedAt ? (
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
              {`${t("announcements.publishedAt")}: ${formatDateTime(a.publishedAt)}`}
            </Text>
          ) : <View />}
          {a.authorName ? (
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
              {`${t("announcements.by")} ${a.authorName}`}
            </Text>
          ) : null}
        </View>

        {a.body ? (
          <Text
            style={{
              color: theme.foreground,
              fontSize: 15,
              lineHeight: 24,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {a.body}
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}
