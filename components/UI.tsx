import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from "react-native";
import { useTranslation } from "react-i18next";
import colors, { Palette } from "@/constants/colors";
import { useIsRTL } from "@/lib/i18n-direction";
import { alignStart, writeDir } from "@/lib/layout";

const R = colors.radius;

let _activePalette: Palette = colors.light;

function buildStyles(p: Palette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: p.background,
    },
    scrollContent: {
      padding: 16,
      gap: 14,
      paddingBottom: 40,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    rowRtl: {
      flexDirection: "row-reverse",
    },
  });
}

let _activeStyles = buildStyles(_activePalette);

// Public mutator used by the ThemeProvider to flip palettes at runtime.
// Components must be re-mounted (key change in _layout) for the new style
// objects to be picked up by inline `style={[s.screen, ...]}` arrays.
export function _setActivePalette(p: Palette) {
  _activePalette = p;
  _activeStyles = buildStyles(p);
}

export function _getActivePalette(): Palette {
  return _activePalette;
}

// Live `theme` object: every property access reads from the current palette.
// Existing `theme.foreground` usages keep working without refactor.
export const theme: Palette = new Proxy({} as Palette, {
  get(_t, prop: string) {
    return (_activePalette as any)[prop];
  },
  ownKeys() {
    return Object.keys(_activePalette);
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
}) as Palette;

// Live `styles` object backing the StyleSheet, regenerated on palette change.
export const styles = new Proxy({} as any, {
  get(_t, prop: string) {
    return (_activeStyles as any)[prop];
  },
}) as ReturnType<typeof buildStyles>;

// All component reads of the palette go through the proxy `theme` object so
// they automatically pick up the active palette on the next render pass.
const c = theme;

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: c.card,
          borderRadius: R,
          borderWidth: 1,
          borderColor: c.border,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: keyof typeof Feather.glyphMap;
  tone?: "default" | "primary" | "warning" | "destructive" | "success";
}) {
  const toneColor =
    tone === "primary"
      ? c.primary
      : tone === "warning"
        ? c.warning
        : tone === "destructive"
          ? c.destructive
          : tone === "success"
            ? c.success
            : c.mutedForeground;
  const rtl = useIsRTL();
  return (
    <Card style={{ flex: 1, gap: 12, minHeight: 128, justifyContent: "space-between", minWidth: 0 }}>
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          alignSelf: "stretch",
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            minWidth: 0,
            color: c.mutedForeground,
            fontSize: 13,
            lineHeight: 18,
            fontFamily: "Inter_500Medium",
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
          }}
        >
          {label}
        </Text>
        {icon ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              flexShrink: 0,
              backgroundColor: tone === "default" ? c.muted : `${toneColor}1A`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={icon} size={16} color={toneColor} />
          </View>
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 28,
          lineHeight: 32,
          fontFamily: "Inter_700Bold",
          color: c.foreground,
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
          alignSelf: "stretch",
          width: "100%",
        }}
      >
        {value}
      </Text>
    </Card>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  fullWidth,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  fullWidth?: boolean;
}) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";
  const isDestr = variant === "destructive";

  const bg = isPrimary
    ? c.primary
    : isDestr
      ? c.destructive
      : isSecondary
        ? c.secondary
        : "transparent";
  const fg = isPrimary
    ? c.primaryForeground
    : isDestr
      ? c.destructiveForeground
      : isSecondary
        ? c.secondaryForeground
        : isOutline
          ? c.foreground
          : c.primary;
  const borderColor = isOutline ? c.border : "transparent";
  const rtl = useIsRTL();

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: R,
          borderWidth: isOutline ? 1 : 0,
          borderColor,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "auto",
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ style, ...rest }: TextInputProps) {
  const rtl = useIsRTL();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      {...rest}
      style={[
        {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.input,
          borderRadius: R,
          paddingVertical: 14,
          paddingHorizontal: 14,
          fontSize: 15,
          color: c.foreground,
          fontFamily: "Inter_400Regular",
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
        },
        style,
      ]}
    />
  );
}

export function Badge({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "primary" | "warning" | "destructive" | "success" | "info";
}) {
  const rtl = useIsRTL();
  const toneColor =
    tone === "primary"
      ? c.primary
      : tone === "warning"
        ? c.warning
        : tone === "destructive"
          ? c.destructive
          : tone === "success"
            ? c.success
            : tone === "info"
              ? c.info
              : c.mutedForeground;
  return (
    <View
      style={{
        backgroundColor: `${toneColor}1A`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: rtl ? "flex-end" : "flex-start",
      }}
    >
      <Text
        style={{
          color: toneColor,
          fontSize: 12,
          fontFamily: "Inter_600SemiBold",
          textAlign: "center",
          writingDirection: writeDir(rtl),
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const rtl = useIsRTL();
  return (
    <View
      style={{
        flexDirection: rtl ? "row-reverse" : "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, alignSelf: "stretch" }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: "Inter_700Bold",
            color: c.foreground,
            textAlign: alignStart(rtl),
            writingDirection: writeDir(rtl),
            width: "100%",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 13,
              color: c.mutedForeground,
              marginTop: 2,
              textAlign: alignStart(rtl),
              writingDirection: writeDir(rtl),
              width: "100%",
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ icon = "inbox", title, subtitle }: { icon?: keyof typeof Feather.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={24} color={c.mutedForeground} />
      </View>
      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 13, color: c.mutedForeground, textAlign: "center", paddingHorizontal: 24 }}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ alignItems: "center", padding: 24, gap: 12 }}>
      <Feather name="alert-circle" size={28} color={c.destructive} />
      <Text style={{ color: c.foreground, textAlign: "center" }}>{message}</Text>
      {onRetry ? <Button title={t("common.retry")} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function RTLText(props: React.ComponentProps<typeof Text>) {
  const rtl = useIsRTL();
  return (
    <Text
      {...props}
      style={[
        {
          textAlign: alignStart(rtl),
          writingDirection: writeDir(rtl),
          color: c.foreground,
          fontFamily: "Inter_400Regular",
        },
        props.style,
      ]}
    />
  );
}
