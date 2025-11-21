import { API_BASE } from '../utils/constants.js';

/**
 * Busca todos os chamados da API
 */
export async function apiGetChamados(page = 1, pageSize = 5, q = '', status = '') { 
    try {
        let url = `${API_BASE}/chamados?page=${page}&pageSize=${pageSize}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        
        const response = await fetch(url, { credentials: 'include' });
        
        if (response.ok) {
            // Retorna o objeto paginado { chamados: [...], totalCount: N }
            return await response.json(); 
        }
        throw new Error('Erro ao buscar todos os chamados (Admin)');
    } catch (error) {
        console.error('Erro API:', error);
        // Retorna um objeto vazio que o frontend sabe como tratar
        return { chamados: [], totalCount: 0 }; 
    }
}

/**
 * Atualiza um chamado específico na API
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
 * Cria um novo chamado
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

        // Se deu certo (200/201)
        if (response.ok) {
            return await response.json();
        }

        // --- TRATAMENTO DE ERRO ROBUSTO ---
        let errorMessage = 'Erro desconhecido no servidor.';
        
        // 1. Tenta ler o corpo da resposta como texto primeiro
        const textData = await response.text();
        
        if (textData) {
            try {
                // 2. Tenta converter para JSON
                const jsonData = JSON.parse(textData);
                errorMessage = jsonData.error || jsonData.message || JSON.stringify(jsonData);
            } catch (e) {
                // 3. Se não for JSON, usa o texto puro (ex: erro de HTML ou texto do SQL)
                errorMessage = textData; 
            }
        } else {
            errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);

    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

export async function apiGetMeusChamados(page = 1, pageSize = 5, q = '', status = '', tipo = '') { 
    try {
        // Monta a URL base
        let url = `${API_BASE}/chamados/meus?page=${page}&pageSize=${pageSize}`;
        
        if (q) {
            url += `&q=${encodeURIComponent(q)}`; 
        }
        
        if (status) {
            url += `&status=${encodeURIComponent(status)}`; 
        }

        // 🚨 A CORREÇÃO ESTÁ AQUI:
        // Verifica se 'tipo' foi passado e adiciona na URL para o Backend receber
        if (tipo) {
            url += `&tipo=${encodeURIComponent(tipo)}`;
        }

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

export async function apiGetChamadosTecnico(page = 1, pageSize = 5, q = '', status = '') { 
    try {
        // Monta a URL base
        let url = `${API_BASE}/chamados/tecnico?page=${page}&pageSize=${pageSize}`;
        
        // 🚨 CORREÇÃO: Agora adicionamos os parâmetros na URL
        if (q) {
            url += `&q=${encodeURIComponent(q)}`;
        }
        
        if (status) {
            url += `&status=${encodeURIComponent(status)}`;
        }
        
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
 * Encaminha um chamado do status aberto (ia) para em andamento (tecnico)
 * @param {number} id O ID do chamado.
 */

export async function apiEncaminharChamado(id) {
    try {
        const response = await fetch(`${API_BASE}/chamados/escalar/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                status_Cham: 'Em Andamento',
                // prioridade_Cham: 'M'
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
 * Busca um chamado específico por ID na API
 * @param {number} id O ID do chamado a ser buscado.
 */
export async function apiGetChamadoById(id) {
    // 1. Validação simples para garantir que o ID não está vazio
    if (!id) {
        throw new Error("ID do chamado é obrigatório.");
    }
    
    try {
        // 2. Monta a URL com o ID: /chamados/123
        const response = await fetch(`${API_BASE}/chamados/${id}`, {
            // Credentials 'include' é crucial para enviar cookies de sessão, se necessário
            credentials: 'include' 
        });

        if (response.ok) {
            // 3. Retorna os dados do chamado encontrado
            return await response.json();
        }

        // Se a resposta não for 200 OK (ex: 404 Not Found, 500 Internal Error)
        
        // Tenta ler o corpo JSON da resposta de erro (como você já faz em outras funções)
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            // Se falhar, usa a mensagem padrão HTTP
            errorData = { error: `Erro HTTP ${response.status}: ${response.statusText}` };
        }

        // Lança um erro com a mensagem do backend
        const errorMessage = errorData.error || `Erro ${response.status} ao buscar o chamado ${id}.`;
        
        throw new Error(errorMessage);

    } catch (error) {
        console.error(`Erro API ao buscar chamado ${id}:`, error);
        // Relança o erro para que o componente/hook que chamou possa tratá-lo
        throw error; 
    }
}

/**
 * [Ação do Cliente] Envia um PATCH para fechar o chamado após validação do cliente.
 * Corresponde à rota PUT /fechar/:id no backend.
 */
export async function apiFecharChamado(chamadoId) {
    const response = await fetch(`${API_BASE}/chamados/fechar/${chamadoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        // Tenta ler a mensagem de erro do backend, se houver
        const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida ao fechar o chamado.' }));
        throw new Error(errorData.error || 'Erro ao fechar o chamado via API.');
    }

    // Retorna a confirmação de sucesso
    return response.json();
}

/**
 * [Ação do Cliente] Envia um PATCH para reabrir o chamado, alterando o status para 'Aberto' e removendo o técnico.
 * Corresponde à rota PUT /reabrir/:id no backend.
 */
export async function apiReabrirChamado(chamadoId) {
    const response = await fetch(`${API_BASE}/chamados/reabrir/${chamadoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida ao reabrir o chamado.' }));
        throw new Error(errorData.error || 'Erro ao reabrir o chamado via API.');
    }

    return response.json();
}

/**
 * [Ação do Cliente] Envia um PATCH para registrar a concordância do cliente com a solução final (mantendo o status 'Fechado').
 * Corresponde à rota PUT /concordar/:id no backend.
 */
export async function apiConcordarSolucao(chamadoId) {
    const response = await fetch(`${API_BASE}/chamados/concordar/${chamadoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida ao concordar com a solução.' }));
        throw new Error(errorData.error || 'Erro ao registrar concordância via API.');
    }

    return response.json();
}

/**
 * EXCLUSÃO [Ação do ADM] Envia um DELETE para remover o chamado permanentemente.
 * Corresponde à rota DELETE /:id no backend (que deve ser protegida por verificarAdm).
 * @param {number} chamadoId O ID do chamado a ser excluído.
 */
export async function apiDeleteChamado(chamadoId) {
    if (!chamadoId) {
        throw new Error("ID do chamado é obrigatório para exclusão.");
    }
    
    try {
        const response = await fetch(`${API_BASE}/chamados/${chamadoId}`, {
            method: 'DELETE', // Método DELETE para exclusão
            credentials: 'include',
        });

        if (response.ok) {
            // 200 OK ou 204 No Content (dependendo do seu backend, assumimos sucesso)
            return { success: true, message: `Chamado ${chamadoId} excluído.` };
        }

        // Se a resposta não for OK, tenta pegar a mensagem de erro específica.
        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            errorData.error = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Se a API retornar 403, a mensagem de erro deve refletir a falha de autorização.
        if (response.status === 403) {
             throw new Error("Acesso negado. Apenas Administradores podem excluir chamados.");
        }

        throw new Error(errorData.error || 'Erro ao tentar excluir chamado.');

    } catch (error) {
        console.error('Erro API (Delete):', error);
        throw error;
    }
}