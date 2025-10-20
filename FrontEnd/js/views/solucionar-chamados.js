import { apiGetChamados, apiGetChamadosTecnico, apiUpdateChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate, renderDescricaoCurta } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js'
import { store } from '../store.js';
import { BaseListView } from '../utils/base-list-view.js';


const NIVEL_ADMIN = 3;
const NIVEL_TECNICO = 2;
const STATUS_EM_ANDAMENTO = 'Em andamento';
const DEFAULT_PAGE_SIZE = 5; // Define o tamanho da página


/**
 * Classe para gerenciar a exibição, carregamento e filtragem dos chamados.
 * Encapsula o estado e a lógica de manipulação do DOM.
 */
class ChamadoManager extends BaseListView {
    constructor() {
        super(DEFAULT_PAGE_SIZE); // Inicializa this.currentPage, this.pageSize, this.filtroStatus, this.termoBusca
        
        // 🚨 CORREÇÃO: Removidas as redefinições de this.currentPage/pageSize/filtroStatus/buscaInput.
        this.chamadosData = []; // Mantido, armazena a lista atual
        this.tbody = null;
        this.loadingIndicator = null;
        
        // Mapeamentos de elementos DOM (Ainda são necessários)
        this.filtroStatusEl = null; 
        this.buscaInputEl = null; 
        
        // Propriedades específicas de segurança/contexto
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
    }

    /**
     * Inicializa a view, carrega os dados e configura os eventos.
     */
    async init() {
        if (!this.usuarioLogadoId || this.nivelAcesso < NIVEL_TECNICO) {
            document.getElementById('view').innerHTML = '<div class="card">Acesso não autorizado.</div>';
            return;
        }

        this.renderBaseHTML();
        this.assignDOMelements();
        this.setupEvents();
        await this.loadData(); // Chama o método da classe filha/abstrata
    }

    /**
     * Renderiza o HTML estático da interface (toolbar e tabela).
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
                        <th>Responsável</th> <th>Descrição</th>
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
     * Atribui as referências aos elementos do DOM para uso interno.
     * @private
     */
     assignDOMelements() {
        this.tbody = document.getElementById('tbody');
        this.loadingIndicator = document.getElementById('loadingChamados');
        this.filtroStatusEl = document.getElementById('filtroStatus'); 
        this.buscaInputEl = document.getElementById('busca'); 
    }

    /**
     * Configura os listeners de eventos.
     * @private
     */
     setupEvents() {
        // 🚨 MELHORIA: Usa triggerLoad da classe base para o refresh
        document.getElementById('refreshChamados').addEventListener('click', () => this.triggerLoad(true));
        
         this.filtroStatusEl.addEventListener('change', (e) => {
            this.filtroStatus = e.target.value; // Atualiza o estado herdado (BaseListView)
            this.termoBusca = this.buscaInputEl.value;
            this.triggerLoad(true);
        });

        this.buscaInputEl.addEventListener('input', (e) => {
            this.termoBusca = e.target.value.toLowerCase();
            this.filtroStatus = this.filtroStatusEl.value;
            this.triggerLoad(true);
        });
        
        this.tbody.addEventListener('click', this.handleChamadoActions.bind(this));
    }


