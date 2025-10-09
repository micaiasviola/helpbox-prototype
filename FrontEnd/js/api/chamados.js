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