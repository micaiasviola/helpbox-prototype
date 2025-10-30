import {
    apiEncaminharChamado, apiGetChamadoById, apiFecharChamado,
    apiReabrirChamado,
    apiConcordarSolucao
} from "../api/chamados.js";
import { store } from "../store.js";
import { showConfirmationModal } from "../utils/feedbackmodal.js";


/**
 * Constrói o template HTML para exibir os detalhes de um chamado
 * com lógica condicional para exibir botões de ação e feedback do cliente.
 */
function getClienteDetalheTemplate(chamado) {
    // -----------------------------------------------------------------
    // BLOCO 1: VARIÁVEIS BÁSICAS E DE CONTROLE
    // -----------------------------------------------------------------
    const dataAbertura = new Date(chamado.dataAbertura_Cham).toLocaleDateString();
    const nomeCliente = (chamado.clienteNome || 'Cliente') + ' ' + (chamado.clienteSobrenome || '');
    const nomeAbertoPor = nomeCliente.trim();
    const status = chamado.status_Cham;

    const usuarioLogadoId = store.usuarioLogado?.id;
    const tecResponsavelId = chamado.tecResponsavel_Cham;
    const isTecResponsavel = usuarioLogadoId && (usuarioLogadoId === tecResponsavelId);


    // -----------------------------------------------------------------
    // BLOCO 2: SEÇÃO DE RESPOSTA DO TÉCNICO
    // -----------------------------------------------------------------
    const solucaoTecnicoBlock = chamado.solucaoTec_Cham
        ? `
        <hr/>
        <h3>Resposta da Equipe Técnica</h3>
        <div class="tec-box" style="padding: 15px; border: 1px solid #007bff; background-color: #e6f7ff; margin-bottom: 20px;">
            <p><strong>Status:</strong> O problema foi analisado pela equipe técnica.</p>
            <p id="tecResponseText">
                ${chamado.solucaoTec_Cham}
            </p>
        </div>
        `
        : '';

    
    // -----------------------------------------------------------------
    // BLOCO 3: LÓGICA CONDICIONAL DOS BOTÕES DE AÇÃO (acoesClienteBlock)
    // -----------------------------------------------------------------
    let acoesClienteBlock = '';
    
    const deveMostrarFeedbackAposFechamento = 
        status === 'Fechado' && !isTecResponsavel;


    if (deveMostrarFeedbackAposFechamento) {
        // Opção 1: Chamado FECHADO e usuário não é o técnico (Mostra Concordar/Reabrir)
        acoesClienteBlock = `
            <h3>Feedback do Cliente</h3>
            <p>O seu chamado foi fechado pela equipe técnica. A solução apresentada resolveu o seu problema?</p>
            
            <div class="actions" id="feedbackActions">
                <button id="btnConcordar" class="btn btn-success">✅ Concordo com a Solução (Manter Fechado)</button>
                <button id="btnReabrir" class="btn btn-warning">🔄 Reabrir Chamado</button>
            </div>
            
            <div id="alertFeedback" style="margin-top:15px;"></div>
        `;
    } else if (status !== 'Fechado' && status !== 'Em andamento') {
        // Opção 2: Chamado ABERTO (Permite ações iniciais: Fechar ou Encaminhar)

        const podeFechar = chamado.solucaoIA_Cham || chamado.solucaoTec_Cham;
        const podeEncaminhar = status === 'Aberto'; 

        acoesClienteBlock = `
            <h3>Validação da Solução</h3>
            <p>A solução apresentada resolveu o seu problema?</p>
            
            <div class="actions" id="validationActions">
                
                ${podeFechar ?
                `<button id="btnAceitar" class="btn btn-success">✅ Fechar Chamado (Resolvido)</button>`
                : ''}
                    
                ${podeEncaminhar ?
                `<button id="btnRejeitar" class="btn btn-danger">❌ Não, Encaminhar para Técnico</button>`
                : ''}
            </div>
        `;
    } 
    
    // -----------------------------------------------------------------
    // BLOCO 4: ESTRUTURA FINAL DO TEMPLATE
    // -----------------------------------------------------------------
    return `<div class="card">
        <div class="actions" style="margin-bottom: 20px;">
            <button id="btnVoltar" class="btn btn-secondary">
                ← Voltar para Meus Chamados
            </button>
        </div>
        <h2>Detalhes do Chamado #${chamado.id_Cham} - Status: ${chamado.status_Cham}</h2>
        
        <p><strong>Aberto por:</strong> ${nomeAbertoPor}</p>
        <p><strong>Assunto:</strong> ${chamado.titulo_Cham}</p>
        <p><strong>Categoria:</strong> ${chamado.categoria_Cham}</p>
        <p><strong>Data de Abertura:</strong> ${dataAbertura}</p>
        <p><strong>Descrição:</strong> ${chamado.descricao_Cham}</p>
        <hr/>

        <h3>Resposta da Inteligência Artificial</h3>
        <div class="ia-box" style="padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9;">
            <p id="iaResponseText">
                ${chamado.solucaoIA_Cham || "Aguardando ou Sem resposta inicial da IA."}
            </p>
        </div>
        
        ${solucaoTecnicoBlock}
        
        <hr/>
        
        ${acoesClienteBlock} <div class="actions">
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

        const btnRejeitar = document.getElementById('btnRejeitar'); // Encaminhar
        const btnAceitar = document.getElementById('btnAceitar'); 
        const btnConcordar = document.getElementById('btnConcordar');
        const btnReabrir = document.getElementById('btnReabrir');

        if (btnRejeitar) {
            // ❌ Não, Encaminhar para Técnico
            btnRejeitar.addEventListener('click', () => this.handleEncaminhar(id));
        }
        if (btnAceitar) {
            // ✅ Sim, Fechar Chamado (Validar Solução IA/Tecnica)
            btnAceitar.addEventListener('click', () => this.handleFechar(id));
        }
        if (btnConcordar) {
            // ✅ Concordo com a Solução (Feedback Final)
            btnConcordar.addEventListener('click', () => this.handleConcordar(id));
        }
        if (btnReabrir) {
            // 🔄 Reabrir Chamado (Feedback Final)
            btnReabrir.addEventListener('click', () => this.handleReabrir(id));
        }
    }

    // =================================================================
    // ENVOLTÓRIOS DE AÇÃO COM MODAL (HANDLERS)
    // =================================================================

    async handleEncaminhar(id) {
        const confirmed = await showConfirmationModal(
            "Confirmar Encaminhamento", 
            "Tem certeza que deseja encaminhar este chamado para a equipe técnica? Esta ação não pode ser desfeita."
        );
        if (confirmed) {
            this.encaminharChamado(id);
        }
    }
    
    async handleFechar(id) {
        const confirmed = await showConfirmationModal(
            "Confirmar Fechamento", 
            "O chamado será marcado como resolvido e FECHADO. Você confirma?"
        );
        if (confirmed) {
            this.fecharChamado(id);
        }
    }

    async handleConcordar(id) {
        const confirmed = await showConfirmationModal(
            "Confirmação de Solução", 
            "Ao confirmar, você valida a solução final e o chamado será mantido FECHADO."
        );
        if (confirmed) {
            this.concordarSolucao(id);
        }
    }

    async handleReabrir(id) {
        const confirmed = await showConfirmationModal(
            "Confirmação de Reabertura", 
            "Você está REABRINDO este chamado. Ele retornará à fila de trabalho e um novo técnico será atribuído. Você confirma?"
        );
        if (confirmed) {
            this.reabrirChamado(id);
        }
    }


    // =================================================================
    // FUNÇÕES DE AÇÃO PRINCIPAIS (EXECUTADAS APÓS CONFIRMAÇÃO)
    // =================================================================

    /** Envia o chamado para o estado 'Em andamento' (aparecerá para o técnico). */
    async encaminharChamado(id) {
        document.getElementById('alert').innerHTML = '<div class="card info">Encaminhando para técnico...</div>';
        try {
            await apiEncaminharChamado(id);
            document.getElementById('alert').innerHTML = '<div class="card success">➡️ Chamado encaminhado para a equipe técnica com sucesso.</div>';
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Falha ao encaminhar: ${error.message}</div>`;
        }
    }

    /** NOVO/REFATORADO: Fecha o chamado pelo próprio cliente (validando a solução). */
    async fecharChamado(id) {
        document.getElementById('alert').innerHTML = '<div class="card info">Fechando chamado...</div>';
        try {
            await apiFecharChamado(id);
            document.getElementById('alert').innerHTML = '<div class="card success">✅ Chamado validado e **FECHADO** com sucesso.</div>';
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Falha ao fechar: ${error.message}</div>`;
        }
    }

    /** Cliente concorda com a solução: registra a concordância e mantém o status 'Fechado'. */
    async concordarSolucao(id) {
        document.getElementById('alert').innerHTML = '<div class="card info">Registrando concordância...</div>';
        try {
            await apiConcordarSolucao(id);
            document.getElementById('alert').innerHTML = '<div class="card success">👍 Sua validação foi registrada. O chamado permanece **Fechado**.</div>';
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Falha ao registrar validação: ${error.message}</div>`;
        }
    }

    /** Cliente discorda da solução final e reabre o chamado. */
    async reabrirChamado(id) {
        document.getElementById('alert').innerHTML = '<div class="card info">Reabrindo chamado...</div>';
        try {
            await apiReabrirChamado(id);
            document.getElementById('alert').innerHTML = '<div class="card warning">🔄 Chamado **REABERTO** com sucesso. Um novo técnico será atribuído.</div>';
            setTimeout(() => { this.render(); }, 1500);
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Falha ao reabrir: ${error.message}</div>`;
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