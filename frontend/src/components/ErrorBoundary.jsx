import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Error de vista", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="content"><section className="surface-card view-error"><span>!</span><h2>No pudimos mostrar esta vista</h2><p>Ocurrió un error inesperado. Tus datos no se han perdido.</p><button className="primary-action" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>Volver a intentar</button></section></div>;
  }
}
