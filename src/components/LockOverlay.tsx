/* Lock overlay — 55% black, clips to button shape including border */
const LockOverlay = ({ borderRadius = 4 }: { borderRadius?: number }) => (
  <div
    className="pointer-events-auto absolute"
    style={{
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: Math.max(borderRadius - 2, 0),
      boxShadow: "0 0 0 4px rgba(0,0,0,0.55)",
      zIndex: 20,
    }}
  />
);

export default LockOverlay;
