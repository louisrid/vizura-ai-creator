import { Link } from "react-router-dom";

const FacefoxLogo = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-block font-extrabold lowercase tracking-tight text-nav-foreground ${className}`}
  >
    facefox
  </Link>
);

export default FacefoxLogo;
