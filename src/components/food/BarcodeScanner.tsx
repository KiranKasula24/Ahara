"use client";

import { useEffect, useRef } from "react";
import { isValidBarcode } from "@/lib/off";

type DetectedCode = { rawValue: string };
type DetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedCode[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => DetectorLike;

type Props = { onDetected: (code: string) => void; onUnavailable: (reason: string) => void };

export function BarcodeScanner({ onDetected, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(onDetected);
  const unavailableRef = useRef(onUnavailable);

  useEffect(() => {
    detectedRef.current = onDetected;
    unavailableRef.current = onUnavailable;
  }, [onDetected, onUnavailable]);

  useEffect(() => {
    const Detector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      unavailableRef.current("This browser can’t scan barcodes. Type the number instead.");
      return;
    }
    let detector: DetectorLike;
    try {
      detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    } catch {
      detector = new Detector();
    }
    let stopped = false;
    let timer: number | undefined;
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        void video.play();
        const scan = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            const hit = codes.find((code) => isValidBarcode(code.rawValue));
            if (hit) {
              detectedRef.current(hit.rawValue);
              return;
            }
          } catch {
            /* a frame that can't be read is simply skipped */
          }
          timer = window.setTimeout(scan, 300);
        };
        void scan();
      })
      .catch(() => unavailableRef.current("Camera access was blocked. You can type the barcode instead."));

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="scan-box">
      <video ref={videoRef} playsInline muted aria-label="Camera view" />
      <p className="muted">Point the camera at the barcode and hold steady.</p>
    </div>
  );
}
