import { API_BASE } from '../utils/constants.js';

/**
 * Busca todos os chamados da API
 */
export async function apiGetChamados() {
    try {
        const response = await fetch(`${API_BASE}/chamados`, {
            credentials: 'include'
        });
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Erro ao buscar chamados');
    } catch (error) {
        console.error('Erro API:', error);
        return [];
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

        if (response.ok) {
            return await response.json();
        }

        // --- INÍCIO DO TRATAMENTO ROBUSTO DE ERRO ---
        // Tenta ler o corpo JSON da resposta de erro (onde o backend envia a mensagem)
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            // Se falhar ao ler JSON, assume que a resposta é texto simples ou vazia.
            errorData = { error: `Erro HTTP ${response.status}: ${response.statusText}` };
        }

        // Lança um novo erro com a mensagem do backend.
        // Se o backend enviou { error: "mensagem" }, usamos essa mensagem.
        const errorMessage = errorData.error || 'Ocorreu um erro desconhecido no servidor.';

        throw new Error(errorMessage);
        // --- FIM DO TRATAMENTO ROBUSTO DE ERRO ---

    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

/**
 * Busca os chamados do cliente logado pelo ID (ou confia na session/cookie)
 * @param {number} clienteId O ID do cliente logado.
 */
export async function apiGetMeusChamados(page = 1, pageSize = 5, q = '', status = '') { 
    try {
        let url = `${API_BASE}/chamados/meus?page=${page}&pageSize=${pageSize}`;
        
        if (q) {
            url += `&q=${encodeURIComponent(q)}`; 
        }
        
        if (status) {
            url += `&status=${encodeURIComponent(status)}`; 
        }

        const response = await fetch(url, {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }

        // Se a resposta não for OK, tenta pegar a mensagem de erro específica.
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

export async function apiGetChamadosTecnico() {
    try {
        // Nova rota específica para o Técnico
        const response = await fetch(`${API_BASE}/chamados/tecnico`, {
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
        
        throw new Error(errorData.error || 'Erro ao buscar chamados do técnico.');
        
    } catch (error) {
        console.error('Erro API (Chamados Técnico):', error);
        throw error;
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
                prioridade_Cham: 'M'
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