export default function LoadingState({ label = "Cargando información..." }) {
  return <div className="module-loading" role="status" aria-live="polite"><span /><strong>{label}</strong></div>;
}
