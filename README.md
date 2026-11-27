# Maionese San Remo — site com pedido pelo WhatsApp

Site estático (HTML + CSS + JavaScript puro). Não tem build, servidor nem banco:
o cliente monta o pedido, escolhe retirada ou entrega, dia e horário, e o site abre
o WhatsApp da loja com a mensagem pronta.

## Estrutura

```
index.html            página
css/estilo.css        visual (paleta da marca: carvão, vinho #7e171a, amarelo #ffb400)
js/config.js          WhatsApp, lojas, horários, entrega, pagamentos, datas especiais
js/cardapio.js        produtos, preços, dias de venda e fotos
js/app.js             lógica (carrinho, regras de dia/horário, mensagem do WhatsApp)
img/                  logo, foto de destaque, imagem de compartilhamento
img/produtos/         fotos dos produtos (WebP, proporção 3:2)
```

## Ver localmente

Abra o `index.html` no navegador (funciona com duplo clique) ou rode `npx serve .`
nesta pasta.

## Tarefas comuns

| Quero…                         | Onde                                                          |
|--------------------------------|---------------------------------------------------------------|
| Mudar um preço                 | `js/cardapio.js` → campo `preco` (use ponto: `20.90`)         |
| Tirar/pôr um produto           | `js/cardapio.js` → remova/adicione o objeto do item           |
| Item que só sai em certos dias | `js/cardapio.js` → `dias: [6, 0]` (0 = domingo … 6 = sábado)  |
| Mudar horário de uma loja      | `js/config.js` → `lojas[].horarios`                           |
| Feriado ou dia fechado         | `js/config.js` → `datasEspeciais` (`'feriado'` ou `'fechado'`) |
| Trocar o número do WhatsApp    | `js/config.js` → `whatsapp` (só dígitos, com 55 + DDD)        |
| Formas de pagamento (entrega)  | `js/config.js` → `pagamentos`                                 |

Horário `null` significa "a loja abre, mas o horário não foi informado". Nesse caso,
o site mostra "consulte" e o cliente escolhe "Combinar o horário pelo WhatsApp".

O quadro "O que tem em cada dia", os selos de dia nos produtos, os avisos no
pedido e os dados estruturados para o Google são gerados a partir desses dois
arquivos. Não é preciso editar texto em outro lugar.

## Publicar

O domínio atual está na Hostinger (servidor `hcdn`, DNS `dns-parking.com`).

1. Baixe uma cópia do site atual (`public_html`) como backup.
2. Envie o conteúdo desta pasta para o `public_html` (Gerenciador de Arquivos ou FTP).
   O `index.html` novo substitui o antigo. As imagens antigas em `img/` podem ser
   apagadas depois.
3. Teste no celular: monte um pedido e confira a mensagem que chega no WhatsApp.

## Google Ads

A tag `AW-11486099084` do site anterior foi mantida. Para contar como conversão
cada pedido enviado, crie a ação de conversão no Google Ads e coloque o rótulo em
`js/config.js` → `googleAds.conversao`.

Atenção: a mensagem antiga começava com "vim pelo google". A nova começa com
"Quero fazer um pedido pelo site". Se a loja usa esse texto para medir anúncios,
ajuste `mensagemAbertura`.

## Pendências para confirmar com o proprietário

Os dados abaixo vieram do site atual e de matérias da imprensa (RIC e Tribuna,
2025–2026). Confirme antes de publicar:

- [ ] **Preços.** Foram tirados das imagens do site atual. O texto alternativo
      das imagens, que é o que o Google lê, tinha preços antigos em 9 dos 15 produtos.
- [ ] **Horários.** Seg a qui na matriz (sem horário informado); sexta abre 10h
      ou 8h (as matérias divergem); horário em feriados.
- [ ] **Dias de cada item.** Seg a qui: só maionese, farofa e canudinho, só na
      matriz. Sexta: + costela e cupim. Sáb, dom e feriados: tudo. O risoto
      continua "somente aos domingos", como dizia o site antigo?
- [ ] **Entrega.** Sai de todas as lojas ou só do Seminário? Qual a área e a taxa?
      Quais formas de pagamento?
- [ ] **Produtos fora do site.** Pudim de leite condensado e bolinho de costela
      congelado aparecem nas matérias. Quais os preços?
- [ ] **Fotos originais sem texto** (com a agência que fez as artes). As atuais
      foram recortadas dos cards e as da maionese P/M/G não puderam ser aproveitadas.
- [ ] **Textos de "Nossa história"**, incluindo "8 a 10 toneladas de maionese por mês".
- [ ] **CNPJ no rodapé** (`config.js` → `cnpj`), recomendado para venda online
      (Decreto 7.962/2013).
- [ ] O mesmo WhatsApp (41) 3369-6969 atende as três lojas?
