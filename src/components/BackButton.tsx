import { forwardRef } from "react";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { getNavDepth } from "@/lib/navigation";

interface BackButtonProps {
  always?: boolean;
}

const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(({ always = false }, ref) => {
  const navigate = useTransitionNavigate();

  if (!always && getNavDepth() < 1) return null;

  const handleBack = () => {
    if (getNavDepth() > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleBack}
      className="flex items-center justify-center hover:opacity-90 transition-colors active:scale-95 w-[40px] h-[40px] md:w-[48px] md:h-[48px] mt-6 md:mt-8"
      style={{
        borderRadius: 9.6,
        backgroundColor: "hsl(var(--card))",
        border: "2px solid #ffffff",
      }}
      aria-label="go back"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[16px] md:h-[16px]">
        <line x1="12" y1="7" x2="2" y2="7" />
        <polyline points="7,2 2,7 7,12" />
      </svg>
    </button>
  );
});
BackButton.displayName = "BackButton";

export default BackButton;
