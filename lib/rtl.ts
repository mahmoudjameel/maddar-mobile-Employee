import i18n from "./i18n";

export function rtlFromLanguage(lng?: string | null): boolean {
  return lng?.startsWith("ar") ?? false;
}

/**
 * Snapshot from i18n (non-React). In components use useIsRTL() from @/lib/i18n-direction.
 */
export function isRTL(): boolean {
  return rtlFromLanguage(i18n.language);
}

export function listChevronIcon(rtl: boolean): "chevron-left" | "chevron-right" {
  return rtl ? "chevron-left" : "chevron-right";
}
