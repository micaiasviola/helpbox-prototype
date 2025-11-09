// services/iaService.js

// Importe o SDK
const { GoogleGenAI } = require('@google/genai');

// 🚨 Inicialize o cliente Gemini (Ele buscará a chave da variável de ambiente GEMINI_API_KEY)
// Se você está usando uma variável diferente, ajuste o construtor.
const ai = new GoogleGenAI({});

/**
 * Gera uma resposta de IA REAL usando a API Gemini.
 * * @param {string} categoria A categoria do chamado.
 * @param {string} descricao A descrição completa do problema.
 * @returns {Promise<string>} O texto da solução sugerida pelo Gemini.
 */
async function gerarRespostaIA(categoria, descricao, titulo) {
    if (!descricao || descricao.length < 10) {
        return "Desculpe, a descrição é muito curta. Por favor, forneça mais detalhes para que a IA possa analisar seu problema.";
    }

    const prompt = `
        Você é um Assistente de Suporte Técnico de primeira linha, focado em **soluções imediatas e fáceis**.
        Sua função é analisar o chamado e fornecer uma resposta profissional, **direta e formatada usando Markdown (listas e negrito)**.
        A resposta deve focar nos **3 passos mais simples e eficazes** de autoatendimento para o problema.
        
        **Instrução de Formatação:** Use títulos em negrito (\`**Título**\`) e listas numeradas ou com marcadores. Seja breve.
        
        ---
        **Detalhes do Chamado:**
        - Título: ${titulo} 
        - Categoria: ${categoria}
        - Descrição do Problema: ${descricao}
        ---

        Forneça APENAS a solução e os passos de autoatendimento.
    `;

    const FALLBACK_MESSAGE = "A análise automática falhou. Por favor, encaminhe para a nossa equipe tecnica.";
    const MAX_RETRIES = 3;
    let currentDelay = 1000; // 1 segundo de atraso inicial

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            // Tenta chamar a API
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { temperature: 0.1 }
            });

            // Se for bem-sucedido, retorna o resultado
            return response.text.trim();

        } catch (error) {
            if (error.status === 503 && i < MAX_RETRIES - 1) {
                // Se for erro 503 e ainda houver tentativas, espera e tenta novamente
                console.warn(`Tentativa ${i + 1} falhou com 503. Tentando novamente em ${currentDelay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= 2; // Dobra o atraso (Exponential Backoff)
            } else {
                console.error(`Erro fatal na IA (Status: ${error.status || 'Rede'}). Retornando fallback.`, error);
                return FALLBACK_MESSAGE;
            }
        }
    }
    return FALLBACK_MESSAGE;
}

module.exports = {
    gerarRespostaIA
};