/** A view's error state (DESIGN.md §13): what could not load, and a retry. */
export function LoadError({ what, retry }: { what: string; retry: () => unknown }) {
  return (
    <div className="card" role="alert">
      <p>{what} could not load.</p>
      <button className="btn" onClick={() => void retry()}>
        Try again
      </button>
    </div>
  );
}
