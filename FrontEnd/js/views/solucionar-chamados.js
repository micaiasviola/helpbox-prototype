/*
 * =================================================================
 * View: Solucionar Chamados (solucionar-chamados.js)
 * =================================================================
 * Esta view é responsável por exibir a lista de chamados para
 * técnicos (Nível 2) e administradores (Nível 3).
 *
 * Utiliza a BaseListView para gerenciar paginação e estado de filtro.
 * =================================================================
 */

// --- Importações ---
import { apiGetChamados, apiGetChamadosTecnico, apiUpdateChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate, renderDescricaoCurta } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';
import { store } from '../store.js';
import { BaseListView } from '../utils/base-list-view.js'; // Classe base para paginação/filtros

// --- Constantes da View ---
const NIVEL_ADMIN = 3;
const NIVEL_TECNICO = 2;
const STATUS_EM_ANDAMENTO = 'Em andamento';
const DEFAULT_PAGE_SIZE = 5; // Itens por página

/**
 * Classe principal para gerenciar a tela "Solucionar Chamados".
 * Herda de BaseListView para reutilizar a lógica de paginação e
 * estado de filtro (currentPage, pageSize, filtroStatus, termoBusca).
 */
class ChamadoManager extends BaseListView {
    
    /**
     * Prepara a classe, definindo o estado inicial e pegando dados do usuário logado.
     */
    constructor() {
        // Inicializa a classe base com o tamanho de página padrão
        super(DEFAULT_PAGE_SIZE); 
        
        // Armazena os dados brutos da API para a página atual
        this.chamadosData = [];
        
        // Referências do DOM que serão preenchidas no 'assignDOMelements'
        this.tbody = null;
        this.loadingIndicator = null;
        this.filtroStatusEl = null;
        this.buscaInputEl = null;
        
        // Contexto do usuário (do 'store' global)
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
    }

    // =================================================================
    // --- 1. Métodos de Inicialização ---
    // =================================================================

    /**
     * Ponto de entrada principal da classe.
     * Verifica permissões, renderiza o HTML base e carrega os dados.
     */
    async init() {
        // Guarda de Rota: Somente Nível 2 (Técnico) ou superior pode acessar esta tela.
        if (!this.usuarioLogadoId || this.nivelAcesso < NIVEL_TECNICO) {
            document.getElementById('view').innerHTML = '<div class="card">Acesso não autorizado.</div>';
            return;
        }

        this.renderBaseHTML();
        this.assignDOMelements();
        this.setupEvents();
        
        // 'loadData' é o método da *nossa* classe (ChamadoManager)
        // que é chamado pela classe base (BaseListView)
        await this.loadData(); 
    }

    /**
     * Atribui referências aos elementos do DOM para uso interno.
     * @private
     */
    assignDOMelements() {
        this.tbody = document.getElementById('tbody');
        this.loadingIndicator = document.getElementById('loadingChamados');
        this.filtroStatusEl = document.getElementById('filtroStatus');
        this.buscaInputEl = document.getElementById('busca');
    }

    // =================================================================
    // --- 2. Métodos de Renderização da UI ---
    // =================================================================

    /**
     * Renderiza o "shell" estático da view (toolbar, tabela vazia, etc.).
     * @private
     */
    renderBaseHTML() {
        const view = document.getElementById('view');
        view.innerHTML = `
            <div class="toolbar">
                <select id="filtroStatus" class="select" style="max-width:220px">
                    <option value="">Todos os status</option>
                    <option>Aberto</option>
                    <option>Em andamento</option>
                    <option>Fechado</option>
                </select>
                <input id="busca" class="input" placeholder="Buscar por descrição..." style="max-width:320px"/>
                <button id="refreshChamados" class="btn">🔄 Atualizar</button>
            </div>
            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID Chamado</th>
                        <th>Responsável</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Categoria</th>
                        <th>Data Abertura</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="tbody"></tbody>
            </table>
            <div id="paginationContainer" style="margin-top: 15px; text-align: center;"></div>
        `;
    }

