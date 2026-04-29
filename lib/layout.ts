import type { TextStyle, ViewStyle } from "react-native";

/** Yoga layout direction — يعكس بداية السطر والـ flex بدون forceRTL على النظام */
export function contentDir(rtl: boolean): ViewStyle {
  return { direction: rtl ? "rtl" : "ltr" };
}

export function alignStart(rtl: boolean): NonNullable<TextStyle["textAlign"]> {
  return rtl ? "right" : "left";
}

export function writeDir(rtl: boolean): "ltr" | "rtl" {
  return rtl ? "rtl" : "ltr";
}
