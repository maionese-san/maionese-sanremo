/* =====================================================================
   Maionese San Remo — cardápio, pedido e envio pelo WhatsApp
   Sem dependências. Dados em js/config.js e js/cardapio.js.
   ===================================================================== */
(function () {
  'use strict';

  const CFG = window.SANREMO_CONFIG;
  const CARDAPIO = window.SANREMO_CARDAPIO;
  if (!CFG || !CARDAPIO) {
    console.error('San Remo: js/config.js ou js/cardapio.js não carregou.');
    return;
  }

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (id) => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const centavos = (preco) => Math.round(preco * 100);
  const dinheiro = (cent) => moeda.format(cent / 100);
  const listaTexto = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} e ${arr[arr.length - 1]}`);

  const memoria = {
    ler(chave, padrao) {
      try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* navegação privada etc. */ }
    },
  };
  const CHAVE_CARRINHO = 'sanremo:carrinho';
  const CHAVE_CLIENTE = 'sanremo:cliente';

  const linkWhatsApp = (texto) => `https://wa.me/${CFG.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

  /* datas */
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const SEMANA = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro
  const dois = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  const deIso = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const diaZero = (d, mais = 0) => { const r = new Date(d); r.setHours(0, 0, 0, 0); r.setDate(r.getDate() + mais); return r; };
  const ddmm = (d) => `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
  const minutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hora = (min) => { const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h${dois(m)}` : `${h}h`; };
  const temDia = (horarios, d) => Object.prototype.hasOwnProperty.call(horarios, d);
  const consecutivos = (a, b) => SEMANA.indexOf(b) === SEMANA.indexOf(a) + 1;

  /** Agrupa dias da semana em faixas: [5,6,0] -> "sex a dom"; [6,0] -> "sáb, dom". */
  function faixasDeDias(dias, curto) {
    const nomes = curto ? DIAS_CURTOS : DIAS;
    const grupos = [];
    SEMANA.filter((d) => dias.includes(d)).forEach((d) => {
      const g = grupos[grupos.length - 1];
      if (g && consecutivos(g[g.length - 1], d)) g.push(d); else grupos.push([d]);
    });
    return grupos.map((g) => {
      if (g.length === 1) return nomes[g[0]];
      if (g.length === 2) return `${nomes[g[0]]}, ${nomes[g[1]]}`;
      return `${nomes[g[0]]} a ${nomes[g[g.length - 1]]}`;
    });
  }
  /** Texto de disponibilidade: "Sáb, dom e feriados", "Sexta a domingo e feriados". */
  function textoDias(dias, { curto = false, feriados = CFG.feriadoCardapioCompleto !== false } = {}) {
    if (dias.length === 7) return 'Todos os dias';
    let txt = faixasDeDias(dias, curto).join(', ');
    txt = feriados ? `${txt} e feriados` : txt.replace(/, ([^,]*)$/, ' e $1');
    return cap(txt);
  }

  /* ------------------------------------------------------------------
     Dados
     ------------------------------------------------------------------ */
  const PRODUTOS = {};
  CARDAPIO.forEach((cat) => cat.itens.forEach((p) => { PRODUTOS[p.id] = { ...p, categoria: cat.id, cent: centavos(p.preco) }; }));
  const LOJAS = {};
  CFG.lojas.forEach((l) => { LOJAS[l.id] = l; });

  const especial = (data) => (CFG.datasEspeciais || {})[iso(data)];

  /** Expediente de uma loja num dia: { aberta, abre, fecha } (minutos; null = não informado). */
  function expediente(loja, data) {
    const esp = especial(data);
    if (esp === 'fechado') return { aberta: false };
    let h = temDia(loja.horarios, data.getDay()) ? loja.horarios[data.getDay()] : undefined;
    if (esp === 'feriado') h = CFG.horarioFeriado || null;
    if (h === undefined) return { aberta: false };
    return { aberta: true, abre: h ? minutos(h[0]) : null, fecha: h ? minutos(h[1]) : null };
  }

  const itemDisponivel = (p, data) => !p.dias || especial(data) === 'feriado' || p.dias.includes(data.getDay());

  /* ------------------------------------------------------------------
     Carrinho
     ------------------------------------------------------------------ */
  function normalizar(c) {
    const r = {};
    Object.keys(c || {}).forEach((id) => {
      const q = Math.floor(Number(c[id]));
      if (PRODUTOS[id] && q > 0) r[id] = Math.min(q, 99);
    });
    return r;
  }
  let carrinho = normalizar(memoria.ler(CHAVE_CARRINHO, {}));
  const itens = () => Object.keys(carrinho).map((id) => ({ p: PRODUTOS[id], q: carrinho[id] }));
  const qtdTotal = () => itens().reduce((s, i) => s + i.q, 0);
  const valorTotal = () => itens().reduce((s, i) => s + i.p.cent * i.q, 0);

  function mudar(id, delta) {
    if (!PRODUTOS[id]) return;
    const antes = carrinho[id] || 0;
    const q = Math.max(0, Math.min(99, antes + delta));
    if (q) carrinho[id] = q; else delete carrinho[id];
    memoria.gravar(CHAVE_CARRINHO, carrinho);
    atualizar(id);
    if (delta > 0) {
      pulsar();
      if (!dlg.open && antes === 0) avisar(`${PRODUTOS[id].nome} no pedido`);
    }
  }

  /* ------------------------------------------------------------------
     Cardápio
     ------------------------------------------------------------------ */
  const porUnidade = (u) => (u ? `por ${u}` : '');

  function htmlControle(id) {
    const p = PRODUTOS[id];
    const q = carrinho[id] || 0;
    if (!q) {
      return `<button type="button" class="btn-add" data-add="${id}">${ico('mais')}<span>Adicionar</span><span class="visualmente-oculto"> ${esc(p.nome)}</span></button>`;
    }
    return `<div class="passo" role="group" aria-label="Quantidade de ${esc(p.nome)}">
        <button type="button" data-menos="${id}" aria-label="${q === 1 ? 'Tirar do pedido' : 'Diminuir'}: ${esc(p.nome)}">${ico(q === 1 ? 'lixo' : 'menos')}</button>
        <output aria-live="polite">${q}</output>
        <button type="button" data-mais="${id}" aria-label="Aumentar: ${esc(p.nome)}">${ico('mais')}</button>
      </div>`;
  }

  /** Para itens sem restrição de dia: avisa os dias em que só algumas lojas abrem. */
  function notaTodoDia() {
    const grupos = [];
    SEMANA.forEach((d) => {
      const lojas = CFG.lojas.filter((l) => temDia(l.horarios, d));
      if (!lojas.length || lojas.length === CFG.lojas.length) return;
      const nomes = listaTexto(lojas.map((l) => l.nome));
      const g = grupos.find((x) => x.nomes === nomes);
      if (g) g.dias.push(d); else grupos.push({ nomes, dias: [d] });
    });
    if (!grupos.length) return 'Todos os dias em que as lojas abrem.';
    return `Todos os dias. ${grupos.map((g) => `De ${textoDias(g.dias, { feriados: false }).toLowerCase()}, só na loja ${g.nomes}`).join('; ')}.`;
  }

  function htmlDestaque(cat) {
    const dias = [...new Set(cat.itens.flatMap((p) => p.dias || []))];
    return `<section class="categoria" id="cat-${cat.id}" aria-labelledby="t-${cat.id}">
      <div class="destaque no-escuro">
        <div class="destaque__foto"><img src="${esc(cat.foto)}" alt="" width="528" height="396" loading="lazy"></div>
        <div class="destaque__info">
          ${cat.sobretitulo ? `<p class="sobretitulo">${esc(cat.sobretitulo)}</p>` : ''}
          <h3 class="destaque__titulo" id="t-${cat.id}">${esc(cat.titulo)}</h3>
          ${cat.descricao ? `<p class="destaque__desc">${esc(cat.descricao)}</p>` : ''}
          <ul class="tamanhos">
            ${cat.itens.map((p) => `<li class="tamanho">
              <div class="tamanho__txt"><span class="tamanho__nome">${esc(p.tamanho || p.nome)}</span><span class="tamanho__det">${esc(p.detalhe)}</span></div>
              <div class="tamanho__lado"><span class="tamanho__preco">${dinheiro(PRODUTOS[p.id].cent)}</span><div class="acao" data-acao="${p.id}">${htmlControle(p.id)}</div></div>
            </li>`).join('')}
          </ul>
          <p class="destaque__nota">${ico('cal')}<span>${esc(dias.length ? textoDias(dias) : notaTodoDia())}</span></p>
        </div>
      </div>
    </section>`;
  }

  function htmlProduto(p) {
    return `<article class="produto" id="p-${p.id}">
      <div class="produto__foto"><img src="${esc(p.foto)}" alt="${esc(p.nome)}" width="675" height="450" loading="lazy"></div>
      <div class="produto__info">
        <h4 class="produto__nome">${esc(p.nome)}</h4>
        <p class="produto__detalhe">${esc(p.detalhe)}</p>
        <div class="produto__rodape">
          <p class="preco">${dinheiro(PRODUTOS[p.id].cent)}<small>${esc(porUnidade(p.unidade))}</small></p>
          <div class="acao" data-acao="${p.id}">${htmlControle(p.id)}</div>
        </div>
      </div>
    </article>`;
  }

  function renderCardapio() {
    $('[data-cardapio]').innerHTML = CARDAPIO.map((cat) => (cat.destaque ? htmlDestaque(cat) : `
      <section class="categoria" id="cat-${cat.id}" aria-labelledby="t-${cat.id}">
        <div class="categoria__topo">
          <h3 class="categoria__titulo" id="t-${cat.id}">${esc(cat.titulo)}</h3>
          ${cat.descricao ? `<p class="categoria__desc">${esc(cat.descricao)}</p>` : ''}
        </div>
        <div class="grade">${cat.itens.map(htmlProduto).join('')}</div>
      </section>`)).join('');
    $('[data-categorias]').innerHTML = CARDAPIO.map((cat) => `<a href="#cat-${cat.id}" data-cat="${cat.id}">${esc(cat.titulo)}</a>`).join('');
  }

  /* ------------------------------------------------------------------
     Dia do pedido: o cardápio mostra só o que sai nesse dia
     ------------------------------------------------------------------ */
  const artigoDia = (d) => (d.getDay() === 0 || d.getDay() === 6 ? 'no' : 'na');
  /** "hoje", "amanhã", "na sexta", "no sábado" */
  function nomeDoDia(d) {
    const hoje = diaZero(new Date());
    if (iso(d) === iso(hoje)) return 'hoje';
    if (iso(d) === iso(diaZero(hoje, 1))) return 'amanhã';
    return `${artigoDia(d)} ${DIAS[d.getDay()]}`;
  }
  const saiNoDia = (d) => Object.values(PRODUTOS).filter((p) => itemDisponivel(p, d));

  /** Próximos dias em que pelo menos uma loja atende (hoje só entra se ainda der tempo). */
  function diasDoCardapio() {
    const hoje = diaZero(new Date());
    const lista = [];
    for (let i = 0; i < (CFG.diasParaAgendar || 7); i++) {
      const d = diaZero(hoje, i);
      const lojas = CFG.lojas.filter((l) => opcoesHorario(l, d).length > 0);
      if (!lojas.length) continue;
      const rotulo = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : cap(DIAS_CURTOS[d.getDay()]);
      const sub = i <= 1 ? `${DIAS_CURTOS[d.getDay()]} ${ddmm(d)}` : ddmm(d);
      lista.push({ d, lojas, rotulo, sub });
    }
    return lista;
  }

  /** Esconde do cardápio (e do menu de categorias) o que não sai no dia escolhido. */
  function filtrarCardapio(data) {
    CARDAPIO.forEach((cat) => {
      const secao = $(`#cat-${cat.id}`);
      let visiveis = 0;
      cat.itens.forEach((p) => {
        const ok = !data || itemDisponivel(p, data);
        if (ok) visiveis++;
        const caixa = $(`[data-acao="${p.id}"]`, secao);
        const el = caixa && caixa.closest('.produto, .tamanho');
        if (el) el.hidden = !ok;
      });
      if (secao) secao.hidden = !visiveis;
      const link = $(`[data-cat="${cat.id}"]`);
      if (link) link.hidden = !visiveis;
    });
  }

  let diasCardapio = [];

  function renderQuando() {
    const box = $('[data-quando]');
    diasCardapio = diasDoCardapio();
    if (!diasCardapio.length) { box.innerHTML = ''; filtrarCardapio(null); return; }
    if (!diasCardapio.some((x) => iso(x.d) === pedido.data)) {
      // primeiro dia em que tudo o que já está no pedido sai; senão, o primeiro dia de atendimento
      const tudoSai = (x) => itens().every(({ p }) => itemDisponivel(p, x.d));
      pedido.data = iso((diasCardapio.find(tudoSai) || diasCardapio[0]).d);
    }
    box.innerHTML = `<fieldset>
        <legend>Para quando é o pedido?</legend>
        <div class="dias">${diasCardapio.map((x) => `<label class="dia">
          <input type="radio" name="dia-cardapio" value="${iso(x.d)}"${iso(x.d) === pedido.data ? ' checked' : ''}>
          <span><b>${esc(x.rotulo)}</b><small>${esc(x.sub)}</small></span>
        </label>`).join('')}</div>
      </fieldset>
      <div class="quando__nota" data-quando-nota aria-live="polite"></div>`;
    filtrarCardapio(deIso(pedido.data));
    renderNotaQuando();
  }

  function renderNotaQuando() {
    const box = $('[data-quando-nota]');
    const x = box && diasCardapio.find((y) => iso(y.d) === pedido.data);
    if (!x) return;
    const linhas = [];
    const nome = nomeDoDia(x.d);
    if (especial(x.d) === 'feriado') linhas.push('Feriado: cardápio completo.');
    if (x.lojas.length < CFG.lojas.length) {
      const nomes = listaTexto(x.lojas.map((l) => `${l.nome}${l.selo ? ` (${l.selo.toLowerCase()})` : ''}`));
      linhas.push(`${cap(nome)}, só ${x.lojas.length === 1 ? `a loja ${nomes} abre` : `as lojas ${nomes} abrem`}.`);
    }
    const total = Object.keys(PRODUTOS).length;
    if (saiNoDia(x.d).length < total) {
      const completos = diasCardapio.filter((y) => saiNoDia(y.d).length === total).slice(0, 2);
      if (completos.length) linhas.push(`Cardápio completo ${listaTexto(completos.map((y) => nomeDoDia(y.d)))}.`);
    }
    const fora = indisponiveis();
    if (fora.length) {
      linhas.push(`<span class="quando__alerta">Do seu pedido, ${esc(listaTexto(fora.map((p) => p.nome.toLowerCase())))} não ${fora.length === 1 ? 'sai' : 'saem'} ${esc(nome)}.</span>`);
    }
    box.innerHTML = linhas.map((l) => `<p>${l.startsWith('<span') ? l : esc(l)}</p>`).join('');
  }

  function escolherDia(valor) {
    pedido.data = valor;
    pedido.hora = '';
    filtrarCardapio(deIso(valor));
    renderNotaQuando();
  }

  /* ------------------------------------------------------------------
     Lojas
     ------------------------------------------------------------------ */
  function linhasHorario(loja) {
    const linhas = [];
    SEMANA.forEach((d) => {
      if (!temDia(loja.horarios, d)) return;
      const h = loja.horarios[d];
      const txt = h ? `${hora(minutos(h[0]))} às ${hora(minutos(h[1]))}` : 'consulte';
      const u = linhas[linhas.length - 1];
      if (u && u.txt === txt && consecutivos(u.dias[u.dias.length - 1], d)) u.dias.push(d);
      else linhas.push({ dias: [d], txt });
    });
    return linhas.map((l) => {
      const n = l.dias.map((d) => DIAS_CURTOS[d]);
      const dias = n.length === 1 ? n[0] : n.length === 2 ? `${n[0]} e ${n[1]}` : `${n[0]} a ${n[n.length - 1]}`;
      return { dias: cap(dias), txt: l.txt };
    });
  }

  function statusLoja(loja) {
    const agora = new Date();
    const hoje = diaZero(agora);
    const min = agora.getHours() * 60 + agora.getMinutes();
    const ex = expediente(loja, hoje);
    if (ex.aberta && ex.abre === null) return null; // horário não informado: melhor não arriscar
    if (ex.aberta && min >= ex.abre && min < ex.fecha) return { aberto: true, texto: `Aberta agora · até ${hora(ex.fecha)}` };
    if (ex.aberta && min < ex.abre) return { aberto: false, texto: `Fechada agora · abre hoje às ${hora(ex.abre)}` };
    for (let i = 1; i <= 7; i++) {
      const d = diaZero(hoje, i);
      const e = expediente(loja, d);
      if (e.aberta) {
        const quando = i === 1 ? 'amanhã' : (d.getDay() === 6 || d.getDay() === 0 ? 'no ' : 'na ') + DIAS[d.getDay()];
        return { aberto: false, texto: `Fechada agora · abre ${quando}${e.abre !== null ? ` às ${hora(e.abre)}` : ''}` };
      }
    }
    return null;
  }

  function renderLojas() {
    $('[data-lojas]').innerHTML = CFG.lojas.map((l) => {
      const st = statusLoja(l);
      return `<article class="loja">
        <div class="loja__topo"><h3 class="loja__nome">${esc(l.nome)}</h3>${l.selo ? `<span class="loja__selo">${esc(l.selo)}</span>` : ''}</div>
        ${st ? `<p class="loja__status${st.aberto ? ' loja__status--aberto' : ''}">${esc(st.texto)}</p>` : ''}
        <p class="loja__end">${ico('pin')}<span>${esc(l.endereco)}<br>${esc(l.bairro)}, Curitiba</span></p>
        <ul class="horarios" aria-label="Horários da loja ${esc(l.nome)}">${linhasHorario(l).map((h) => `<li><span>${esc(h.dias)}</span><b>${esc(h.txt)}</b></li>`).join('')}</ul>
        <div class="loja__acoes">
          <a class="btn btn--leve" href="${esc(l.mapa)}" target="_blank" rel="noopener">${ico('pin')}Como chegar</a>
          <button type="button" class="btn btn--vinho" data-retirar-em="${l.id}">Retirar aqui</button>
        </div>
      </article>`;
    }).join('');
    $('[data-rodape-lojas]').innerHTML = CFG.lojas.map((l) => `<li><b>${esc(l.nome)}</b>${l.selo ? ` (${esc(l.selo.toLowerCase())})` : ''}<br>${esc(l.endereco)}</li>`).join('');
  }

  /* ------------------------------------------------------------------
     Resumo (selo do topo, barra, totais) e controles
     ------------------------------------------------------------------ */
  function atualizarControles(id) {
    const q = carrinho[id] || 0;
    $$(`[data-acao="${id}"]`).forEach((box) => {
      const passo = $('.passo', box);
      if (q && passo) { // só muda o número: mantém foco e o anúncio do leitor de tela
        $('output', passo).textContent = q;
        const menos = $('[data-menos]', passo);
        menos.innerHTML = ico(q === 1 ? 'lixo' : 'menos');
        menos.setAttribute('aria-label', `${q === 1 ? 'Tirar do pedido' : 'Diminuir'}: ${PRODUTOS[id].nome}`);
        return;
      }
      const tinhaFoco = box.contains(document.activeElement);
      box.innerHTML = htmlControle(id);
      if (tinhaFoco) { const alvo = $(q ? '[data-mais]' : '[data-add]', box); if (alvo) alvo.focus(); }
    });
  }

  function atualizarResumo() {
    const qtd = qtdTotal();
    const total = dinheiro(valorTotal());
    $$('[data-qtd]').forEach((el) => { el.textContent = qtd; el.hidden = !qtd; });
    $$('[data-abrir-pedido]').forEach((b) => b.setAttribute('aria-label', qtd ? `Ver pedido: ${qtd} ${qtd === 1 ? 'item' : 'itens'}, ${total}` : 'Ver pedido (vazio)'));
    $('[data-barra]').hidden = !qtd;
    document.body.classList.toggle('tem-itens', qtd > 0);
    $('[data-barra-qtd]').textContent = qtd;
    $('[data-barra-total]').textContent = total;
    $$('[data-total]').forEach((el) => { el.textContent = total; });
  }

  function pulsar() {
    const barra = $('[data-barra]');
    barra.classList.remove('pulsa'); void barra.offsetWidth; barra.classList.add('pulsa');
    $$('[data-qtd]').forEach((el) => { el.classList.remove('pula'); void el.offsetWidth; el.classList.add('pula'); });
  }

  let timerAviso;
  function avisar(texto) {
    const t = $('[data-toast]');
    t.innerHTML = `${ico('check')}<span>${esc(texto)}</span>`;
    t.classList.add('visivel');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => t.classList.remove('visivel'), 2400);
  }

  /** Re-renderiza mantendo o foco no controle equivalente (acessibilidade). */
  function comFoco(container, render) {
    const ativo = document.activeElement;
    let alvo = null;
    if (ativo && container.contains(ativo)) {
      for (const a of ['data-add', 'data-mais', 'data-menos']) {
        if (ativo.hasAttribute(a)) { alvo = [a, ativo.getAttribute(a)]; break; }
      }
    }
    render();
    if (!alvo) return;
    const [a, id] = alvo;
    const opcoes = a === 'data-add' ? [`[data-mais="${id}"]`, `[data-add="${id}"]`]
      : a === 'data-menos' ? [`[data-menos="${id}"]`, `[data-add="${id}"]`] : [`[${a}="${id}"]`];
    for (const s of opcoes) { const el = $(s, container); if (el) { el.focus(); return; } }
    const outro = $('[data-menos], [data-mais], [data-add]', container);
    (outro || $('[data-pedido-titulo]')).focus();
  }

  function atualizar(id) {
    if (id) atualizarControles(id); else Object.keys(PRODUTOS).forEach(atualizarControles);
    atualizarResumo();
    renderNotaQuando();
    if (!dlg.open) return;
    if (etapa === 'itens') {
      const naTela = $$('[data-item]', $('[data-itens]')).map((li) => li.dataset.item).join();
      if (naTela && naTela === Object.keys(carrinho).join()) {
        itens().forEach(({ p, q }) => { const el = $(`[data-linha-total="${p.id}"]`); if (el) el.textContent = dinheiro(p.cent * q); });
      } else {
        comFoco($('[data-etapa="itens"]'), renderItens);
      }
      ajustarRodape();
    }
    if (etapa === 'dados') {
      if (!qtdTotal()) { irPara('itens'); return; }
      renderAlerta(); renderResumo();
    }
  }

  /* ------------------------------------------------------------------
     Gaveta do pedido
     ------------------------------------------------------------------ */
  const dlg = $('[data-pedido]');
  const form = $('#form-pedido');
  let etapa = 'itens';
  let ultimoLink = linkWhatsApp('');

  const clienteSalvo = memoria.ler(CHAVE_CLIENTE, {});
  const pedido = {
    modo: clienteSalvo.modo === 'entrega' && CFG.entrega && CFG.entrega.ativa ? 'entrega' : 'retirar',
    loja: LOJAS[clienteSalvo.loja] ? clienteSalvo.loja : CFG.lojas[0].id,
    data: null,
    hora: '',
    pagamento: (CFG.pagamentos || []).includes(clienteSalvo.pagamento) ? clienteSalvo.pagamento : '',
  };

  function abrirPedido(qual = 'itens') {
    irPara(qual, false);
    if (!dlg.open) dlg.showModal();
  }
  function fecharPedido() {
    if (!dlg.open || dlg.classList.contains('saindo')) return;
    const fim = () => { dlg.classList.remove('saindo'); dlg.close(); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { fim(); return; }
    dlg.classList.add('saindo');
    setTimeout(fim, 190);
  }
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); fecharPedido(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) fecharPedido(); });

  const TITULOS = { itens: 'Seu pedido', dados: 'Retirada ou entrega', enviado: 'Pedido enviado' };
  const ORDEM = ['itens', 'dados', 'enviado'];

  function irPara(qual, focar = true) {
    etapa = qual;
    $$('[data-etapa]').forEach((s) => { s.hidden = s.dataset.etapa !== qual; });
    $('[data-pedido-titulo]').textContent = TITULOS[qual];
    $('[data-voltar]').hidden = qual !== 'dados';
    const pos = ORDEM.indexOf(qual);
    $$('[data-passo]').forEach((li) => {
      const i = ORDEM.indexOf(li.dataset.passo);
      if (i === pos) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('feito', i < pos);
    });
    if (qual === 'itens') renderItens();
    if (qual === 'dados') renderDados();
    ajustarRodape();
    $('[data-corpo]').scrollTop = 0;
    if (focar) $('[data-pedido-titulo]').focus({ preventScroll: true });
  }

  function ajustarRodape() {
    const vazio = !qtdTotal();
    $('[data-rodape-pedido]').hidden = etapa === 'enviado' || (etapa === 'itens' && vazio);
    $('[data-continuar]').hidden = etapa !== 'itens' || vazio;
    $('[data-enviar]').hidden = etapa !== 'dados';
  }

  /* etapa 1: itens */
  function renderItens() {
    const lista = itens();
    $('[data-vazio]').hidden = lista.length > 0;
    $('[data-itens]').hidden = !lista.length;
    $('[data-itens]').innerHTML = lista.map(({ p, q }) => `<li class="item" data-item="${p.id}">
        <img src="${esc(p.foto)}" alt="" width="56" height="56" loading="lazy">
        <div class="item__info">
          <span class="item__nome">${esc(p.nome)}</span>
          <span class="item__preco">${dinheiro(p.cent)} ${esc(porUnidade(p.unidade))}</span>
          ${p.dias ? `<span class="chip-dias">${ico('cal')}${esc(textoDias(p.dias, { curto: true }))}</span>` : ''}
        </div>
        <div class="item__lado"><span class="item__total" data-linha-total="${p.id}">${dinheiro(p.cent * q)}</span><div class="acao" data-acao="${p.id}">${htmlControle(p.id)}</div></div>
      </li>`).join('');
    renderSugestoes();
  }

  function renderSugestoes() {
    const box = $('[data-sugestoes]');
    const temMaionese = Object.keys(carrinho).some((id) => PRODUTOS[id].categoria === 'maionese');
    const lista = (CFG.sugestoes || [])
      .filter((id) => PRODUTOS[id] && !carrinho[id] && !(PRODUTOS[id].categoria === 'maionese' && temMaionese))
      .filter((id) => !pedido.data || itemDisponivel(PRODUTOS[id], deIso(pedido.data)))
      .slice(0, 2);
    if (!qtdTotal() || !lista.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<p class="sugestoes__titulo">Combina com o seu pedido</p>
      <ul class="sugestoes__lista">${lista.map((id) => {
        const p = PRODUTOS[id];
        return `<li class="sugestao"><img src="${esc(p.foto)}" alt="" width="44" height="44" loading="lazy">
          <span><b>${esc(p.nome)}</b><small>${dinheiro(p.cent)}</small></span>
          <button type="button" class="btn-add" data-add="${id}">${ico('mais')}<span>Adicionar</span><span class="visualmente-oculto"> ${esc(p.nome)}</span></button></li>`;
      }).join('')}</ul>`;
  }

  /* etapa 2: retirada/entrega, dia e horário, dados */
  const baseAgenda = () => (pedido.modo === 'entrega' ? LOJAS[CFG.entrega.lojaBase] || CFG.lojas[0] : LOJAS[pedido.loja]);

  function opcoesHorario(loja, data) {
    const ex = expediente(loja, data);
    if (!ex.aberta) return [];
    const agora = new Date();
    const hoje = iso(data) === iso(agora);
    const ops = [];
    if (ex.abre === null) {
      if (hoje) ops.push({ v: 'asap', t: 'Assim que possível' });
      ops.push({ v: 'combinar', t: 'Combinar o horário pelo WhatsApp' });
      return ops;
    }
    const passo = 30;
    const folga = CFG.antecedenciaMinutos || 30;
    const agoraMin = agora.getHours() * 60 + agora.getMinutes();
    let inicio = ex.abre;
    if (hoje) {
      if (agoraMin >= ex.abre && agoraMin < ex.fecha - folga) ops.push({ v: 'asap', t: 'Assim que possível' });
      inicio = Math.max(inicio, Math.ceil((agoraMin + folga) / passo) * passo);
    }
    for (let m = inicio; m <= ex.fecha - passo; m += passo) ops.push({ v: String(m), t: hora(m) });
    return ops;
  }

  function diasAgendaveis() {
    const loja = baseAgenda();
    const hoje = diaZero(new Date());
    const n = CFG.diasParaAgendar || 7;
    const lista = [];
    for (let i = 0; i < n; i++) {
      const d = diaZero(hoje, i);
      const ok = opcoesHorario(loja, d).length > 0;
      const rotulo = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : cap(DIAS_CURTOS[d.getDay()]);
      const sub = i <= 1 ? `${DIAS_CURTOS[d.getDay()]} ${ddmm(d)}` : ddmm(d);
      lista.push({ d, ok, rotulo, sub });
    }
    return lista;
  }

  function renderDados() {
    if (!form.dataset.preenchido) {
      ['nome', 'endereco', 'bairro', 'complemento'].forEach((k) => {
        if (clienteSalvo[k] && form.elements[k] && !form.elements[k].value) form.elements[k].value = clienteSalvo[k];
      });
      $('[data-aviso-entrega]').textContent = (CFG.entrega && CFG.entrega.aviso) || '';
      form.dataset.preenchido = '1';
    }
    const entregaAtiva = !!(CFG.entrega && CFG.entrega.ativa);
    if (!entregaAtiva) pedido.modo = 'retirar';
    $('[data-modos]').hidden = !entregaAtiva;
    $$('input[name="modo"]', form).forEach((r) => { r.checked = r.value === pedido.modo; });
    $$('[data-bloco="retirar"]').forEach((el) => { el.hidden = pedido.modo !== 'retirar'; });
    $$('[data-bloco="entrega"]').forEach((el) => { el.hidden = pedido.modo !== 'entrega'; });
    renderListaLojas();
    renderDias();
    renderPagamentos();
    renderResumo();
  }

  function renderListaLojas() {
    $('[data-lista-lojas]').innerHTML = CFG.lojas.map((l) => {
      const dias = Object.keys(l.horarios).map(Number);
      const abre = dias.length === 7 ? 'Abre todos os dias' : `Abre ${textoDias(dias, { curto: true }).toLowerCase()}`;
      return `<label class="opcao-loja">
        <input type="radio" name="loja" value="${l.id}"${pedido.loja === l.id ? ' checked' : ''}>
        <span><b>${esc(l.nome)}${l.selo ? `<em>${esc(l.selo)}</em>` : ''}</b><small>${esc(l.endereco)}</small><small>${esc(abre)}</small></span>
      </label>`;
    }).join('');
  }

  function renderDias() {
    const dias = diasAgendaveis();
    if (!dias.some((x) => x.ok && iso(x.d) === pedido.data)) {
      // sugere o primeiro dia em que todos os itens do pedido saem; senão, o primeiro dia aberto
      const tudoSai = (x) => itens().every(({ p }) => itemDisponivel(p, x.d));
      const escolhido = dias.find((x) => x.ok && tudoSai(x)) || dias.find((x) => x.ok);
      pedido.data = escolhido ? iso(escolhido.d) : null;
    }
    $('[data-dias]').innerHTML = dias.map((x) => `<label class="dia">
        <input type="radio" name="data" value="${iso(x.d)}"${x.ok ? '' : ' disabled'}${iso(x.d) === pedido.data ? ' checked' : ''}>
        <span><b>${esc(x.rotulo)}</b><small>${x.ok ? esc(x.sub) : 'fechado'}</small></span>
      </label>`).join('');
    renderHoras();
    renderAlerta();
    if (pedido.data) renderQuando(); // o cardápio acompanha o dia escolhido aqui
  }

  function renderHoras() {
    const sel = $('[data-hora]');
    const loja = baseAgenda();
    const data = pedido.data ? deIso(pedido.data) : null;
    const ops = data ? opcoesHorario(loja, data) : [];
    if (!ops.some((o) => o.v === pedido.hora)) {
      pedido.hora = ops.length === 1 || (ops[0] && ops[0].v === 'asap') ? ops[0].v : '';
    }
    sel.innerHTML = `<option value="">Escolha o horário</option>${ops.map((o) => `<option value="${o.v}"${o.v === pedido.hora ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}`;
    sel.disabled = !ops.length;
    const nota = $('[data-nota-horario]');
    if (!data) { nota.textContent = 'Sem dias disponíveis nesta loja na próxima semana. Escolha outra loja.'; return; }
    const ex = expediente(loja, data);
    const onde = pedido.modo === 'entrega' ? 'A loja' : `A loja ${loja.nome}`;
    nota.textContent = ex.abre !== null
      ? `${onde} abre das ${hora(ex.abre)} às ${hora(ex.fecha)} neste dia.`
      : 'O horário deste dia é confirmado pelo WhatsApp.';
  }

  function renderPagamentos() {
    $('[data-pagamentos]').innerHTML = (CFG.pagamentos || []).map((f) => `<label class="chip">
        <input type="radio" name="pagamento" value="${esc(f)}"${pedido.pagamento === f ? ' checked' : ''}><span>${esc(f)}</span>
      </label>`).join('');
    $('[data-troco]').hidden = !(pedido.modo === 'entrega' && /dinheiro/i.test(pedido.pagamento));
  }

  const indisponiveis = () => {
    if (!pedido.data) return [];
    const d = deIso(pedido.data);
    return itens().filter(({ p }) => !itemDisponivel(p, d)).map(({ p }) => p);
  };

  function renderAlerta() {
    const box = $('[data-alerta]');
    const lista = indisponiveis();
    box.hidden = !lista.length;
    if (!lista.length) { box.innerHTML = ''; return; }
    const d = deIso(pedido.data);
    const artigo = d.getDay() === 0 || d.getDay() === 6 ? 'no' : 'na';
    box.innerHTML = `<p class="alerta__tit">${ico('alerta')}${lista.length === 1 ? 'Um item não sai' : 'Alguns itens não saem'} ${artigo} ${DIAS[d.getDay()]}</p>
      <ul>${lista.map((p) => `<li><b>${esc(p.nome)}</b>: só ${esc(textoDias(p.dias).toLowerCase())}</li>`).join('')}</ul>
      <p>Escolha outro dia ou tire ${lista.length === 1 ? 'o item' : 'os itens'} do pedido. Se ${artigo === 'no' ? 'o' : 'a'} ${DIAS[d.getDay()]} for feriado, pode enviar assim mesmo.</p>
      <button type="button" class="btn-link" data-remover-indisponiveis>Tirar ${lista.length === 1 ? 'esse item' : 'esses itens'} do pedido</button>`;
  }

  function renderResumo() {
    const lista = itens();
    $('[data-resumo]').innerHTML = `<p class="resumo__tit">Resumo do pedido</p>
      <ul>${lista.map(({ p, q }) => `<li><span>${q}× ${esc(p.nome)}</span><span>${dinheiro(p.cent * q)}</span></li>`).join('')}</ul>
      <p class="resumo__total"><span>Total dos itens</span><span>${dinheiro(valorTotal())}</span></p>
      ${pedido.modo === 'entrega' ? '<p class="nota">+ taxa de entrega, confirmada pelo WhatsApp.</p>' : ''}
      <button type="button" class="btn-link" data-voltar-itens>Alterar itens</button>`;
  }

  /* validação e envio */
  const ALVO_ERRO = { data: 'input[name="data"]:not([disabled])', hora: 'select', nome: 'input', endereco: 'input', bairro: 'input' };

  function limparErro(nome) {
    const campo = $(`[data-campo="${nome}"]`, form);
    if (!campo) return;
    campo.classList.remove('com-erro');
    const msg = $(':scope > .erro', campo);
    if (msg) msg.remove();
    $$(ALVO_ERRO[nome], campo).forEach((el) => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  }

  function mostrarErros(erros) {
    ['nome', 'endereco', 'bairro', 'data', 'hora'].forEach(limparErro);
    Object.entries(erros).forEach(([nome, texto]) => {
      const campo = $(`[data-campo="${nome}"]`, form);
      if (!campo) return;
      campo.classList.add('com-erro');
      const msg = document.createElement('small');
      msg.className = 'erro';
      msg.id = `erro-${nome}`;
      msg.textContent = texto;
      campo.appendChild(msg);
      $$(ALVO_ERRO[nome], campo).forEach((el) => { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', msg.id); });
    });
  }

  function coletar() {
    const f = form.elements;
    return {
      modo: pedido.modo,
      loja: LOJAS[pedido.loja],
      data: pedido.data ? deIso(pedido.data) : null,
      hora: f.hora.value,
      nome: f.nome.value.trim(),
      endereco: f.endereco.value.trim(),
      bairro: f.bairro.value.trim(),
      complemento: f.complemento.value.trim(),
      pagamento: pedido.pagamento,
      troco: f.troco.value.replace(/[^\d,.]/g, ''),
      obs: f.obs.value.trim(),
    };
  }

  function validar(d) {
    const e = {};
    if (d.modo === 'entrega') {
      if (!d.endereco) e.endereco = 'Informe a rua e o número.';
      if (!d.bairro) e.bairro = 'Informe o bairro.';
    }
    if (!d.data) e.data = 'Escolha o dia.';
    else if (!d.hora) e.hora = 'Escolha o horário.';
    if (!d.nome) e.nome = 'Diga seu nome para a loja saber de quem é o pedido.';
    return e;
  }

  function quandoTexto(d) {
    const agora = new Date();
    const prefixo = iso(d.data) === iso(agora) ? 'hoje, ' : iso(d.data) === iso(diaZero(agora, 1)) ? 'amanhã, ' : '';
    const h = d.hora === 'asap' ? 'assim que possível' : d.hora === 'combinar' ? 'horário a combinar' : `às ${hora(Number(d.hora))}`;
    return `${prefixo}${DIAS[d.data.getDay()]} ${ddmm(d.data)}, ${h}`;
  }

  function montarMensagem(d) {
    const L = [];
    L.push(CFG.mensagemAbertura || 'Olá! Quero fazer um pedido.');
    L.push('');
    L.push('*PEDIDO*');
    itens().forEach(({ p, q }) => {
      const un = p.unidade && p.unidade !== 'unidade' ? ` (${p.unidade})` : '';
      L.push(`${q}x ${p.nome}${un} — ${dinheiro(p.cent * q)}`);
    });
    L.push(`*Total: ${dinheiro(valorTotal())}*${d.modo === 'entrega' ? ' + entrega' : ''}`);
    L.push('');
    L.push(`*Nome:* ${d.nome}`);
    if (d.modo === 'retirar') {
      L.push(`*Retirada:* loja ${d.loja.nome} (${d.loja.endereco})`);
    } else {
      L.push(`*Entrega:* ${d.endereco} — ${d.bairro}`);
      if (d.complemento) L.push(`*Complemento:* ${d.complemento}`);
    }
    L.push(`*Quando:* ${quandoTexto(d)}`);
    if (d.modo === 'entrega' && d.pagamento) {
      L.push(`*Pagamento:* ${d.pagamento}${/dinheiro/i.test(d.pagamento) && d.troco ? ` (troco para R$ ${d.troco})` : ''}`);
    }
    if (d.obs) L.push(`*Observações:* ${d.obs}`);
    const faltam = indisponiveis();
    if (faltam.length) L.push(`_Obs.: escolhi um dia em que ${faltam.map((p) => p.nome.toLowerCase()).join(', ')} normalmente não sai._`);
    L.push('');
    L.push('Pode confirmar, por favor?');
    return L.join('\n');
  }

  function registrarConversao(cent) {
    try {
      const ga = CFG.googleAds;
      if (typeof window.gtag === 'function' && ga && ga.id && ga.conversao) {
        window.gtag('event', 'conversion', { send_to: `${ga.id}/${ga.conversao}`, value: cent / 100, currency: 'BRL' });
      }
    } catch (e) { /* nunca bloquear o pedido por causa de métrica */ }
  }

  function enviar(e) {
    e.preventDefault();
    if (!qtdTotal()) { irPara('itens'); return; }
    const d = coletar();
    const erros = validar(d);
    mostrarErros(erros);
    const primeiro = Object.keys(erros)[0];
    if (primeiro) {
      const campo = $(`[data-campo="${primeiro}"]`, form);
      const el = campo && $(ALVO_ERRO[primeiro], campo);
      if (el) el.focus(); else if (campo) campo.scrollIntoView({ block: 'center' });
      return;
    }
    memoria.gravar(CHAVE_CLIENTE, {
      modo: d.modo, loja: pedido.loja, pagamento: d.pagamento,
      nome: d.nome, endereco: d.endereco, bairro: d.bairro, complemento: d.complemento,
    });
    const url = linkWhatsApp(montarMensagem(d));
    ultimoLink = url;
    $('[data-link-final]').href = url;
    registrarConversao(valorTotal());

    const toque = window.matchMedia('(pointer: coarse)').matches;
    if (toque) {
      irPara('enviado');
      window.location.href = url; // no celular abre direto o app do WhatsApp
    } else {
      const janela = window.open(url, '_blank');
      if (janela) { try { janela.opener = null; } catch (err) { /* ok */ } }
      irPara('enviado');
    }
  }

  function novoPedido() {
    carrinho = {};
    memoria.gravar(CHAVE_CARRINHO, carrinho);
    pedido.data = null;
    pedido.hora = '';
    form.elements.obs.value = '';
    form.elements.troco.value = '';
    atualizar();
    renderQuando();
    fecharPedido();
    avisar('Pronto! Pode montar um novo pedido.');
  }

  function removerIndisponiveis() {
    indisponiveis().forEach((p) => { delete carrinho[p.id]; });
    memoria.gravar(CHAVE_CARRINHO, carrinho);
    atualizar();
    if (etapa === 'dados') { const dia = $('input[name="data"]:checked', form); if (dia) dia.focus(); }
  }

  function retirarEm(id) {
    pedido.modo = 'retirar';
    pedido.loja = id;
    if (qtdTotal()) { abrirPedido('dados'); return; }
    $('#cardapio').scrollIntoView({ behavior: 'smooth' });
    avisar(`Retirada na loja ${LOJAS[id].nome}. Agora escolha os itens.`);
  }

  /* ------------------------------------------------------------------
     Eventos
     ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-mais],[data-menos],[data-abrir-pedido],[data-fechar],[data-voltar],[data-voltar-itens],[data-continuar],[data-novo-pedido],[data-retirar-em],[data-remover-indisponiveis],[data-ir-cardapio]');
    if (!t) return;
    const ds = t.dataset;
    if ('add' in ds) mudar(ds.add, 1);
    else if ('mais' in ds) mudar(ds.mais, 1);
    else if ('menos' in ds) mudar(ds.menos, -1);
    else if ('abrirPedido' in ds) abrirPedido('itens');
    else if ('fechar' in ds) fecharPedido();
    else if ('voltar' in ds || 'voltarItens' in ds) irPara('itens');
    else if ('continuar' in ds) { lojaAbertaNoDia(); irPara('dados'); }
    else if ('novoPedido' in ds) novoPedido();
    else if ('retirarEm' in ds) retirarEm(ds.retirarEm);
    else if ('removerIndisponiveis' in ds) removerIndisponiveis();
    else if ('irCardapio' in ds) { fecharPedido(); setTimeout(() => $('#cardapio').scrollIntoView({ behavior: 'smooth' }), 220); }
  });

  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el.name === 'modo') { pedido.modo = el.value; renderDados(); }
    else if (el.name === 'loja') { pedido.loja = el.value; renderDias(); limparErro('data'); }
    else if (el.name === 'data') { pedido.data = el.value; renderHoras(); renderAlerta(); renderQuando(); limparErro('data'); limparErro('hora'); }
    else if (el.name === 'hora') { pedido.hora = el.value; limparErro('hora'); }
    else if (el.name === 'pagamento') { pedido.pagamento = el.value; renderPagamentos(); }
  });
  form.addEventListener('input', (e) => { if (['nome', 'endereco', 'bairro'].includes(e.target.name)) limparErro(e.target.name); });
  form.addEventListener('submit', enviar);

  // dia escolhido em cima do cardápio
  $('[data-quando]').addEventListener('change', (e) => {
    if (e.target.name === 'dia-cardapio') escolherDia(e.target.value);
  });

  /** Ao seguir para a retirada: se a loja salva não abre no dia escolhido, sugere uma que abre. */
  function lojaAbertaNoDia() {
    if (pedido.modo !== 'retirar' || !pedido.data) return;
    const d = deIso(pedido.data);
    if (opcoesHorario(LOJAS[pedido.loja], d).length) return;
    const aberta = CFG.lojas.find((l) => opcoesHorario(l, d).length);
    if (aberta) pedido.loja = aberta.id;
  }

  // carrinho sincronizado entre abas
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE_CARRINHO) return;
    carrinho = normalizar(memoria.ler(CHAVE_CARRINHO, {}));
    atualizar();
  });

  /* categoria ativa conforme a rolagem */
  function iniciarCategoriaAtiva() {
    const trilho = $('[data-categorias]');
    const links = $$('[data-cat]', trilho);
    if (!('IntersectionObserver' in window) || !links.length) return;
    const marcar = (id) => {
      links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.cat === id)));
      const ativo = links.find((a) => a.dataset.cat === id);
      if (ativo && trilho.scrollWidth > trilho.clientWidth) {
        trilho.scrollTo({ left: ativo.offsetLeft - trilho.offsetLeft - (trilho.clientWidth - ativo.clientWidth) / 2, behavior: 'smooth' });
      }
    };
    const secoes = $$('.categoria');
    const topoDaPagina = $('.hero');
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.target === topoDaPagina) { if (en.isIntersecting) marcar(null); return; }
        if (en.isIntersecting) marcar(en.target.id.replace('cat-', ''));
        else if (en.target === secoes[0] && en.boundingClientRect.top > 0) marcar(null); // voltou para antes do cardápio
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secoes.forEach((s) => obs.observe(s));
    if (topoDaPagina) obs.observe(topoDaPagina);
  }

  /* dados estruturados (Google) gerados a partir do cardápio e das lojas */
  function dadosEstruturados() {
    const site = CFG.site.replace(/\/$/, '');
    const precos = Object.values(PRODUTOS).map((p) => p.cent);
    const diasSchema = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grafo = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization', '@id': `${site}/#marca`, name: 'Maionese San Remo', url: CFG.site,
          logo: `${site}/img/compartilhar.jpg`, foundingDate: '1971',
          sameAs: CFG.instagram ? [`https://www.instagram.com/${CFG.instagram}/`] : [],
        },
        {
          '@type': 'Menu', '@id': `${site}/#cardapio`, name: 'Cardápio Maionese San Remo', inLanguage: 'pt-BR',
          hasMenuSection: CARDAPIO.map((c) => ({
            '@type': 'MenuSection', name: c.titulo,
            hasMenuItem: c.itens.map((p) => ({
              '@type': 'MenuItem', name: p.nome, description: p.detalhe, image: `${site}/${p.foto}`,
              offers: { '@type': 'Offer', price: (centavos(p.preco) / 100).toFixed(2), priceCurrency: 'BRL' },
            })),
          })),
        },
        ...CFG.lojas.map((l) => ({
          '@type': 'FoodEstablishment', '@id': `${site}/#loja-${l.id}`, name: `Maionese San Remo — ${l.nome}`,
          parentOrganization: { '@id': `${site}/#marca` }, url: CFG.site, image: `${site}/img/compartilhar.jpg`,
          telephone: `+55 ${CFG.telefone}`, servesCuisine: 'Brasileira',
          priceRange: `${dinheiro(Math.min(...precos))} – ${dinheiro(Math.max(...precos))}`,
          hasMenu: { '@id': `${site}/#cardapio` },
          address: { '@type': 'PostalAddress', streetAddress: l.endereco, addressLocality: 'Curitiba', addressRegion: 'PR', addressCountry: 'BR' },
          openingHoursSpecification: Object.keys(l.horarios).filter((d) => l.horarios[d]).map((d) => ({
            '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${diasSchema[d]}`, opens: l.horarios[d][0], closes: l.horarios[d][1],
          })),
        })),
      ],
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(grafo);
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------
     Início
     ------------------------------------------------------------------ */
  /* faixa do hero com os nomes do cardápio rolando */
  function renderFaixa() {
    const trilho = $('[data-faixa]');
    if (!trilho) return;
    const nomes = CARDAPIO.flatMap((c) => (c.destaque ? [c.titulo] : c.itens.map((p) => p.nome)));
    if (!nomes.length) return;
    // metade do trilho precisa ser mais larga que a tela, para o loop não deixar buraco
    const lista = `<ul class="faixa__lista">${nomes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    trilho.innerHTML = lista.repeat(4);
    trilho.closest('.faixa').hidden = false;
  }

  function iniciar() {
    renderFaixa();
    renderCardapio();
    renderQuando();
    renderLojas();

    const contato = linkWhatsApp(CFG.mensagemContato || '');
    $$('[data-link-contato]').forEach((a) => { a.href = contato; });
    $$('[data-anos]').forEach((el) => { el.textContent = new Date().getFullYear() - 1971; });
    $$('[data-ano]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    if (CFG.cnpj) $$('[data-cnpj]').forEach((el) => { el.textContent = ` · CNPJ ${CFG.cnpj}`; });
    const maioneses = (CARDAPIO.find((c) => c.destaque) || CARDAPIO[0]).itens.map((p) => centavos(p.preco));
    $$('[data-preco-min]').forEach((el) => { el.textContent = dinheiro(Math.min(...maioneses)); });
    $('[data-link-final]').href = ultimoLink;

    atualizarResumo();
    iniciarCategoriaAtiva();
    dadosEstruturados();

    const topo = $('[data-topo]');
    const sombra = () => topo.classList.toggle('rolou', window.scrollY > 8);
    window.addEventListener('scroll', sombra, { passive: true });
    sombra();

    if (location.hash === '#pedido' && qtdTotal()) abrirPedido('itens');
  }

  iniciar();
})();
