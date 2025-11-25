/**
 * @file detalhes-IA.js
 * @description View de Detalhes do Cliente (Foco em Autoatendimento).
 * * Diferente da tela do técnico, aqui o foco é a simplicidade e a validação.
 * * Eu desenhei este módulo para ser o ponto de contato principal do cliente com a IA.
 * O objetivo é tentar resolver o chamado aqui mesmo ("Shift-Left"), antes que ele chegue a um humano.
 * @author [Micaías Viola - Full Stack Developer]
 */

import {
    apiEncaminharChamado, apiGetChamadoById, apiFecharChamado,
    apiReabrirChamado, apiConcordarSolucao
} from "../api/chamados.js";
import { store } from "../store.js";
import { showConfirmationModal } from "../utils/feedbackmodal.js";
// Importo o 'marked' para renderizar o Markdown da IA (negrito, listas, código) como HTML seguro.
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

/**
 * @constant {Object} ICONS
 * @description Ícones Semânticos.
 * * Usei ícones que reforçam o significado da ação:
 * 'Send' para encaminhar (escalar), 'Check' para sucesso/concordar, 'CPU' para a IA.
 */
const ICONS = {
    arrowLeft: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    cpu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`,
    tool: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
};

/**
 * @function getClienteDetalheTemplate
 * @description Constrói o HTML da interface.
 * * A complexidade aqui está em decidir quais botões mostrar.
 * Eu uso um sistema de "blocos condicionais" para renderizar o Card de Ação correto
 * dependendo se o chamado está Aberto, Fechado ou em Andamento.
 */
function getClienteDetalheTemplate(chamado) {
    // --- VARIÁVEIS BÁSICAS ---
    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    const status = chamado.status_Cham;
    
    const statusClass = `status-${status.toLowerCase().replace(/\s+/g, '')}`;

    // Verifica se quem está vendo é o próprio técnico (edge case)
    const usuarioLogadoId = store.usuarioLogado?.id;
    const tecResponsavelId = chamado.tecResponsavel_Cham;
    const isTecResponsavel = usuarioLogadoId && (usuarioLogadoId === tecResponsavelId);

    // Parser de Markdown para HTML
    const solucaoIAHtml = chamado.solucaoIA_Cham 
        ? marked.parse(chamado.solucaoIA_Cham) 
        : "<em style='color:#999'>Aguardando análise ou sem resposta inicial da IA.</em>";

    // --- ESTILOS CSS (Scoped) ---
    const styles = `
        <style>
            /* Layout Grid Clean */
            .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .detail-item { display: flex; flex-direction: column; gap: 4px; }
            .detail-label { font-size: 0.75rem; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display:flex; align-items:center; gap:5px; }
            .detail-value { font-size: 0.95rem; color: #2d3748; font-weight: 500; }

            /* Badges */
            .badge-status { padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: inline-block; }
            .status-aberto { background: #e0f2f1; color: #00695c; }
            .status-emandamento { background: #e3f2fd; color: #1565c0; }
            .status-fechado { background: #ffebee; color: #c62828; }

            /* Boxes de Conteúdo (Destaque para IA vs Humano) */
            .content-box { 
                background-color: #f8f9fa; 
                border: 1px solid #e9ecef;
                border-radius: 6px; 
                padding: 20px; 
                margin-bottom: 25px; 
                font-family: 'Segoe UI', system-ui, sans-serif; 
            }
            /* Roxo para IA */
            .box-ia { border-left: 4px solid #6c5ce7; }
            /* Azul para Técnico */
            .box-tec { border-left: 4px solid #3b82f6; background-color: #eff6ff; }
            
            .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-size: 1.1rem; font-weight: 600; }
            
            /* Markdown Styling */
            .markdown-content { color: #2d3436; line-height: 1.6; font-size: 15px; }
            .markdown-content h3 { margin-top: 0; font-size: 1.1em; }
            .markdown-content ul { padding-left: 20px; }

            /* Action Card - Onde o usuário decide o futuro do chamado */
            .action-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin-top: 30px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .action-title { font-size: 1.1rem; font-weight: 600; color: #2d3748; margin-bottom: 10px; }
            .action-desc { color: #4a5568; margin-bottom: 20px; font-size: 0.95rem; }
            .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
            
            /* Botões Genéricos */
            .btn-icon-text { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500; }
        </style>
    `;

    // --- BLOCO: RESPOSTA DO TÉCNICO (Condicional) ---
    const solucaoTecnicoBlock = chamado.solucaoTec_Cham
        ? `
        <div class="section-header" style="color:#2563eb; margin-top: 30px;">
            ${ICONS.tool} Solução da Equipe Técnica
        </div>
        <div class="content-box box-tec">
            <div class="markdown-content" style="white-space: pre-wrap;">${chamado.solucaoTec_Cham}</div>
        </div>
        `
        : '';

    // --- BLOCO: LÓGICA DE DECISÃO (ACTION BUTTONS) ---
    let acoesClienteBlock = '';
    
    // Regra: Se fechado e não sou o técnico, posso avaliar ou reabrir.
    const deveMostrarFeedbackAposFechamento = status === 'Fechado' && !isTecResponsavel;

    if (deveMostrarFeedbackAposFechamento) {
        // Cenário 1: Feedback Pós-Fechamento
        acoesClienteBlock = `
            <div class="action-card">
                <div class="action-title">Validação Final</div>
                <p class="action-desc">O seu chamado foi fechado. A solução apresentada resolveu o seu problema?</p>
                
                <div class="action-buttons" id="feedbackActions">
                    <button id="btnConcordar" class="btn btn-primary btn-icon-text">
                        ${ICONS.check} Concordo (Manter Fechado)
                    </button>
                    <button id="btnReabrir" class="btn btn-secondary btn-icon-text">
                        ${ICONS.refresh} Reabrir Chamado
                    </button>
                </div>
                <div id="alertFeedback" style="margin-top:15px;"></div>
            </div>
        `;
    } else if (status !== 'Fechado' && status !== 'Em andamento') {
        // Cenário 2: Triagem Inicial (Aberto)
        // Se existe alguma solução proposta (IA ou Técnico), o cliente pode fechar.
        const podeFechar = chamado.solucaoIA_Cham || chamado.solucaoTec_Cham;
        // Se está aberto, pode mandar para um humano.
        const podeEncaminhar = status === 'Aberto'; 

        acoesClienteBlock = `
            <div class="action-card">
                <div class="action-title">O que deseja fazer?</div>
                <p class="action-desc">Analise a resposta automática acima. Se ela resolveu seu problema, você pode fechar o chamado agora.</p>
                
                <div class="action-buttons" id="validationActions">
                    ${podeFechar ? `
                        <button id="btnAceitar" class="btn btn-primary btn-icon-text">
                            ${ICONS.check} Resolvido (Fechar Chamado)
                        </button>` 
                    : ''}
                    
                    ${podeEncaminhar ? `
                        <button id="btnRejeitar" class="btn btn-secondary btn-icon-text">
                            ${ICONS.send} Não resolveu, enviar para Técnico
                        </button>` 
                    : ''}
                </div>
            </div>
        `;
    } 
    
    // --- TEMPLATE FINAL ---
    return `
    ${styles} 
    <div class="card" style="max-width: 900px; margin: 0 auto;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <button id="btnVoltar" class="btn btn-secondary btn-icon-text" style="padding: 6px 12px; font-size:0.9rem;">
                ${ICONS.arrowLeft} Voltar
            </button>
            <div style="color:#718096; font-size:0.9rem;">#${chamado.id_Cham}</div>
        </div>

        <h2 style="margin-top:0; color:#2d3748; margin-bottom: 20px;">Detalhes do Chamado</h2>
        
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Status</span>
                <div><span class="badge-status ${statusClass}">${chamado.status_Cham}</span></div>
            </div>
            <div class="detail-item">
                <span class="detail-label">${ICONS.user} Aberto por</span>
                <span class="detail-value">${nomeCliente}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">${ICONS.tag} Categoria</span>
                <span class="detail-value">${chamado.categoria_Cham}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">${ICONS.calendar} Data</span>
                <span class="detail-value">${dataAbertura}</span>
            </div>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 5px;">${chamado.titulo_Cham}</h3>
            <div style="color: #4a5568; line-height: 1.6; background: #fff; padding: 10px 0;">
                ${chamado.descricao_Cham}
            </div>
        </div>

        <div class="section-header" style="color:#6c5ce7;">
            ${ICONS.cpu} Resposta da Inteligência Artificial
        </div>
        <div class="content-box box-ia">
            <div id="iaResponseText" class="markdown-content">
                ${solucaoIAHtml}
            </div>
        </div>
        
        ${solucaoTecnicoBlock}
        
        ${acoesClienteBlock} 
    </div>
    <div id="alert" style="margin-top:15px; max-width: 900px; margin-left: auto; margin-right: auto;"></div>`;
}

/**
 * @class DetalhesIAView
 * @description Controlador da visualização para o cliente.
 */
export class DetalhesIAView {
    constructor(chamadoId) {
        this.chamadoId = chamadoId;
        this.container = document.getElementById('view')
    }

    /**
     * @method render
     * @description Busca os dados e renderiza o template.
     */
    async render() {
        this.container.innerHTML = `<div id="alert"></div><div class="loading">Carregando detalhes do chamado ${this.chamadoId}...</div>`;

        try {
            const chamado = await apiGetChamadoById(this.chamadoId);

            if (!chamado) {
                this.container.innerHTML = '<div class="card error">Chamado não encontrado.</div>';
                return;
            }

            this.container.innerHTML = getClienteDetalheTemplate(chamado);
            this.attachListeners(chamado.id_Cham);
        } catch (error) {
            this.container.innerHTML = `<div class="card error">Erro ao carregar detalhes: ${error.message}</div>`;
        }
    }

    /**
     * @method attachListeners
     * @description Conecta os eventos de clique aos botões gerados dinamicamente.
     * * Verifico se cada botão existe antes de adicionar o listener, pois nem todos
     * os botões são renderizados em todos os estados do chamado.
     */
    attachListeners(id) {
        document.getElementById('btnVoltar').addEventListener('click', () => this.voltarParaChamados());

        const btnRejeitar = document.getElementById('btnRejeitar'); // Encaminhar
        const btnAceitar = document.getElementById('btnAceitar'); // Fechar
        const btnConcordar = document.getElementById('btnConcordar'); // Feedback
        const btnReabrir = document.getElementById('btnReabrir'); // Reabrir

        if (btnRejeitar) {
            btnRejeitar.addEventListener('click', () => this.handleEncaminhar(id));
        }
        if (btnAceitar) {
            btnAceitar.addEventListener('click', () => this.handleFechar(id));
        }
        if (btnConcordar) {
            btnConcordar.addEventListener('click', () => this.handleConcordar(id));
        }
        if (btnReabrir) {
            btnReabrir.addEventListener('click', () => this.handleReabrir(id));
        }
    }

    // --- HANDLERS DE AÇÃO (Controladores de Fluxo) ---

    async handleEncaminhar(id) {
        // "Não resolveu": Manda para a fila dos técnicos
        const confirmed = await showConfirmationModal(
            "Encaminhar para Técnico", 
            "A resposta automática não resolveu? Deseja encaminhar este chamado para nossa equipe técnica?"
        );
        if (confirmed) this.encaminharChamado(id);
    }
    
    async handleFechar(id) {
        // "Resolveu": Fecha o ticket
        const confirmed = await showConfirmationModal(
            "Fechar Chamado", 
            "O chamado será marcado como resolvido e FECHADO. Você confirma?"
        );
        if (confirmed) this.fecharChamado(id);
    }

    async handleConcordar(id) {
        // Feedback positivo pós-fechamento
        const confirmed = await showConfirmationModal(
            "Confirmar Solução", 
            "Ficamos felizes em ajudar! Ao confirmar, você valida a solução e o chamado permanece fechado."
        );
        if (confirmed) this.concordarSolucao(id);
    }

    async handleReabrir(id) {
        // Feedback negativo pós-fechamento (Ticket volta pra fila)
        const confirmed = await showConfirmationModal(
            "Reabrir Chamado", 
            "O chamado retornará à fila de trabalho e um técnico será notificado. Confirma a reabertura?"
        );
        if (confirmed) this.reabrirChamado(id);
    }

    // --- MÉTODOS DE API ---

    async encaminharChamado(id) {
        this.showAlert('info', 'Encaminhando para técnico...');
        try {
            await apiEncaminharChamado(id);
            this.showAlert('success', 'Chamado encaminhado para a equipe técnica com sucesso.');
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            this.showAlert('error', `Falha ao encaminhar: ${error.message}`);
        }
    }

    async fecharChamado(id) {
        this.showAlert('info', 'Fechando chamado...');
        try {
            await apiFecharChamado(id);
            this.showAlert('success', 'Chamado validado e FECHADO com sucesso.');
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            this.showAlert('error', `Falha ao fechar: ${error.message}`);
        }
    }

    async concordarSolucao(id) {
        this.showAlert('info', 'Registrando feedback...');
        try {
            await apiConcordarSolucao(id);
            this.showAlert('success', 'Obrigado! Sua validação foi registrada.');
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            this.showAlert('error', `Erro ao registrar: ${error.message}`);
        }
    }

    async reabrirChamado(id) {
        this.showAlert('info', 'Reabrindo chamado...');
        try {
            await apiReabrirChamado(id);
            this.showAlert('warning', 'Chamado REABERTO. Um técnico irá analisar.');
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            this.showAlert('error', `Falha ao reabrir: ${error.message}`);
        }
    }

    showAlert(type, msg) {
        const el = document.getElementById('alert');
        if (el) el.innerHTML = `<div class="card ${type}">${msg}</div>`;
    }

    voltarParaChamados() {
        location.hash = '#/chamados';
    }
}

/**
 * @function iniciarDetalhesIA
 * @description Função Helper exportada para iniciar a view.
 * Atualiza a URL para permitir deep-linking (se o usuário der F5, volta pra cá).
 */
export function iniciarDetalhesIA(id) {
    location.hash = `#/chamados/detalhe/${id}`;
    const view = new DetalhesIAView(id);
    view.render();
}