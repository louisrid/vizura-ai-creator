/* Lock overlay — 80% black, clips to button shape including border */
const LockOverlay = ({ borderRadius = 10 }: { borderRadius?: number }) => (
  <div
    className="pointer-events-auto absolute"
    style={{
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.80)",
      borderRadius: Math.max(borderRadius - 2, 0),
      boxShadow: "0 0 0 4px rgba(0,0,0,0.80)",
      zIndex: 20,
    }}
  />
);

export default LockOverlay;
