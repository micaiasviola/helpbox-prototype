/**
 * @file helpers.js
 * @description Utilitários de Formatação e UX.
 * * Este é o meu "canivete suíço". Aqui concentro toda a lógica repetitiva de transformação de dados.
 * * Decisão de Arquitetura: Optei por funções puras que retornam Strings HTML. 
 * Isso permite que eu use esses helpers dentro de Template Strings (``) em qualquer 
 * outra View do sistema sem precisar importar componentes pesados.
 * @author [Micaías Viola - Full Stack Developer]
 */

import { STATUS_MAP, PRIORIDADE_MAP } from './constants.js';

/**
 * @constant {number} MAX_LENGTH
 * @description Limite de caracteres para a visualização prévia na tabela.
 * Escolhi 50 caracteres pois é o suficiente para dar contexto sem quebrar o layout em telas menores.
 */
export const MAX_LENGTH = 50; 

/**
 * @function formatDate
 * @description Padronização de Datas.
 * * O JavaScript tende a usar o formato americano por padrão. Aqui forço o padrão PT-BR.
 * * Tratamento de Erro: Se a data vier nula do banco (comum em campos opcionais como 'dataFechamento'),
 * retorno 'N/A' para não quebrar a interface visualmente.
 * @param {string} dateString String de data ISO ou similar.
 * @returns {string} Data formatada (dd/mm/aaaa) ou 'N/A'.
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

/**
 * @function renderBadge
 * @description Fábrica de Badges de Status.
 * * Em vez de encher as Views com if/else para decidir a cor do status (Aberto = Verde, Fechado = Vermelho),
 * centralizei essa lógica aqui. Se eu quiser mudar a cor de "Em andamento" no futuro, mudo só aqui.
 * @param {string} status O status do chamado (ex: 'Aberto').
 * @returns {string} HTML do badge.
 */
export function renderBadge(status) {
    // Normalização: Garanto que null ou undefined virem string vazia para evitar erros no toLowerCase()
    const lowerStatus = (status || '').toLowerCase().trim();
    
    // O STATUS_MAP (importado) contém as classes CSS.
    // Se o status não existir no mapa, uso uma classe padrão (fallback).
    const cls = STATUS_MAP[lowerStatus] || 'secondary';
    
    return `<span class="badge ${cls}">${status || 'N/A'}</span>`;
}

/**
 * @function getPrioridadeTexto
 * @description Tradutor de Códigos de Prioridade.
 * * O banco de dados salva 'A', 'M', 'B' para economizar espaço. 
 * Esta função traduz isso para 'Alta', 'Média', 'Baixa' e aplica a cor semântica correta.
 * @param {string} prioridade Código da prioridade ('A', 'M', 'B').
 * @returns {string} HTML do badge de prioridade.
 */
export function getPrioridadeTexto(prioridade) {
    // Mapa local para mapear Código -> Texto e Classe CSS
    const priorityMap = {
        'A': { text: 'Alta', class: 'danger' },
        'M': { text: 'Média', class: 'warning' },
        'B': { text: 'Baixa', class: 'success' }
    };

    // Fallback seguro: Se vier um código desconhecido, mostro ele mesmo em cinza.
    const p = priorityMap[prioridade] || { text: prioridade || 'N/A', class: 'secondary' };

    return `<span class="badge ${p.class}">${p.text}</span>`;
}

/**
 * @function renderDescricaoCurta
 * @description Lógica de "Ver Mais" para textos longos.
 * * Problema: Descrições gigantes quebram a tabela.
 * * Solução: Trunco o texto se ele passar do limite e adiciono um botão interativo.
 * * Decisão de UX: O botão chama `mostrarDescricaoCompleta` globalmente para abrir um alerta/modal rápido.
 * @param {string} descricao O texto completo.
 * @param {number} chamadoId O ID para buscar os dados completos se necessário.
 * @returns {string} HTML seguro para inserção.
 */
export function renderDescricaoCurta(descricao, chamadoId) {
    if (!descricao) {
        return '<span style="color:#ccc; font-style:italic">Sem descrição.</span>';
    }

    if (descricao.length > MAX_LENGTH) {
        const textoCurto = descricao.substring(0, MAX_LENGTH) + '...';
        
        // O botão usa onclick inline apontando para a função exposta no window (veja o final do arquivo).
        // Usei 'btn-mini' para ele ser discreto na tabela.
        return `${textoCurto} <button class="btn-mini" onclick="mostrarDescricaoCompleta('${chamadoId}')" title="Ler tudo"></button>`;
    }

    return descricao; 
}

/**
 * @function mostrarDescricaoCompleta
 * @description Handler do botão "Ver Mais".
 * * Esta função precisa ser esperta: ela tem que descobrir qual tela está ativa (Meus Chamados ou Todos)
 * para buscar os dados no lugar certo, já que não temos um Redux/Store global complexo.
 * @param {number|string} chamadoId ID do chamado clicado.
 */
export function mostrarDescricaoCompleta(chamadoId) {
    // 1. Detecção de Contexto
    // Tento achar qual gerenciador está ativo na janela global.
    const activeView = window.meusChamadosView || window.chamadoManager; 
    
    if (!activeView) {
        console.error("Erro: Nenhum gerenciador de view ativo encontrado.");
        alert("Não foi possível carregar os detalhes. Tente recarregar a página.");
        return;
    }
    
    // 2. Unificação de Fonte de Dados
    // 'chamados' é usado em MeusChamadosView, 'chamadosData' em ChamadoManager.
    // O operador || (OU) resolve isso elegantemente.
    const dataArray = activeView.chamados || activeView.chamadosData; 
    
    if (!dataArray || dataArray.length === 0) {
        alert("Dados ainda estão carregando. Aguarde um momento.");
        return;
    }

    // 3. Busca Local (Otimização)
    // Em vez de bater na API de novo (GET /chamado/id), busco no array que já está na memória RAM.
    // Uso '==' para permitir comparação entre string "10" e number 10.
    const chamado = dataArray.find(c => c.id_Cham == chamadoId); 
    
    if (chamado && chamado.descricao_Cham) {
        // UX Simples: Um alert nativo resolve o problema sem precisar criar um modal DOM complexo para isso.
        // Em um app maior, substituiríamos por um Dialog customizado.
        alert(`📄 Descrição Completa #${chamadoId}\n\n${chamado.descricao_Cham}`);
    } else {
        alert("Descrição não disponível.");
    }
}


// Necessário porque o HTML retornado por `renderDescricaoCurta` é injetado como string
// e o navegador precisa encontrar essas funções no escopo 'window' ao clicar.
window.mostrarDescricaoCompleta = mostrarDescricaoCompleta;
window.renderDescricaoCurta = renderDescricaoCurta;