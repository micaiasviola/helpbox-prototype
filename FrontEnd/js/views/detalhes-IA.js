import {
    apiEncaminharChamado, apiGetChamadoById, apiFecharChamado,
    apiReabrirChamado,
    apiConcordarSolucao
} from "../api/chamados.js";
import { store } from "../store.js";
import { showConfirmationModal } from "../utils/feedbackmodal.js";
// Importando a biblioteca 'marked' para converter Markdown em HTML
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

/**
 * Constrói o template HTML para exibir os detalhes de um chamado
 * com lógica condicional para exibir botões de ação e feedback do cliente.
 */
function getClienteDetalheTemplate(chamado) {
    // -----------------------------------------------------------------
    // BLOCO 0: ESTILOS CSS (INJETADO PARA FORMATAR O MARKDOWN)
    // -----------------------------------------------------------------
    const styles = `
        <style>
            /* Container da resposta da IA */
            .ia-box {
                background-color: #f8f9fa;
                border-left: 5px solid #6c5ce7; /* Cor de destaque (Roxo IA) */
                border-radius: 4px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                margin-bottom: 20px;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            }

            /* Estilização do conteúdo gerado pelo Markdown */
            .markdown-content {
                color: #2d3436;
                line-height: 1.6;
                font-size: 15px;
            }

            /* Títulos dentro da resposta */
            .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                margin-top: 15px;
                margin-bottom: 10px;
                color: #2d3436;
                font-weight: 600;
            }
            .markdown-content h3:first-child { margin-top: 0; }

            /* Listas (Bolinhas e Números) */
            .markdown-content ul, .markdown-content ol {
                padding-left: 25px;
                margin-bottom: 15px;
            }

            .markdown-content li {
                margin-bottom: 5px; /* Espaço entre itens da lista */
            }

            /* Negrito */
            .markdown-content strong {
                color: #000;
                font-weight: 700;
            }
            
            /* Parágrafos */
            .markdown-content p {
                margin-bottom: 10px;
            }
        </style>
    `;

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

    // Conversão do Markdown da IA para HTML
    const solucaoIAHtml = chamado.solucaoIA_Cham 
        ? marked.parse(chamado.solucaoIA_Cham) 
        : "<em>Aguardando análise ou sem resposta inicial da IA.</em>";


    // -----------------------------------------------------------------
    // BLOCO 2: SEÇÃO DE RESPOSTA DO TÉCNICO
    // -----------------------------------------------------------------
    const solucaoTecnicoBlock = chamado.solucaoTec_Cham
        ? `
        <hr/>
        <h3>Resposta da Equipe Técnica</h3>
        <div class="tec-box" style="padding: 15px; border: 1px solid #007bff; background-color: #e6f7ff; margin-bottom: 20px; border-radius: 4px;">
            <p><strong>Status:</strong> O problema foi analisado pela equipe técnica.</p>
            <p id="tecResponseText" style="white-space: pre-wrap;">${chamado.solucaoTec_Cham}</p>
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
    return `
    ${styles} <div class="card">
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
        <div class="ia-box">
            <div id="iaResponseText" class="markdown-content">
                ${solucaoIAHtml}
            </div>
        </div>
        
        ${solucaoTecnicoBlock}
        
        <hr/>
        
        ${acoesClienteBlock} <div class="actions">
            <button class="btn btn-secondary" onclick="window.print()">🖨️ Imprimir Página</button>
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