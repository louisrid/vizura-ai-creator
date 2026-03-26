import { Link } from "react-router-dom";

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-block font-extrabold lowercase tracking-tight bg-transparent text-nav-foreground border-[2px] border-nav-foreground/50 px-3 py-0.5 rounded-full text-lg ${className}`}
  >
    vizura
  </Link>
);

export default VizuraLogo;
