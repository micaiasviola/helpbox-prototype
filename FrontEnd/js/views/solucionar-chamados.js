import { apiGetChamados, apiUpdateChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate } from '../utils/helpers.js';
import { store } from '../store.js';

const NIVEL_ADMIN = 3;
const NIVEL_TECNICO = 2;

/**
 * Classe para gerenciar a exibição, carregamento e filtragem dos chamados.
 * Encapsula o estado e a lógica de manipulação do DOM.
 */
class ChamadoManager {
    /*
    *@param {number} acessLevel - Nível de acesso do usuário atual.
    */constructor() {
        /** @type {Array<Object>} Dados brutos dos chamados carregados do DB. */
        this.chamadosData = [];
        this.tbody = null;
        this.loadingIndicator = null;
        this.filtroStatus = null;
        this.buscaInput = null;
    }

    /**
     * Inicializa a view, carrega os dados e configura os eventos.
     */
    async init() {
        this.renderBaseHTML();
        this.assignDOMelements();
        this.setupEvents();
        await this.loadChamadosFromDB();
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
                        <th>ID Tecnico</th>
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
        `;
    }

    /**
     * Atribui as referências aos elementos do DOM para uso interno.
     * @private
     */
    assignDOMelements() {
        this.tbody = document.getElementById('tbody');
        this.loadingIndicator = document.getElementById('loadingChamados');
        this.filtroStatus = document.getElementById('filtroStatus');
        this.buscaInput = document.getElementById('busca');
    }

    /**
     * Configura os listeners de eventos.
     * @private
     */
    setupEvents() {
        document.getElementById('refreshChamados').addEventListener('click', () => this.loadChamadosFromDB());
        this.filtroStatus.addEventListener('change', () => this.drawChamados());
        this.buscaInput.addEventListener('input', () => this.drawChamados());
        // O event listener para as ações dos botões deve ser no tbody
        // pois os botões são adicionados dinamicamente.
        this.tbody.addEventListener('click', this.handleChamadoActions.bind(this));
    }

    /**
     * Carrega os dados de chamados da API e atualiza o estado da classe.
     */
    async loadChamadosFromDB() {
        try {
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'block';
                this.loadingIndicator.textContent = 'Carregando chamados...';
            }
            
            this.chamadosData = await apiGetChamados();
            this.drawChamados(this.chamadosData);
            
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
     * Renderiza a tabela de chamados (linhas).
     * @param {Array<Object>} chamados - Lista de chamados a serem renderizados.
     * @private
     */
    renderChamadosTable(chamados) {
        if (!this.tbody) return;

        this.tbody.innerHTML = '';
        const rows = chamados.map(c => {
            return `
                <tr>
                    <td>${c.id_Cham}</td>
                    <td>${c.tecResponsavel_Cham || 'Sem tecnico'}</td>
                    <td>${c.descricao_Cham || 'Sem descrição'}</td>
                    <td>${renderBadge(c.status_Cham)}</td>
                    <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
                    <td>${c.categoria_Cham || 'Não definida'}</td>
                    <td>${formatDate(c.dataAbertura_Cham)}</td>
                    <td>
                        <button class="btn" data-action="progress" data-id="${c.id_Cham}">Mover ↻</button>
                        <button class="btn secondary" data-action="close" data-id="${c.id_Cham}">Finalizar ✓</button>
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
             this.renderChamadosTable([]); // Limpa a tabela
             return;
        }

        const status = this.filtroStatus.value;
        const q = this.buscaInput.value.toLowerCase();

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

        try {
            let updatePayload = {};
            if (action === 'progress') {
                updatePayload = { status_Cham: 'Em andamento' };
            } else if (action === 'close') {
                updatePayload = {
                    status_Cham: 'Fechado',
                    dataFechamento_Cham: new Date().toISOString().slice(0, 10)
                };
            } else {
                 return; // Ação desconhecida
            }
            
            await apiUpdateChamado(id, updatePayload);

            // Recarrega a lista após a atualização
            await this.loadChamadosFromDB();

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
    const manager = new ChamadoManager();
    await manager.init();
}

