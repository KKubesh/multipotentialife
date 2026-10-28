/** A pill that grows while the PDF is read. */
export function ImportLoader() {
  return (
    <div className="imp-card imp-loading" role="status">
      <div className="grow-pill" aria-hidden="true">
        <span />
      </div>
      <p>Reading your PDF…</p>
      <p className="muted">It stays on this device.</p>
    </div>
  );
}
