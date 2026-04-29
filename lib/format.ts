import i18n from "./i18n";

function locale() {
  return i18n.language?.startsWith("en") ? "en-US" : "ar-SA";
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale());
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale());
  } catch {
    return iso;
  }
}

export function formatTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(locale(), {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
