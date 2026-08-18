// ============================================
// grupo-humanidade / painel-comercial (repo `estrela`)
// Religado em: 18/08/2026 — o botão sumiu em 17/08 e voltou aqui.
//
// Chat do Painel Comercial: botão flutuante + painel de conversa, falando com
// o Worker (chat-proxy/worker.js), que guarda a chave da Anthropic.
//
// POR QUE ESTE ARQUIVO É PÚBLICO E ESTÁ EM docs/
// Até 17/08 o widget era injetado dentro do blob criptografado pelo
// encrypt_painel.py, porque carregava o PAINEL_TOKEN em texto claro. Não
// carrega mais: o token vem do localStorage, o mesmo que o painel já pede uma
// vez por aparelho. Sem segredo dentro, o arquivo pode morar no destino e ser
// servido pelo Pages.
//
// DUAS DIFERENÇAS EM RELAÇÃO À VERSÃO DE 12/08
//   1. Uma digitação de token, não duas. O Worker confere o MESMO valor que o
//      Cofre confere (hub_token_gestao). Ver chat-proxy/README.md.
//   2. Manda o dado, não a tela. A versão antiga raspava as <table> do DOM —
//      que hoje estão filtradas pelos chips e, na metade do Parque, mostram um
//      mês só. O chat responderia sobre o recorte da tela achando que era a
//      base inteira. Agora vai o window.__DADOS__ da empresa aberta.
// ============================================

