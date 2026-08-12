// ============================================
// grupo-humanidade / hub comercial / gestao / estrela
// Gerado em: 11/08/2026 22:00
// Widget de chat do Painel Vendas x Estoque: botao flutuante + painel de
// conversa, falando com o Worker (chat-proxy/worker.js).
//
// ONDE ESTE ARQUIVO ENTRA: no FONTE do painel, no Cowork — o mesmo arquivo que
// o encrypt_painel.py criptografa. NAO adianta colar no docs/index.html
// publicado: aquele arquivo e' so' a casca de senha, e o document.write()
// substitui o documento inteiro quando o painel destrava.
//
// DOIS AJUSTES ANTES DE USAR (marcados com AJUSTAR abaixo):
//   1. URL do Worker
//   2. Token — deve ser injetado pelo encrypt_painel.py, nunca escrito a mao
// ============================================

(function () {
  'use strict';

  // --- Endereco do Worker publicado (deploy de 11/08/2026) -----------------
  const PROXY = 'https://estrela-painel-chat.ricardocandrade.workers.dev';

  // --- AJUSTAR 2: token de acesso ao proxy ---------------------------------
  // Este valor precisa ser substituido pelo encrypt_painel.py no momento da
  // geracao, do mesmo jeito que os dados de vendas. Ele so' existe dentro do
  // blob criptografado — quem nao tem a senha do painel nao chega nele.
  const TOKEN = '__PAINEL_TOKEN__';

  const historico = [];
  let tabelaCache = null;
  let ocupado = false;

  // Titulo da tabela. O <h3> do painel fica no .card, dois niveis acima do
  // <table> (table > .tblbox > .card), entao closest() com seletor generico
  // para no .tblbox e nao acha nada. Subimos ancestral por ancestral ate'
  // encontrar um que contenha cabecalho.
  function tituloDaTabela(tabela, i) {
    if (tabela.caption && tabela.caption.textContent.trim()) {
      return tabela.caption.textContent.trim();
    }
    let no = tabela.parentElement;
    for (let d = 0; no && d < 8; d++, no = no.parentElement) {
      const h = no.querySelector('h1,h2,h3,h4');
      if (h && h.textContent.trim()) return h.textContent.trim();
    }
    return `Tabela ${i + 1}`;
  }

  // Extrai as tabelas do painel ja' descriptografado e serializa em TSV.
  // TSV gasta menos token que HTML e o modelo le' bem.
  function extrairTabela() {
    if (tabelaCache) return tabelaCache;
    const blocos = [];
    document.querySelectorAll('table').forEach((tabela, i) => {
      const linhas = [...tabela.rows].map((linha) =>
        [...linha.cells].map((c) => c.textContent.trim().replace(/\s+/g, ' ')).join('\t')
      );
      if (linhas.length) blocos.push(`## ${tituloDaTabela(tabela, i)}\n${linhas.join('\n')}`);
    });
    tabelaCache = blocos.join('\n\n');
    return tabelaCache;
  }

  const css = `
.eu-chat-bt{position:fixed;right:20px;bottom:20px;z-index:9998;width:52px;height:52px;
  border:none;border-radius:50%;background:#0e9fc4;color:#04121a;cursor:pointer;
  box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
.eu-chat-bt:hover{background:#12b4dd}
.eu-chat-bt svg{width:24px;height:24px;fill:currentColor}
.eu-chat{position:fixed;right:20px;bottom:84px;z-index:9999;width:400px;max-width:calc(100vw - 40px);
  height:540px;max-height:calc(100vh - 120px);display:none;flex-direction:column;
  background:rgba(11,18,32,.97);border:1px solid rgba(255,255,255,.11);border-radius:16px;
  backdrop-filter:blur(10px);box-shadow:0 14px 44px rgba(0,0,0,.5);overflow:hidden;
  font:14px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#eef4fa}
.eu-chat.aberto{display:flex}
.eu-chat-topo{padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.09);
  display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}
.eu-chat-topo b{font-size:14px;font-weight:600}
.eu-chat-topo span{display:block;font-size:11px;color:#64778f;font-weight:400}
.eu-chat-x{background:none;border:none;color:#64778f;font-size:22px;line-height:1;cursor:pointer;padding:0 4px}
.eu-chat-x:hover{color:#eef4fa}
.eu-chat-msgs{flex:1 1 auto;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.eu-msg{max-width:88%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}
.eu-msg.eu-user{align-self:flex-end;background:#0e9fc4;color:#04121a}
.eu-msg.eu-bot{align-self:flex-start;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.08)}
.eu-msg.eu-erro{align-self:flex-start;background:rgba(248,113,113,.11);
  border:1px solid rgba(248,113,113,.3);color:#f87171}
.eu-chat-dica{color:#64778f;font-size:12.5px;text-align:center;margin:auto 0;padding:0 12px}
.eu-chat-baixo{flex:0 0 auto;padding:11px 12px;border-top:1px solid rgba(255,255,255,.09);display:flex;gap:8px}
.eu-chat-baixo textarea{flex:1;resize:none;height:40px;max-height:110px;padding:9px 11px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eef4fa;
  border-radius:9px;font:inherit;outline:none}
.eu-chat-baixo textarea:focus{border-color:rgba(103,207,232,.5)}
.eu-chat-baixo button{flex:0 0 auto;padding:0 15px;border:none;border-radius:9px;background:#0e9fc4;
  color:#04121a;font-weight:700;cursor:pointer}
.eu-chat-baixo button:disabled{opacity:.45;cursor:default}
@media(max-width:520px){.eu-chat{right:10px;left:10px;width:auto}}
/* Ate' 640px o painel troca as abas pelo menu fixo do rodape (.bnav, ~59px +
   area segura). O botao do chat sobe acima dele para nao cobrir "V x E". */
@media(max-width:640px){
  .eu-chat-bt{bottom:calc(72px + env(safe-area-inset-bottom))}
  .eu-chat{bottom:calc(136px + env(safe-area-inset-bottom));
    max-height:calc(100vh - 200px)}
}`;

  const marcacao = `
<div class="eu-chat-topo">
  <div><b>Perguntar ao Claude</b><span>sobre os dados deste painel</span></div>
  <button class="eu-chat-x" aria-label="Fechar">&times;</button>
</div>
<div class="eu-chat-msgs">
  <div class="eu-chat-dica">Pergunte sobre os números da tabela.<br>
    Ex.: "qual empreendimento tem maior giro de estoque?"</div>
</div>
<div class="eu-chat-baixo">
  <textarea placeholder="Sua pergunta..." rows="1"></textarea>
  <button type="button">Enviar</button>
</div>`;

  const estilo = document.createElement('style');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  const botao = document.createElement('button');
  botao.className = 'eu-chat-bt';
  botao.setAttribute('aria-label', 'Perguntar ao Claude');
  botao.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';

  const painel = document.createElement('div');
  painel.className = 'eu-chat';
  painel.innerHTML = marcacao;

  document.body.append(botao, painel);

  const listaMsgs = painel.querySelector('.eu-chat-msgs');
  const campo = painel.querySelector('textarea');
  const enviar = painel.querySelector('.eu-chat-baixo button');

  botao.onclick = () => {
    painel.classList.toggle('aberto');
    if (painel.classList.contains('aberto')) campo.focus();
  };
  painel.querySelector('.eu-chat-x').onclick = () => painel.classList.remove('aberto');

  campo.addEventListener('input', () => {
    campo.style.height = '40px';
    campo.style.height = Math.min(campo.scrollHeight, 110) + 'px';
  });
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      perguntar();
    }
  });
  enviar.onclick = perguntar;

  function bolha(classe, texto) {
    painel.querySelector('.eu-chat-dica')?.remove();
    const el = document.createElement('div');
    el.className = 'eu-msg ' + classe;
    el.textContent = texto;
    listaMsgs.appendChild(el);
    listaMsgs.scrollTop = listaMsgs.scrollHeight;
    return el;
  }

  async function perguntar() {
    const pergunta = campo.value.trim();
    if (!pergunta || ocupado) return;

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
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
        body: JSON.stringify({ tabela: extrairTabela(), mensagens: historico }),
      });
      if (!req.ok) throw new Error('HTTP ' + req.status);

      // Consome o SSE da API: cada content_block_delta traz um pedaco do texto.
      const leitor = req.body.getReader();
      const decodificador = new TextDecoder();
      let sobra = '';
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        sobra += decodificador.decode(value, { stream: true });
        const linhas = sobra.split('\n');
        sobra = linhas.pop();
        for (const linha of linhas) {
          if (!linha.startsWith('data: ')) continue;
          let ev;
          try {
            ev = JSON.parse(linha.slice(6));
          } catch {
            continue;
          }
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
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
