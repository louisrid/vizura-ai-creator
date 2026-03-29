import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getNavDepth } from "@/lib/navigation";

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Only navigate(-1) if we have real in-app history;
    // otherwise go to homepage to avoid leaving the app.
    if (getNavDepth() > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleBack}
      className="w-9 h-9 rounded-2xl bg-foreground flex items-center justify-center text-background hover:bg-foreground/80 transition-colors active:scale-95"
      aria-label="go back"
    >
      <ArrowLeft size={14} strokeWidth={2.5} />
    </button>
  );
});
BackButton.displayName = "BackButton";

export default BackButton;
