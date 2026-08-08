"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function CameraCapture({ onCapture, onCancel, onUnavailable }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable?.();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        onUnavailable?.();
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.9);
  }

  return (
    <div className="corner-frame rounded-2xl overflow-hidden">
      <span className="cf-tl" /><span className="cf-tr" /><span className="cf-bl" /><span className="cf-br" />
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {ready && (
          <>
            <button
              type="button"
              onClick={capture}
              aria-label="Capture photo"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-brand shadow-card active:scale-90 transition-transform"
            />
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
            >
              <Icon name="close" className="text-white text-[18px]" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
