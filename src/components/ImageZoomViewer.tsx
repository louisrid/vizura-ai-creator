import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ModalCloseButton from "@/components/ModalCloseButton";

interface ImageZoomViewerProps {
  url: string | null;
  onClose: () => void;
  showDownload?: boolean;
  downloadFilename?: string;
  footer?: ReactNode;
}

const ImageZoomViewer = ({ url, onClose, showDownload = true, downloadFilename = "facefox-photo.png", footer }: ImageZoomViewerProps) => {
  useEffect(() => {
    if (!url) return;

    const root = document.getElementById("root");
    const previous = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      root: root?.style.overflow ?? "",
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous.body;
      document.documentElement.style.overflow = previous.html;
      if (root) root.style.overflow = previous.root;
    };
  }, [url]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-5 md:p-6 pt-[52%] md:pt-[51%]"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", isolation: "isolate" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-[392px] md:max-w-[660px]"
          >
            <ModalCloseButton onClick={onClose} />

            <div className="overflow-hidden" style={{ backgroundColor: "#1a1a1a", borderRadius: 10, border: "2px solid rgba(255,255,255,0.15)" }}>
              <div className="pt-3" style={{ backgroundColor: "#1a1a1a" }} />
              <div className="px-3 overflow-hidden" style={{ borderRadius: 10 }}>
                <img src={url} alt="" className="w-full object-contain max-h-[58vh] md:max-h-[70vh] block" style={{ borderRadius: 10 }} />
              </div>
              {footer ?? (showDownload && (
                <div className="p-3 md:p-4 flex gap-2" style={{ backgroundColor: "#1a1a1a", borderRadius: "0 0 10px 10px" }}>
                  <a href={url} download={downloadFilename} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full h-10 md:h-12 border-[2px] border-[rgba(255,255,255,0.15)] text-xs md:text-sm font-[900] lowercase hover:opacity-90" style={{ backgroundColor: "#000", color: "#ffffff" }}>
                      download <Download size={12} strokeWidth={2.5} />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ImageZoomViewer;
