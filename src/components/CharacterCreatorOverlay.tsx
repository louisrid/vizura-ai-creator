import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Zap, Gem } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const categories = [
  { key: "skin", label: "skin", options: ["white", "tan", "asian", "black"] },
  { key: "bodyType", label: "body type", options: ["slim", "regular", "curvy"] },
  { key: "chest", label: "chest", options: ["small", "medium", "large"] },
  { key: "hairStyle", label: "hair", options: ["straight", "curly", "bangs", "short"] },
  { key: "hairColour", label: "hair colour", options: ["blonde", "brunette", "black", "pink"] },
  { key: "eyes", label: "eyes", options: ["brown", "blue", "green", "hazel"] },
  { key: "makeup", label: "makeup", options: ["natural", "classic"] },
] as const;

type CatKey = (typeof categories)[number]["key"];

const SelectionBox = ({ value, active, onClick }: { value: string | null; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex h-14 w-full items-center justify-center rounded-2xl border-[5px] text-sm font-[900] lowercase tracking-tight transition-colors ${
    active ? "border-neon-yellow bg-neon-yellow/10 text-white" : "border-[#1a1a1a] text-white/80"
    }`}
    style={{ backgroundColor: active ? "rgba(250,204,21,0.1)" : "#111111" }}
  >
    {value || "–"}
  </button>
);

const ToggleOptions = ({ options, value, onSelect }: { options: readonly string[]; value: string | null; onSelect: (v: string) => void }) => (
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
          className={`rounded-2xl border-2 px-4 py-2 text-xs font-[900] lowercase transition-all ${
          value === opt
            ? "border-neon-yellow bg-neon-yellow text-neon-yellow-foreground"
            : "border-[#1a1a1a] text-white/60 hover:border-white/40"
        }`}
        style={{ backgroundColor: value === opt ? undefined : "#111111" }}
      >
        {opt}
      </button>
    ))}
  </motion.div>
);

interface CharacterCreatorOverlayProps { open: boolean; onClose: () => void; }

const CharacterCreatorOverlay = ({ open, onClose }: CharacterCreatorOverlayProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [values, setValues] = useState<Record<CatKey, string | null>>({
    skin: null, bodyType: null, chest: null, hairStyle: null, hairColour: null, eyes: null, makeup: null,
  });
  const [expandedKey, setExpandedKey] = useState<CatKey | null>(null);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setValues({ skin: null, bodyType: null, chest: null, hairStyle: null, hairColour: null, eyes: null, makeup: null });
      setExpandedKey(null);
      setDescription("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    const prev = { body: document.body.style.overflow, html: document.documentElement.style.overflow, root: root?.style.overflow ?? "" };
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
    const sk = values.skin || "tan";
    const b = values.bodyType || "regular";
    const ch = values.chest || "medium";
    const hs = values.hairStyle || "straight";
    const hc = values.hairColour || "brunette";
    const e = values.eyes || "brown";
    const m = values.makeup || "natural";
    let prompt = `photorealistic portrait, woman, ${sk} skin, ${b} body type, ${ch} chest, ${hs} ${hc} hair, ${e} eyes, ${m} makeup`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const handleCreate = async () => {
    if (!user) { onClose(); navigate("/account?redirect=%2F"); return; }
    setIsSaving(true);
    try {
      const charData = {
        user_id: user.id,
        name: `${values.hairColour || "brunette"} ${values.eyes || "brown"} ${values.makeup || "natural"}`,
        country: sanitiseText(values.skin || "tan", 50),
        age: "25",
        hair: sanitiseText(values.hairColour || "brunette", 50),
        eye: sanitiseText(values.eyes || "brown", 50),
        body: sanitiseText(values.bodyType || "regular", 50),
        style: sanitiseText(values.makeup || "natural", 50),
        description: sanitiseText(`${values.chest || "medium"} chest, ${values.hairStyle || "straight"} hair. ${description}`, 500),
      };
      const { data: inserted, error: insertError } = await supabase.from("characters").insert(charData).select("id").single();
      if (insertError) throw insertError;
      onClose();
      navigate("/choose-face", { state: { prompt: buildPrompt(), characterId: inserted.id } });
    } catch (err: any) {
      toast.error(err.message || "failed to save character");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelect = (key: CatKey, val: string) => { setValues((prev) => ({ ...prev, [key]: val })); setExpandedKey(null); };
  const toggleExpand = (key: CatKey) => { setExpandedKey((prev) => (prev === key ? null : key)); };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[9998] flex flex-col bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="flex items-center px-5 pt-5 pb-2">
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-[#1a1a1a] transition-colors hover:border-white/40" style={{ backgroundColor: "#111111" }} aria-label="close">
              <X size={16} strokeWidth={2.5} className="text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-28">
            <div className="mx-auto flex w-full max-w-sm flex-col pt-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                {categories.map((cat) => (
                  <div key={cat.key} className="flex flex-col gap-2">
                    <span className="text-sm font-[900] lowercase tracking-tight text-white">{cat.label}</span>
                    <SelectionBox value={values[cat.key]} active={expandedKey === cat.key} onClick={() => toggleExpand(cat.key)} />
                  </div>
                ))}
              </div>
              <AnimatePresence>
                {expandedKey && (
                  <motion.div className="mt-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                    <ToggleOptions options={categories.find((c) => c.key === expandedKey)!.options} value={values[expandedKey]} onSelect={(v) => handleSelect(expandedKey, v)} />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-10">
                <span className="mb-3 block text-sm font-[900] lowercase tracking-tight text-white">details</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="face shape, hairstyle, outfit, pose, mood..." rows={3}
                  className="min-h-[100px] w-full resize-none rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 py-3 text-sm font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/50" />
              </div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-10 px-10 pb-[max(env(safe-area-inset-bottom),2rem)] pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
            <button onClick={handleCreate} disabled={isSaving}
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-neon-yellow text-base font-[900] lowercase tracking-tight text-neon-yellow-foreground transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{ transition: "transform 0.05s" }}>
              {isSaving ? (<><Loader2 size={18} className="animate-spin" />saving...</>) : (<><Zap size={18} strokeWidth={2.5} />create<Gem size={14} strokeWidth={2.5} className="text-gem-green ml-1" /><span className="text-[11px] ml-0.5">30</span></>)}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CharacterCreatorOverlay;
