/* =====================================================================
   CONFIGURAÇÕES DA LOJA — Maionese San Remo
   ---------------------------------------------------------------------
   Aqui ficam WhatsApp, lojas, horários, entrega e formas de pagamento.
   Preços e produtos ficam em js/cardapio.js.

   Dias da semana: 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta,
                   4 = quinta, 5 = sexta, 6 = sábado
   ===================================================================== */
window.SANREMO_CONFIG = {
  site: 'https://www.maionesesanremo.com.br/',

  // Número que recebe os pedidos: só dígitos, com 55 + DDD.
  whatsapp: '554133696969',
  telefone: '(41) 3369-6969',
  instagram: 'maionesesanremo',
  cnpj: '', // aparece no rodapé quando preenchido (ex.: '00.000.000/0001-00')

  // Primeira linha da mensagem de pedido que chega no WhatsApp.
  mensagemAbertura: 'Olá! Quero fazer um pedido pelo site 😋',
  // Mensagem dos botões de contato ("tirar dúvida").
  mensagemContato: 'Olá! Vim pelo site e queria tirar uma dúvida.',

  // Lojas. Em "horarios", cada dia aberto recebe ['abre', 'fecha']:
  //   - dia que não aparece = loja fechada nesse dia
  //   - null                = loja abre, mas o horário ainda não foi informado
  //                           (o site mostra "consulte" e combina pelo WhatsApp)
  lojas: [
    {
      id: 'seminario',
      nome: 'Seminário',
      selo: 'Matriz',
      endereco: 'Av. Nossa Senhora Aparecida, 726',
      bairro: 'Seminário',
      mapa: 'https://maps.app.goo.gl/fisxkzjsbTXSZJS48',
      horarios: { 1: null, 2: null, 3: null, 4: null, 5: ['10:00', '18:00'], 6: ['08:00', '18:00'], 0: ['08:00', '14:00'] },
    },
    {
      id: 'merces',
      nome: 'Mercês',
      endereco: 'Alameda Prudente de Moraes, 679',
      bairro: 'Mercês',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Maionese+San+Remo+Alameda+Prudente+de+Moraes+679+Curitiba',
      horarios: { 5: ['10:00', '18:00'], 6: ['08:00', '18:00'], 0: ['08:00', '14:00'] },
    },
    {
      id: 'juveve',
      nome: 'Juvevê',
      endereco: 'Rua Manoel Eufrásio, 599',
      bairro: 'Juvevê',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Maionese+San+Remo+Rua+Manoel+Eufrasio+599+Curitiba',
      horarios: { 5: ['10:00', '18:00'], 6: ['08:00', '18:00'], 0: ['08:00', '14:00'] },
    },
  ],

  // Em feriado todas as lojas abrem com o cardápio completo.
  feriadoCardapioCompleto: true,
  horarioFeriado: null, // ex.: ['08:00', '14:00'] — null = combinar pelo WhatsApp

  // Datas especiais (AAAA-MM-DD):
  //   'feriado' = abre como feriado (cardápio completo, todas as lojas)
  //   'fechado' = sem atendimento nesse dia
  datasEspeciais: {
    // '2026-12-24': 'feriado',
    // '2026-12-25': 'fechado',
  },

  entrega: {
    ativa: true,
    lojaBase: 'seminario', // dias e horários de entrega seguem esta loja
    aviso: 'A taxa e a área de entrega são confirmadas pelo WhatsApp.',
  },

  // Formas de pagamento perguntadas na entrega.
  pagamentos: ['Pix', 'Cartão', 'Dinheiro'],

  diasParaAgendar: 7,      // quantos dias aparecem no "Para quando?"
  antecedenciaMinutos: 30, // prazo mínimo para pedidos de hoje

  // Itens sugeridos no carrinho ("Combina com o seu pedido").
  sugestoes: ['maionese-g', 'farofa', 'canudinho'],

  // Google Ads (tag mantida do site anterior). Para medir pedidos enviados,
  // coloque em "conversao" o rótulo da ação de conversão (ex.: 'AbC1dEfGh2').
  googleAds: { id: 'AW-11486099084', conversao: '' },
};
