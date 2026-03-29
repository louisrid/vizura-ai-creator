import { forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // If there's history within the app, go back; otherwise go home
    if (window.history.length > 2) {
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
