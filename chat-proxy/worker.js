// ============================================
// grupo-humanidade / hub comercial / gestao / estrela
// Gerado em: 11/08/2026 22:00
// Proxy Cloudflare Worker entre o Painel Vendas x Estoque e a API do Claude.
// A chave da API vive como secret do Worker (ANTHROPIC_API_KEY) e NUNCA
// aparece no navegador. O painel se autentica com PAINEL_TOKEN, que fica
// dentro do blob criptografado do index.html.
// Deploy: ver README.md nesta pasta.
// ============================================

const ORIGEM_PERMITIDA = 'https://humanidade-grupo.github.io';
const MODELO = 'claude-opus-5';
const MAX_TOKENS_RESPOSTA = 2048;
const MAX_BYTES_REQUISICAO = 512 * 1024; // teto do corpo: ~512 KB

const INSTRUCOES = `Você é um analista comercial da Estrela Urbanidade (loteamentos, Juiz de Fora/MG).
Responde perguntas da coordenação comercial sobre a tabela de vendas x estoque abaixo.

Regras:
- Responda SOMENTE com base nos dados da tabela. Se a resposta não estiver nos dados, diga isso.
- Nunca estime um número sem marcar explicitamente como estimativa.
- Ao citar um valor, diga de qual coluna/linha veio.
- Português do Brasil. Direto e conciso: responda a pergunta, sem preâmbulo.
- Valores em R$ no formato brasileiro (R$ 1.234.567,89).`;

function cabecalhosCors(origem) {
  return {
    'Access-Control-Allow-Origin': origem,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function erro(mensagem, status, origem) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cabecalhosCors(origem) },
  });
}

export default {
  async fetch(request, env) {
    const origem = request.headers.get('Origin');
    const corsOrigem = origem === ORIGEM_PERMITIDA ? origem : ORIGEM_PERMITIDA;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cabecalhosCors(corsOrigem) });
    }
    if (request.method !== 'POST') {
      return erro('Método não permitido.', 405, corsOrigem);
    }
    if (origem !== ORIGEM_PERMITIDA) {
      // Barreira de conveniência: Origin é forjável fora do navegador.
      // Quem realmente autentica é o PAINEL_TOKEN abaixo.
      return erro('Origem não autorizada.', 403, corsOrigem);
    }

    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!env.PAINEL_TOKEN || token !== env.PAINEL_TOKEN) {
      // Diagnostico sem expor segredo: hash truncado dos dois lados. Se estes
      // valores divergirem, o painel foi gerado com um token diferente do que
      // esta' no Worker — ver build/README.md, secao "Se o chat der 401".
      const hash = async (s) => {
        if (!s) return '(vazio)';
        const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
      };
      console.log('AUTH FALHOU ' + JSON.stringify({
        tamanhoRecebido: token.length,
        tamanhoEsperado: (env.PAINEL_TOKEN || '').length,
        hashRecebido: await hash(token),
        hashEsperado: await hash(env.PAINEL_TOKEN),
      }));
      return erro('Token inválido.', 401, corsOrigem);
    }

    const tamanho = Number(request.headers.get('Content-Length') || 0);
    if (tamanho > MAX_BYTES_REQUISICAO) {
      return erro('Requisição grande demais.', 413, corsOrigem);
    }

    let corpo;
    try {
      corpo = await request.json();
    } catch {
      return erro('JSON inválido.', 400, corsOrigem);
    }

    const { tabela, mensagens } = corpo;
    if (typeof tabela !== 'string' || !tabela.trim()) {
      return erro('Campo "tabela" ausente.', 400, corsOrigem);
    }
    if (!Array.isArray(mensagens) || mensagens.length === 0) {
      return erro('Campo "mensagens" ausente.', 400, corsOrigem);
    }
    // Só repassa o que a API espera — nada de campo extra vindo do cliente.
    const historico = mensagens.slice(-20).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content ?? ''),
    }));

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: MAX_TOKENS_RESPOSTA,
        stream: true,
        output_config: { effort: 'medium' },
        // O bloco estável (instruções + tabela) fica no system com cache_control:
        // a primeira pergunta paga a escrita do cache, as seguintes leem a ~0,1x.
        // A pergunta variável fica em messages, depois do breakpoint.
        system: [
          {
            type: 'text',
            text: `${INSTRUCOES}\n\n<tabela>\n${tabela}\n</tabela>`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: historico,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error('Erro da API Anthropic:', resposta.status, detalhe);
      // Não devolve o corpo do erro da Anthropic ao navegador.
      return erro('Falha ao consultar o modelo.', 502, corsOrigem);
    }

    return new Response(resposta.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...cabecalhosCors(corsOrigem),
      },
    });
  },
};
