import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Loader2, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const hairOptions = ["blonde", "brunette", "black", "red", "pink", "white"] as const;
const eyeOptions = ["brown", "blue", "green", "hazel", "grey"] as const;
const bodyOptions = ["slim", "regular", "curvy"] as const;
const styleOptions = ["natural", "model", "egirl"] as const;

/* ── Toggle row ── */
const ToggleRow = ({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`rounded-2xl border-[4px] px-5 py-2.5 text-sm font-extrabold lowercase transition-all ${
          value === opt
            ? "border-neon-yellow bg-neon-yellow text-neon-yellow-foreground"
            : "border-[hsl(0,0%,25%)] text-white/60 hover:border-white/40"
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

/* ── Select dropdown on dark bg ── */
const DarkSelect = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) => (
  <label className="relative block">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-14 w-full appearance-none rounded-2xl border-[4px] border-[hsl(0,0%,25%)] bg-transparent px-4 pr-10 text-sm font-extrabold lowercase text-white outline-none transition-colors focus:border-white/50"
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-black text-white">
          {opt}
        </option>
      ))}
    </select>
    <ChevronDown
      size={16}
      strokeWidth={2.5}
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50"
    />
  </label>
);

/* ── Section label ── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-[900] lowercase tracking-tight text-white">
    {children}
  </h3>
);

/* ═══════════════ MAIN OVERLAY ═══════════════ */

interface CharacterCreatorOverlayProps {
  open: boolean;
  onClose: () => void;
}

const CharacterCreatorOverlay = ({ open, onClose }: CharacterCreatorOverlayProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [style, setStyle] = useState("natural");
  const [hair, setHair] = useState("brunette");
  const [eye, setEye] = useState("brown");
  const [body, setBody] = useState("regular");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    const prev = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      root: root?.style.overflow ?? "",
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [open]);

  const buildPrompt = () => {
    let prompt = `photorealistic portrait, woman, ${body} body type, ${hair} hair, ${eye} eyes, ${style} style`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const handleCreate = async () => {
    if (!user) {
      onClose();
      navigate("/auth?redirect=/");
      return;
    }

    setIsSaving(true);
    try {
      const charData = {
        user_id: user.id,
        name: `${hair} ${eye} ${style}`,
        country: "any",
        age: "25",
        hair: sanitiseText(hair, 50),
        eye: sanitiseText(eye, 50),
        body: sanitiseText(body, 50),
        style: sanitiseText(style, 50),
        description: sanitiseText(description, 500),
      };

      const { data: inserted, error: insertError } = await supabase
        .from("characters")
        .insert(charData)
        .select("id")
        .single();

      if (insertError) throw insertError;

      onClose();
      navigate("/choose-face", {
        state: { prompt: buildPrompt(), characterId: inserted.id },
      });
    } catch (err: any) {
      toast({
        title: "error",
        description: err.message || "failed to save character",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] flex flex-col bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-2">
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white/20 transition-colors hover:border-white/40"
              aria-label="close"
            >
              <X size={18} strokeWidth={2.5} className="text-white" />
            </button>
            <span className="text-xs font-extrabold lowercase text-white/40">
              create character
            </span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-28">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-10 pt-6">
              {/* Style */}
              <section className="flex flex-col gap-4">
                <SectionLabel>style</SectionLabel>
                <ToggleRow options={styleOptions} value={style} onChange={setStyle} />
              </section>

              {/* Hair */}
              <section className="flex flex-col gap-4">
                <SectionLabel>hair colour</SectionLabel>
                <ToggleRow options={hairOptions} value={hair} onChange={setHair} />
              </section>

              {/* Eyes */}
              <section className="flex flex-col gap-4">
                <SectionLabel>eye colour</SectionLabel>
                <ToggleRow options={eyeOptions} value={eye} onChange={setEye} />
              </section>

              {/* Body */}
              <section className="flex flex-col gap-4">
                <SectionLabel>body type</SectionLabel>
                <ToggleRow options={bodyOptions} value={body} onChange={setBody} />
              </section>

              {/* Description */}
              <section className="flex flex-col gap-4">
                <SectionLabel>details</SectionLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="face shape, hairstyle, outfit, pose, mood..."
                  rows={4}
                  className="min-h-[120px] w-full resize-none rounded-2xl border-[4px] border-[hsl(0,0%,25%)] bg-transparent px-4 py-3 text-sm font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/50"
                />
              </section>
            </div>
          </div>

          {/* Fixed bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 z-10 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="flex h-[58px] w-full items-center justify-center gap-2 rounded-full bg-neon-yellow text-base font-[900] lowercase tracking-tight text-neon-yellow-foreground transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{ transition: "transform 0.05s" }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  saving...
                </>
              ) : (
                <>
                  <Zap size={18} strokeWidth={2.5} />
                  create
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CharacterCreatorOverlay;
