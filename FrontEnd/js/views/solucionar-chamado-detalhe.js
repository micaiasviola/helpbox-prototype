import { apiGetChamadoById, apiUpdateChamado } from "../api/chamados.js";
import { store } from "../store.js";
import { showConfirmationModal } from "../utils/feedbackmodal.js"; 
// 1. Importando a biblioteca para formatar o texto
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

function getSolucaoTemplate(chamado) {
    // -----------------------------------------------------------------
    // BLOCO 0: ESTILOS CSS (Para formatar a resposta da IA)
    // -----------------------------------------------------------------
    const styles = `
        <style>
            /* Estilo do container da IA */
            .ia-box {
                background-color: #f8f9fa;
                border-left: 5px solid #6c5ce7; /* Roxo destaque */
                border-radius: 4px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                margin-bottom: 20px;
                font-family: 'Segoe UI', system-ui, sans-serif;
            }

            /* Estilo do conteúdo Markdown convertido */
            .markdown-content {
                color: #2d3436;
                line-height: 1.6;
                font-size: 15px;
            }

            /* Títulos */
            .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                margin-top: 15px; 
                margin-bottom: 10px;
                color: #2d3436;
                font-weight: 600;
            }
            .markdown-content h3:first-child { margin-top: 0; }

            /* Listas */
            .markdown-content ul, .markdown-content ol {
                padding-left: 25px;
                margin-bottom: 15px;
            }
            .markdown-content li {
                margin-bottom: 5px;
            }

            /* Negrito */
            .markdown-content strong {
                color: #000;
                font-weight: 700;
            }
            
            /* Badge de prioridade se quiser exibir */
            .badge-prioridade.A { background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; }
            .badge-prioridade.M { background-color: #ffc107; color: black; padding: 2px 8px; border-radius: 4px; }
            .badge-prioridade.B { background-color: #198754; color: white; padding: 2px 8px; border-radius: 4px; }
        </style>
    `;

    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    const nomeAbertoPor = nomeCliente.trim();
    
    // 2. CONVERSÃO DO MARKDOWN PARA HTML
    const solucaoIAHtml = chamado.solucaoIA_Cham 
        ? marked.parse(chamado.solucaoIA_Cham) 
        : "<em>Nenhuma resposta da IA registrada.</em>";

    return `
    ${styles} <div class="card">
        <div class="actions" style="margin-bottom: 20px;">
            <button id="btnVoltar" class="btn btn-secondary">
                ← Voltar para Solucionar Chamados
            </button>
        </div>
        <h2>Solucionar Chamado #${chamado.id_Cham}</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <p><strong>Status:</strong> <span class="badge ${chamado.status_Cham.toLowerCase()}">${chamado.status_Cham}</span></p>
            <p><strong>Prioridade IA:</strong> <span class="badge-prioridade ${chamado.prioridade_Cham}">${chamado.prioridade_Cham || 'N/A'}</span></p>
            <p><strong>Aberto por:</strong> ${nomeAbertoPor}</p>
            <p><strong>Categoria:</strong> ${chamado.categoria_Cham}</p>
            <p><strong>Data:</strong> ${dataAbertura}</p>
        </div>
        
        <p><strong>Assunto:</strong> ${chamado.titulo_Cham}</p>
        <p><strong>Descrição:</strong><br/> ${chamado.descricao_Cham}</p>
        <hr/>

        <h3>🤖 Sugestão da IA (Encaminhada pelo Cliente)</h3>
        
        <div class="ia-box">
            <div class="markdown-content">
                ${solucaoIAHtml}
            </div>
        </div>
        
        <hr/>
        
        <h3>🛠️ Solução do Técnico</h3>
        <div id="alertSolucao" style="margin-bottom: 15px;"></div>
        <textarea id="solucaoTecnico" class="input" rows="6" 
            placeholder="Descreva a solução aplicada (obrigatório para fechar o chamado)">${chamado.solucaoTec_Cham || ''}</textarea>
        
        <div class="actions" style="margin-top: 20px;">
            <button id="btnSalvarSolucao" class="btn btn-success">💾 Salvar Rascunho</button>
            <button id="btnFinalizar" class="btn btn-danger">✓ Finalizar Chamado</button>
        </div>
    </div>`;
}

export class SolucionarChamadoView {
    constructor(chamadoId) {
        this.chamadoId = chamadoId;
        this.container = document.getElementById('view');
    }

    async render() {
        this.container.innerHTML = `<div id="alert"></div><div class="card loading">Carregando detalhes do chamado #${this.chamadoId}...</div>`;

        try {
            const chamado = await apiGetChamadoById(this.chamadoId);

            if (!chamado) {
                this.container.innerHTML = '<div class="card error">Chamado não encontrado.</div>';
                return;
            }
            
            if (chamado.status_Cham === 'Fechado') {
                 this.container.innerHTML = `<div class="card">Chamado #${this.chamadoId} Fechado. Solução Final: ${chamado.solucaoFinal_Cham || chamado.solucaoTec_Cham}</div>`;
                 return;
            }

            this.container.innerHTML = getSolucaoTemplate(chamado);
            this.attachListeners(chamado.id_Cham);

        } catch (error) {
            this.container.innerHTML = `<div class="card error">Erro ao carregar detalhes: ${error.message}</div>`;
            console.error(error);
        }
    }

    attachListeners(id) {
        document.getElementById('btnVoltar').addEventListener('click', () => this.voltarParaChamados());
        
        // Adicionamos preventDefault por segurança
        document.getElementById('btnSalvarSolucao').addEventListener('click', (e) => {
            e.preventDefault();
            this.salvarRascunho(id);
        });
        
        document.getElementById('btnFinalizar').addEventListener('click', (e) => {
            e.preventDefault();
            this.finalizarChamado(id);
        });
    }
    
    async salvarRascunho(id) {
        const solucao = document.getElementById('solucaoTecnico').value;
        const alertDiv = document.getElementById('alertSolucao');

        // Confirmação para Salvar Rascunho
        const confirmar = await showConfirmationModal(
            'Salvar Rascunho', 
            'Deseja atualizar o rascunho da solução?'
        );

        if (!confirmar) return; 

        alertDiv.innerHTML = '<div class="card info">Salvando rascunho...</div>';
        try {
            await apiUpdateChamado(id, { solucaoTec_Cham: solucao });
            alertDiv.innerHTML = '<div class="card success">Rascunho salvo com sucesso!</div>';
            setTimeout(() => { alertDiv.innerHTML = ''; }, 3000);
        } catch (error) {
            alertDiv.innerHTML = `<div class="card error">Falha ao salvar rascunho: ${error.message}</div>`;
        }
    }

    async finalizarChamado(id) {
        const solucao = document.getElementById('solucaoTecnico').value;
        const alertDiv = document.getElementById('alertSolucao');
        
        if (!solucao.trim()) {
            alertDiv.innerHTML = '<div class="card error">A solução é obrigatória para finalizar o chamado.</div>';
            return;
        }

        // Confirmação Crítica para Finalizar
        const confirmar = await showConfirmationModal(
            'Finalizar Chamado', 
            'Tem certeza que deseja finalizar este chamado? <b>Esta ação irá concluir o atendimento.</b>'
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
            alertDiv.innerHTML = '<div class="card success">✅ Chamado finalizado com sucesso! Redirecionando...</div>';
            setTimeout(() => { this.voltarParaChamados(); }, 2000);
        } catch (error) {
            alertDiv.innerHTML = `<div class="card error">❌ Falha ao finalizar: ${error.message}</div>`;
        }
    }

    voltarParaChamados() {
        location.hash = '#/todos'; 
    }
}

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