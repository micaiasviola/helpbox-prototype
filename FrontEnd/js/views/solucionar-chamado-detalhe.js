import { apiGetChamadoById, apiUpdateChamado } from "../api/chamados.js";
import { store } from "../store.js";


function getSolucaoTemplate(chamado) {
    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    
    // 🚨 MELHORIA: Usa o nome do autor que veio da API
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

/** Classe responsável por exibir os detalhes do chamado para o Técnico/Admin e permitir a solução.
 */
export class SolucionarChamadoView {
    constructor(chamadoId) {
        this.chamadoId = chamadoId;
        this.container = document.getElementById('view');
    }

    /** Renderiza os detalhes do chamado e anexa os listeners de eventos. */
    async render() {
        this.container.innerHTML = `<div id="alert"></div><div class="card loading">Carregando detalhes do chamado #${this.chamadoId}...</div>`;

        try {
            const chamado = await apiGetChamadoById(this.chamadoId);

            if (!chamado) {
                this.container.innerHTML = '<div class="card error">Chamado não encontrado.</div>';
                return;
            }
            
            // Verifica se o chamado está fechado e exibe uma tela de visualização (opcional)
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


    /** Anexa listeners para os botões de ação do técnico. */
    attachListeners(id) {
        document.getElementById('btnVoltar').addEventListener('click', () => this.voltarParaChamados());
        document.getElementById('btnSalvarSolucao').addEventListener('click', () => this.salvarRascunho(id));
        document.getElementById('btnFinalizar').addEventListener('click', () => this.finalizarChamado(id));
    }
    
    /** Salva o texto da solução como rascunho no campo solucaoTec_Cham. */
    async salvarRascunho(id) {
        const solucao = document.getElementById('solucaoTecnico').value;
        const alertDiv = document.getElementById('alertSolucao');
        alertDiv.innerHTML = '<div class="card info">Salvando rascunho...</div>';
        try {
            await apiUpdateChamado(id, { solucaoTec_Cham: solucao });
            alertDiv.innerHTML = '<div class="card success">Rascunho salvo com sucesso!</div>';
        } catch (error) {
            alertDiv.innerHTML = `<div class="card error">Falha ao salvar rascunho: ${error.message}</div>`;
        }
    }

    /** Fecha o chamado e salva a solução final. */
    async finalizarChamado(id) {
        const solucao = document.getElementById('solucaoTecnico').value;
        const alertDiv = document.getElementById('alertSolucao');
        
        if (!solucao.trim()) {
            alertDiv.innerHTML = '<div class="card error">A solução é obrigatória para finalizar o chamado.</div>';
            return;
        }

        alertDiv.innerHTML = '<div class="card info">Finalizando chamado...</div>';
        try {
            await apiUpdateChamado(id, {
                 status_Cham: 'Fechado',
                 solucaoTec_Cham: solucao,
                 solucaoFinal_Cham: solucao, // Usa a mesma solução como final
                 dataFechamento_Cham: new Date().toISOString()
            });
            alertDiv.innerHTML = '<div class="card success">✅ Chamado finalizado com sucesso! Redirecionando...</div>';
            setTimeout(() => { this.voltarParaChamados(); }, 2000);
        } catch (error) {
            alertDiv.innerHTML = `<div class="card error">❌ Falha ao finalizar: ${error.message}</div>`;
        }
    }

    voltarParaChamados() {
        // Volta para a tela de solução (todos os chamados)
        location.hash = '#/todos'; 
    }
}

/** Ponto de entrada para a navegação da aplicação. */
export function iniciarSolucao(idChamado) { // Use um nome de parâmetro genérico
    
    // 1. Se o 'idChamado' veio do router (como string da URL), ele pode ser o ID
    // Se for uma string vazia ou nula (ex: /#/solucao/ sem ID), não renderiza.
    if (!idChamado) {
        // Redireciona para a lista se o ID for obrigatório e não existir
        location.hash = '#/todos';
        return; 
    }
    
    // 2. Se a chamada veio do botão (com ID) ou do router (com ID), 
    // garante que o hash esteja correto (evita loop desnecessário se o hash já está certo)
    if (!location.hash.includes(`#/solucao/${idChamado}`)) {
        location.hash = `#/solucao/${idChamado}`;
    }
    
    // 3. Renderiza a view com o ID recebido
    const view = new SolucionarChamadoView(idChamado);
    view.render();
}