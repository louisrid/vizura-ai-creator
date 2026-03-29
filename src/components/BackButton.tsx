import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();

  return (
    <button
      ref={ref}
      onClick={() => navigate(-1)}
      className="w-9 h-9 rounded-2xl bg-foreground flex items-center justify-center text-background hover:bg-foreground/80 transition-colors active:scale-95"
      aria-label="go back"
    >
      <ArrowLeft size={14} strokeWidth={2.5} />
    </button>
  );
});
BackButton.displayName = "BackButton";

export default BackButton;
