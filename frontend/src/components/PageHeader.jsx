export default function PageHeader({ eyebrow, title, description, action, secondary }) {
  return <section className="module-header"><div><span className="date-label">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="module-actions">{secondary}{action}</div></section>;
}
