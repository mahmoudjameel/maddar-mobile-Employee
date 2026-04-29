import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Loading, SectionHeader, styles as s, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type Announcement = {
  id: string;
  title?: string;
  body?: string | null;
  summary?: string | null;
  publishedAt?: string;
  authorName?: string | null;
  isPinned?: boolean;
  pinned?: boolean;
  viewedAt?: string | null;
};

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const rtl = useIsRTL();

  const q = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const r = await api.get<{ announcements?: Announcement[] } | Announcement[]>(
        "/api/employee/announcements",
      );
      if (!r.ok) throw new Error(r.error);
      return Array.isArray(r.data) ? r.data : r.data?.announcements || [];
    },
  });

  const items = q.data || [];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scrollContent}
      refreshControl={
        <RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.primary} />
      }
    >
      <SectionHeader title={t("announcements.title")} subtitle={t("announcements.subtitle")} />

      {q.isLoading ? <Loading /> : null}

      {!q.isLoading && items.length === 0 ? (
        <Card>
          <EmptyState icon="bell" title={t("announcements.empty")} />
        </Card>
      ) : (
        items.map((a) => {
          const pinned = Boolean(a.isPinned ?? a.pinned);
          const viewed = Boolean(a.viewedAt);
          return (
            <Pressable key={a.id} onPress={() => router.push(`/announcement/${a.id}`)}>
              <Card style={{ gap: 8, alignSelf: "stretch" }}>
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
                  {!viewed ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
                  ) : null}
                  <Text
                    style={{
                      flex: 1,
                      color: theme.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 15,
                      textAlign: alignStart(rtl),
                      writingDirection: writeDir(rtl),
                      width: "100%",
                    }}
                    numberOfLines={2}
                  >
                    {a.title || t("announcements.defaultName")}
                  </Text>
                </View>

                {a.summary || a.body ? (
                  <Text
                    style={{
                      color: theme.mutedForeground,
                      fontSize: 13,
                      textAlign: alignStart(rtl),
                      writingDirection: writeDir(rtl),
                      width: "100%",
                    }}
                    numberOfLines={2}
                  >
                    {a.summary || a.body || ""}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: rtl ? "row-reverse" : "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {a.publishedAt ? (
                    <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>
                      {formatDateTime(a.publishedAt)}
                    </Text>
                  ) : <View />}
                  {a.authorName ? (
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        fontSize: 11,
                        textAlign: rtl ? "left" : "right",
                      }}
                      numberOfLines={1}
                    >
                      {`${t("announcements.by")} ${a.authorName}`}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
