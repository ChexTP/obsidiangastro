export default function EmptyState({ icon = "＋", title, description, action }) {
  return <div className="module-empty"><span>{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
