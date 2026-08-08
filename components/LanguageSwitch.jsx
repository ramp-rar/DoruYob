import { LANGS } from "@/lib/i18n";

export default function LanguageSwitch({ lang, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white border border-line p-1 shadow-card">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            lang === l.code
              ? "bg-brand text-white"
              : "text-muted hover:text-ink"
          }`}
          aria-pressed={lang === l.code}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
