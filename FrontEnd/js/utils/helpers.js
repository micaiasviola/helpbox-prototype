import { STATUS_MAP, PRIORIDADE_MAP } from './constants.js';

/**
 * Formata uma data para o formato brasileiro
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

/**
 * Gera um badge colorido para o status do chamado
 */
export function renderBadge(status) {
    const cls = STATUS_MAP[status.toLowerCase()] || '';
    return '<span class="badge ' + cls + '">' + status + '</span>';
}

/**
 * Converte código de prioridade em texto legível
 */
export function getPrioridadeTexto(prioridade) {
    return PRIORIDADE_MAP[prioridade] || prioridade;
}

/**
 * Aplica a cor de destaque selecionada na interface
 */
export function applyAccent(color) {
    document.documentElement.style.setProperty('--primary', color);
    const primaryElements = document.querySelectorAll('.btn:not(.ghost), .badge, .menu-item.active');
    primaryElements.forEach(el => {
        el.style.backgroundColor = color;
        if (el.classList.contains('menu-item')) el.style.borderLeftColor = color;
    });
}