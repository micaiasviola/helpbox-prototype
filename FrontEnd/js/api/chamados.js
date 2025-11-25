/**
 * @file api/chamados.js
 * @description Service Layer para comunicação com a API de Chamados.
 * * Minha abordagem aqui é isolar completamente a lógica HTTP (fetch, headers, status codes)
 * das Views. As telas não devem saber se o backend é Node, .NET ou PHP; elas apenas pedem dados.
 * * Destaque: Implementei um tratamento de erro robusto em `apiCreateChamado` para lidar com 
 * falhas críticas do servidor que retornam HTML em vez de JSON.
 * @author [Micaias Viola - Full Stack Developer]
 */

import { API_BASE } from '../utils/constants.js';

/**
 * @function apiGetChamados
 * @description Busca geral para Administradores (Visão de Águia).
 * * O admin precisa ver tudo, então essa rota não tem filtros de usuário ou técnico embutidos,
 * mas aceita parâmetros de busca (q) e status para a datatable.
 */
export async function apiGetChamados(page = 1, pageSize = 5, q = '', status = '') { 
    try {
        let url = `${API_BASE}/chamados?page=${page}&pageSize=${pageSize}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        
        const response = await fetch(url, { 
            // Credentials 'include' é obrigatório para APIs que usam Sessions/Cookies.
            credentials: 'include' 
        });
        
        if (response.ok) {
            // O backend deve retornar: { chamados: [...], totalCount: 150 }
            return await response.json(); 
        }
        throw new Error('Erro ao buscar todos os chamados (Admin)');
    } catch (error) {
        console.error('Erro API:', error);
        // Fallback seguro: Retorna lista vazia para não quebrar o .map() na View
        return { chamados: [], totalCount: 0 }; 
    }
}

/**
 * @function apiUpdateChamado
 * @description Atualização Genérica (PUT).
 * * Usada tanto para técnicos assumirem chamados quanto para salvar soluções.
 */
export async function apiUpdateChamado(id, dados) {
    try {
        const response = await fetch(`${API_BASE}/chamados/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            return await response.json();
        }
        throw new Error('Erro ao atualizar chamado');
    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

/**
 * @function apiCreateChamado
 * @description Criação de Tickets (POST).
 * * 🚨 TÉCNICA AVANÇADA DE DEBUG:
 * * Muitas vezes, quando o servidor explode (Erro 500), ele retorna uma página HTML de erro (Nginx/Express default)
 * em vez de um JSON. Se tentarmos fazer `response.json()` direto, o JS quebra com "Unexpected token <".
 * * Por isso, leio como `.text()` primeiro, tento converter para JSON, e se falhar, mostro o texto puro.
 * Isso salva horas de debug.
 */
export async function apiCreateChamado(dados) {
    try {
        const response = await fetch(`${API_BASE}/chamados`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(dados)
        });

        // Sucesso (200 OK ou 201 Created)
        if (response.ok) {
            return await response.json();
        }

        // --- INÍCIO DO TRATAMENTO ROBUSTO ---
        let errorMessage = 'Erro desconhecido no servidor.';
        
        // 1. Leio o corpo cru da resposta
        const textData = await response.text();
        
        if (textData) {
            try {
                // 2. Tento parsear como JSON (o cenário feliz de erro, ex: validação)
                const jsonData = JSON.parse(textData);
                errorMessage = jsonData.error || jsonData.message || JSON.stringify(jsonData);
            } catch (e) {
                // 3. Se falhar, é provável que seja HTML de erro ou Plain Text.
                // Uso o texto cru para mostrar ao desenvolvedor o que aconteceu.
                errorMessage = textData; 
            }
        } else {
            // Se o corpo vier vazio
            errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
        // --- FIM DO TRATAMENTO ---

    } catch (error) {
        console.error('Erro API:', error);
        throw error; // Repassa o erro para a View exibir o Alert
    }
}

/**
 * @function apiGetMeusChamados
 * @description Busca tickets relacionados ao usuário logado.
 * * O backend usa a sessão para identificar o usuário, mas o filtro `tipo` é crucial:
 * ele diz se quero ver os chamados que EU ABRI (cliente) ou os que EU RESOLVO (técnico).
 */
export async function apiGetMeusChamados(page = 1, pageSize = 5, q = '', status = '', tipo = '') { 
    try {
        let url = `${API_BASE}/chamados/meus?page=${page}&pageSize=${pageSize}`;
        
        if (q) url += `&q=${encodeURIComponent(q)}`; 
        if (status) url += `&status=${encodeURIComponent(status)}`; 
        if (tipo) url += `&tipo=${encodeURIComponent(tipo)}`; // Essencial para a View "Meus Chamados"

        const response = await fetch(url, {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }

        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            errorData.error = `Erro HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorData.error || 'Erro ao buscar seus chamados.');

    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

/**
 * @function apiGetChamadosTecnico
 * @description Busca a "Fila de Trabalho" (Pool de Tickets).
 * * Traz chamados que estão 'Em andamento' mas sem dono (para assumir)
 * ou chamados que já pertencem a outros técnicos (para supervisão).
 */
export async function apiGetChamadosTecnico(page = 1, pageSize = 5, q = '', status = '') { 
    try {
        let url = `${API_BASE}/chamados/tecnico?page=${page}&pageSize=${pageSize}`;
        
        if (q) url += `&q=${encodeURIComponent(q)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        
        const response = await fetch(url, { credentials: 'include' });
        
        if (response.ok) {
            return await response.json(); 
        }
        throw new Error('Erro ao buscar chamados da fila técnica.');
    } catch (error) {
        console.error('Erro API (Chamados Técnico):', error);
        return { chamados: [], totalCount: 0 };
    }
}

/**
 * @function apiEncaminharChamado
 * @description Workflow: Cliente -> Técnico.
 * * Esta rota é chamada quando o cliente diz "A IA não resolveu". 
 * Ela altera o status e joga o chamado na fila geral.
 */
export async function apiEncaminharChamado(id) {
    try {
        const response = await fetch(`${API_BASE}/chamados/escalar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                status_Cham: 'Em Andamento' // Trigger para aparecer na dashboard dos técnicos
            })
        });
        if (response.ok) {
            return await response.json();
        }

        let errorData = await response.json().catch(() => ({ error: 'Erro ao escalar chamado.' }));
        throw new Error(errorData.error || 'Erro ao encaminhar chamado para técnico.');

    } catch (error) {
        console.error('Erro API (Encaminhar):', error);
        throw error;
    }
}

/**
 * @function apiGetChamadoById
 * @description Busca detalhada de um único ticket.
 * * Usada na tela de detalhes para exibir histórico, conversas e soluções.
 */
export async function apiGetChamadoById(id) {
    if (!id) {
        throw new Error("ID do chamado é obrigatório.");
    }
    
    try {
        const response = await fetch(`${API_BASE}/chamados/${id}`, {
            credentials: 'include' 
        });

        if (response.ok) {
            return await response.json();
        }

        // Tratamento de erro para ID não existente (404) ou erro de servidor
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: `Erro HTTP ${response.status}: ${response.statusText}` };
        }

        const errorMessage = errorData.error || `Erro ${response.status} ao buscar o chamado ${id}.`;
        throw new Error(errorMessage);

    } catch (error) {
        console.error(`Erro API ao buscar chamado ${id}:`, error);
        throw error; 
    }
}

/**
 * @function apiFecharChamado
 * @description Workflow: Cliente -> Fechado.
 * * Ocorre quando o cliente confirma que a solução (da IA ou do Técnico) funcionou.
 */
export async function apiFecharChamado(chamadoId) {
    const response = await fetch(`${API_BASE}/chamados/fechar/${chamadoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida ao fechar o chamado.' }));
        throw new Error(errorData.error || 'Erro ao fechar o chamado via API.');
    }

    return response.json();
}

/**
 * @function apiReabrirChamado
 * @description Workflow: Fechado -> Aberto.
 * * Se o cliente não concordar com a solução ou o problema voltar,
 * esta função reseta o status e remove a atribuição do técnico anterior.
 */
export async function apiReabrirChamado(chamadoId) {
    const response = await fetch(`${API_BASE}/chamados/reabrir/${chamadoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida ao reabrir o chamado.' }));
        throw new Error(errorData.error || 'Erro ao reabrir o chamado via API.');
    }

    return response.json();
}

/**
 * @function apiConcordarSolucao
 * @description Registro de Feedback Positivo (NPS).
 * * Apenas registra que o cliente ficou feliz, sem alterar o status (que já deve estar fechado).
 */
export async function apiConcordarSolucao(chamadoId) {
    const response = await fetch(`${API_BASE}/chamados/concordar/${chamadoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida ao concordar com a solução.' }));
        throw new Error(errorData.error || 'Erro ao registrar concordância via API.');
    }

    return response.json();
}

/**
 * @function apiDeleteChamado
 * @description Exclusão Física (Admin).
 * * Operação sensível. O backend deve verificar se o usuário é realmente Admin antes de processar.
 */
export async function apiDeleteChamado(chamadoId) {
    if (!chamadoId) {
        throw new Error("ID do chamado é obrigatório para exclusão.");
    }
    
    try {
        const response = await fetch(`${API_BASE}/chamados/${chamadoId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (response.ok) {
            return { success: true, message: `Chamado ${chamadoId} excluído.` };
        }

        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            errorData.error = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Tratamento específico para erro de permissão (403)
        if (response.status === 403) {
             throw new Error("Acesso negado. Apenas Administradores podem excluir chamados.");
        }

        throw new Error(errorData.error || 'Erro ao tentar excluir chamado.');

    } catch (error) {
        console.error('Erro API (Delete):', error);
        throw error;
    }
}