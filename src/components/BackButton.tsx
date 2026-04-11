import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { getNavDepth } from "@/lib/navigation";

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // If we have navigation history depth > 1, go back; otherwise go home
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
      className="flex items-center justify-center hover:opacity-90 transition-colors active:scale-95 w-[40px] h-[40px] md:w-[48px] md:h-[48px]"
      style={{
        borderRadius: 10,
        backgroundColor: "#ffe603",
      }}
      aria-label="go back"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[16px] md:h-[16px]">
        <line x1="12" y1="7" x2="2" y2="7" />
        <polyline points="7,2 2,7 7,12" />
      </svg>
    </button>
  );
});
BackButton.displayName = "BackButton";

export default BackButton;
