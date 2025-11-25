/**
 * @file api/usuarios.js
 * @description Camada de Serviço para Usuários.
 * * Aqui eu centralizo toda a comunicação HTTP com o backend referente a usuários.
 * * Minha filosofia de design para APIs no frontend é: "O frontend deve ser burro sobre a rede".
 * As Views não devem saber o que é um 'fetch', headers ou status code 401. Elas apenas pedem dados e recebem objetos ou erros tratados.
 * @author [Micaías Viola - Full Stack Developer]
 */

import { API_BASE } from '../utils/constants.js';

/**
 * @function apiGetUsuarios
 * @description Busca a lista completa de usuários.
 * * @returns {Promise<Array>} Array de objetos de usuário.
 */
export async function apiGetUsuarios() {
    try {
        const response = await fetch(`${API_BASE}/usuarios`, {
            // 🚨 SEGURANÇA CRÍTICA: 'credentials: include'
            // Sem isso, o navegador NÃO envia os cookies de sessão (connect.sid) para o backend.
            // O servidor acharia que somos um usuário anônimo e retornaria 401 (Unauthorized).
            credentials: 'include' 
        }); 
        
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Erro ao buscar usuários');
    } catch (error) {
        console.error('Erro API:', error);
        // Retorno array vazio em vez de quebrar a tela, permitindo que a tabela renderize "Nenhum usuário"
        return [];
    }
}

/**
 * @function apiCreateUsuario
 * @description Cadastra um novo usuário.
 * * @param {Object} dados Objeto com nome, email, senha, etc.
 * * @returns {Promise<Object>} O usuário criado (incluindo o ID gerado pelo banco).
 */
export async function apiCreateUsuario(dados) {
    try {
        const response = await fetch(`${API_BASE}/usuarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Aviso ao backend que estou mandando JSON
            },
            credentials: 'include',
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            return await response.json();
        }
        
        // Tenta extrair erro específico do backend, se houver
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao criar usuário');
        
    } catch (error) {
        console.error('Erro API:', error);
        throw error; // Repasso o erro para que a View possa exibir um alert()
    }
}

/**
 * @function apiUpdateUsuario
 * @description Atualiza dados de um usuário existente.
 * * Aqui implementei um tratamento de erro mais sofisticado.
 * Se o backend recusar a atualização (ex: "Email já em uso"), eu capturo essa mensagem exata
 * e lanço o erro para que o usuário saiba exatamente o que corrigir no formulário.
 * * @param {number} id ID do usuário.
 * @param {Object} dados Dados a serem atualizados.
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

        // TRATAMENTO DE ERRO GRANULAR
        // O fetch não rejeita promessas em status 400 ou 500, então preciso verificar manualmente.
        let errorData;
        try {
            // Tento ler o JSON de erro que o backend mandou (ex: { error: "Senha muito curta" })
            errorData = await response.json();
        } catch (e) {
            // Se o backend quebrou feio e não mandou JSON, uso o texto padrão do HTTP
            errorData = { error: response.statusText };
        }

        // Lança o erro com a mensagem específica para ser mostrada no Modal
        throw new Error(errorData.error || 'Erro desconhecido ao atualizar usuário');

    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}

/**
 * @function apiDeleteUsuario
 * @description Remove um usuário do sistema.
 * * Operação destrutiva. Assim como no Update, preciso ler a resposta de erro caso falhe,
 * pois o backend pode impedir a exclusão (ex: "Não é possível excluir usuário que possui chamados abertos").
 * * @param {number} id ID do usuário a ser removido.
 * @returns {Promise<boolean>} True se sucesso.
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

        // Leitura de erro customizado do backend
        let errorMessage = 'Erro ao deletar usuário';
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (e) {
            // Falha silenciosa no parse do erro, mantém mensagem genérica
        }

        throw new Error(errorMessage);

    } catch (error) {
        console.error('Erro API:', error);
        throw error;
    }
}