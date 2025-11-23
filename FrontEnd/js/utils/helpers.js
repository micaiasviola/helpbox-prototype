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
    // 🚨 CORREÇÃO: Adicionado fallback para status nulo/undefined
    const lowerStatus = (status || '').toLowerCase();
    const cls = STATUS_MAP[lowerStatus] || '';
    return '<span class="badge ' + cls + '">' + (status || 'N/A') + '</span>';
}

/**
 * Converte código de prioridade em texto legível
 */
export function getPrioridadeTexto(prioridade) {
    // 💡 SUGESTÃO: Você importa PRIORIDADE_MAP, mas não usa. 
    // O ideal seria usar o Map importado.
    const priorityMap = {
        A: { text: 'Alta', class: 'danger' },
        M: { text: 'Média', class: 'warning' },
        B: { text: 'Baixa', class: 'success' }
    };
    const p = priorityMap[prioridade] || { text: prioridade, class: 'secondary' };

    return `<span class="badge ${p.class}">${p.text}</span>`;
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
        
        // Mantido o onclick original que funcionava para o layout
        return `${textoCurto} <button class="btn-mini" onclick="mostrarDescricaoCompleta('${chamadoId}')" title="Ver descrição completa"></button>`;
    }

    return descricao; // Retorna a descrição completa se for curta
}

export function mostrarDescricaoCompleta(chamadoId) {
    // 1. Tenta encontrar a instância correta (MeusChamadosView)
    // A ordem aqui é crítica: procuramos pela view específica primeiro!
    const activeView = window.meusChamadosView || window.chamadoManager; 
    
    // 🚨 Esta ORDEM é o que deve corrigir o bug do Técnico, 
    // mas precisamos ter certeza de que 'meusChamadosView' é a única ativa.
    
    if (!activeView) {
        alert("Erro: O gerenciador de chamados não foi inicializado.");
        return;
    }
    
    // O array de dados: 'chamados' (em MeusChamadosView) ou 'chamadosData' (em ChamadoManager)
    // Acessa o array da view ativa.
    const dataArray = activeView.chamados || activeView.chamadosData; 
    
    if (!dataArray || dataArray.length === 0) {
        alert("Dados do chamado não carregados.");
        return;
    }

    // 2. Encontra o objeto do chamado pelo ID
    // O '==' é mantido pois é como estava funcionando.
    const chamado = dataArray.find(c => c.id_Cham == chamadoId); 
    
    if (chamado && chamado.descricao_Cham) {
        alert(`Descrição Completa do Chamado #${chamadoId} (${chamado.titulo_Cham || ''}):\n\n${chamado.descricao_Cham}`);
    } else {
        alert("Descrição não encontrada nos dados carregados.");
    }
}

window.mostrarDescricaoCompleta = mostrarDescricaoCompleta;
window.renderDescricaoCurta = renderDescricaoCurta;