    /**
     * Renderiza as linhas (<tr>) da tabela com base nos dados fornecidos.
     * @param {Array<Object>} chamados - Lista de chamados para exibir.
     * @private
     */
    renderChamadosTable(chamados) {
        if (!this.tbody) return;

        if (chamados.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum chamado encontrado.</td></tr>';
            return;
        }

        const rows = chamados.map(c => {
            // Lógica de UI complexa é movida para uma função helper
            const actionButton = this.getActionButton(c);
            
            const nomeTecnico = c.tecNome 
                ? `${c.tecNome} ${c.tecSobrenome}` 
                : (c.tecResponsavel_Cham ? `ID: ${c.tecResponsavel_Cham}` : 'Sem técnico');
            
            return `
                <tr>
                    <td>${c.id_Cham}</td>
                    <td>${nomeTecnico}</td>
                    <td>${renderDescricaoCurta(c.descricao_Cham, c.id_Cham) || 'Sem descrição'}</td>
                    <td>${renderBadge(c.status_Cham)}</td>
                    <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
                    <td>${c.categoria_Cham || 'Não definida'}</td>
                    <td>${formatDate(c.dataAbertura_Cham)}</td>
                    <td>
                        ${actionButton}
                        </td>
                </tr>
            `;
        }).join('');
        
        this.tbody.innerHTML = rows;
    }

    /**
     * Helper que contém a lógica de negócios para decidir qual botão
     * de ação exibir para o técnico/admin.
     * @param {Object} c - O objeto chamado.
     * @returns {string} O HTML do botão.
     * @private
     */
    getActionButton(c) {
        const isAssignedToMe = c.tecResponsavel_Cham === this.usuarioLogadoId;
        const isInProgress = c.status_Cham === STATUS_EM_ANDAMENTO;
        const isClosed = c.status_Cham === 'Fechado';
        const isAuthor = c.clienteId_Cham === this.usuarioLogadoId;

        // 1. Chamado fechado
        if (isClosed) {
            // 'detalharChamadoIA' é uma função global exposta pelo main.js
            return `<button class="btn secondary" onclick="detalharChamadoIA(${c.id_Cham})">Fechado</button>`;
        }

        // 2. Chamado "Em Andamento"
        if (isInProgress) {
            if (isAssignedToMe) {
                // Está comigo, posso continuar a solução
                return `<button class="btn btn-third" data-action="continue" data-id="${c.id_Cham}">Continuar Solucionando</button>`;
            } 
            
            if (!c.tecResponsavel_Cham) {
                // Regra de negócio: Se o usuário logado for o autor, ele não pode "pegar" o próprio chamado.
                if (isAuthor) {
                    return '<button class="btn btn-secondary" disabled>Você é o Autor</button>';
                }
                // Está "Em Andamento" mas livre (ex: fila da IA), pode pegar.
                return `<button class="btn btn-primary" data-action="take" data-id="${c.id_Cham}">🛠️ Solucionar Chamado</button>`;
            }
            
            // Está em andamento E com outro técnico
            return '<button class="btn btn-secondary" disabled>Em Andamento (Atribuído)</button>';
        }
        
        // 3. Chamado "Aberto"
        // (Status "Aberto" significa que ainda está com o cliente ou IA, antes de ir para a fila "Em Andamento")
        if (c.status_Cham === 'Aberto') {
            return '<button class="btn btn-secondary" disabled>Aguardando IA/Cliente</button>';
        }

        // Fallback
        return '';
    }

    // =================================================================
    // --- 3. Métodos de Gerenciamento de Dados ---
    // =================================================================

