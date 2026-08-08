"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import LanguageSwitch from "@/components/LanguageSwitch";
import Icon from "@/components/Icon";

const STEP_ICONS = ["search_insights", "auto_awesome", "location_on"];

export default function LandingPage() {
  const [lang, setLang, ready] = useLang("ru");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.count === "number" && setStats(d.count))
      .catch(() => {});
  }, []);

  if (!ready) return null;
  const t = STRINGS[lang];
  const steps = [
    { title: t.step1Title, body: t.step1 },
    { title: t.step2Title, body: t.step2 },
    { title: t.step3Title, body: t.step3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-bg border-b border-line">
        <div className="flex items-center justify-between w-full px-4 h-16 max-w-5xl mx-auto">
          <div className="font-display font-bold text-lg text-brand flex items-center gap-2">
            <Icon name="medical_services" filled />
            {t.appName}
          </div>
          <LanguageSwitch lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        {/* Hero */}
        <section className="px-4 py-12 md:py-20 flex flex-col items-center text-center bg-surface">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg border border-line">
              <Icon name="auto_awesome" className="text-brand text-[16px]" />
              <span className="font-mono text-xs text-muted uppercase tracking-wider">
                {t.eyebrow}
              </span>
            </div>

            <h1 className="font-display font-extrabold text-3xl md:text-5xl leading-tight text-brand tracking-tight">
              {t.heroTitle}
            </h1>

            <p className="text-muted text-base md:text-lg leading-relaxed max-w-xl">
              {t.heroSub}
            </p>

            <p className="text-brand text-sm font-medium flex items-center gap-1.5">
              <Icon name="check_circle" filled className="text-[18px]" />
              {t.heroDifferentiator}
            </p>

            <Link
              href="/app"
              className="mt-2 inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-ink rounded-full font-display font-bold text-base shadow-card hover:bg-accent-dark transition-colors active:scale-95"
            >
              {t.heroCta}
              <Icon name="arrow_forward" />
            </Link>

            {stats !== null && (
              <p className="text-xs font-mono text-muted mt-1">
                {stats.toLocaleString(lang === "ru" ? "ru-RU" : lang === "tg" ? "tg-TJ" : "en-US")}{" "}
                {t.statsCount}
              </p>
            )}
          </div>

          {/* Mini capture preview, echoes the real tool */}
          <div className="mt-10 w-full max-w-sm mx-auto corner-frame rounded-2xl">
            <span className="cf-tl" /><span className="cf-tr" /><span className="cf-bl" /><span className="cf-br" />
            <div className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center shrink-0">
                <Icon name="photo_camera" filled className="text-white text-[20px]" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-3/4 bg-line rounded-full" />
                <div className="h-2 w-1/2 bg-line/70 rounded-full" />
              </div>
              <div className="w-8 h-8 rounded-full border border-brand flex items-center justify-center shrink-0">
                <Icon name="search" className="text-brand text-[16px]" />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-14 bg-bg">
          <div className="max-w-xl mx-auto flex flex-col gap-8">
            <div className="text-center">
              <h2 className="font-display font-bold text-xl text-brand mb-1">{t.howItWorks}</h2>
              <p className="text-muted text-sm">{t.howItWorksSub}</p>
            </div>

            {steps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex flex-col items-center gap-2 mt-1 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center font-mono text-sm text-brand font-semibold">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && <div className="w-px h-16 bg-line" />}
                </div>
                <div className="flex-1 bg-surface border border-line p-4 rounded-2xl">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-brand/10 rounded-lg text-brand">
                      <Icon name={STEP_ICONS[i]} className="text-[18px]" />
                    </div>
                    <h3 className="font-display font-bold text-base text-ink">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-surface border-t border-line px-4 py-8 text-center">
        <div className="font-display font-bold text-brand flex items-center justify-center gap-2 mb-3">
          <Icon name="medical_services" filled className="text-[18px]" />
          {t.appName}
        </div>
        <p className="text-xs text-muted leading-relaxed">{t.footer}</p>
      </footer>
    </div>
  );
}
