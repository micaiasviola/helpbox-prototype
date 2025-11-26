const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function gerarRespostaIA(categoria, descricao, titulo, frequencia, impacto, usuarios) {
    
    const FALLBACK = {
        solucao: "A análise automática falhou. Encaminhado para equipe técnica.",
        prioridade: 'M' 
    };

    if (!descricao || descricao.length < 5) {
        return { solucao: "Descrição muito curta.", prioridade: 'B' };
    }

    const prompt = `
        Você é um Assistente de Suporte Técnico (Nível 1).
        
        --- ETAPA 1: ANÁLISE DE DADOS ---
        Título: ${titulo} 
        Categoria: ${categoria}
        Descrição: ${descricao}
        Frequência: ${frequencia || 'Não informado'}
        Impacto: ${impacto || 'Não informado'}
        Abrangência: ${usuarios || 'Não informado'}

        --- ETAPA 2: CÁLCULO OCULTO DE PRIORIDADE ---
        Use estas regras APENAS para decidir a letra (A, M ou B). NÃO escreva isso na resposta.
        
        1. Frequência: Ocasional(1) | Contínua(3)
        2. Impacto: Mínimo(1) | Atraso(2) | Parado(3)
        3. Abrangência: Eu(1) | Grupo(2) | Todos(3)
        
        Soma: 7-9 pts = A | 4-6 pts = M | 3 pts = B

        --- ETAPA 3: GERAÇÃO DE RESPOSTA ---
        Escreva uma resposta técnica, cordial e formatada em Markdown (listas/negrito) com a solução.

        =============================================================
        🔴 REGRAS OBRIGATÓRIAS DE FORMATAÇÃO (LEIA COM ATENÇÃO):
        
        1. Sua resposta deve conter APENAS: A Letra, o Pipe (|) e a Solução.
        2. Sua resposta deve conter no MÁXIMO 1999 caracteres.
        3. PROIBIDO escrever "Cálculo de Prioridade", "Soma total" ou "Pontos".
        4. PROIBIDO explicar por que você escolheu a prioridade.
        5. Se a solução sugerir troca/substituição de hardware, sempre exiba uma mensagem "**Encaminhe para o Suporte Técnico para assistência presencial.**"
        6. Se a descrição indicar que o problema é "não técnico" (ex: dúvidas sobre políticas, treinamentos, etc), responda com:
           "B|**Este tipo de solicitação não é técnica. Por favor, contate o departamento responsável para mais informações.**"
        
        EXEMPLO DO QUE EU QUERO (Faça assim):
        M|**Olá!** Para resolver esse problema de lentidão, sugiro limpar o cache...

        EXEMPLO DO QUE EU NÃO QUERO (Jamais faça isso):
        M|Cálculo: 1+2+1 = 4. **Olá**...
        =============================================================
    `;

    const MAX_RETRIES = 3;
    let currentDelay = 1000;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', 
                contents: prompt,
                config: { temperature: 0.1 }
            });

            let fullText = response.text ? response.text.trim() : "";
            if (!fullText) throw new Error("Resposta vazia");

            let prioridadeDetectada = 'M';
            let solucaoDetectada = fullText;

            if (fullText.includes('|')) {
                const partes = fullText.split('|');
                const possivelPrioridade = partes[0].trim().toUpperCase();
                
                if (['A', 'M', 'B'].includes(possivelPrioridade)) {
                    prioridadeDetectada = possivelPrioridade;
                    // Pega tudo após o primeiro pipe
                    solucaoDetectada = partes.slice(1).join('|').trim();
                }
            }
            
            // LIMPEZA EXTRA DE SEGURANÇA:
            // Se mesmo com o prompt a IA teimar em escrever "Cálculo de Prioridade", a gente remove via código.
            solucaoDetectada = solucaoDetectada
                .replace(/Cálculo de Prioridade:[\s\S]*?(Solução Sugerida:|$)/gi, '$1') // Remove bloco de cálculo
                .replace(/\*\*Análise:.*?\*\*/g, '') // Remove linhas de análise soltas
                .trim();

            return {
                prioridade: prioridadeDetectada,
                solucao: solucaoDetectada
            };

        } catch (error) {
            if ((error.status === 503 || error.code === 503) && i < MAX_RETRIES - 1) {
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