import { apiEncaminharChamado, apiGetChamadoById } from "../api/chamados.js";

import { store } from "../store.js";


function getClienteDetalheTemplate(chamado) {
    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();

    // 🚨 MELHORIA: Usa o nome do autor que veio da API
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    const nomeAbertoPor = nomeCliente.trim();

    return `<div class="card">
        <div class="actions" style="margin-bottom: 20px;">
            <button id="btnVoltar" class="btn btn-secondary">
                ← Voltar para Meus Chamados
            </button>
        </div>
        <h2>Detalhes do Chamado #${chamado.id_Cham} para Impressão</h2>
        
        <p><strong>Aberto por:</strong> ${nomeAbertoPor}</p>
        <p><strong>Assunto:</strong> ${chamado.titulo_Cham}</p>
        <p><strong>Categoria:</strong> ${chamado.categoria_Cham}</p>
        <p><strong>Data de Abertura:</strong> ${dataAbertura}</p>
        <p><strong>Descrição:</strong> ${chamado.descricao_Cham}</p>
        <hr/>

        <h3>Resposta da Inteligência Artificial</h3>
        <div class="ia-box" style="padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9;">
            <p id="iaResponseText">
                ${chamado.solucaoIA_Cham || "Aguardando resposta da IA..."}
            </p>
        </div>
        
        <hr/>
        
        <h3>Validação do Cliente</h3>
        <p>A solução acima resolveu o seu problema?</p>
        
        <div class="actions">
            <button id="btnAceitar" class="btn btn-success">✅ Sim, Resolver Problema (Fechar)</button>
            <button id="btnRejeitar" class="btn btn-danger">❌ Não, Encaminhar para Técnico</button>
            <button class="btn btn-secondary" onclick="window.print()">印️ Imprimir Página</button>
        </div>
    </div>
    <div id="alert" style="margin-top:15px;"></div>`;
}

/** Classe responsável por exibir os detalhes de um chamado e permitir ações como encaminhar.
 */
export class DetalhesIAView {
    constructor(chamadoId) {
        this.chamadoId = chamadoId;
        this.container = document.getElementById('view')
    }

    /** Renderiza os detalhes do chamado e anexa os listeners de eventos. */
    async render() {
        this.container.innerHTML = `<div id="alert"></div><div class="card loading">Carregando detalhes do chamado ${this.chamadoId}...</div>`;

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
     * Anexa listeners para os botões de ação.
     */
    attachListeners(id) {
        document.getElementById('btnVoltar').addEventListener('click', () => this.voltarParaChamados());

        document.getElementById('btnRejeitar').addEventListener('click', () => this.encaminharChamado(id));
        document.getElementById('btnAceitar').addEventListener('click', () => this.fecharChamado(id));

    }

    /**
     * Envia o chamado para o estado 'Em andamento' (aparecerá para o técnico).
     */
    async encaminharChamado(id) {
        document.getElementById('alert').innerHTML = '<div class="card info">Encaminhando para técnico...</div>';
        try {
            await apiEncaminharChamado(id);
            document.getElementById('alert').innerHTML = '<div class="card success">➡️ Chamado encaminhado para a equipe técnica com sucesso.</div>';
            // Opcional: Redirecionar para a lista de chamados após 3 segundos
            setTimeout(() => { location.hash = '#/chamados'; }, 3000);
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Falha ao encaminhar: ${error.message}</div>`;
        }
    }

    // Lógica simples para fechar o chamado (você precisará de uma API PUT)
    async fecharChamado(id) {
        document.getElementById('alert').innerHTML = '<div class="card info">Fechando chamado...</div>';
        try {
            // ⚠️ Você precisará de uma nova apiUpdateChamado ou rota PUT para fechar com status 'Fechado'
            // Por agora, apenas simulamos:
            // await apiUpdateChamado(id, { status_Cham: 'Fechado', solucaoFinal_Cham: 'Resolvido pela IA (validado)' });
            document.getElementById('alert').innerHTML = '<div class="card success">✅ Chamado marcado como resolvido e fechado.</div>';
            setTimeout(() => { location.hash = '#/chamados'; }, 3000);
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Falha ao fechar: ${error.message}</div>`;
        }
    }
    voltarParaChamados() {
        location.hash = '#/chamados';
    }

}



export function iniciarDetalhesIA(id) {
    location.hash = `#/chamados/detalhe/${id}`;
    const view = new DetalhesIAView(id);
    view.render();
}