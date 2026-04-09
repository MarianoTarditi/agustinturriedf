export function AuthCard({ children, maxWidth = 460 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div
      className="glass-panel void-shadow"
      style={{
        width: "100%",
        maxWidth,
        borderRadius: 12,
        border: "1px solid var(--outline-variant)",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
      }}
    >
      <div className="kinetic-gradient" style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%" }} />
      {children}
    </div>
  );
}
