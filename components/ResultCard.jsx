"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

const TTS_LANG = { tg: "ru-RU", ru: "ru-RU", en: "en-US" };

function speak(text, lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = TTS_LANG[lang] || "ru-RU";
  window.speechSynthesis.speak(utter);
}

export default function ResultCard({ result, t, lang }) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [asking, setAsking] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  if (!result) return null;

  async function askFollowup() {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion("");
    setThread((prev) => [...prev, { question: q, answer: null }]);
    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          question: q,
          context: { name: result.name, whatItIs: result.whatItIs, whatToDo: result.whatToDo },
        }),
      });
      const data = await res.json();
      setThread((prev) => {
        const next = [...prev];
        next[next.length - 1] = { question: q, answer: res.ok ? data.answer : t.errorBody };
        return next;
      });
    } catch {
      setThread((prev) => {
        const next = [...prev];
        next[next.length - 1] = { question: q, answer: t.errorBody };
        return next;
      });
    } finally {
      setAsking(false);
    }
  }

  if (result.emergency) {
    return (
      <div className="rounded-card bg-danger/10 border border-danger/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="emergency" filled className="text-danger animate-pulse" />
          <h2 className="font-display font-bold text-lg text-danger">{t.emergencyTitle}</h2>
        </div>
        <p className="text-ink text-sm leading-relaxed">{t.emergencyBody}</p>
        <a
          href="tel:103"
          className="mt-1 w-full py-3 rounded-full bg-danger text-white font-display font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-card"
        >
          <Icon name="call" filled className="text-[18px]" />
          {t.emergencyCall}
        </a>
      </div>
    );
  }

  const confidenceLabel =
    result.confidence === "high" ? t.confidenceHigh : result.confidence === "medium" ? t.confidenceMedium : t.confidenceLow;
  const confidenceColor =
    result.confidence === "high" ? "text-brand" : result.confidence === "medium" ? "text-accent-dark" : "text-danger";

  return (
    <div className="corner-frame rounded-card">
      <span className="cf-tl" /><span className="cf-tr" /><span className="cf-bl" /><span className="cf-br" />
      <div className="rounded-card bg-surface shadow-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display font-bold text-xl text-ink">{result.name}</h2>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {canSpeak && (
              <button
                type="button"
                onClick={() => speak(`${result.whatItIs} ${result.whatToDo}`, lang)}
                aria-label="Listen"
                className="w-7 h-7 rounded-full bg-bg border border-line flex items-center justify-center text-brand active:scale-90 transition-transform"
              >
                <Icon name="volume_up" className="text-[15px]" />
              </button>
            )}
            <span className={`inline-flex items-center gap-1 bg-bg border border-line rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${confidenceColor}`}>
              <Icon name="verified" filled className="text-[13px]" />
              {confidenceLabel}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-muted mb-1">{t.whatItIs}</p>
          <p className="text-ink leading-relaxed">{result.whatItIs}</p>
        </div>

        <div className="h-px bg-line" />

        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-muted mb-1">{t.whatToDo}</p>
          <p className="text-ink leading-relaxed">{result.whatToDo}</p>
        </div>

        {result.warning ? (
          <div className="rounded-lg bg-accent/10 border border-accent/30 px-3 py-2 flex gap-2">
            <Icon name="warning" className="text-accent-dark text-[18px] shrink-0 mt-0.5" />
            <p className="text-sm text-ink">
              <span className="font-semibold">{t.warning}: </span>
              {result.warning}
            </p>
          </div>
        ) : null}

        {/* Follow-up chat */}
        <div className="pt-2 border-t border-line space-y-3">
          {thread.map((turn, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-sm text-ink bg-bg rounded-xl rounded-br-sm px-3 py-2 ml-6">{turn.question}</p>
              {turn.answer ? (
                <p className="text-sm text-muted bg-brand/5 rounded-xl rounded-bl-sm px-3 py-2 mr-6">{turn.answer}</p>
              ) : (
                <p className="text-sm text-muted px-3">…</p>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askFollowup()}
              placeholder={t.followupPlaceholder}
              className="flex-1 rounded-full border border-line bg-bg px-4 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <button
              type="button"
              onClick={askFollowup}
              disabled={!question.trim() || asking}
              aria-label="Send"
              className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform shrink-0"
            >
              <Icon name="arrow_upward" className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
