import { Link } from "react-router-dom";

const WeirdStar = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className="shrink-0"
  >
    <path d="M12 0 L14.5 8.5 L24 9 L16.5 14 L19 24 L12 18 L5 24 L7.5 14 L0 9 L9.5 8.5 Z" />
  </svg>
);

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-flex items-center gap-1.5 font-extrabold lowercase tracking-tight text-nav-foreground ${className}`}
  >
    <WeirdStar size={18} />
    vizura
  </Link>
);

export default VizuraLogo;
