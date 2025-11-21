// Configurações e constantes globais
const protocol = window.location.protocol; // http:
const host = window.location.hostname;     // 192.168.x.x
const port = 3000;                         // Sua porta do backend

export const API_BASE = `${protocol}//${host}:${port}`;
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