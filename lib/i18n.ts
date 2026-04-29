import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { I18nManager, Platform } from "react-native";
import { initReactI18next } from "react-i18next";

import ar from "../locales/ar.json";
import en from "../locales/en.json";

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "maddar.lang";
const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

export function isRTLLang(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}

function detectInitialLanguage(stored: string | null): SupportedLanguage {
  if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }
  try {
    const locales = Localization.getLocales();
    const code = locales?.[0]?.languageCode || "ar";
    if (code.startsWith("en")) return "en";
  } catch {}
  return "ar";
}

/** Match Baytak-style: keep native root layout LTR; mirror rows/text in components. */
function applyNativeLayoutFixed() {
  if (Platform.OS === "web") return;
  try {
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(false);
    I18nManager.forceRTL(false);
  } catch {}
}

function applyWebDocumentDir(lang: string) {
  if (Platform.OS !== "web") return;
  if (typeof document === "undefined" || !document.documentElement) return;
  const rtl = isRTLLang(lang);
  document.documentElement.setAttribute("dir", rtl ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
}

export async function initI18n(): Promise<SupportedLanguage> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const lang = detectInitialLanguage(stored);

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: lang,
    fallbackLng: "ar",
    interpolation: { escapeValue: false },
    returnObjects: true,
    compatibilityJSON: "v4",
  });

  applyNativeLayoutFixed();
  applyWebDocumentDir(lang);
  return lang;
}

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  applyNativeLayoutFixed();
  applyWebDocumentDir(lang);
}

export async function reloadApp(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.reload();
    return;
  }
  try {
    const Updates = await import("expo-updates");
    await Updates.reloadAsync();
  } catch {
    // Best-effort; in dev the user may need to manually reload.
  }
}

export default i18n;
