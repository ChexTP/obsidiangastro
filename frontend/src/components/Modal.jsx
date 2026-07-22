export default function Modal({ title, description, children, onClose, wide = false }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className={`modal-card ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><h2>{title}</h2>{description && <p>{description}</p>}{children}</section></div>;
}
