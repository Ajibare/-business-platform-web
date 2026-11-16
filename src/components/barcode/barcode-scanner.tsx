'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

/** Formats the platform may support. Unsupported entries are filtered out at runtime. */
const CANDIDATE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
];

export interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  /** Hide the start button and only render the camera surface. */
  autoStart?: boolean;
}

/**
 * Camera barcode scanner built on the browser BarcodeDetector API.
 *
 * Scanning only reads the code and hands it to the caller; it never writes
 * inventory. The camera is requested on demand, released after a detection or
 * when the component unmounts, and the manual input remains available when the
 * browser does not support detection.
 */
export function BarcodeScanner({ onDetected, autoStart = false }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const releaseResources = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stop = useCallback(() => {
    releaseResources();
    setActive(false);
    setStarting(false);
  }, [releaseResources]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseResources();
    };
  }, [releaseResources]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setStarting(true);
    setError(null);

    const start = async () => {
      const detectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
        .BarcodeDetector;

      if (!detectorCtor) {
        setUnsupported(true);
        setStarting(false);
        setActive(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot access the camera. Use manual entry instead.');
        setStarting(false);
        setActive(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (cancelled || !mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          releaseResources();
          return;
        }

        video.srcObject = stream;
        await video.play().catch(() => undefined);

        let formats = CANDIDATE_FORMATS;
        const supportsFormats = (
          detectorCtor as unknown as { getSupportedFormats?: () => Promise<string[]> }
        ).getSupportedFormats;
        if (supportsFormats) {
          try {
            const supported = await supportsFormats.call(detectorCtor);
            const usable = supported.filter((format) => CANDIDATE_FORMATS.includes(format));
            if (usable.length > 0) formats = usable;
          } catch {
            // Format negotiation is best effort; keep the candidate list.
          }
        }

        const detector = new detectorCtor({ formats });
        setStarting(false);

        intervalRef.current = window.setInterval(async () => {
          const element = videoRef.current;
          if (!element || element.readyState < 2) return;

          try {
            const codes = await detector.detect(element);
            const match = codes.find((code) => code.rawValue);
            if (match) {
              stop();
              onDetected(match.rawValue);
            }
          } catch {
            // Transient detection failures are ignored; the loop keeps running.
          }
        }, 350);
      } catch (cause) {
        const message =
          cause instanceof DOMException && cause.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access or use manual entry.'
            : 'The camera could not be started. Use manual entry instead.';
        setError(message);
        setStarting(false);
        setActive(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      releaseResources();
    };
  }, [active, onDetected, releaseResources, stop]);

  useEffect(() => {
    if (autoStart) setActive(true);
  }, [autoStart]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <Button variant="outline" onClick={stop}>
            <CameraOff className="mr-2 h-4 w-4" aria-hidden="true" />
            Stop camera
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setActive(true)}
            disabled={unsupported || starting}
          >
            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
            Start camera
          </Button>
        )}
        {starting ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Starting camera…
          </span>
        ) : null}
      </div>

      {unsupported ? (
        <Alert tone="info" title="Camera scanning is not supported in this browser">
          Use manual barcode entry below. Scanning with a supported browser (Chrome on Android or
          desktop, Edge) reads EAN-13, EAN-8 and UPC codes.
        </Alert>
      ) : null}

      {error ? <Alert tone="warning" title="Camera unavailable">{error}</Alert> : null}

      <div
        className={
          active
            ? 'relative overflow-hidden rounded-md border border-border bg-ink'
            : 'hidden'
        }
      >
        <video
          ref={videoRef}
          className="h-56 w-full object-cover sm:h-72"
          playsInline
          muted
          aria-label="Camera preview for barcode scanning"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-4/5 rounded border-2 border-white/70" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
