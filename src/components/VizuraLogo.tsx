import { Link } from "react-router-dom";

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-block font-extrabold lowercase tracking-tight text-neon-yellow ${className}`}
  >
    vizura
  </Link>
);

export default VizuraLogo;
