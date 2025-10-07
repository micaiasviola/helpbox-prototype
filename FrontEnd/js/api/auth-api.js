
import { API_BASE } from './constants.js';

export async function apiLogin(email, senha) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // ESSENCIAL: Permite que o servidor crie o cookie de sessão
            credentials: 'include', 
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Se o login for bem-sucedido, o cookie de sessão foi salvo no navegador.
            // O servidor também retorna o nível de acesso (data.nivel_acesso)
            return data;
        }
        
        // Se a resposta não for OK (ex: 401), lança o erro do backend
        throw new Error(data.error || 'Erro desconhecido no login');
    } catch (error) {
        console.error('Erro API Login:', error);
        throw error;
    }
}