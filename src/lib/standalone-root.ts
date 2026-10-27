/** Fallback for static hosts; HTTP frame-ancestors remains the primary defense. */
export function standaloneRoot(): HTMLElement {
  if (window.self !== window.top) {
    document.body.replaceChildren();
    throw new Error('A aplicação não pode ser aberta dentro de um iframe.');
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('Elemento #root não encontrado.');
  document.documentElement.setAttribute('data-standalone', '');
  return root;
}
