// Configurações e constantes globais
export const API_BASE = 'http://localhost:3000';
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