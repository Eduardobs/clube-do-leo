const Utils = {
  formatPrice(valor) {
    if (!valor || valor <= 0) return 'Sob consulta';
    return `${CONFIG.sistema.moeda} ${valor.toFixed(2).replace('.', ',')}`;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  },
};

if (typeof module !== 'undefined') module.exports = Utils;
