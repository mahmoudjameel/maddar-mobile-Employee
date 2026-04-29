import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import { Badge, Button, Card, Input, Loading, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type Message = {
  id: string;
  authorName?: string;
  body?: string;
  kind?: "system" | "user" | "comment" | string;
  createdAt?: string;
};
type RequestDetail = {
  request?: {
    id: string;
    typeId?: string;
    typeName?: string;
    status?: string;
    fieldValues?: Record<string, any>;
    createdAt?: string;
    submitterName?: string;
    returnReason?: string | null;
    messages?: Message[];
  };
  type?: { name?: string; fields?: Array<{ key: string; label?: string; kind?: string }> };
  permissions?: {
    canComment?: boolean;
    canClaim?: boolean;
    canApproveRejectReturn?: boolean;
    canCancel?: boolean;
    isSubmitter?: boolean;
  };
  chainProgress?: Array<{ step: number; approver?: string; status?: string; actedAt?: string; comment?: string }> | null;
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

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "comments">("details");
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const q = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const r = await api.get<RequestDetail>(`/api/employee/requests/${id}`);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    enabled: !!id,
  });

  const act = useMutation({
    mutationFn: async (payload: any) => {
      const r = await api.patch(`/api/employee/requests/${id}`, payload);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request", id] });
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setComment("");
      setReason("");
    },
    onError: (e: any) =>
      showAlert(t("requestDetail.actionFailed"), e?.message || t("newRequest.errorMsg")),
  });

  const r = q.data?.request;
  const perms = q.data?.permissions || {};
  const fieldsMeta = q.data?.type?.fields || [];
  const hasBottomActions =
    perms.canApproveRejectReturn || perms.canCancel || perms.canClaim;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: hasBottomActions ? 128 : 20,
        }}
      >
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      {q.isLoading || !r ? (
        <Loading />
      ) : (
        <>
          <Card style={{ gap: 8, alignSelf: "stretch" }}>
            <View
              style={{
                flexDirection: rtl ? "row-reverse" : "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 18,
                    color: theme.foreground,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    width: "100%",
                  }}
                >
                  {r.typeName || q.data?.type?.name || r.typeId || t("requestDetail.defaultName")}
                </Text>
                <Text
                  style={{
                    color: theme.mutedForeground,
                    fontSize: 12,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    marginTop: 4,
                    width: "100%",
                  }}
                >
                  #{r.id}
                </Text>
              </View>
              <Badge
                text={statusKey[r.status || ""] ? t(statusKey[r.status || ""]) : r.status || "—"}
                tone={statusTone[r.status || ""] || "default"}
              />
            </View>
            {r.submitterName ? (
              <Text
                style={{
                  color: theme.mutedForeground,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                }}
              >
                {t("requestDetail.submitter")}: {r.submitterName}
              </Text>
            ) : null}
            {r.returnReason ? (
              <View style={{ backgroundColor: `${theme.warning || "#f59e0b"}15`, padding: 10, borderRadius: 8, marginTop: 6 }}>
                <Text
                  style={{
                    color: theme.foreground,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    fontSize: 12,
                  }}
                >
                  {t("requestDetail.returnReason")}: {r.returnReason}
                </Text>
              </View>
            ) : null}
            {r.createdAt ? (
              <Text
                style={{
                  color: theme.mutedForeground,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                  fontSize: 12,
                }}
              >
                {t("requestDetail.createdAt")}: {formatDateTime(r.createdAt)}
              </Text>
            ) : null}
          </Card>

          <View
            style={{
              flexDirection: rtl ? "row-reverse" : "row",
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
              alignSelf: "stretch",
            }}
          >
            <Pressable
              onPress={() => setActiveTab("details")}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === "details" ? theme.primary : "transparent",
              }}
            >
              <Text style={{ textAlign: "center", color: activeTab === "details" ? theme.primary : theme.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
                {t("requestDetail.title")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("comments")}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === "comments" ? theme.primary : "transparent",
              }}
            >
              <Text style={{ textAlign: "center", color: activeTab === "comments" ? theme.primary : theme.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
                {t("requestDetail.messages")}
              </Text>
            </Pressable>
          </View>

          {activeTab === "details" ? (
            <>
              <Card style={{ gap: 10, alignSelf: "stretch" }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    color: theme.foreground,
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                  }}
                >
                  {t("newRequest.details")}
                </Text>
                {Object.entries(r.fieldValues || {}).map(([k, v]) => {
                  const meta = fieldsMeta.find((f) => f.key === k);
                  return (
                    <View
                      key={k}
                      style={{
                        flexDirection: rtl ? "row-reverse" : "row",
                        justifyContent: "space-between",
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        gap: 12,
                      }}
                    >
                      <Text style={{ color: theme.mutedForeground, flexShrink: 0, textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {meta?.label || k}
                      </Text>
                      <Text style={{ color: theme.foreground, fontFamily: "Inter_500Medium", flex: 1, textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {String(v ?? "—")}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            </>
          ) : (
            <Card style={{ gap: 12, alignSelf: "stretch" }}>
              {perms.canComment ? (
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8, alignItems: "center" }}>
                  <Pressable
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.card,
                    }}
                  >
                    <Feather name="paperclip" size={18} color={theme.mutedForeground} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={comment}
                      onChangeText={setComment}
                      placeholder={t("requestDetail.addComment")}
                    />
                  </View>
                  <Pressable
                    onPress={() => act.mutate({ action: "comment", body: comment })}
                    disabled={!comment.trim() || act.isPending}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.primary,
                      opacity: !comment.trim() || act.isPending ? 0.6 : 1,
                    }}
                  >
                    <Feather name="send" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : null}

              {q.data?.request?.messages?.map((m) => {
                const mine = m.kind === "user" || m.kind === "comment";
                return (
                  <View
                    key={m.id}
                    style={{
                      alignItems: mine ? (rtl ? "flex-start" : "flex-end") : rtl ? "flex-end" : "flex-start",
                    }}
                  >
                    <View
                      style={{
                        maxWidth: "88%",
                        backgroundColor: mine ? theme.secondary : theme.muted,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: theme.foreground, fontSize: 13, textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                        {m.body || ""}
                      </Text>
                    </View>
                    <Text style={{ color: theme.mutedForeground, fontSize: 11, marginTop: 4 }}>
                      {m.authorName || "—"} {m.createdAt ? `· ${formatDateTime(m.createdAt)}` : ""}
                    </Text>
                  </View>
                );
              })}
            </Card>
          )}

          {q.data?.chainProgress && q.data.chainProgress.length > 0 ? (
            <Card style={{ gap: 12, alignSelf: "stretch" }}>
              <Text style={{ fontFamily: "Inter_700Bold", color: theme.foreground, textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                {t("requestDetail.approvalFlow")}
              </Text>
              {q.data.chainProgress.map((step, i) => (
                <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: step.status === "approved" ? theme.success : step.status === "rejected" ? theme.destructive : theme.muted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather
                      name={step.status === "approved" ? "check" : step.status === "rejected" ? "x" : "clock"}
                      size={14}
                      color={step.status === "approved" || step.status === "rejected" ? "#fff" : theme.mutedForeground}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: rtl ? "flex-end" : "flex-start" }}>
                    <Text style={{ color: theme.foreground, fontFamily: "Inter_600SemiBold", textAlign: alignStart(rtl), writingDirection: writeDir(rtl) }}>
                      {t("common.step")} {step.step}: {step.approver || "—"}
                    </Text>
                    {step.comment ? (
                      <Text style={{ color: theme.mutedForeground, fontSize: 12, textAlign: alignStart(rtl), writingDirection: writeDir(rtl), marginTop: 2 }}>
                        {step.comment}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {perms.canApproveRejectReturn ? (
            <Card style={{ gap: 6, alignSelf: "stretch" }}>
              <Text
                style={{
                  color: theme.mutedForeground,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                }}
              >
                {t("requestDetail.returnReasonPlaceholder")}
              </Text>
              <Input value={reason} onChangeText={setReason} />
            </Card>
          ) : null}
        </>
      )}
      </ScrollView>

      {hasBottomActions ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.card,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 8),
            gap: 8,
          }}
        >
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
            {perms.canApproveRejectReturn ? (
              <>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t("requestDetail.approve")}
                    onPress={() => act.mutate({ action: "approve" })}
                    loading={act.isPending}
                    fullWidth
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t("requestDetail.reject")}
                    variant="destructive"
                    onPress={() => act.mutate({ action: "reject", reason })}
                    loading={act.isPending}
                    fullWidth
                  />
                </View>
              </>
            ) : null}
            {perms.canClaim ? (
              <View style={{ flex: 1 }}>
                <Button
                  title={t("requestDetail.claim")}
                  variant="outline"
                  onPress={() => act.mutate({ action: "claim" })}
                  loading={act.isPending}
                  fullWidth
                />
              </View>
            ) : null}
          </View>
          {perms.canApproveRejectReturn || perms.canCancel ? (
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
              {perms.canApproveRejectReturn ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={t("requestDetail.return")}
                    variant="outline"
                    onPress={() => act.mutate({ action: "return", reason })}
                    loading={act.isPending}
                    fullWidth
                  />
                </View>
              ) : null}
              {perms.canCancel ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={t("requestDetail.cancel")}
                    variant="outline"
                    onPress={() => act.mutate({ action: "cancel" })}
                    loading={act.isPending}
                    fullWidth
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
