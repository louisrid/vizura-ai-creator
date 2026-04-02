import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleBack}
      className="w-10 h-10 rounded-2xl bg-neon-yellow flex items-center justify-center text-neon-yellow-foreground hover:opacity-90 transition-colors active:scale-95"
      aria-label="go back"
    >
      <ArrowLeft size={18} strokeWidth={3} />
    </button>
  );
});
BackButton.displayName = "BackButton";

export default BackButton;
