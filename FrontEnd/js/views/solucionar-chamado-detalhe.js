import { apiGetChamadoById, apiUpdateChamado } from "../api/chamados.js";
import { store } from "../store.js";

import { showConfirmationModal } from "../utils/feedbackmodal.js"; 

function getSolucaoTemplate(chamado) {
    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    const nomeAbertoPor = nomeCliente.trim();
    
    return `<div class="card">
        <div class="actions" style="margin-bottom: 20px;">
            <button id="btnVoltar" class="btn btn-secondary">
                ← Voltar para Solucionar Chamados
            </button>
        </div>
        <h2>Solucionar Chamado #${chamado.id_Cham}</h2>
        
        <p><strong>Status:</strong> <span class="badge ${chamado.status_Cham.toLowerCase()}">${chamado.status_Cham}</span></p>
        <p><strong>Aberto por:</strong> ${nomeAbertoPor}</p>
        <p><strong>Assunto:</strong> ${chamado.titulo_Cham}</p>
        <p><strong>Categoria:</strong> ${chamado.categoria_Cham}</p>
        <p><strong>Data de Abertura:</strong> ${dataAbertura}</p>
        <p><strong>Descrição:</strong> ${chamado.descricao_Cham}</p>
        <hr/>

        <h3>Resposta da IA (Encaminhada pelo Cliente)</h3>
        <div class="ia-box" style="padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9;">
            <p>${chamado.solucaoIA_Cham || "Nenhuma resposta da IA registrada."}</p>
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
        
        // Adicionamos preventDefault por segurança, embora não seja form submit
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

        // 2. Confirmação para Salvar Rascunho
        const confirmar = await showConfirmationModal(
            'Salvar Rascunho', 
            'Deseja atualizar o rascunho da solução?'
        );

        if (!confirmar) return; // Se clicar em "Não", para a execução

        alertDiv.innerHTML = '<div class="card info">Salvando rascunho...</div>';
        try {
            await apiUpdateChamado(id, { solucaoTec_Cham: solucao });
            alertDiv.innerHTML = '<div class="card success">Rascunho salvo com sucesso!</div>';
            // Remove mensagem de sucesso após 3 segundos para limpar a tela
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

        // 3. Confirmação Crítica para Finalizar
        const confirmar = await showConfirmationModal(
            'Finalizar Chamado', 
            'Tem certeza que deseja finalizar este chamado? <b>Esta ação irá concluir o atendimento.</b>'
        );

        if (!confirmar) return; // Se cancelar, nada acontece

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