    /**
     * Carrega os dados da API com base no nível de acesso e nos filtros
     * atuais (armazenados na classe base).
     * Este método é chamado por 'init' e pela paginação (BaseListView).
     */
    async loadData() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
            this.loadingIndicator.textContent = 'Carregando chamados...';
        }
        
        try {
            const apiParams = [this.currentPage, this.pageSize, this.termoBusca, this.filtroStatus];
            let response;

            // Decide qual endpoint da API chamar com base no nível de acesso
            if (this.nivelAcesso === NIVEL_ADMIN) {
                // Admin vê TODOS os chamados
                response = await apiGetChamados(...apiParams);
            } else {
                // Técnico vê apenas os chamados da fila "Em Andamento"
                response = await apiGetChamadosTecnico(...apiParams);
            }

            // A API deve retornar { chamados: [...], totalCount: N }
            this.chamadosData = response.chamados;
            this.totalCount = response.totalCount; // Informa à BaseListView o total de itens

            this.drawChamados(); // Renderiza os dados recebidos
            this.renderPagination(); // Renderiza os controles de paginação (método da BaseListView)

        } catch (error) {
            console.error('Erro ao carregar chamados:', error);
            if (this.loadingIndicator) {
                this.loadingIndicator.textContent = 'Erro ao carregar chamados. Tente novamente.';
            }
        } finally {
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
        }
    }

    /**
     * Renderiza os dados na tabela.
     * Esta função é chamada após 'loadData' buscar os dados.
     * A filtragem já foi feita pelo back-end.
     */
    drawChamados() {
        // A filtragem foi removida daqui, pois 'this.chamadosData' já
        // contém os dados corretos (filtrados e paginados) vindos da API.
        this.renderChamadosTable(this.chamadosData);
    }

    // =================================================================
    // --- 4. Métodos de Gerenciamento de Eventos ---
    // =================================================================

    /**
     * Configura todos os listeners de eventos para a view.
     * @private
     */
    setupEvents() {
        // O 'triggerLoad(true)' é um método da BaseListView.
        // O 'true' indica que a paginação deve ser resetada para a página 1.
        
        document.getElementById('refreshChamados').addEventListener('click', () => {
            this.triggerLoad(false); // 'false' = recarrega a página atual
        });

        this.filtroStatusEl.addEventListener('change', (e) => {
            this.filtroStatus = e.target.value; // Atualiza o estado na BaseListView
            this.triggerLoad(true); // Reseta para a página 1
        });

        this.buscaInputEl.addEventListener('input', (e) => {
            this.termoBusca = e.target.value; // Atualiza o estado na BaseListView
            this.triggerLoad(true); // Reseta para a página 1
        });
        
        // Delegação de eventos: Um único listener no <tbody>
        // para gerenciar cliques em todos os botões de ação.
        this.tbody.addEventListener('click', (e) => this.handleChamadoActions(e));
    }

    /**
     * Manipulador central para todos os cliques nos botões de ação da tabela.
     * @param {Event} e - O objeto de evento do clique.
     * @private
     */
    async handleChamadoActions(e) {
        // Encontra o botão mais próximo que foi clicado
        const btn = e.target.closest('button');
        if (!btn) return; // O clique não foi em um botão

        const id = +btn.dataset.id; // Converte o ID para número
        const action = btn.dataset.action;

        if (!action || !id) return; // Botão sem ação ou ID (ex: "Fechado", "Aguardando")

        try {
            if (action === 'take') {
                // Ação: Pegar um chamado da fila
                const updatePayload = {
                    status_Cham: STATUS_EM_ANDAMENTO, // Define o status
                    tecResponsavel_Cham: this.usuarioLogadoId // Atribui a si mesmo
                };

                await apiUpdateChamado(id, updatePayload);
                alert(`Chamado ${id} atribuído a você!`);
                iniciarSolucao(id); // Navega para a tela de detalhes da solução
                return; // Encerra a execução aqui
            }
            
            if (action === 'continue') {
                // Ação: Continuar um chamado que já é seu
                iniciarSolucao(id); // Apenas navega para a tela de solução
                return; // Encerra
            }

            // (Opcional: Ação 'close' foi removida, mas poderia ser tratada aqui)
            // if (action === 'close') { ... }
            
            // Recarrega os dados da lista se uma ação (que não seja navegação) for concluída
            await this.loadData();

        } catch (error) {
            alert('Erro ao atualizar chamado: ' + error.message);
            console.error('Erro ao atualizar chamado:', error);
        }
    }
}


/**
 * Função de exportação pública.
 * Cria a instância da classe e a inicia.
 * É chamada pelo roteador (main.js).
 */
export async function renderTodosChamados() {
    // Expõe a instância ao 'window' para depuração fácil, se necessário
    window.chamadoManager = new ChamadoManager();
    await window.chamadoManager.init();
}