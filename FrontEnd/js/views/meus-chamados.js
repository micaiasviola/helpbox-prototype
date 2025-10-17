import { apiGetMeusChamados } from '../api/chamados.js';
import { store } from '../store.js';
import { renderBadge, getPrioridadeTexto, renderDescricaoCurta } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';

// Constantes de Nível de Acesso e Paginação
const NIVEL_TECNICO = 2;
const DEFAULT_PAGE_SIZE = 5;

/**
 * Classe responsável por exibir, filtrar e buscar os chamados de um cliente específico.
 */
class MeusChamadosView {
    constructor(containerId = 'view') {
        this.container = document.getElementById(containerId);
        this.chamados = []; // Mantém apenas a lista da página atual
        this.filtroStatus = '';
        this.termoBusca = '';
        this.currentPage = 1;
        this.totalCount = 0;
        this.pageSize = DEFAULT_PAGE_SIZE;
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
    }

    async render() {
        this.container.innerHTML = this.getTemplate();
        this.attachListeners();
        await this.loadChamados();
    }

    getTemplate() {
        return `
            <div class="toolbar">
                <select id="filtroStatus" class="select filtro-status">
                    <option value="">Todos os status</option>
                    <option ${this.filtroStatus === 'Aberto' ? 'selected' : ''}>Aberto</option>
                    <option ${this.filtroStatus === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                    <option ${this.filtroStatus === 'Fechado' ? 'selected' : ''}>Fechado</option>
                </select>
                <input id="busca" class="input input-busca" placeholder="Buscar por descrição..." value="${this.termoBusca}"/>
                <button id="refreshChamados" class="btn">🔄 Atualizar</button>
            </div>
            
            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>ID Chamado</th>
                        <th>Cliente</th> 
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Categoria</th>
                        <th>Data Abertura</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="tbodyChamados">
                </tbody>
            </table>
            
            <div id="paginationContainer" class="pagination-container""></div>
        `;
    }

