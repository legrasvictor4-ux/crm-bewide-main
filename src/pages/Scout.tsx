import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Loader2, Star, Globe, Phone, MapPin, TrendingUp,
  MessageCircle, Mail, PhoneCall, Copy, CheckCheck, Plus, X,
  AlertTriangle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateClient } from "@/hooks/use-clients";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScoutResult {
  ocr:         { text: string; businessName: string };
  business:    { name: string; formatted_address?: string; rating?: number; user_ratings_total?: number; website?: string; formatted_phone_number?: string };
  social:      { instagram?: string; facebook?: string; tiktok?: string };
  competitors: { name: string; rating: number; reviews: number }[];
  intelligence: {
    score: number;
    verdict: string;
    opportunities: string[];
    weaknesses: string[];
    pitch: string;
    scripts: { call: string; dm: string; email: { subject: string; body: string } };
    objections: { objection: string; reponse: string }[];
    closingScore: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return "#ef4444";
  if (s >= 60) return "#f59e0b";
  return "#10b981";
}

function ScoreRing({ score }: { score: number }) {
  const r = 36, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="text-center z-10">
        <p className="text-2xl font-black" style={{ color }}>{score}</p>
        <p className="text-[10px] text-gray-500 font-medium">/ 100</p>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a1a2e] hover:bg-black/5 transition">
      {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Scout() {
  const fileRef        = useRef<HTMLInputElement>(null);
  const [phase, setPhase]   = useState<"idle" | "loading" | "result" | "error">("idle");
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [error,  setError]  = useState("");
  const [tab,    setTab]    = useState<"pitch" | "scripts" | "objections">("pitch");
  const [added,  setAdded]  = useState(false);

  const mutation = useCreateClient({
    onSuccess: () => { setAdded(true); toast.success("Prospect ajouté au CRM ✓"); },
    onError:   (e: Error) => toast.error(e.message),
  });

  // ── Capture photo ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setPhase("loading");
    setResult(null);
    setError("");
    setAdded(false);

    // GPS
    const gps = await new Promise<{ lat: number; lng: number }>((resolve) => {
      navigator.geolocation?.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        ()  => resolve({ lat: 48.8566, lng: 2.3522 }), // Paris fallback
      );
    });

    // Image → base64
    const b64 = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    try {
      const resp = await fetch("/api/scout/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, lat: gps.lat, lng: gps.lng }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error ?? "Erreur inconnue");
      setResult(data as ScoutResult);
      setPhase("result");
    } catch (e: any) {
      setError(e.message ?? "Analyse échouée");
      setPhase("error");
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  // ── Ajouter au CRM ────────────────────────────────────────────────────────
  const addToCRM = () => {
    if (!result || added) return;
    mutation.mutate({
      last_name: result.business.name,
      status:    "new",
      phone:     result.business.formatted_phone_number ?? null,
      city:      result.business.formatted_address?.split(",").at(-2)?.trim() ?? null,
      notes: [
        `Scout IA — Score opportunité : ${result.intelligence.score}/100`,
        result.intelligence.verdict,
        `\nPitch : ${result.intelligence.pitch}`,
        result.social.instagram ? `Instagram : @${result.social.instagram}` : null,
      ].filter(Boolean).join("\n"),
      metadata: { scout: result } as any,
    });
  };

  const intel = result?.intelligence;
  const biz   = result?.business;

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#1a1a2e]">Scout</h1>
          <p className="text-xs text-gray-500">Intelligence terrain IA</p>
        </div>
      </div>

      {/* ── Zone de capture ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.button
            key="capture"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-[#1a1a2e]/25 rounded-2xl py-14 flex flex-col items-center gap-3 hover:border-[#1a1a2e]/50 hover:bg-[#1a1a2e]/[0.02] transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a2e] flex items-center justify-center shadow-lg">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#1a1a2e]">Scanner un commerce</p>
              <p className="text-sm text-gray-500 mt-0.5">Photo d'une enseigne · façade · vitrine</p>
            </div>
          </motion.button>
        )}

        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl bg-[#1a1a2e] text-white p-8 flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              <Zap className="absolute inset-0 m-auto h-6 w-6 text-white" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-lg">Analyse en cours…</p>
              <p className="text-sm text-white/60">Vision IA → Places → Intelligence Claude</p>
            </div>
            {["Lecture de l'enseigne…", "Identification du business…", "Analyse de la présence digitale…", "Génération du pitch…"].map((s, i) => (
              <motion.p key={i} className="text-xs text-white/50"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 1.2 }}>
                {s}
              </motion.p>
            ))}
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
            <p className="font-semibold text-red-700">Analyse échouée</p>
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setPhase("idle")}
              className="px-4 py-2 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium">
              Réessayer
            </button>
          </motion.div>
        )}

        {phase === "result" && result && intel && biz && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-3">

            {/* Résumé business */}
            <div className="bg-white rounded-2xl border border-black/[0.07] p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-[#1a1a2e] text-lg leading-tight">{biz.name}</h2>
                  {biz.formatted_address && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {biz.formatted_address}
                    </p>
                  )}
                  {biz.rating && (
                    <p className="text-sm flex items-center gap-1 mt-1 text-amber-500 font-medium">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {biz.rating}★ · {biz.user_ratings_total?.toLocaleString()} avis Google
                    </p>
                  )}
                </div>
                <ScoreRing score={intel.score} />
              </div>

              <p className="text-sm text-gray-600 italic border-l-2 border-[#1a1a2e]/20 pl-3">
                {intel.verdict}
              </p>

              {/* Infos contact */}
              <div className="flex flex-wrap gap-2">
                {biz.formatted_phone_number && (
                  <a href={`tel:${biz.formatted_phone_number}`}
                    className="flex items-center gap-1.5 text-xs bg-[#1a1a2e]/5 px-3 py-1.5 rounded-full text-[#1a1a2e] font-medium">
                    <Phone className="h-3.5 w-3.5" /> {biz.formatted_phone_number}
                  </a>
                )}
                {biz.website && (
                  <a href={biz.website} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-[#1a1a2e]/5 px-3 py-1.5 rounded-full text-[#1a1a2e] font-medium">
                    <Globe className="h-3.5 w-3.5" /> Site web
                  </a>
                )}
                {result.social.instagram && (
                  <span className="flex items-center gap-1.5 text-xs bg-pink-50 px-3 py-1.5 rounded-full text-pink-600 font-medium">
                    @{result.social.instagram}
                  </span>
                )}
              </div>
            </div>

            {/* Opportunités détectées */}
            {intel.opportunities?.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opportunités détectées</p>
                {intel.opportunities.map((o, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-amber-500">⚡</span>
                    <span className="text-[#1a1a2e]">{o}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Concurrents */}
            {result.competitors?.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.07] p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Concurrents dans 500m</p>
                {result.competitors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#1a1a2e] font-medium">{c.name}</span>
                    <span className="text-amber-500 font-semibold">{c.rating}★ · {c.reviews} avis</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pitch + Scripts */}
            <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-black/[0.07]">
                {(["pitch", "scripts", "objections"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-xs font-semibold transition capitalize ${
                      tab === t ? "text-[#1a1a2e] border-b-2 border-[#1a1a2e]" : "text-gray-400"
                    }`}>
                    {t === "pitch" ? "Pitch terrain" : t === "scripts" ? "Scripts" : "Objections"}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {tab === "pitch" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-[#1a1a2e] leading-relaxed">{intel.pitch}</p>
                      <CopyButton text={intel.pitch} />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-gray-500">Score de closing estimé :</span>
                      <span className="text-sm font-bold text-[#1a1a2e]">{intel.closingScore}/10</span>
                    </div>
                  </div>
                )}

                {tab === "scripts" && (
                  <div className="space-y-4">
                    {/* Call */}
                    <div className="rounded-xl bg-[#1a1a2e]/[0.03] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#1a1a2e]">
                          <PhoneCall className="h-3.5 w-3.5" /> Script appel
                        </div>
                        <CopyButton text={intel.scripts.call} />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{intel.scripts.call}</p>
                    </div>
                    {/* DM */}
                    <div className="rounded-xl bg-pink-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-pink-700">
                          <MessageCircle className="h-3.5 w-3.5" /> DM Instagram
                        </div>
                        <CopyButton text={intel.scripts.dm} />
                      </div>
                      <p className="text-xs text-pink-800 leading-relaxed">{intel.scripts.dm}</p>
                    </div>
                    {/* Email */}
                    <div className="rounded-xl bg-blue-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </div>
                        <CopyButton text={`Objet: ${intel.scripts.email.subject}\n\n${intel.scripts.email.body}`} />
                      </div>
                      <p className="text-xs text-blue-600 font-semibold">Objet : {intel.scripts.email.subject}</p>
                      <p className="text-xs text-blue-800 leading-relaxed">{intel.scripts.email.body}</p>
                    </div>
                  </div>
                )}

                {tab === "objections" && (
                  <div className="space-y-3">
                    {intel.objections?.map((o, i) => (
                      <div key={i} className="rounded-xl border border-black/[0.07] p-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-500">— {o.objection}</p>
                        <p className="text-xs text-[#1a1a2e] leading-relaxed">✓ {o.reponse}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => { setPhase("idle"); setResult(null); }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-black/[0.1] text-sm font-medium text-gray-600 hover:bg-black/5 transition">
                <X className="h-4 w-4" /> Nouveau scan
              </button>
              <button onClick={addToCRM} disabled={added || mutation.isPending}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
                  added
                    ? "bg-green-500 text-white"
                    : "bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/85"
                }`}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {added ? "Ajouté au CRM ✓" : "Ajouter au CRM"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={onFileChange} />
    </div>
  );
}
