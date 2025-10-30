import { STATUS_MAP, PRIORIDADE_MAP } from './constants.js';


export const MAX_LENGTH = 50; // Limite de caracteres para a descrição na tabela


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
    const priorityMap = {
        A: { text: 'Alta', class: 'danger' },
        M: { text: 'Média', class: 'warning' },
        B: { text: 'Baixa', class: 'success' }
    };
    const p = priorityMap[prioridade] || { text: prioridade, class: 'secondary' };

    return `<span class="badge ${p.class}">${p.text}</span>`;
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

/**
 * Trunca a descrição do chamado e adiciona um botão para visualização completa.
 * @param {string} descricao O texto completo da descrição.
 * @param {number} chamadoId O ID do chamado.
 * @returns {string} O HTML com a descrição truncada e o botão, ou a descrição completa.
 */
export function renderDescricaoCurta(descricao, chamadoId) {
    if (!descricao) {
        return 'Nenhuma descrição.';
    }

    if (descricao.length > MAX_LENGTH) {
        // Trunca o texto e adiciona o botão "+"
        const textoCurto = descricao.substring(0, MAX_LENGTH) + '...';
        
        // Usamos onclick para chamar a nova função que mostrará o texto completo
        return `${textoCurto} <button class="btn-mini" onclick="mostrarDescricaoCompleta('${chamadoId}')" title="Ver descrição completa">+</button>`;
    }

    return descricao; // Retorna a descrição completa se for curta
}

export function mostrarDescricaoCompleta(chamadoId) {
    // 1. 🚨 CORREÇÃO PRINCIPAL: Tenta encontrar a instância ativa (Manager ou View)
    const activeView = window.chamadoManager || window.meusChamadosView;
    
    if (!activeView) {
        alert("Erro: O gerenciador de chamados não foi inicializado.");
        return;
    }
    
    // O array de dados pode ser 'chamadosData' (em ChamadoManager) ou 'chamados' (em MeusChamadosView)
    // Vamos padronizar para procurar 'chamadosData' primeiro, mas fallback para 'chamados'
    const dataArray = activeView.chamadosData || activeView.chamados;
    
    if (!dataArray || dataArray.length === 0) {
        alert("Dados do chamado não carregados.");
        return;
    }

    // 2. Encontra o objeto do chamado pelo ID
    const chamado = dataArray.find(c => c.id_Cham == chamadoId); 
    
    if (chamado && chamado.descricao_Cham) {
        alert(`Descrição Completa do Chamado #${chamadoId} (${chamado.titulo_Cham || ''}):\n\n${chamado.descricao_Cham}`);
    } else {
        alert("Descrição não encontrada nos dados carregados.");
    }
}

window.mostrarDescricaoCompleta = mostrarDescricaoCompleta;
window.renderDescricaoCurta = renderDescricaoCurta;