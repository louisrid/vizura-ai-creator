import { Link } from "react-router-dom";

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-block font-extrabold lowercase tracking-tight bg-white text-foreground px-4 py-1 rounded-full ${className}`}
  >
    vizura
  </Link>
);

export default VizuraLogo;
