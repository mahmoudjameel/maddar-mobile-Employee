import React, { createContext, useContext, useEffect, useState } from "react";

import i18n from "./i18n";
import { rtlFromLanguage } from "./rtl";

const RtlContext = createContext<boolean>(false);

/**
 * Subscribes to i18n language changes so layout direction updates everywhere
 * (including tab screens that may not re-render from useTranslation alone).
 */
export function I18nDirectionProvider({ children }: { children: React.ReactNode }) {
  const [rtl, setRtl] = useState(() => rtlFromLanguage(i18n.language));

  useEffect(() => {
    const onLang = (lng: string) => setRtl(rtlFromLanguage(lng));
    i18n.on("languageChanged", onLang);
    setRtl(rtlFromLanguage(i18n.language));
    return () => {
      i18n.off("languageChanged", onLang);
    };
  }, []);

  return <RtlContext.Provider value={rtl}>{children}</RtlContext.Provider>;
}

export function useIsRTL(): boolean {
  return useContext(RtlContext);
}
