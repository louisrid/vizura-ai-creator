import { Link } from "react-router-dom";

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link to="/" className={`inline-flex items-baseline font-extrabold lowercase tracking-tight ${className}`}>
    <span>vizura</span>
    <span className="inline-block bg-accent-purple ml-0.5" style={{ width: "0.28em", height: "0.28em", marginBottom: "0.05em" }} />
  </Link>
);

export default VizuraLogo;
