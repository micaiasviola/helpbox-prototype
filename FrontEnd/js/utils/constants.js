// Configurações e constantes globais

// Lógica Inteligente para definir a API:
// 1. Se estiver no seu PC (localhost), usa http://localhost:3000
// 2. Se estiver no Render (ou qualquer outro lugar), usa '' (vazio).
//    Isso faz o navegador usar o domínio atual automaticamente (ex: https://helpbox.onrender.com/api...)

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE = isLocalhost ? 'http://localhost:3000' : '';

export const YEAR = new Date().getFullYear();

// Mapeamentos
export const PRIORIDADE_MAP = {
    'A': 'Alta',
    'M': 'Média',
    'B': 'Baixa'
};

export const STATUS_MAP = {
    'aberto': 'open',
    'em andamento': 'progress',
    'fechado': 'done'
};

export const NIVEL_ACESSO_MAP = {
    '1': 'Baixo',
    '2': 'Médio',
    '3': 'Alto'
};