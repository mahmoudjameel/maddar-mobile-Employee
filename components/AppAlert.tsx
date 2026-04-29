import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "@/components/UI";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

export type AppAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

type AppAlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

export function useAppAlert() {
  const { t } = useTranslation();
  const defaultButton = useMemo<AppAlertButton>(
    () => ({ text: t("common.ok"), style: "default" }),
    [t],
  );
  const [state, setState] = useState<AppAlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [defaultButton],
  });

  const hideAlert = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AppAlertButton[]) => {
      const nextButtons = buttons?.length ? buttons : [defaultButton];
      setState({
        visible: true,
        title,
        message,
        buttons: nextButtons,
      });
    },
    [defaultButton],
  );

  return {
    alertState: state,
    showAlert,
    hideAlert,
  };
}

export function AppAlert({
  visible,
  title,
  message,
  buttons,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  onClose: () => void;
}) {
  const rtl = useIsRTL();
  const { t } = useTranslation();
  const actions = useMemo(
    () => (buttons?.length ? buttons : [{ text: t("common.ok"), style: "default" as const }]),
    [buttons, t],
  );

  const onPressAction = async (btn: AppAlertButton) => {
    onClose();
    if (btn.onPress) await btn.onPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.30)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable style={{ position: "absolute", inset: 0 }} onPress={onClose} />
        <View
          style={{
            width: "100%",
            maxWidth: 320,
            backgroundColor: theme.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
            <Text
              style={{
                color: theme.foreground,
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                textAlign: alignStart(rtl),
                writingDirection: writeDir(rtl),
                width: "100%",
              }}
            >
              {title}
            </Text>
            {message ? (
              <Text
                style={{
                  color: theme.foreground,
                  fontSize: 14,
                  textAlign: alignStart(rtl),
                  writingDirection: writeDir(rtl),
                  width: "100%",
                }}
              >
                {message}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              flexDirection: rtl ? "row-reverse" : "row",
            }}
          >
            {actions.map((btn, idx) => (
              <Pressable
                key={`${btn.text}-${idx}`}
                onPress={() => {
                  void onPressAction(btn);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeftWidth: idx === 0 ? 0 : 1,
                  borderLeftColor: theme.border,
                }}
              >
                <Text
                  style={{
                    color:
                      btn.style === "destructive"
                        ? theme.destructive
                        : btn.style === "cancel"
                          ? theme.mutedForeground
                          : theme.primary,
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
