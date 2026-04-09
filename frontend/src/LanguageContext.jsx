// LanguageContext.jsx
// Wrap your <App /> with <LanguageProvider> once.
// Every page calls useTranslation() to get strings + helpers.

import { createContext, useContext, useState } from "react";
import { translations } from "./i18n";
import { safeT } from "./safeT";

const LanguageContext = createContext(null);

export function LanguageProvider({ children, defaultLang = "ar" }) {
  const [lang, setLang] = useState(defaultLang);

  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));

  const value = {
    lang,
    setLang,
    toggleLang,
    isRTL: lang === "ar",
    t: safeT(translations[lang]),
  };

  return (
    <LanguageContext.Provider value={value}>
      <div dir={value.isRTL ? "rtl" : "ltr"} lang={lang}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

/**
 * Usage in any component:
 *   const { t, lang, toggleLang, isRTL } = useTranslation();
 */
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside <LanguageProvider>");
  return ctx;
}