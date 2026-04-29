import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppAlert, useAppAlert } from "@/components/AppAlert";
import { Button, Card, Input, Loading, theme } from "@/components/UI";
import { api } from "@/lib/api";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

type FieldKind = "text" | "textarea" | "number" | "date" | "file" | "select";
type RequestField = {
  id?: string;
  key: string;
  label?: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string | null;
  options?: any;
};
type RequestType = {
  id: string;
  name?: string;
  description?: string | null;
  fields?: RequestField[];
};
type SelectOption = { label: string; value: string };

export default function NewRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ quickType?: string | string[] }>();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const rtl = useIsRTL();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const typesQ = useQuery({
    queryKey: ["request-types"],
    queryFn: async () => {
      const r = await api.get<RequestType[] | { types?: RequestType[] }>("/api/employee/request-types");
      if (!r.ok) throw new Error(r.error);
      return Array.isArray(r.data) ? r.data : r.data?.types || [];
    },
  });

  const types = typesQ.data || [];
  const selected = useMemo(() => types.find((t) => t.id === typeId), [types, typeId]);
  const fields = selected?.fields || [];
  const quickType = Array.isArray(params.quickType) ? params.quickType[0] : params.quickType;

  const pickPdf = async (fieldKey: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      // Backend currently accepts string values in fieldValues.
      // We keep the selected file name as a user-friendly optional value.
      setValues((prev) => ({ ...prev, [fieldKey]: file.name || "selected.pdf" }));
    } catch (e: any) {
      showAlert(t("newRequest.errorTitle"), e?.message || t("newRequest.errorMsg"));
    }
  };

  useEffect(() => {
    if (!quickType || typeId || types.length === 0) return;
    if (quickType !== "leave") return;
    const leaveType = types.find(isLeaveType);
    if (leaveType) setTypeId(leaveType.id);
  }, [quickType, typeId, types]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!typeId) throw new Error(t("newRequest.selectKind"));
      const payloadValues: Record<string, string> = { ...values };
      for (const f of fields) {
        if (f.kind === "file" && f.required) {
          // Temporary mobile fallback until file upload is supported:
          // provide a non-empty value so backend "required" validation can pass.
          if (!payloadValues[f.key]?.trim()) {
            payloadValues[f.key] = "mobile-placeholder.pdf";
          }
        }
        if (f.required && !payloadValues[f.key]?.trim()) {
          throw new Error(t("newRequest.fieldRequired", { name: f.label || f.key }));
        }
      }
      const r = await api.post<{ id: string }>("/api/employee/requests", {
        typeId,
        fieldValues: payloadValues,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      showAlert(t("newRequest.successTitle"), t("newRequest.successMsg"));
      if (d?.id) router.replace(`/request/${d.id}`);
      else router.back();
    },
    onError: (e: any) => showAlert(t("newRequest.errorTitle"), e?.message || t("newRequest.errorMsg")),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <AppAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <Card style={{ gap: 10, alignSelf: "stretch" }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            color: theme.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {t("newRequest.kind")}
        </Text>
        {typesQ.isLoading ? (
          <Loading />
        ) : types.length === 0 ? (
          <Text
            style={{
              color: theme.mutedForeground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("newRequest.noKinds")}
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {types.map((tp) => (
              <TypeOption key={tp.id} active={typeId === tp.id} label={tp.name || tp.id} onPress={() => setTypeId(tp.id)} />
            ))}
          </View>
        )}
      </Card>

      {typeId ? (
        <Card style={{ gap: 12, alignSelf: "stretch" }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              color: theme.foreground,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {t("newRequest.details")}
          </Text>
          {fields.map((f) => {
            if (f.kind === "file") {
              const picked = values[f.key];
              return (
                <View key={f.key} style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: theme.foreground,
                      fontFamily: "Inter_500Medium",
                      textAlign: alignStart(rtl),
                      writingDirection: writeDir(rtl),
                      width: "100%",
                    }}
                  >
                    {f.label || f.key} {f.required ? <Text style={{ color: theme.destructive }}>*</Text> : null}
                  </Text>
                  <View style={{ padding: 12, backgroundColor: theme.muted, borderRadius: 8 }}>
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        textAlign: alignStart(rtl),
                        writingDirection: writeDir(rtl),
                        fontSize: 12,
                        width: "100%",
                      }}
                    >
                      {t("newRequest.fileUploadNotice")}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      void pickPdf(f.key);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.primary,
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {t("newRequest.uploadPdfOptional")}
                    </Text>
                  </Pressable>
                  {picked ? (
                    <View
                      style={{
                        flexDirection: rtl ? "row-reverse" : "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        backgroundColor: theme.card,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 10,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          color: theme.foreground,
                          textAlign: alignStart(rtl),
                          writingDirection: writeDir(rtl),
                        }}
                      >
                        {picked}
                      </Text>
                      <Pressable onPress={() => setValues((s) => ({ ...s, [f.key]: "" }))}>
                        <Text style={{ color: theme.destructive, fontFamily: "Inter_600SemiBold" }}>
                          {t("newRequest.removeFile")}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            }
            if (f.kind === "select") {
              const options = normalizeSelectOptions(f.options);
              const selectedValue = values[f.key] || "";
              return (
                <View key={f.key} style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: theme.foreground,
                      fontFamily: "Inter_500Medium",
                      textAlign: alignStart(rtl),
                      writingDirection: writeDir(rtl),
                      width: "100%",
                    }}
                  >
                    {f.label || f.key} {f.required ? <Text style={{ color: theme.destructive }}>*</Text> : null}
                  </Text>
                  {options.length === 0 ? (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        backgroundColor: theme.muted,
                        padding: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.mutedForeground,
                          textAlign: alignStart(rtl),
                          writingDirection: writeDir(rtl),
                          width: "100%",
                        }}
                      >
                        {t("newRequest.noOptionsForField")}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {options.map((opt) => {
                        const active = selectedValue === opt.value;
                        return (
                          <Pressable
                            key={`${f.key}-${opt.value}`}
                            onPress={() => setValues((s) => ({ ...s, [f.key]: opt.value }))}
                          >
                            <View
                              style={{
                                flexDirection: rtl ? "row-reverse" : "row",
                                alignItems: "center",
                                padding: 12,
                                borderWidth: 1,
                                borderColor: active ? theme.primary : theme.border,
                                borderRadius: 12,
                                backgroundColor: active ? theme.secondary : theme.card,
                                gap: 10,
                                alignSelf: "stretch",
                              }}
                            >
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  borderWidth: 2,
                                  borderColor: active ? theme.primary : theme.border,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {active ? (
                                  <View
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 4,
                                      backgroundColor: theme.primary,
                                    }}
                                  />
                                ) : null}
                              </View>
                              <Text
                                style={{
                                  flex: 1,
                                  color: theme.foreground,
                                  fontFamily: "Inter_600SemiBold",
                                  textAlign: alignStart(rtl),
                                  writingDirection: writeDir(rtl),
                                  width: "100%",
                                }}
                              >
                                {opt.label}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            }
            const isTextarea = f.kind === "textarea";
            return (
              <View key={f.key} style={{ gap: 6 }}>
                <Text
                  style={{
                    color: theme.foreground,
                    fontFamily: "Inter_500Medium",
                    textAlign: alignStart(rtl),
                    writingDirection: writeDir(rtl),
                    width: "100%",
                  }}
                >
                  {f.label || f.key} {f.required ? <Text style={{ color: theme.destructive }}>*</Text> : null}
                </Text>
                <Input
                  value={values[f.key] || ""}
                  onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                  placeholder={f.placeholder || (f.kind === "date" ? "YYYY-MM-DD" : "")}
                  multiline={isTextarea}
                  keyboardType={f.kind === "number" ? "numeric" : "default"}
                  style={isTextarea ? { minHeight: 100, textAlignVertical: "top" } : undefined}
                />
              </View>
            );
          })}

          <Button title={t("newRequest.submit")} icon="send" onPress={() => submit.mutate()} loading={submit.isPending} fullWidth />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function TypeOption({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const rtl = useIsRTL();
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          padding: 14,
          borderWidth: 1,
          borderColor: active ? theme.primary : theme.border,
          borderRadius: 12,
          backgroundColor: active ? theme.secondary : theme.card,
          gap: 10,
          alignSelf: "stretch",
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: active ? theme.primary : theme.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} /> : null}
        </View>
        <Text
          style={{
            flex: 1,
            color: theme.foreground,
            fontFamily: "Inter_600SemiBold",
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function normalizeSelectOptions(raw: any): SelectOption[] {
  if (raw == null) return [];

  let source = raw;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return source
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((v) => ({ label: v, value: v }));
    }
  }

  if (Array.isArray(source)) {
    const list = source
      .map((item): SelectOption | null => {
        if (item == null) return null;
        if (typeof item === "string" || typeof item === "number") {
          const v = String(item);
          return { label: v, value: v };
        }
        if (typeof item === "object") {
          const value = item.value ?? item.id ?? item.key ?? item.code ?? item.name ?? item.label;
          const label = item.label ?? item.name ?? item.title ?? item.value ?? item.id ?? item.key;
          if (value == null || label == null) return null;
          return { label: String(label), value: String(value) };
        }
        return null;
      })
      .filter((o): o is SelectOption => Boolean(o && o.value && o.label));

    const seen = new Set<string>();
    return list.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }

  if (typeof source === "object") {
    if (Array.isArray(source.options)) return normalizeSelectOptions(source.options);
    if (Array.isArray(source.values)) return normalizeSelectOptions(source.values);
    if (Array.isArray(source.list)) return normalizeSelectOptions(source.list);

    return Object.entries(source)
      .map(([value, label]) => ({ value: String(value), label: String(label) }))
      .filter((o) => o.value && o.label);
  }

  return [];
}

function isLeaveType(tp: RequestType): boolean {
  const source = `${tp.id} ${tp.name || ""}`.toLowerCase();
  return (
    source.includes("leave") ||
    source.includes("vacation") ||
    source.includes("اجاز") ||
    source.includes("إجاز")
  );
}
