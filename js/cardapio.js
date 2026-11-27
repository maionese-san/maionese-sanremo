/* =====================================================================
   CARDÁPIO — Maionese San Remo
   ---------------------------------------------------------------------
   Para mudar um preço, altere só o número em "preco" (use ponto: 20.90).
   "unidade": como o preço é cobrado (pote, unidade, fatia, porção, pacote).
   "dias":    dias da semana em que o item sai (0 = domingo ... 6 = sábado).
              Sem "dias" = todo dia em que a loja abre.
   "foto":    imagem em img/produtos/ (proporção 3:2).
   ===================================================================== */
window.SANREMO_CARDAPIO = [
  {
    id: 'maionese',
    titulo: 'Maionese',
    destaque: true,
    sobretitulo: 'O carro-chefe',
    descricao: 'Receita caseira, feita à mão desde os anos 80: sem gosto de ovo e sem gosto de óleo. Escolha o tamanho.',
    foto: 'img/produtos/maionese.webp',
    itens: [
      { id: 'maionese-p', nome: 'Maionese pequena', tamanho: 'Pequena', detalhe: 'Aprox. 500 g · serve 2 pessoas', preco: 25.00, unidade: 'pote', foto: 'img/produtos/maionese.webp' },
      { id: 'maionese-m', nome: 'Maionese média', tamanho: 'Média', detalhe: 'Aprox. 750 g · serve 3 a 4 pessoas', preco: 37.00, unidade: 'pote', foto: 'img/produtos/maionese.webp' },
      { id: 'maionese-g', nome: 'Maionese grande', tamanho: 'Grande', detalhe: 'Aprox. 1 kg · serve 4 a 5 pessoas', preco: 48.00, unidade: 'pote', foto: 'img/produtos/maionese.webp' },
    ],
  },
  {
    id: 'assados',
    titulo: 'Assados',
    descricao: 'Na sexta tem costela e cupim. Sábado, domingo e feriado, todos os assados.',
    itens: [
      { id: 'frango', nome: 'Frango assado', detalhe: 'Frango inteiro', preco: 59.00, unidade: 'unidade', dias: [6, 0], foto: 'img/produtos/frango-assado.webp' },
      { id: 'coxa', nome: 'Coxa e sobrecoxa', detalhe: 'Aprox. 250 g · serve 1 pessoa', preco: 12.00, unidade: 'unidade', dias: [6, 0], foto: 'img/produtos/coxa-sobrecoxa.webp' },
      { id: 'linguica', nome: 'Linguiça', detalhe: 'Serve 1 pessoa', preco: 5.90, unidade: 'unidade', dias: [6, 0], foto: 'img/produtos/linguica.webp' },
      { id: 'costela', nome: 'Costela bovina', detalhe: 'Aprox. 350 g · serve 2 pessoas', preco: 35.00, unidade: 'fatia', dias: [5, 6, 0], foto: 'img/produtos/costela-bovina.webp' },
      { id: 'costeleta', nome: 'Costeleta suína', detalhe: 'Aprox. 350 g · serve 2 pessoas', preco: 35.00, unidade: 'porção', dias: [6, 0], foto: 'img/produtos/costeleta-suina.webp' },
      { id: 'cupim', nome: 'Cupim bovino', detalhe: 'Aprox. 350 g · serve 2 pessoas', preco: 38.00, unidade: 'porção', dias: [5, 6, 0], foto: 'img/produtos/cupim.webp' },
    ],
  },
  {
    id: 'acompanhamentos',
    titulo: 'Acompanhamentos',
    descricao: 'Para fechar o almoço de domingo.',
    itens: [
      { id: 'farofa', nome: 'Farofa', detalhe: 'Aprox. 275 g · serve 2 a 3 pessoas', preco: 15.00, unidade: 'porção', foto: 'img/produtos/farofa.webp' },
      { id: 'feijao', nome: 'Feijão cavalo', detalhe: 'Aprox. 400 g · serve 2 a 3 pessoas', preco: 19.00, unidade: 'porção', dias: [6, 0], foto: 'img/produtos/feijao-cavalo.webp' },
      { id: 'risoto', nome: 'Risoto', detalhe: 'Aprox. 500 g · serve 2 a 3 pessoas', preco: 29.00, unidade: 'porção', dias: [6, 0], foto: 'img/produtos/risoto.webp' },
      { id: 'arroz-grega', nome: 'Arroz à grega', detalhe: 'Aprox. 500 g · serve 2 a 3 pessoas', preco: 35.00, unidade: 'porção', dias: [6, 0], foto: 'img/produtos/arroz-a-grega.webp' },
      { id: 'arroz-branco', nome: 'Arroz branco', detalhe: 'Aprox. 500 g · serve 2 a 3 pessoas', preco: 15.00, unidade: 'porção', dias: [6, 0], foto: 'img/produtos/arroz-branco.webp' },
      { id: 'canudinho', nome: 'Canudinho artesanal', detalhe: 'Pacote com 25 unidades', preco: 20.90, unidade: 'pacote', foto: 'img/produtos/canudinho.webp' },
    ],
  },
];
