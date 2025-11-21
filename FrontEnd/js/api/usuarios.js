import { API_BASE } from '../utils/constants.js';

/**
 * Busca todos os usuários da API
 */
export async function apiGetUsuarios() {
    try {
        const response = await fetch(`${API_BASE}/usuarios`, {
            // ESSENCIAL: Garante que o cookie de sessão seja enviado com a requisição
            credentials: 'include' 
        }); 
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Erro ao buscar usuários');
    } catch (error) {
        console.error('Erro API:', error);
        return [];
    }
}

/**
 * Cria um novo usuário
 */
export async function apiCreateUsuario(dados) {
    try {
        const response = await fetch(`${API_BASE}/usuarios`, {
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
        throw new Error('Erro ao criar usuário');
    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

/**
 * Atualiza um usuário existente
 */
export async function apiUpdateUsuario(id, dados) {
    try {
        const response = await fetch(`${API_BASE}/usuarios/${id}`, {
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

        // 🚨 MELHORIA: Ler a mensagem de erro real do backend
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: response.statusText };
        }

        // Lança o erro com a mensagem específica (ex: "Nome é obrigatório")
        throw new Error(errorData.error || 'Erro desconhecido ao atualizar usuário');

    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

/**
 * Remove um usuário
 */
export async function apiDeleteUsuario(id) {
    try {
        const response = await fetch(`${API_BASE}/usuarios/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (response.ok) {
            return true;
        }
        throw new Error('Erro ao deletar usuário');
    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}