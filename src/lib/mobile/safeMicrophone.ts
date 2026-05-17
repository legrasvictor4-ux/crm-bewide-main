const MIC_PERMISSION_KEY = 'bewide_mic_permission';

type MicState = {
  available: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unavailable';
  error: string | null;
};

let cachedMicState: MicState | null = null;

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroidChrome(): boolean {
  return /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent);
}

function isSamsungBrowser(): boolean {
  return /SamsungBrowser/.test(navigator.userAgent);
}

export function detectMobileBrowser(): 'ios' | 'android_chrome' | 'samsung' | 'other' {
  if (isIOS()) return 'ios';
  if (isAndroidChrome()) return 'android_chrome';
  if (isSamsungBrowser()) return 'samsung';
  return 'other';
}

function getSpeechRecognition(): new () => SpeechRecognition | null {
  const w = globalThis as any;
  return (
    w.SpeechRecognition ??
    w.webkitSpeechRecognition ??
    null
  );
}

export function isSpeechAPIAvailable(): boolean {
  return getSpeechRecognition() !== null;
}

export async function checkMicroPermission(): Promise<MicState> {
  if (cachedMicState) return cachedMicState;

  const apiAvailable = isSpeechAPIAvailable();
  const browser = detectMobileBrowser();

  if (!apiAvailable) {
    cachedMicState = { available: false, permission: 'unavailable', error: 'Speech API not available' };
    return cachedMicState;
  }

  if (browser === 'ios') {
    const perm = localStorage.getItem(MIC_PERMISSION_KEY);
    if (perm === 'granted') {
      cachedMicState = { available: true, permission: 'granted', error: null };
      return cachedMicState;
    }
    cachedMicState = { available: true, permission: 'prompt', error: null };
    return cachedMicState;
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const permission = result.state as MicState['permission'];

      if (permission === 'granted') {
        localStorage.setItem(MIC_PERMISSION_KEY, 'granted');
      }

      cachedMicState = {
        available: permission !== 'denied',
        permission,
        error: permission === 'denied' ? 'Microphone access denied' : null,
      };
      return cachedMicState;
    } catch { /* ignore */ }
  }

  cachedMicState = { available: true, permission: 'prompt', error: null };
  return cachedMicState;
}

export function createSafeSpeechRecognition(): SpeechRecognition | null {
  const SR = getSpeechRecognition();
  if (!SR) return null;

  const recognition = new SR();
  recognition.lang = 'fr-FR';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  return recognition;
}

export function resetMicCache(): void {
  cachedMicState = null;
}

export interface MobileMicOptions {
  onInterruption?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
}

export function createMobileMicGuard(options: MobileMicOptions) {
  let recognition: SpeechRecognition | null = null;
  let wasActiveBeforeSuspend = false;

  function attach(rec: SpeechRecognition): void {
    recognition = rec;
  }

  function handleVisibilityChange(visible: boolean): void {
    if (!recognition) return;

    if (!visible) {
      try { recognition?.stop(); } catch { /* ignore */ }
      wasActiveBeforeSuspend = true;
      options.onInterruption?.();
    } else if (wasActiveBeforeSuspend) {
      wasActiveBeforeSuspend = false;
      options.onResume?.();
    }
  }

  function detach(): void {
    recognition = null;
    wasActiveBeforeSuspend = false;
  }

  return { attach, detach, handleVisibilityChange };
}
