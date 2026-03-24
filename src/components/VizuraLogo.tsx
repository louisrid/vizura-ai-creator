import { Link } from "react-router-dom";

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link to="/" className={`inline-flex items-baseline font-extrabold lowercase tracking-tight ${className}`}>
    <span>v</span>
    <span className="relative">
      i
      <span
        className="absolute bg-accent-purple"
        style={{
          width: "0.32em",
          height: "0.32em",
          top: "-0.05em",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
    </span>
    <span>zura</span>
  </Link>
);

export default VizuraLogo;
