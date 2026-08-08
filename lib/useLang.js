"use client";

import { useEffect, useState } from "react";

const KEY = "doruyob_lang";

export function useLang(defaultLang = "ru") {
  const [lang, setLang] = useState(defaultLang);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored) setLang(stored);
    } catch {
      // localStorage unavailable (e.g. private mode) — fall back silently
    }
    setReady(true);
  }, []);

  const updateLang = (next) => {
    setLang(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // ignore
    }
  };

  return [lang, updateLang, ready];
}
