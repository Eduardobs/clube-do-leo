class WhatsAppManager {
  constructor() {
    this.whatsappNumber = CONFIG.whatsapp?.number || ''; // Número padrão da loja, se definido em config.js
  }

  sendMessages(clientNumber) {
    if (!clientNumber) {
      cartManager.showToast('Por favor, insira um número de WhatsApp válido.');
      return;
    }

    // Validar formato do número (remover caracteres não numéricos)
    const cleanNumber = clientNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 12) {
      cartManager.showToast('Número de WhatsApp inválido. Use o formato (XX) XXXXX-XXXX.');
      return;
    }

    // Obter itens do carrinho
    const cart = cartManager.cart;
    if (cart.length === 0) {
      cartManager.showToast('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }

    // Montar mensagem do pedido
    let message = `*Novo Pedido - ${CONFIG.loja.nome}*\n\n`;
    message += '*Itens do Pedido:*\n';
    let total = 0;

    cart.forEach(item => {
      const product = productManager.products.find(p => p.id === item.id);
      if (product) {
        const itemTotal = item.quantity * item.valor;
        total += itemTotal;
        message += `- ${product.nome} (${item.variation || 'Sem variação'}): ${item.quantity} x ${CONFIG.sistema.moeda} ${item.valor.toFixed(2)} = ${CONFIG.sistema.moeda} ${itemTotal.toFixed(2)}\n`;
      }
    });

    message += `\n*Total: ${CONFIG.sistema.moeda} ${total.toFixed(2)}*\n`;
    message += `\n*Enviado por:* ${cleanNumber}\n`;
    message += `Obrigado por comprar na ${CONFIG.loja.nome}!`;

    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);

    // Gerar link do WhatsApp (usar número da loja ou cliente, conforme config)
    const targetNumber = this.whatsappNumber || cleanNumber;
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;

    try {
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      cartManager.showToast('Pedido enviado com sucesso! Você será redirecionado ao WhatsApp.');
      // Limpar carrinho após envio
      cartManager.clearCart();
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      cartManager.showToast('Erro ao enviar o pedido. Tente novamente.');
    }
  }
}

const whatsappManager = new WhatsAppManager();