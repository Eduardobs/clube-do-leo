class WhatsAppManager {
  constructor() {
    this.whatsappNumber = CONFIG.whatsapp.number;
  }

  openMessage(message) {
    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  consultarProduto(codigo) {
    const product = productManager.getProduct(codigo);
    if (!product) return;
    const message = `Olá! Gostaria de saber o valor do produto *${product.nome}* (código ${product.codigo}).`;
    this.openMessage(message);
  }

  sendOrder(customerName) {
    const cart = cartManager.cart;
    if (cart.length === 0) {
      cartManager.showToast('Carrinho vazio! Adicione itens antes de finalizar.');
      return false;
    }

    let message = `*Novo Pedido - ${CONFIG.loja.nome}*\n\n`;
    message += '*Itens do Pedido:*\n';

    cart.forEach((item) => {
      const product = productManager.getProduct(item.codigo);
      if (!product) return;
      const itemTotal = product.valor * item.quantity;
      message += `- ${product.nome} (${product.codigo}): ${item.quantity} x ${Utils.formatPrice(product.valor)} = ${Utils.formatPrice(itemTotal)}\n`;
    });

    message += `\n*Total: ${Utils.formatPrice(cartManager.getTotal())}*\n`;
    message += `\n*Cliente:* ${customerName.trim()}\n`;
    message += `Obrigado por comprar na ${CONFIG.loja.nome}!`;

    this.openMessage(message);
    cartManager.clearCart();
    return true;
  }
}

const whatsappManager = new WhatsAppManager();
