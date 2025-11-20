import { apiGetChamadoById, apiUpdateChamado } from "../api/chamados.js";
import { store } from "../store.js";
import { showConfirmationModal } from "../utils/feedbackmodal.js"; 
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

/**
 * Gera o HTML do template.
 * A decisão de 'isReadOnly' agora é feita antes de chamar esta função.
 */
function getSolucaoTemplate(chamado, isReadOnly) {
    // --- CSS Styles ---
    const styles = `
        <style>
            .ia-box { background-color: #f8f9fa; border-left: 5px solid #6c5ce7; border-radius: 4px; padding: 20px; margin-bottom: 20px; font-family: 'Segoe UI', system-ui, sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .markdown-content { color: #2d3436; line-height: 1.6; font-size: 15px; }
            .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 15px; margin-bottom: 10px; color: #2d3436; font-weight: 600; }
            .markdown-content h3:first-child { margin-top: 0; }
            .markdown-content ul, .markdown-content ol { padding-left: 25px; margin-bottom: 15px; }
            .markdown-content li { margin-bottom: 5px; }
            .markdown-content strong { color: #000; font-weight: 700; }
            .badge-prioridade.A { background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; }
            .badge-prioridade.M { background-color: #ffc107; color: black; padding: 2px 8px; border-radius: 4px; }
            .badge-prioridade.B { background-color: #198754; color: white; padding: 2px 8px; border-radius: 4px; }
            /* Estilo para ReadOnly */
            .readonly-textarea { background-color: #e9ecef; cursor: not-allowed; color: #6c757d; }
        </style>
    `;

    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    
    const solucaoIAHtml = chamado.solucaoIA_Cham 
        ? marked.parse(chamado.solucaoIA_Cham) 
        : "<em>Nenhuma resposta da IA registrada.</em>";

    // Configuração Visual baseada no modo
    const tituloTela = isReadOnly ? 'Visualizar Chamado' : 'Solucionar Chamado';
    const disabledAttr = isReadOnly ? 'disabled' : '';
    const textAreaClass = isReadOnly ? 'input readonly-textarea' : 'input';
    
    // Botões de ação (Salvar/Finalizar) somem se for apenas leitura
    const buttonsHtml = isReadOnly ? '' : `
        <div class="actions" style="margin-top: 20px;">
            <button id="btnSalvarSolucao" class="btn btn-success">💾 Salvar Rascunho</button>
            <button id="btnFinalizar" class="btn btn-danger">✓ Finalizar Chamado</button>
        </div>
    `;

    // Faixa informativa
    const infoBanner = isReadOnly 
        ? `<div class="alert alert-info" style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 15px; color: #0d47a1; border: 1px solid #b3e5fc;">
             👁️ <strong>Modo de Visualização:</strong> Você não pode editar este chamado no momento (Status: ${chamado.status_Cham}).
           </div>` 
        : '';

    return `
    ${styles} 
    <div class="card">
        <div class="actions" style="margin-bottom: 20px;">
            <button id="btnVoltar" class="btn btn-secondary">← Voltar para Lista</button>
        </div>
        
        ${infoBanner}

        <h2>${tituloTela} #${chamado.id_Cham}</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <p><strong>Status:</strong> <span class="badge ${chamado.status_Cham.toLowerCase()}">${chamado.status_Cham}</span></p>
            <p><strong>Prioridade IA:</strong> <span class="badge-prioridade ${chamado.prioridade_Cham}">${chamado.prioridade_Cham || 'N/A'}</span></p>
            <p><strong>Aberto por:</strong> ${nomeCliente}</p>
            <p><strong>Categoria:</strong> ${chamado.categoria_Cham}</p>
            <p><strong>Data:</strong> ${dataAbertura}</p>
        </div>
        
        <p><strong>Assunto:</strong> ${chamado.titulo_Cham}</p>
        <p><strong>Descrição:</strong><br/> ${chamado.descricao_Cham}</p>
        <hr/>

        <h3>🤖 Sugestão da IA</h3>
        <div class="ia-box">
            <div class="markdown-content">${solucaoIAHtml}</div>
        </div>
        
        <hr/>
        
        <h3>🛠️ Solução do Técnico</h3>
        <div id="alertSolucao" style="margin-bottom: 15px;"></div>
        
        <textarea id="solucaoTecnico" class="${textAreaClass}" rows="6" 
            placeholder="${isReadOnly ? 'Nenhuma solução registrada ou acesso apenas leitura.' : 'Descreva a solução aplicada...'}" 
            ${disabledAttr}>${chamado.solucaoTec_Cham || ''}</textarea>
        
        ${buttonsHtml}
    </div>`;
}

export class SolucionarChamadoView {
    constructor(chamadoId) {
        this.chamadoId = chamadoId;
        this.container = document.getElementById('view');
        // Pegamos o usuário aqui para garantir dados atualizados
        this.usuarioLogado = store.usuarioLogado; 
    }

    async render() {
        this.container.innerHTML = `<div id="alert"></div><div class="card loading">Carregando detalhes do chamado #${this.chamadoId}...</div>`;

        try {
            const chamado = await apiGetChamadoById(this.chamadoId);

            if (!chamado) {
                this.container.innerHTML = '<div class="card error">Chamado não encontrado.</div>';
                return;
            }
            
            // =========================================================
            // LÓGICA CENTRAL DE PERMISSÃO (Onde a mágica acontece)
            // =========================================================
            const meuId = Number(this.usuarioLogado?.id);
            const tecResponsavelId = Number(chamado.tecResponsavel_Cham);
            const status = chamado.status_Cham;

            let isEditable = false;

            // Só é editável se estiver "Em andamento" E o técnico for EU.
            if (status === 'Em andamento' && tecResponsavelId === meuId) {
                isEditable = true;
            }
            
            // Se estiver Fechado ou Aberto, ou com outro técnico -> ReadOnly
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
        
        // Se for apenas leitura, não adicionamos listeners de salvar
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
            alertDiv.innerHTML = '<div class="card error">A solução é obrigatória para finalizar.</div>';
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
        // Ao mudar o hash, o router provavelmente vai chamar essa função de novo
        // ou recriar a view, mas agora a lógica interna da view garante a segurança.
    }
    
    const view = new SolucionarChamadoView(idChamado);
    view.render();
}

window.iniciarSolucao = iniciarSolucao;