    /**
    * Carrega os dados de chamados da API e atualiza o estado da classe.
    */
    async loadData() {
        try {
             if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'block';
                this.loadingIndicator.textContent = 'Carregando chamados...';
            }
            
            let response;
            
            const apiParams = [this.currentPage, this.pageSize, this.termoBusca, this.filtroStatus];

            if (this.nivelAcesso === NIVEL_ADMIN) {
                // Admin: Rota paginada
                response = await apiGetChamados(...apiParams);
            } else if (this.nivelAcesso >= NIVEL_TECNICO) {
                // Técnico: Rota paginada
                response = await apiGetChamadosTecnico(...apiParams);
            } else {
                response = { chamados: [], totalCount: 0 };
            }
            
            // 🚨 Assume que a API retorna { chamados: [...], totalCount: N }
            this.chamadosData = response.chamados; 
            this.totalCount = response.totalCount;

            this.drawChamados(); // Aplica filtros locais (necessário se o backend não fizer tudo)
            this.renderPagination(); // MÉTODO HERDADO

            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
        } catch (error) {
            if (this.loadingIndicator) {
                this.loadingIndicator.textContent = 'Erro ao carregar chamados';
            }
            console.error('Erro ao carregar chamados:', error);
        }
    }

    /**
     * NOVO: Retorna o HTML do botão de ação primário com base no estado do chamado.
     * @param {Object} c - O objeto chamado.
     * @returns {string} O HTML do botão ou string vazia.
     */
    getActionButton(c) {
        const isAssignedToMe = c.tecResponsavel_Cham === this.usuarioLogadoId;
        const isInProgress = c.status_Cham === STATUS_EM_ANDAMENTO;
        const isClosed = c.status_Cham === 'Fechado';
        
        // Checa se o usuário logado é o autor do chamado
        const isAuthor = c.clienteId_Cham === this.usuarioLogadoId; 

        if (isClosed) {
            return `<button class="btn secondary" onclick="detalharChamadoIA(${c.id_Cham})">Fechado</button>`;
        }
        
        // Lógica para chamados EM ANDAMENTO (já na fila de trabalho)
        if (isInProgress) {
            if (isAssignedToMe) {
                // Se está atribuído a ele, ele continua (independente de ser o autor)
                return `<button class="btn btn-third" data-action="continue" data-id="${c.id_Cham}">Continuar Solucionando</button>`;
            } else if (!c.tecResponsavel_Cham) {
                // Chamado livre na fila
                
                // 🚨 CORREÇÃO: Bloqueia a ação 'take' se o Admin/Tecnico for o autor
                if (isAuthor) {
                    return '<button class="btn btn-secondary" disabled>Você é o Autor</button>';
                }
                
                return `<button class="btn btn-primary" data-action="take" data-id="${c.id_Cham}">🛠️ Solucionar Chamado</button>`;
            } else {
                // Em Andamento, mas de outro técnico/administrador
                return '<button class="btn btn-secondary" disabled>Em Andamento (Atribuído)</button>';
            }
        }
        
        // Chamados "Aberto" (fora do fluxo de trabalho do técnico)
        if (c.status_Cham === 'Aberto') {
            return '<button class="btn btn-secondary" disabled>Aguardando IA/Cliente</button>';
        }

        return '';
    }

    /**
     * Renderiza a tabela de chamados (linhas).
     * @param {Array<Object>} chamados - Lista de chamados a serem renderizados.
     * @private
     */
    renderChamadosTable(chamados) {
        if (!this.tbody) return;

        this.tbody.innerHTML = '';
        const rows = chamados.map(c => {
            const actionButton = this.getActionButton(c);
            
            const nomeTecnico = c.tecNome 
                ? `${c.tecNome} ${c.tecSobrenome}` 
                : (c.tecResponsavel_Cham || 'Sem técnico'); 
            
            const closeButton = (c.tecResponsavel_Cham === this.usuarioLogadoId && c.status_Cham !== 'Fechado') 
                ? `<button class="btn btn-secondary" data-action="close" data-id="${c.id_Cham}">Finalizar ✓</button>` 
                : '';

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
                        <!-- ${closeButton}-->
                    </td>
                 </tr>
            `;
        }).join('');
        this.tbody.innerHTML = rows;
    }

    /**
     * Filtra e exibe os chamados com base nos critérios selecionados.
     */
     drawChamados() {
        if (!this.chamadosData || this.chamadosData.length === 0) {
             this.renderChamadosTable([]);
             return;
        }

        // 🚨 CORREÇÃO: Usa os valores dos elementos DOM mapeados
        const status = this.filtroStatusEl.value; 
        const q = this.buscaInputEl.value.toLowerCase(); 

        const chamadosFiltrados = this.chamadosData.filter(c => {
            const statusMatch = !status || c.status_Cham.toLowerCase() === status.toLowerCase();
            const searchMatch = !q ||
                (c.descricao_Cham && c.descricao_Cham.toLowerCase().includes(q)) ||
                (c.categoria_Cham && c.categoria_Cham.toLowerCase().includes(q));
            return statusMatch && searchMatch;
        });

        this.renderChamadosTable(chamadosFiltrados);
    }

    /**
     * Manipula as ações dos botões na tabela de chamados.
     * @param {Event} e - Evento de clique
     * @private
     */
    async handleChamadoActions(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = +btn.dataset.id;
        const action = btn.dataset.action;
        let updatePayload = {};

        try {
            if (action === 'take') {
                // Prepara o payload para ATRIBUIÇÃO (Tecnico = logado, Status = Em andamento)
                updatePayload = {
                    status_Cham: STATUS_EM_ANDAMENTO,
                    tecResponsavel_Cham: this.usuarioLogadoId
                };

                await apiUpdateChamado(id, updatePayload);
                alert(`Chamado ${id} atribuído a você!`);
                iniciarSolucao(id); // Navega para a tela de solução
                return;

            } else if (action === 'continue') {
                // Navega para a tela de solução (o chamado já está atribuído)
                iniciarSolucao(id);
                return;

            } else if (action === 'close') {
                // Prepara o payload para FINALIZAÇÃO
                updatePayload = {
                    status_Cham: 'Fechado',
                    dataFechamento_Cham: new Date().toISOString().slice(0, 10)
                };
                await apiUpdateChamado(id, updatePayload);
            } else {
                return;
            }

            // Recarrega a lista após o close/finalização
            await this.loadData(); 

        } catch (error) {
            alert('Erro ao atualizar chamado: ' + error.message);
            console.error('Erro ao atualizar chamado:', error);
        }
    }

}

/**
 * Função exportada que inicia a view.
 * *Esta é a única função que precisa ser mantida inalterada no seu nome e exportação
 * para não quebrar dependências externas.*
 */
export async function renderTodosChamados() {
    window.chamadoManager = new ChamadoManager();
    await window.chamadoManager.init();
}

