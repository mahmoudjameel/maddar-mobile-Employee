import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import colors, { Palette } from "@/constants/colors";
import { _setActivePalette } from "@/components/UI";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "maddar.themeMode";

type Ctx = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  palette: Palette;
  setMode: (m: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<Ctx | null>(null);

function resolveMode(mode: ThemeMode, system: ColorSchemeName): "light" | "dark" {
  if (mode === "system") return system === "dark" ? "dark" : "light";
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") {
          setModeState(v);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const resolved = useMemo(() => resolveMode(mode, systemScheme), [mode, systemScheme]);
  const palette = resolved === "dark" ? colors.dark : colors.light;

  // Push palette changes into the UI module so theme/styles proxies update.
  useEffect(() => {
    _setActivePalette(palette);
  }, [palette]);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
    } catch {}
  }, []);

  if (!hydrated) return null;

  const value: Ctx = { mode, resolved, palette, setMode };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: "system",
      resolved: "light",
      palette: colors.light,
      setMode: async () => {},
    };
  }
  return ctx;
}
