import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getNavDepth } from "@/lib/navigation";

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();

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
      onClick={handleBack}
      className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-black hover:opacity-90 transition-colors active:scale-95"
      aria-label="go back"
    >
      <ArrowLeft size={14} strokeWidth={2.5} />
    </button>
  );
});
BackButton.displayName = "BackButton";

export default BackButton;
