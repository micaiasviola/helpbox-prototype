// services/iaService.js
const { GoogleGenAI } = require('@google/genai');

// Inicialização conforme seu código original
const ai = new GoogleGenAI({});

async function gerarRespostaIA(categoria, descricao, titulo) {
    
    // Objeto de fallback padrão
    const FALLBACK = {
        solucao: "A análise automática falhou. Por favor, encaminhe para a nossa equipe tecnica.",
        prioridade: 'M' 
    };

    if (!descricao || descricao.length < 10) {
        return { 
            solucao: "Desculpe, a descrição é muito curta. Por favor, forneça mais detalhes.", 
            prioridade: 'B' 
        };
    }

    // 🚨 O TRUQUE ESTÁ AQUI:
    // Pedimos para a IA responder no formato: "A|Texto da solução..."
    // Usamos o pipe "|" para separar a letra da prioridade do resto do texto.
    const prompt = `
        Você é um Assistente de Suporte Técnico.
        
        1. Analise o chamado:
           - Título: ${titulo} 
           - Categoria: ${categoria}
           - Descrição: ${descricao}

        2. Defina a Prioridade:
           - 'A' (Alta): Sistema parado, crítico.
           - 'M' (Média): Problema funcional, lentidão.
           - 'B' (Baixa): Dúvida, solicitação simples.

        3. Crie uma solução curta em Markdown (listas/negrito).

        ⚠️ IMPORTANTE: Sua resposta deve começar EXATAMENTE com a letra da prioridade, seguida de uma barra vertical "|", e depois a solução.
        
        Exemplo de Resposta:
        M|**Solução Sugerida:**\n1. Faça isso...
        
        Sua resposta:
    `;

    const MAX_RETRIES = 3;
    let currentDelay = 1000;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            // Mantivemos o seu modelo e configs originais
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Se esse funcionava, mantemos ele!
                contents: prompt,
                config: { temperature: 0.1 } // Sem forçar JSON
            });

            // Na sua lib, response.text é uma string direta (não função)
            let fullText = response.text ? response.text.trim() : "";

            if (!fullText) throw new Error("Resposta vazia");

            // --- LÓGICA DE SEPARAÇÃO (PARSE) ---
            let prioridadeDetectada = 'M';
            let solucaoDetectada = fullText;

            // Verifica se a resposta veio no formato "Letra|Texto"
            if (fullText.includes('|')) {
                const partes = fullText.split('|');
                const possivelPrioridade = partes[0].trim().toUpperCase();
                
                // Se a primeira parte for A, M ou B, extraímos ela
                if (['A', 'M', 'B'].includes(possivelPrioridade)) {
                    prioridadeDetectada = possivelPrioridade;
                    // O resto do texto é a solução (junta de volta caso tenha mais pipes)
                    solucaoDetectada = partes.slice(1).join('|').trim();
                }
            }

            return {
                prioridade: prioridadeDetectada,
                solucao: solucaoDetectada
            };

        } catch (error) {
            // Tratamento de erro 503 (Server Overloaded)
            if (error.status === 503 && i < MAX_RETRIES - 1) {
                console.warn(`Tentativa ${i + 1} falhou (503). Aguardando ${currentDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= 2; 
            } else {
                console.error("Erro IA:", error.message || error);
                return FALLBACK;
            }
        }
    }
    return FALLBACK;
}

module.exports = { gerarRespostaIA };