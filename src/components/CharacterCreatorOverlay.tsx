import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const categories = [
  { key: "style", label: "style", options: ["natural", "model", "egirl"] },
  { key: "hair", label: "hair", options: ["blonde", "brunette", "black", "red", "pink", "white"] },
  { key: "eyes", label: "eyes", options: ["brown", "blue", "green", "hazel", "grey"] },
  { key: "body", label: "body", options: ["slim", "regular", "curvy"] },
] as const;

type CatKey = (typeof categories)[number]["key"];

/* ── Selection box ── */
const SelectionBox = ({
  value,
  active,
  onClick,
}: {
  value: string | null;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex h-14 w-full items-center justify-center rounded-2xl border-[5px] text-sm font-[900] lowercase tracking-tight transition-colors ${
      active
        ? "border-neon-yellow bg-white/10 text-white"
        : "border-white/15 bg-white/5 text-white/80"
    }`}
  >
    {value || "–"}
  </button>
);

/* ── Toggle options that appear below a row ── */
const ToggleOptions = ({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string | null;
  onSelect: (v: string) => void;
}) => (
  <motion.div
    className="col-span-2 flex flex-wrap gap-2 pb-2"
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.2 }}
  >
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onSelect(opt)}
        className={`rounded-2xl border-[5px] px-4 py-2 text-xs font-[900] lowercase transition-all ${
          value === opt
            ? "border-neon-yellow bg-neon-yellow text-neon-yellow-foreground"
            : "border-white/15 text-white/60 hover:border-white/40"
        }`}
      >
        {opt}
      </button>
    ))}
  </motion.div>
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

  const [values, setValues] = useState<Record<CatKey, string | null>>({
    style: null,
    hair: null,
    eyes: null,
    body: null,
  });
  const [expandedKey, setExpandedKey] = useState<CatKey | null>(null);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setValues({ style: null, hair: null, eyes: null, body: null });
      setExpandedKey(null);
      setDescription("");
    }
  }, [open]);

  // Lock scroll
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
    const s = values.style || "natural";
    const h = values.hair || "brunette";
    const e = values.eyes || "brown";
    const b = values.body || "regular";
    let prompt = `photorealistic portrait, woman, ${b} body type, ${h} hair, ${e} eyes, ${s} style`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const handleCreate = async () => {
    if (!user) {
      onClose();
      navigate("/account?redirect=%2F");
      return;
    }

    setIsSaving(true);
    try {
      const h = values.hair || "brunette";
      const e = values.eyes || "brown";
      const s = values.style || "natural";
      const b = values.body || "regular";

      const charData = {
        user_id: user.id,
        name: `${h} ${e} ${s}`,
        country: "any",
        age: "25",
        hair: sanitiseText(h, 50),
        eye: sanitiseText(e, 50),
        body: sanitiseText(b, 50),
        style: sanitiseText(s, 50),
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
      toast.error(err.message || "failed to save character");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelect = (key: CatKey, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setExpandedKey(null);
  };

  const toggleExpand = (key: CatKey) => {
    setExpandedKey((prev) => (prev === key ? null : key));
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
          <div className="flex items-center px-5 pt-5 pb-2">
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border-[5px] border-white/15 transition-colors hover:border-white/40"
              aria-label="close"
            >
              <X size={16} strokeWidth={2.5} className="text-white" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-28">
            <div className="mx-auto flex w-full max-w-sm flex-col pt-2">
              {/* 2-column grid: each cell = label + box stacked */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                {categories.map((cat) => (
                  <div key={cat.key} className="flex flex-col gap-2">
                    <span className="text-sm font-[900] lowercase tracking-tight text-white">
                      {cat.label}
                    </span>
                    <SelectionBox
                      value={values[cat.key]}
                      active={expandedKey === cat.key}
                      onClick={() => toggleExpand(cat.key)}
                    />
                  </div>
                ))}
              </div>

              {/* Expanded toggles — shown below grid */}
              <AnimatePresence>
                {expandedKey && (
                  <motion.div
                    className="mt-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ToggleOptions
                      options={categories.find((c) => c.key === expandedKey)!.options}
                      value={values[expandedKey]}
                      onSelect={(v) => handleSelect(expandedKey, v)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Details textarea */}
              <div className="mt-10">
                <span className="mb-3 block text-sm font-[900] lowercase tracking-tight text-white">
                  details
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="face shape, hairstyle, outfit, pose, mood..."
                  rows={3}
                  className="min-h-[100px] w-full resize-none rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 py-3 text-sm font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/50"
                />
              </div>
            </div>
          </div>

          {/* Fixed bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 z-10 px-10 pb-[max(env(safe-area-inset-bottom),2rem)] pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-neon-yellow text-base font-[900] lowercase tracking-tight text-neon-yellow-foreground transition-transform active:scale-[0.97] disabled:opacity-60"
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
