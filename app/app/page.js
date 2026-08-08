"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STRINGS } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import { fileToCompressedBase64 } from "@/lib/image";
import LanguageSwitch from "@/components/LanguageSwitch";
import ScanFrame from "@/components/ScanFrame";
import ResultCard from "@/components/ResultCard";
import PharmacyList from "@/components/PharmacyList";
import CameraCapture from "@/components/CameraCapture";
import Icon from "@/components/Icon";

function blobToCompressedBase64(blob) {
  const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
  return fileToCompressedBase64(file);
}

export default function AppPage() {
  const [lang, setLang, ready] = useLang("ru");
  const [tab, setTab] = useState("photo");
  const [text, setText] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoData, setPhotoData] = useState(null); // { base64, mimeType }
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorCode, setErrorCode] = useState(null);
  const [result, setResult] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    if (new URLSearchParams(window.location.search).get("emergency") === "1") {
      window.location.href = "tel:103";
    }
  }, []);

  if (!ready) return null;
  const t = STRINGS[lang];

  async function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError(null);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);
      setPhotoData({ base64, mimeType });
    } catch {
      setPhotoData(null);
      setPhotoError(t.photoDecodeError);
    }
  }

  async function handleCameraCapture(blob) {
    setCameraOpen(false);
    setPhotoPreview(URL.createObjectURL(blob));
    setPhotoError(null);
    try {
      const { base64, mimeType } = await blobToCompressedBase64(blob);
      setPhotoData({ base64, mimeType });
    } catch {
      setPhotoData(null);
      setPhotoError(t.photoDecodeError);
    }
  }

  function resetPhoto() {
    setPhotoData(null);
    setPhotoError(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openCamera() {
    resetPhoto();
    setCameraOpen(true);
  }

  function openGallery() {
    resetPhoto();
    // defer so input value reset is flushed before click
    setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = lang === "en" ? "en-US" : "ru-RU"; // tg-TJ has no browser STT support yet; ru covers most bilingual speakers
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 4000 }
    );
  }

  async function handleSubmit() {
    if (tab === "text" && !text.trim()) return;
    if (tab === "photo" && !photoData) return;

    setStatus("loading");
    setErrorCode(null);
    requestLocation();

    try {
      const payload = { type: tab === "photo" ? "image" : "text", lang };
      if (tab === "text") {
        payload.text = text.trim();
      } else {
        payload.imageBase64 = photoData.base64;
        payload.mimeType = photoData.mimeType;
      }

      let res;
      try {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new Error("network_error");
      }

      if (!res.ok) {
        let errorType = "unexpected";
        try {
          const errData = await res.json();
          errorType = errData.error || "unexpected";
        } catch {}
        throw new Error(errorType);
      }

      const data = await res.json();
      setResult(data.result);
      setPharmacies(data.pharmacies || []);
      setStatus("done");
    } catch (err) {
      setErrorCode(err.message);
      setStatus("error");
    }
  }

  function getErrorBody() {
    if (errorCode === "network_error") return t.errorNetworkBody;
    if (errorCode === "server_misconfigured") return t.errorConfigBody;
    if (errorCode === "gemini_error" || errorCode === "empty_response" || errorCode === "parse_error") return t.errorImageBody;
    return t.errorBody;
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setPharmacies([]);
    setText("");
    setPhotoData(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setErrorCode(null);
    setCameraOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="min-h-screen flex flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-6 pb-4 max-w-md mx-auto w-full">
        <Link href="/" className="flex items-center gap-2" aria-label="DoruYob home">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Icon name="medical_services" filled className="text-white text-[16px]" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-tight text-brand">{t.appName}</span>
        </Link>
        <LanguageSwitch lang={lang} onChange={setLang} />
      </header>

      {/* CAPTURE */}
      {status === "idle" && (
        <div className="px-5 max-w-md mx-auto w-full flex-1">
          <h1 className="font-display font-bold text-2xl text-ink mb-1">{t.captureTitle}</h1>
          <p className="text-muted text-sm mb-5">{t.captureSub}</p>

          <div className="relative bg-line/60 rounded-full p-1 flex mb-5">
            <div
              className="absolute inset-y-1 w-[calc(50%-4px)] bg-surface rounded-full shadow-sm border border-line transition-transform duration-300"
              style={{ transform: tab === "text" ? "translateX(100%)" : "translateX(0)" }}
            />
            <button type="button" onClick={() => setTab("photo")} className={`relative z-10 flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "photo" ? "text-ink" : "text-muted"}`}>
              <Icon name="photo_camera" className="text-[16px]" />
              {t.tabPhoto}
            </button>
            <button type="button" onClick={() => setTab("text")} className={`relative z-10 flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "text" ? "text-ink" : "text-muted"}`}>
              <Icon name="edit_document" className="text-[16px]" />
              {t.tabText}
            </button>
          </div>

          {tab === "photo" ? (
            cameraOpen ? (
              <CameraCapture
                onCapture={handleCameraCapture}
                onCancel={() => setCameraOpen(false)}
                onUnavailable={() => {
                  setCameraSupported(false);
                  setCameraOpen(false);
                  // defer click so React re-renders the file input into the DOM first
                  setTimeout(() => fileInputRef.current?.click(), 0);
                }}
              />
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />

                {/* Preview frame */}
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="w-full h-56 rounded-2xl object-contain bg-surface border border-line"
                  />
                ) : (
                  <ScanFrame
                    className="rounded-2xl border border-line bg-surface h-56 flex flex-col items-center justify-center gap-2 cursor-pointer"
                    onClick={openGallery}
                  >
                    <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center text-brand">
                      <Icon name="add_a_photo" filled className="text-[26px]" />
                    </div>
                    <h3 className="font-display font-bold text-ink">{t.uploadHint}</h3>
                    <p className="text-sm text-muted">{t.uploadSub}</p>
                  </ScanFrame>
                )}

                {photoError && (
                  <p className="mt-2 text-sm text-danger text-center">{photoError}</p>
                )}

                {/* Action buttons — camera + gallery, always visible */}
                <div className="mt-3 flex gap-3 justify-center">
                  {cameraSupported && (
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex-1 py-2.5 rounded-full border border-brand text-brand text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Icon name="photo_camera" className="text-[16px]" />
                      {t.useCamera}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openGallery}
                    className="flex-1 py-2.5 rounded-full border border-brand text-brand text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Icon name="image" className="text-[16px]" />
                    {t.useGallery}
                  </button>
                </div>
              </>
            )
          ) : (
            <div className="relative">
              <ScanFrame className="rounded-2xl">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.textPlaceholder}
                  rows={6}
                  className="w-full h-56 rounded-2xl border border-line bg-surface px-4 py-3 pb-12 text-ink placeholder:text-muted resize-none focus:border-brand focus:outline-none"
                />
              </ScanFrame>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label={t.micHint}
                  className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    listening ? "bg-danger text-white animate-pulse" : "bg-brand text-white"
                  }`}
                >
                  <Icon name={listening ? "stop" : "mic"} filled className="text-[16px]" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={cameraOpen || (tab === "photo" && !photoData)}
            className="w-full mt-5 py-3.5 rounded-full bg-accent text-ink font-display font-bold text-base flex items-center justify-center gap-2 hover:bg-accent-dark transition-colors active:scale-95 disabled:opacity-50"
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            {t.submit}
          </button>
        </div>
      )}

      {/* LOADING */}
      {status === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <ScanFrame className="relative w-52 h-52 overflow-hidden rounded-2xl bg-surface">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-[2px]" />
            )}
            <div className="absolute inset-0 z-10 scan-beam" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-surface/80 backdrop-blur-sm p-4 rounded-full border border-brand/20 shadow-card">
                <Icon name="qr_code_scanner" className="text-brand text-[32px] animate-pulse" />
              </div>
            </div>
          </ScanFrame>
          <h2 className="mt-6 font-display font-bold text-xl text-brand">{t.loading}</h2>
          <p className="mt-1 text-sm text-muted text-center max-w-[240px]">{t.loadingSub}</p>
          <div className="mt-5 flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0s" }} />
            <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0.15s" }} />
            <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      )}

      {/* ERROR */}
      {status === "error" && (
        <div className="px-5 mt-5 max-w-md mx-auto w-full">
          <div className="rounded-card bg-danger/10 border border-danger/30 p-4 text-center space-y-2">
            <p className="font-semibold text-danger">{t.errorTitle}</p>
            <p className="text-sm text-ink">{getErrorBody()}</p>
            <button type="button" onClick={reset} className="mt-2 px-5 py-2 rounded-full bg-brand text-white text-sm font-medium">
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {status === "done" && (
        <div className="px-5 mt-2 space-y-5 max-w-md mx-auto w-full pb-10">
          <ResultCard result={result} t={t} lang={lang} />
          {!result?.emergency && <PharmacyList pharmacies={pharmacies} userLocation={userLocation} t={t} />}
          <button type="button" onClick={reset} className="w-full py-3 rounded-full border border-line text-ink font-medium">
            {t.tryAgain}
          </button>
        </div>
      )}

      <footer className="mt-auto px-5 py-6 max-w-md mx-auto w-full">
        <p className="text-xs text-muted text-center leading-relaxed">{t.disclaimer}</p>
      </footer>
    </main>
  );
}
