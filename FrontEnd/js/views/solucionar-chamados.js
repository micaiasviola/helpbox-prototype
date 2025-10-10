import { apiGetChamados, apiGetChamadosTecnico, apiUpdateChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js'
import { store } from '../store.js';

const NIVEL_ADMIN = 3;
const NIVEL_TECNICO = 2;
const STATUS_EM_ANDAMENTO = 'Em andamento';
/**
 * Classe para gerenciar a exibição, carregamento e filtragem dos chamados.
 * Encapsula o estado e a lógica de manipulação do DOM.
 */
class ChamadoManager {
    constructor() {
        /** @type {Array<Object>} Dados brutos dos chamados carregados do DB. */
        this.chamadosData = [];
        this.tbody = null;
        this.loadingIndicator = null;
        this.filtroStatus = null;
        this.buscaInput = null;
        /** @type {number|null} ID do usuário logado, essencial para a lógica de atribuição. */
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        /** @type {number|null} Nível de acesso do usuário logado. */
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
    }

    /**
     * Inicializa a view, carrega os dados e configura os eventos.
     */
    async init() {
        if (!this.usuarioLogadoId) { 
         // Esta mensagem geralmente indica que store.usuarioLogado.id_user não foi encontrado.
         document.getElementById('view').innerHTML = '<div class="card error">Falha ao carregar dados do usuário logado. Recarregue a página.</div>';
         return;
    }
        // Redireciona se o ID do usuário não estiver disponível (segurança extra)
        if (!this.usuarioLogadoId || this.nivelAcesso < NIVEL_TECNICO) {
             document.getElementById('view').innerHTML = '<div class="card">Acesso não autorizado.</div>';
             return;
        }

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
            
            let rawChamados;

            if (this.nivelAcesso === NIVEL_ADMIN) {
                // Admin: Busca todos os chamados
                rawChamados = await apiGetChamados();
                
            } else if (this.nivelAcesso >= NIVEL_TECNICO) { // Nível 2 ou superior
                // Técnico: Usa a rota específica que retorna apenas os chamados relevantes
                rawChamados = await apiGetChamadosTecnico(); 
            } else {
                rawChamados = [];
            }
            
            // Não precisamos mais do filterChamadosForAccessLevel no frontend, 
            // pois o backend já filtrou, mas manter o filtro de busca/status é bom.
            this.chamadosData = rawChamados; 
            
            this.drawChamados(); // O drawChamados lida com os filtros de status/busca

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

        if (isClosed) {
            return '<button class="btn secondary" disabled>Fechado</button>';
        }
        
        // Lógica para chamados EM ANDAMENTO
        if (isInProgress) {
            if (isAssignedToMe) {
                return `<button class="btn" data-action="continue" data-id="${c.id_Cham}">Continuar Solucionando</button>`;
            } else if (!c.tecResponsavel_Cham) {
                // Chamado 'Em andamento' (encaminhado pelo cliente) e SEM técnico atribuído
                return `<button class="btn primary" data-action="take" data-id="${c.id_Cham}">🛠️ Solucionar Chamado</button>`;
            } else {
                // Em Andamento, mas de outro técnico/administrador
                return '<button class="btn secondary" disabled>Em Andamento (Atribuído)</button>';
            }
        }
        
        // Chamados "Aberto" (que não vieram da IA/cliente, ou o técnico não precisa ver)
        // Se for 'Aberto', o Técnico Nível 2 não precisa pegar, pois o fluxo é:
        // ABERTO -> (IA Responde) -> CLIENTE ENCAMINHA -> EM ANDAMENTO (Sem Técnico)
        // A lógica do Técnico agora é focar nos 'EM ANDAMENTO' não atribuídos.
        if (c.status_Cham === 'Aberto') {
             return '<button class="btn secondary" disabled>Aguardando IA/Cliente</button>';
        }

        // Caso default (ex: novo status)
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
            
            // 🛠️ NOVO: Lógica para exibir o nome do técnico
            const nomeTecnico = c.tecNome 
                ? `${c.tecNome} ${c.tecSobrenome}` 
                : 'Sem técnico'; 
            
            // O botão de finalizar só deve aparecer se o chamado for meu E estiver em andamento.
            const closeButton = (c.tecResponsavel_Cham === this.usuarioLogadoId && c.status_Cham !== 'Fechado') 
                ? `<button class="btn danger" data-action="close" data-id="${c.id_Cham}">Finalizar ✓</button>` 
                : '';

            return `
                 <tr>
                     <td>${c.id_Cham}</td>
                     <td>${nomeTecnico}</td> 
                     <td>${c.descricao_Cham || 'Sem descrição'}</td>
                     <td>${renderBadge(c.status_Cham)}</td>
                     <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
                     <td>${c.categoria_Cham || 'Não definida'}</td>
                     <td>${formatDate(c.dataAbertura_Cham)}</td>
                     <td>
                         ${actionButton}
                         ${closeButton}
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

            if (action === 'take') {
                // 1. O técnico assume o chamado (atribuição)
                updatePayload = { 
                    status_Cham: STATUS_EM_ANDAMENTO,
                    tecResponsavel_Cham: this.usuarioLogadoId 
                };
                
                // Realiza a atribuição ANTES de navegar
                await apiUpdateChamado(id, updatePayload);
                alert(`Chamado ${id} atribuído a você!`); 
                
                // 🚨 NOVO: Navega para a tela de solução após a atribuição
                iniciarSolucao(id);
                
                // Não precisa recarregar a lista se estamos navegando
                return; 

            } else if (action === 'continue') {
                // 2. O chamado já é dele -> Apenas navega
                iniciarSolucao(id);
                return; 
                
            } else if (action === 'close') {
                // ... (lógica de fechar, mantém o reload da lista)
                updatePayload = {
                     status_Cham: 'Fechado',
                     dataFechamento_Cham: new Date().toISOString().slice(0, 10)
                };
                await apiUpdateChamado(id, updatePayload);
            } else {
                 return;
            }
            
            // Recarrega a lista após a atualização (apenas para 'close')
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

