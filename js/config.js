const CONFIG = {
  loja: {
    nome: "Clube do Léo",
    whatsapp: "5551998582591",
    logo: "assets/logo.png"
  },
  sistema: {
    moeda: "R$",
    formatoData: "DD/MM/YYYY HH:mm"
  },
  whatsapp: {
    apiUrl: "https://api.whatsapp.com/send",
    templates: {
      pedidoLoja: `🛍️ *NOVO PEDIDO*

📱 Cliente: [NÚMERO_DO_CLIENTE]

📋 *Produtos:*
[PRODUTOS]

💰 *Total: R$ [VALOR_TOTAL]*

⏰ Pedido realizado em: [DATA_HORA]`,
      confirmacaoCliente: `✅ *PEDIDO CONFIRMADO*

Olá! Seu pedido foi recebido com sucesso:

📋 *Seus produtos:*
[PRODUTOS]

💰 *Total: R$ [VALOR_TOTAL]*

ℹ️ Seu pedido será confeccionado após a confirmação do pagamento.

Em breve entraremos em contato!`
    }
  }
};