    /**
     * Dispara o carregamento dos chamados a partir do servidor.
     * @param {boolean} resetPage Se a página atual deve ser resetada para 1.
     */
    triggerLoad(resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }
        // Chamado com forceReload=true para ignorar o cache (se ele existisse)
        this.loadChamados(true);
    }

    attachListeners() {
        const filtroStatusEl = document.getElementById('filtroStatus');
        const buscaEl = document.getElementById('busca');
        const refreshEl = document.getElementById('refreshChamados');

        // Listener de Filtro de Status (Dispara busca GLOBAL no servidor)
        if (filtroStatusEl) {
            filtroStatusEl.addEventListener('change', (e) => {
                this.filtroStatus = e.target.value;
                this.termoBusca = document.getElementById('busca').value; // Mantém a busca
                this.triggerLoad(true); // Reseta a página para 1 e recarrega
            });
        }

        // Listener de Busca (Dispara busca GLOBAL no servidor)
        if (buscaEl) {
            let debounceTimeout;
            buscaEl.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);

                // Usamos debounce para não sobrecarregar o servidor a cada tecla
                debounceTimeout = setTimeout(() => {
                    this.termoBusca = e.target.value.toLowerCase();
                    this.filtroStatus = document.getElementById('filtroStatus').value; // Mantém o status
                    this.triggerLoad(true); // Reseta a página para 1 e recarrega
                }, 300); // Espera 300ms após a digitação
            });
        }

        // Listener de Atualizar
        if (refreshEl) {
            refreshEl.addEventListener('click', () => {
                // Ao atualizar, mantém os filtros e recarrega a página 1
                this.triggerLoad(true);
            });
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.loadChamados(true);
    }

    /**
     * Carrega os chamados do servidor, enviando página, tamanho, busca e filtro.
     */
    async loadChamados() {
        const loadingDiv = document.getElementById('loadingChamados');
        const tbody = document.getElementById('tbodyChamados');

        if (loadingDiv) loadingDiv.style.display = 'block';
        if (tbody) tbody.innerHTML = '';

        try {
            // 🚨 NOVO: Passando todos os parâmetros de filtragem para a API
            const response = await apiGetMeusChamados(
                this.currentPage,
                this.pageSize,
                this.termoBusca,
                this.filtroStatus
            );

            this.chamados = response.chamados;
            this.totalCount = response.totalCount;

            this.renderTable(this.chamados); // Apenas renderiza, sem filtro local
            this.renderPagination();

            if (this.chamados.length === 0 && tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="td-center"">Nenhum chamado encontrado.</td></tr>';
            }
        } catch (error) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="td-error"">Erro ao carregar chamados: ${error.message}</td></tr>`;
            console.error(error);
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    // 🚨 drawChamados / applyFilters foi removido, pois a busca é toda no servidor agora.

    getActionButton(chamadoId, status, clienteId_Cham) {
        const statusLower = status.toLowerCase();

        // Variável para checar se o usuário logado é o autor do chamado
        const isAuthor = this.usuarioLogadoId === clienteId_Cham;

        // --- 1. LÓGICA DO CLIENTE/AUTOR ---
        // Se o usuário logado é o autor (Nível 1, ou Admin abrindo para si mesmo)
        // Ele SEMPRE deve ver o botão de Cliente ("Ver Solução"), a menos que seja um Nível 2 que pegou.
        if (isAuthor) {
            // Se o Admin/Técnico é o autor, ele deve ver como um cliente (Ver Solução)
            return `
                <button class="btn btn-primary btn-sm" onclick="detalharChamadoIA(${chamadoId})">
                    Ver Solução
                </button>
            `;
        }

        // --- 2. LÓGICA DO TÉCNICO/SOLUCIONADOR ---
        // Se não é o autor, mas é um Técnico/Admin que está no escopo de solução (Nível >= 2).
        if (this.nivelAcesso >= NIVEL_TECNICO) {

            // Se for um chamado ativo, ele pode continuar solucionando.
            if (statusLower !== 'fechado') {
                return `
                    <button class="btn btn-third btn-sm" onclick="iniciarSolucao(${chamadoId})">
                        Continuar Solucionando
                    </button>
                `;
            }
        }

        // Se o chamado foi aberto por outra pessoa, e o usuário logado não é técnico,
        // ou se não for um cenário de atribuição/autoria, volta para a visão padrão.
        return `
            <button class="btn btn-primary btn-sm" onclick="detalharChamadoIA(${chamadoId})">
                Ver Solução
            </button>
        `;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const paginationContainer = document.getElementById('paginationContainer');

        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        let buttons = '';
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        buttons += `<button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.meusChamadosView.goToPage(${this.currentPage - 1})">← Anterior</button>`;

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'primary' : 'secondary';
            buttons += `<button class="btn btn-sm ${activeClass}" onclick="window.meusChamadosView.goToPage(${i})">${i}</button>`;
        }

        buttons += `<button class="btn btn-sm" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window.meusChamadosView.goToPage(${this.currentPage + 1})">Próximo →</button>`;

        paginationContainer.innerHTML = `<div class="pagination">${buttons}</div>`;
    }

    renderTable(data) {
        const tbody = document.getElementById('tbodyChamados');
        if (!tbody) return;

        tbody.innerHTML = data.map(chamado => {
            const nomeCompleto = `${chamado.nome_User || ''} ${chamado.sobrenome_User || ''}`.trim();

            // Passar o ID do cliente que abriu o chamado
            const actionButton = this.getActionButton(
                chamado.id_Cham,
                chamado.status_Cham,
                chamado.clienteId_Cham
            );

            return `
                 <tr>
                    <td>${chamado.id_Cham}</td>
                     <td>${nomeCompleto || chamado.clienteId_Cham}</td> 
                    <td>${renderDescricaoCurta(chamado.descricao_Cham, chamado.id_Cham)}</td>                     <td>${renderBadge(chamado.status_Cham)}</td>
                     <td>${getPrioridadeTexto(chamado.prioridade_Cham)}</td>
                     <td>${chamado.categoria_Cham}</td>
                     <td>${new Date(chamado.dataAbertura_Cham).toLocaleDateString()}</td>
                     <td>
                        ${actionButton}
                     </td>
                 </tr>
             `;
        }).join('');

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum chamado encontrado com os filtros atuais.</td></tr>';
        }
    }
}

window.iniciarSolucao = iniciarSolucao;
// Se 'detalharChamadoIA' for uma função, deve ser tornada global aqui também
// window.detalharChamadoIA = detalharChamadoIA; 

export function renderMeusChamados() {
    window.meusChamadosView = new MeusChamadosView('view');
    window.meusChamadosView.render();
}