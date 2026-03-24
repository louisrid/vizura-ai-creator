import { Link } from "react-router-dom";

const VizuraLogo = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-block font-extrabold lowercase tracking-tight ${className}`}
    style={{
      fontVariantLigatures: "none",
    }}
  >
    v
    <span
      className="relative inline-block"
      style={{ width: "0.35em" }}
    >
      {/* The i stem without its dot */}
      <span style={{ clipPath: "inset(30% 0 0 0)" }} className="inline-block">i</span>
      {/* Purple square replacing the dot */}
      <span
        className="absolute bg-accent-purple"
        style={{
          width: "0.34em",
          height: "0.34em",
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
    </span>
    zura
  </Link>
);

export default VizuraLogo;
