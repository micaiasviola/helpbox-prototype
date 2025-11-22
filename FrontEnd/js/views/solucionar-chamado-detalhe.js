import { apiGetChamadoById, apiUpdateChamado } from "../api/chamados.js";
import { store } from "../store.js";
import { showConfirmationModal } from "../utils/feedbackmodal.js"; 
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

// --- ÍCONES SVG MODERNOS (Feather/Lucide) ---
const ICONS = {
    arrowLeft: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    save: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    cpu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`,
    tool: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

/**
 * Gera o HTML do template.
 * A decisão de 'isReadOnly' agora é feita antes de chamar esta função.
 */
function getSolucaoTemplate(chamado, isReadOnly) {
    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    
    const solucaoIAHtml = chamado.solucaoIA_Cham 
        ? marked.parse(chamado.solucaoIA_Cham) 
        : "<em style='color:#999'>Nenhuma resposta da IA registrada.</em>";

    // --- CSS Styles Inline ---
    const styles = `
        <style>
            /* Layout e Containers */
            .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .detail-item { display: flex; flex-direction: column; gap: 4px; }
            .detail-label { font-size: 0.75rem; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display:flex; align-items:center; gap:5px; }
            .detail-value { font-size: 0.95rem; color: #2d3748; font-weight: 500; }
            
            /* Box da IA */
            .ia-box { 
                background-color: #f8f9fa; 
                border: 1px solid #e9ecef;
                border-left: 4px solid #6c5ce7; 
                border-radius: 6px; 
                padding: 20px; 
                margin-bottom: 25px; 
                font-family: 'Segoe UI', system-ui, sans-serif; 
            }
            .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; color: #2d3748; font-size: 1.1rem; font-weight: 600; }
            
            /* Markdown Clean */
            .markdown-content { color: #2d3436; line-height: 1.6; font-size: 15px; }
            .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 15px; margin-bottom: 10px; font-weight: 600; }
            .markdown-content ul, .markdown-content ol { padding-left: 20px; margin-bottom: 15px; }
            .markdown-content li { margin-bottom: 4px; }
            
            /* Badges */
            .badge-status { padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: inline-block; }
            .status-aberto { background: #e0f2f1; color: #00695c; }
            .status-emandamento { background: #e3f2fd; color: #1565c0; }
            .status-fechado { background: #ffebee; color: #c62828; }
            
            .badge-prio { padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
            .prio-Alta { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            .prio-Media { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .prio-Baixa { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

            /* Buttons & Inputs */
            .btn-icon-text { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500; }
            .readonly-textarea { background-color: #f8f9fa; cursor: not-allowed; color: #6c757d; border-color: #e2e8f0; }
            .actions-bar { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
    `;

    // Configuração Visual baseada no modo
    const tituloTela = isReadOnly ? 'Visualizar Chamado' : 'Solucionar Chamado';
    const disabledAttr = isReadOnly ? 'disabled' : '';
    const textAreaClass = isReadOnly ? 'input readonly-textarea' : 'input';
    
    // Tratamento de Classes para Status e Prioridade
    const statusClass = `status-${chamado.status_Cham.toLowerCase().replace(/\s+/g, '')}`;
    const prioClass = `prio-${chamado.prioridade_Cham}`;

    const buttonsHtml = isReadOnly ? '' : `
        <div class="actions-bar">
            <button id="btnSalvarSolucao" class="btn btn-secondary btn-icon-text">
                ${ICONS.save} Salvar Rascunho
            </button>
            <button id="btnFinalizar" class="btn btn-primary btn-icon-text">
                ${ICONS.check} Finalizar Chamado
            </button>
        </div>
    `;

    const infoBanner = isReadOnly 
        ? `<div style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 20px; color: #1565c0; border: 1px solid #bbdefb; display:flex; align-items:center; gap: 10px;">
             ${ICONS.info}
             <div><strong>Apenas Leitura:</strong> Você não pode editar este chamado (Status: ${chamado.status_Cham}).</div>
           </div>` 
        : '';

    return `
    ${styles} 
    <div class="card" style="max-width: 900px; margin: 0 auto;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <button id="btnVoltar" class="btn btn-secondary btn-icon-text" style="padding: 6px 12px; font-size:0.9rem;">
                ${ICONS.arrowLeft} Voltar
            </button>
            <div style="color:#718096; font-size:0.9rem;">#${chamado.id_Cham}</div>
        </div>
        
        ${infoBanner}

        <h2 style="margin-top:0; color:#2d3748; margin-bottom: 20px;">${tituloTela}</h2>
        
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Status</span>
                <div><span class="badge-status ${statusClass}">${chamado.status_Cham}</span></div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Prioridade IA</span>
                <div><span class="badge-prio ${prioClass}">${chamado.prioridade_Cham || 'N/A'}</span></div>
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
        
        <div style="margin-bottom: 25px;">
            <h3 style="font-size: 1.1rem; color: #2d3748; margin-bottom: 5px;">${chamado.titulo_Cham}</h3>
            <div style="color: #4a5568; line-height: 1.6; background: #fff; padding: 10px 0;">
                ${chamado.descricao_Cham}
            </div>
        </div>

        <div class="section-header" style="color:#6c5ce7;">
            ${ICONS.cpu} Sugestão da IA
        </div>
        <div class="ia-box">
            <div class="markdown-content">${solucaoIAHtml}</div>
        </div>
        
        <div class="section-header">
            ${ICONS.tool} Solução do Técnico
        </div>
        <div id="alertSolucao" style="margin-bottom: 15px;"></div>
        
        <textarea id="solucaoTecnico" class="${textAreaClass}" rows="8" 
            style="line-height:1.5; padding: 12px;"
            placeholder="${isReadOnly ? 'Nenhuma solução registrada.' : 'Descreva detalhadamente a solução aplicada...'}" 
            ${disabledAttr}>${chamado.solucaoTec_Cham || ''}</textarea>
        
        ${buttonsHtml}
    </div>`;
}

export class SolucionarChamadoView {
    constructor(chamadoId) {
        this.chamadoId = chamadoId;
        this.container = document.getElementById('view');
        this.usuarioLogado = store.usuarioLogado; 
    }

    async render() {
        this.container.innerHTML = `<div id="alert"></div><div class="loading">Carregando detalhes do chamado #${this.chamadoId}...</div>`;

        try {
            const chamado = await apiGetChamadoById(this.chamadoId);

            if (!chamado) {
                this.container.innerHTML = '<div class="card error">Chamado não encontrado.</div>';
                return;
            }
            
            const meuId = Number(this.usuarioLogado?.id);
            const tecResponsavelId = Number(chamado.tecResponsavel_Cham);
            const status = chamado.status_Cham;

            let isEditable = false;

            // Só é editável se estiver "Em andamento" E o técnico for EU.
            if (status === 'Em andamento' && tecResponsavelId === meuId) {
                isEditable = true;
            }
            
            const isReadOnly = !isEditable;

            this.container.innerHTML = getSolucaoTemplate(chamado, isReadOnly);
            this.attachListeners(chamado.id_Cham, isReadOnly);

        } catch (error) {
            this.container.innerHTML = `<div class="card error">Erro ao carregar detalhes: ${error.message}</div>`;
            console.error(error);
        }
    }

    attachListeners(id, isReadOnly) {
        document.getElementById('btnVoltar').addEventListener('click', () => this.voltarParaChamados());
        
        if (isReadOnly) return;

        const btnSalvar = document.getElementById('btnSalvarSolucao');
        const btnFinalizar = document.getElementById('btnFinalizar');

        if (btnSalvar) {
            btnSalvar.addEventListener('click', (e) => {
                e.preventDefault();
                this.salvarRascunho(id);
            });
        }
        
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', (e) => {
                e.preventDefault();
                this.finalizarChamado(id);
            });
        }
    }
    
    async salvarRascunho(id) {
        const solucao = document.getElementById('solucaoTecnico').value;
        const alertDiv = document.getElementById('alertSolucao');

        const confirmar = await showConfirmationModal('Salvar Rascunho', 'Deseja atualizar o rascunho da solução?');
        if (!confirmar) return; 

        alertDiv.innerHTML = '<div class="card info">Salvando rascunho...</div>';
        try {
            await apiUpdateChamado(id, { solucaoTec_Cham: solucao });
            alertDiv.innerHTML = '<div class="card success">Rascunho salvo com sucesso!</div>';
            setTimeout(() => { alertDiv.innerHTML = ''; }, 3000);
        } catch (error) {
            alertDiv.innerHTML = `<div class="card error">Falha ao salvar: ${error.message}</div>`;
        }
    }

    async finalizarChamado(id) {
        const solucao = document.getElementById('solucaoTecnico').value;
        const alertDiv = document.getElementById('alertSolucao');
        
        if (!solucao.trim()) {
            alertDiv.innerHTML = '<div class="card error" style="background:#fff5f5; color:#c53030; border-left:4px solid #c53030; padding:10px;">⚠️ A solução é obrigatória para finalizar.</div>';
            return;
        }

        const confirmar = await showConfirmationModal(
            'Finalizar Chamado', 
            'Tem certeza que deseja finalizar este chamado? <b>Esta ação concluirá o atendimento.</b>'
        );
        if (!confirmar) return;

        alertDiv.innerHTML = '<div class="card info">Finalizando chamado...</div>';
        try {
            await apiUpdateChamado(id, {
                 status_Cham: 'Fechado',
                 solucaoTec_Cham: solucao,
                 solucaoFinal_Cham: solucao,
                 dataFechamento_Cham: new Date().toISOString()
            });
            alertDiv.innerHTML = '<div class="card success">✅ Chamado finalizado! Redirecionando...</div>';
            setTimeout(() => { this.voltarParaChamados(); }, 2000);
        } catch (error) {
            alertDiv.innerHTML = `<div class="card error">❌ Falha ao finalizar: ${error.message}</div>`;
        }
    }

    voltarParaChamados() {
        location.hash = '#/todos'; 
    }
}

// Função auxiliar exportada
export function iniciarSolucao(idChamado) { 
    if (!idChamado) {
        location.hash = '#/todos';
        return; 
    }
    
    if (!location.hash.includes(`#/solucao/${idChamado}`)) {
        location.hash = `#/solucao/${idChamado}`;
    }
    
    const view = new SolucionarChamadoView(idChamado);
    view.render();
}

window.iniciarSolucao = iniciarSolucao;