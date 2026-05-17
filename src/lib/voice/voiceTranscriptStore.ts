import logger from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptVersion {
  id: string;
  text: string;
  timestamp: number;
  source: "live" | "paste" | "restore";
}

export interface TranscriptStore {
  current: string;
  versions: TranscriptVersion[];
  interim: string;
}

// ─── Store en mémoire ─────────────────────────────────────────────────────────

let store: TranscriptStore = {
  current: "",
  versions: [],
  interim: "",
};

let versionCounter = 0;

export function resetTranscriptStore(): void {
  store = { current: "", versions: [], interim: "" };
  versionCounter = 0;
}

export function appendTranscript(text: string, isFinal: boolean): void {
  if (isFinal && text.trim()) {
    store.current = (store.current + " " + text).trim();
    versionCounter++;
    store.versions.push({
      id: `v${versionCounter}`,
      text: store.current,
      timestamp: Date.now(),
      source: "live",
    });
    logger.voice.info("transcriptStore", `Version ${versionCounter} ajoutée`, {
      versionId: `v${versionCounter}`,
      length: store.current.length,
    });
  } else {
    store.interim = text;
  }
}

export function setTranscript(text: string, source: "paste" | "restore" = "paste"): void {
  store.current = text.trim();
  versionCounter++;
  store.versions.push({
    id: `v${versionCounter}`,
    text: store.current,
    timestamp: Date.now(),
    source,
  });
  store.interim = "";
  logger.voice.info("transcriptStore", `Transcript défini via ${source}`, {
    versionId: `v${versionCounter}`,
    length: store.current.length,
  });
}

export function getTranscript(): string {
  return store.current;
}

export function getTranscriptVersions(): TranscriptVersion[] {
  return [...store.versions];
}

export function getTranscriptVersion(id: string): TranscriptVersion | undefined {
  return store.versions.find(v => v.id === id);
}

export function restoreTranscriptVersion(id: string): boolean {
  const version = getTranscriptVersion(id);
  if (!version) return false;
  store.current = version.text;
  versionCounter++;
  store.versions.push({
    id: `v${versionCounter}`,
    text: version.text,
    timestamp: Date.now(),
    source: "restore",
  });
  logger.voice.info("transcriptStore", `Version ${id} restaurée`, {
    restoredVersionId: `v${versionCounter}`,
  });
  return true;
}

export function getTranscriptStore(): TranscriptStore {
  return { ...store, versions: [...store.versions] };
}
