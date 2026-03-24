import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PaywallOverlay from "@/components/PaywallOverlay";

const randomPrompts = [
  "cyberpunk warrior with neon tattoos, confident stance, leather jacket",
  "ethereal elf princess, silver hair, glowing eyes, forest armor",
  "street samurai, scarred face, katana, rain-soaked city backdrop",
  "steampunk inventor, goggles, brass arm, wild curly hair",
  "space bounty hunter, sleek helmet, dark bodysuit, holographic badge",
];

const Generate = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [credits, setCredits] = useState(1);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleGenerate = () => {
    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setImages([]);

    // Simulate generation
    setTimeout(() => {
      setImages([
        `https://placehold.co/512x768/111/fff?text=front&font=raleway`,
        `https://placehold.co/512x768/111/fff?text=left&font=raleway`,
        `https://placehold.co/512x768/111/fff?text=right&font=raleway`,
      ]);
      setCredits((c) => c - 1);
      setIsGenerating(false);
    }, 3000);
  };

  const handleRandomize = () => {
    const random = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
    setPrompt(random);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} />

      <main className="container max-w-4xl py-14 md:py-22">
        {/* Credits Badge */}
        <div className="flex justify-end mb-8">
          <div className="border-2 border-foreground px-5 py-2 font-extrabold lowercase text-sm">
            {credits} credit{credits !== 1 ? "s" : ""} remaining
          </div>
        </div>

        {/* Input */}
        <div className="mb-8">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="describe her look, mood, style…"
            rows={4}
            className="w-full border-2 border-foreground bg-background text-foreground p-6 text-body-lg font-semibold lowercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-14">
          <Button
            size="xl"
            variant="hero"
            className="flex-1"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                generating…
              </>
            ) : (
              "generate"
            )}
          </Button>
          <Button size="xl" variant="outline" onClick={handleRandomize} disabled={isGenerating}>
            <Shuffle className="mr-2" />
            randomize style
          </Button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-heading mb-8 text-center">your character</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {images.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className="border-2 border-foreground overflow-hidden"
                  >
                    <img
                      src={src}
                      alt={`character angle ${i + 1}`}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="p-4 text-center font-extrabold lowercase text-sm">
                      {["front", "left", "right"][i]}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Generate;
