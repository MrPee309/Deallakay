import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { translations } from "@/i18n";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lang, setLang] = useState(localStorage.getItem("dl_lang") || "ht");

  const loadMeta = useCallback(async () => {
    try {
      const [c, cats, locs] = await Promise.all([
        api.get("/config"),
        api.get("/categories"),
        api.get("/locations"),
      ]);
      setConfig(c.data);
      setCategories(cats.data);
      setLocations(locs.data);
      const b = c.data.site_branding;
      document.title = `${b.siteName} — ${b.siteTagline}`;
    } catch (e) {
      console.error("meta load", e);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem("dl_lang", l);
  };

  const t = useCallback((key) => (translations[lang] && translations[lang][key]) || translations.ht[key] || key, [lang]);

  const branding = config?.site_branding || { siteName: "DealLakay", siteTagline: "Achte. Vann. Fè bon Deal.", currency: "HTG" };

  return (
    <AppContext.Provider value={{ config, branding, categories, locations, lang, changeLang, t, reloadMeta: loadMeta, safetyMessages: config?.safety_messages || [] }}>
      {children}
    </AppContext.Provider>
  );
}
