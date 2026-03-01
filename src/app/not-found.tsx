export default function NotFound() {
  return (
    <main
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1 style={{ margin: 0, fontWeight: 600 }}>Not found</h1>
      <p style={{ margin: "8px 0 0", opacity: 0.9 }}>
        The requested page does not exist.
      </p>
    </main>
  );
}
