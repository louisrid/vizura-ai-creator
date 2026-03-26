import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/")}
      className="w-9 h-9 className="w-9 h-9 rounded-2xl bg-foreground flex items-center justify-center text-background hover:bg-foreground/80 transition-colors" flex items-center justify-center text-background hover:bg-foreground/80 transition-colors"
      aria-label="go back"
    >
      <ArrowLeft size={14} strokeWidth={2.5} />
    </button>
  );
};

export default BackButton;