(function () {
  'use strict';

  const PROXY = 'https://estrela-painel-chat.ricardocandrade.workers.dev';
  const CHAVE_TOKEN = 'hub_token_gestao';   // o mesmo do painel — não duplicar

  let historico = [];
  let baseCache = null;      // TSV já montado da empresa da conversa
  let empDaConversa = null;  // sobre qual empresa o histórico fala
  let ocupado = false;

  function empresaNaTela() {
    return document.body.classList.contains('emp-ps') ? 'ps' : 'eu';
  }

  /* Serializa em TSV a partir das CHAVES REAIS de cada registro, sem lista
     fixa de colunas. Se o Cofre passar a mandar um campo novo, ele chega ao
     chat sozinho — uma lista escrita à mão aqui viraria mentira silenciosa na
     primeira mudança de esquema. TSV gasta menos token que JSON e o modelo lê
     bem. */
  function tsv(nome, arr) {
    if (!Array.isArray(arr) || !arr.length) return '## ' + nome + '\n(vazio)';
    const cols = [];
    arr.forEach(function (o) {
      Object.keys(o || {}).forEach(function (k) {
        if (cols.indexOf(k) === -1) cols.push(k);
      });
    });
    const linha = function (o) {
      return cols.map(function (k) {
        const v = o ? o[k] : '';
        return (v === null || v === undefined) ? '' : String(v).replace(/[\t\n]/g, ' ');
      }).join('\t');
    };
    return '## ' + nome + ' (' + arr.length + ' linhas)\n' +
      cols.join('\t') + '\n' + arr.map(linha).join('\n');
  }

  function montarBase(emp) {
    if (emp === 'ps') {
      const P = window.__DADOS_PS__ || {};
      return [
        'EMPRESA: Parque da Saudade (jazigos)',
        'Cofre atualizado em: ' + (P.atualizado_em || '(sem carimbo)'),
        tsv('vendas', P.vendas),
        tsv('meses', P.meses),
        '## metas (objeto, chave = competência AAAA-MM)\n' + JSON.stringify(P.metas || {})
      ].join('\n\n');
    }
    const D = window.__DADOS__ || {};
    return [
      'EMPRESA: Estrela Urbanidade (lotes)',
      'Cofre atualizado em: ' + (D.atualizado_em || '(sem carimbo)'),
      tsv('vendas', D.vendas),
      tsv('estoque', D.estoque),
      // As ressalvas de base (área estimada, % de sócio assumido, o que é
      // "informado") moram no Cofre, não neste arquivo público. Sem elas o
      // chat afirmaria com precisão de centavo um número que é estimativa.
      '## notas do Cofre\n' + JSON.stringify(D.notas || {}),
      '## rótulos/abreviações\n' + JSON.stringify(D.rotulos || {})
    ].join('\n\n');
  }

  const css = [
    '.eu-chat-bt{position:fixed;right:20px;bottom:48px;z-index:9998;width:52px;height:52px;',
    '  border:none;border-radius:50%;background:var(--s1,#0e9fc4);color:#04121a;cursor:pointer;',
    '  box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}',
    '.eu-chat-bt:hover{background:#12b4dd}',
    '.eu-chat-bt svg{width:24px;height:24px;fill:currentColor}',
    '.eu-chat{position:fixed;right:20px;bottom:112px;z-index:9999;width:400px;max-width:calc(100vw - 40px);',
    '  height:540px;max-height:calc(100vh - 190px);display:none;flex-direction:column;',
    '  background:rgba(11,18,32,.97);border:1px solid var(--edge,rgba(255,255,255,.11));border-radius:16px;',
    '  backdrop-filter:blur(10px);box-shadow:0 14px 44px rgba(0,0,0,.5);overflow:hidden;',
    '  font:14px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text-1,#eef4fa)}',
    '.eu-chat.aberto{display:flex}',
    '.eu-chat-topo{padding:13px 16px;border-bottom:1px solid var(--edge,rgba(255,255,255,.09));',
    '  display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}',
    '.eu-chat-topo b{font-size:14px;font-weight:600}',
    '.eu-chat-topo span{display:block;font-size:11px;color:var(--text-3,#64778f);font-weight:400}',
    '.eu-chat-x{background:none;border:none;color:var(--text-3,#64778f);font-size:22px;line-height:1;',
    '  cursor:pointer;padding:0 4px}',
    '.eu-chat-x:hover{color:var(--text-1,#eef4fa)}',
    '.eu-chat-msgs{flex:1 1 auto;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}',
    '.eu-msg{max-width:88%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}',
    '.eu-msg.eu-user{align-self:flex-end;background:var(--s1,#0e9fc4);color:#04121a}',
    '.eu-msg.eu-bot{align-self:flex-start;background:rgba(255,255,255,.06);',
    '  border:1px solid rgba(255,255,255,.08)}',
    '.eu-msg.eu-erro{align-self:flex-start;background:rgba(248,113,113,.11);',
    '  border:1px solid rgba(248,113,113,.3);color:var(--crit,#f87171)}',
    '.eu-msg.eu-troca{align-self:center;max-width:100%;background:none;border:none;padding:2px;',
    '  color:var(--text-3,#64778f);font-size:11.5px;text-align:center}',
    '.eu-chat-dica{color:var(--text-3,#64778f);font-size:12.5px;text-align:center;margin:auto 0;padding:0 12px}',
    '.eu-chat-baixo{flex:0 0 auto;padding:11px 12px;border-top:1px solid var(--edge,rgba(255,255,255,.09));',
    '  display:flex;gap:8px}',
    '.eu-chat-baixo textarea{flex:1;resize:none;height:40px;max-height:110px;padding:9px 11px;',
    '  border:1px solid var(--edge2,rgba(255,255,255,.14));background:rgba(255,255,255,.05);',
    '  color:var(--text-1,#eef4fa);border-radius:9px;font:inherit;outline:none}',
    '.eu-chat-baixo textarea:focus{border-color:rgba(103,207,232,.5)}',
    '.eu-chat-baixo button{flex:0 0 auto;padding:0 15px;border:none;border-radius:9px;',
    '  background:var(--s1,#0e9fc4);color:#04121a;font-weight:700;cursor:pointer}',
    '.eu-chat-baixo button:disabled{opacity:.45;cursor:default}',
    '@media(max-width:520px){.eu-chat{right:10px;left:10px;width:auto}}',
    /* Dois móveis fixos disputam o rodapé: o #selo do carimbo do Cofre (34px, e
       62px acima da barra no celular) e a .bnav de abas (~59px + área segura).
       O botão sobe acima dos dois — cobrir o carimbo seria esconder justamente
       o aviso de "dado velho". */
    '@media(max-width:640px){',
    '  .eu-chat-bt{bottom:calc(106px + env(safe-area-inset-bottom))}',
    '  .eu-chat{bottom:calc(170px + env(safe-area-inset-bottom));',
    '    max-height:calc(100vh - 240px)}',
    '}'
  ].join('\n');

  const marcacao = [
    '<div class="eu-chat-topo">',
    '  <div><b>Perguntar ao Claude</b><span class="eu-chat-sub">sobre os números deste painel</span></div>',
    '  <button class="eu-chat-x" aria-label="Fechar">&times;</button>',
    '</div>',
    '<div class="eu-chat-msgs">',
    '  <div class="eu-chat-dica">Pergunte sobre os números da empresa aberta.<br>',
    '    Ex.: "qual empreendimento tem maior giro de estoque?"</div>',
    '</div>',
    '<div class="eu-chat-baixo">',
    '  <textarea placeholder="Sua pergunta..." rows="1"></textarea>',
    '  <button type="button">Enviar</button>',
    '</div>'
  ].join('\n');

  let botao, painel, listaMsgs, campo, enviar;

  /* Chamado pelo painel DEPOIS que o portão cai e o dado sobe. Antes disso não
     há o que perguntar, e um botão de chat em cima da tela de token só
     convidaria a esbarrar nele. */
  window.__ligarChat = function () {
    if (botao) return;

    const estilo = document.createElement('style');
    estilo.textContent = css;
    document.head.appendChild(estilo);

    botao = document.createElement('button');
    botao.className = 'eu-chat-bt';
    botao.setAttribute('aria-label', 'Perguntar ao Claude');
    botao.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';

    painel = document.createElement('div');
    painel.className = 'eu-chat';
    painel.innerHTML = marcacao;

    document.body.append(botao, painel);

    listaMsgs = painel.querySelector('.eu-chat-msgs');
    campo = painel.querySelector('textarea');
    enviar = painel.querySelector('.eu-chat-baixo button');

    botao.onclick = function () {
      painel.classList.toggle('aberto');
      if (painel.classList.contains('aberto')) { legenda(); campo.focus(); }
    };
    painel.querySelector('.eu-chat-x').onclick = function () {
      painel.classList.remove('aberto');
    };

    campo.addEventListener('input', function () {
      campo.style.height = '40px';
      campo.style.height = Math.min(campo.scrollHeight, 110) + 'px';
    });
    campo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); perguntar(); }
    });
    enviar.onclick = perguntar;
  };

  function legenda() {
    const s = painel.querySelector('.eu-chat-sub');
    if (s) {
      s.textContent = 'sobre ' + (empresaNaTela() === 'ps'
        ? 'o Parque da Saudade' : 'a Estrela Urbanidade');
    }
  }

  function bolha(classe, texto) {
    const dica = painel.querySelector('.eu-chat-dica');
    if (dica) dica.remove();
    const el = document.createElement('div');
    el.className = 'eu-msg ' + classe;
    el.textContent = texto;
    listaMsgs.appendChild(el);
    listaMsgs.scrollTop = listaMsgs.scrollHeight;
    return el;
  }

  function pegarToken() {
    try { return localStorage.getItem(CHAVE_TOKEN); } catch (e) { return null; }
  }

  async function perguntar() {
    const pergunta = campo.value.trim();
    if (!pergunta || ocupado) return;

    const token = pegarToken();
    if (!token) {
      bolha('eu-erro', 'Sem token neste aparelho. Recarregue o painel e digite o token.');
      return;
    }

    /* Trocar de empresa troca a base inteira. Manter o histórico faria o
       modelo responder sobre jazigos citando lotes — e com toda a confiança,
       porque o texto anterior continua no contexto. */
    const emp = empresaNaTela();
    if (empDaConversa && empDaConversa !== emp) {
      historico = [];
      baseCache = null;
      bolha('eu-troca', '— agora sobre ' +
        (emp === 'ps' ? 'o Parque da Saudade' : 'a Estrela Urbanidade') +
        '; a conversa anterior ficou para trás —');
    }
    if (baseCache === null) baseCache = montarBase(emp);
    empDaConversa = emp;
    legenda();

    ocupado = true;
    enviar.disabled = true;
    campo.value = '';
    campo.style.height = '40px';

    bolha('eu-user', pergunta);
    historico.push({ role: 'user', content: pergunta });
    const saida = bolha('eu-bot', '…');
    let resposta = '';

    try {
      const req = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ tabela: baseCache, mensagens: historico })
      });
      // 401 aqui não é o token do painel estar errado — ele acabou de abrir o
      // Cofre. É o Worker guardando um valor diferente. Ver chat-proxy/README.
      if (req.status === 401) throw new Error('o Worker não aceitou o token (401) — ver chat-proxy/README.md');
      if (!req.ok) throw new Error('HTTP ' + req.status);

      // Consome o SSE da API: cada content_block_delta traz um pedaço do texto.
      const leitor = req.body.getReader();
      const decodificador = new TextDecoder();
      let sobra = '';
      for (;;) {
        const passo = await leitor.read();
        if (passo.done) break;
        sobra += decodificador.decode(passo.value, { stream: true });
        const linhas = sobra.split('\n');
        sobra = linhas.pop();
        for (const linha of linhas) {
          if (linha.indexOf('data: ') !== 0) continue;
          let ev;
          try { ev = JSON.parse(linha.slice(6)); } catch (e) { continue; }
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
            resposta += ev.delta.text;
            saida.textContent = resposta;
            listaMsgs.scrollTop = listaMsgs.scrollHeight;
          }
        }
      }

      if (resposta) {
        historico.push({ role: 'assistant', content: resposta });
      } else {
        saida.className = 'eu-msg eu-erro';
        saida.textContent = 'O modelo não retornou resposta. Tente reformular.';
        historico.pop();
      }
    } catch (e) {
      saida.className = 'eu-msg eu-erro';
      saida.textContent = 'Falha ao consultar: ' + e.message;
      historico.pop();
    } finally {
      ocupado = false;
      enviar.disabled = false;
      campo.focus();
    }
  }
})();
