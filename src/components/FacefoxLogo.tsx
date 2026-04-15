import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";

const FacefoxLogo = ({ className = "" }: { className?: string }) => {
  const navigate = useTransitionNavigate();

  return (
    <button type="button" onClick={() => navigate("/")} className={`inline-block font-extrabold lowercase tracking-tight text-nav-foreground ${className}`}>
      facefox
    </button>
  );
};

export default FacefoxLogo;
