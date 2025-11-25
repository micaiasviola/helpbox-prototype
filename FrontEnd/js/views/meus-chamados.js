/**
 * @file meus-chamados.js
 * @description View "Meus Chamados" (Painel Pessoal).
 * * Esta tela tem uma dualidade interessante: ela serve tanto para o Cliente acompanhar
 * os chamados que abriu, quanto para o Técnico ver sua "fila de trabalho" pessoal.
 * * Minha prioridade aqui foi a clareza visual: o usuário precisa saber instantaneamente
 * se aquele item é uma tarefa para ele fazer ou apenas uma solicitação que ele está esperando.
 * @author [Micaías Viola - Full Stack Developer]
 */

import { apiGetMeusChamados } from '../api/chamados.js';
import { store } from '../store.js';
import { renderBadge, getPrioridadeTexto, renderDescricaoCurta, formatDate } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';
import { iniciarDetalhesIA } from './detalhes-IA.js'; 

// EXPOSIÇÃO GLOBAL (Hack de Escopo)
// Como estou gerando o HTML via Template Strings com atributos onclick="funcao()",
// o navegador busca essas funções no escopo global (window). 
// Como este é um módulo ES6 (fechado), preciso expor manualmente as funções que o HTML vai chamar.
window.iniciarDetalhesIA = iniciarDetalhesIA;
window.iniciarSolucao = iniciarSolucao;

/**
 * @constant {Object} ICONS
 * @description Ícones SVG Clean.
 * * Mantendo a consistência visual com o restante do sistema.
 */
const ICONS = {
    refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    eye: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
};

const NIVEL_TECNICO = 2;
const DEFAULT_PAGE_SIZE = 5;

/**
 * @class MeusChamadosView
 * @description Gerencia a view pessoal do usuário.
 */
class MeusChamadosView {
    constructor(containerId = 'view') {
        this.container = document.getElementById(containerId);
        this.chamados = []; 
        
        // Filtros de Estado
        this.filtroStatus = '';
        this.filtroTipo = ''; // Importante: Filtra entre "Criado por mim" vs "Atribuído a mim"
        this.termoBusca = '';
        
        this.currentPage = 1;
        this.totalCount = 0;
        this.pageSize = DEFAULT_PAGE_SIZE;
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
        
        // Singleton da instância para acesso global se necessário
        window.meusChamadosView = this;
    }

    async render() {
        this.renderBaseHTML();
        this.attachListeners();
        await this.loadChamados();
    }

    /**
     * @method renderBaseHTML
     * @description Injeta o Layout e CSS.
     * * Aqui utilizei Flexbox para criar uma barra de filtros responsiva que se adapta
     * se o usuário redimensionar a janela, mantendo os controles alinhados.
     */
    renderBaseHTML() {
        // Renderização Condicional: Só mostro o filtro de "Tipo" se o usuário for Técnico.
        // Clientes comuns não resolvem chamados, então não faz sentido mostrar essa opção para eles.
        const selectTipoHtml = this.nivelAcesso >= NIVEL_TECNICO ? `
            <select id="filtroTipo" class="select filter-item" style="border-left: 3px solid #6c5ce7; font-weight: 500;">
                <option value="">Todos os Vínculos</option>
                <option value="atribuido">Para eu resolver</option>
                <option value="criado">Que eu abri</option>
            </select>
        ` : '';

        const styles = `
            <style>
                /* --- BOTÕES TRANSPARENTES (Estilo Clean) --- */
                .btn-action {
                    padding: 6px;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: #555;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-action:hover { background: #eef2f6; color: #1976d2; } /* Azul padrão */
                .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
                
                /* Hover Verde para o botão Play (Resolver) - Incentivo visual à ação */
                .btn-action.play:hover { background: #e0f2f1; color: #00695c; }

                /* --- ESTRUTURA DOS FILTROS --- */
                .filters-card {
                    background: #fff; 
                    padding: 15px; 
                    border-radius: 8px; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
                    margin-bottom: 20px;
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                    flex-wrap: nowrap; 
                }

                .filter-item { width: auto; min-width: 160px; margin: 0; }
                .search-wrapper { flex-grow: 1; } /* Ocupa o espaço restante */
                .search-input { width: 100%; margin: 0; }
                
                .btn-refresh {
                    white-space: nowrap; 
                    height: 38px; 
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Mobile */
                @media (max-width: 768px) {
                    .filters-card { flex-wrap: wrap; }
                    .filter-item, .search-wrapper { width: 100%; min-width: 100%; }
                }

                /* Badges de Vínculo (Destaque visual importante) */
                .badge-vinculo { padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; }
                .badge-vinculo-criado { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
                .badge-vinculo-atribuido { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
                
                .toolbar-title { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
                .icon-bg { background:#eef2f6; padding:8px; border-radius:8px; color:#4a5568; display: flex; align-items: center; }
            </style>
        `;

        this.container.innerHTML = `
            ${styles}
            
            <div class="toolbar-title">
                <div class="icon-bg">${ICONS.list}</div>
                <div>
                    <h2 style="margin:0; font-size: 1.5rem; color: #2d3748;">Meus Chamados</h2>
                    <small style="color:#718096">Acompanhe suas solicitações e tarefas</small>
                </div>
            </div>

            <div class="filters-card">
                ${selectTipoHtml}

                <select id="filtroStatus" class="select filter-item">
                    <option value="">Todos os status</option>
                    <option ${this.filtroStatus === 'Aberto' ? 'selected' : ''}>Aberto</option>
                    <option ${this.filtroStatus === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                    <option ${this.filtroStatus === 'Fechado' ? 'selected' : ''}>Fechado</option>
                </select>
                
                <div class="search-wrapper">
                    <input id="busca" class="input search-input" autocomplete="off" placeholder="Buscar por ID ou descrição..." value="${this.termoBusca}"/>
                </div>
                
                <button id="refreshChamados" class="btn btn-secondary btn-refresh">
                    ${ICONS.refresh} Atualizar
                </button>
            </div>
            
            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            
            <div class="table-responsive" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <table class="table" style="margin-bottom:0;">
                    <thead style="background: #f8f9fa; border-bottom: 2px solid #edf2f7;">
                        <tr>
                            <th style="color:#4a5568;">ID</th>
                            <th class="col-descricao" style="color:#4a5568;">Descrição</th>
                            <th style="color:#4a5568;">Status</th>
                            <th style="color:#4a5568;">Prioridade</th>
                            <th style="color:#4a5568;">Categoria</th>
                            <th style="color:#4a5568;">Data</th>
                            <th style="color:#4a5568;">Vínculo</th> 
                            <th style="color:#4a5568; text-align:right;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyChamados"></tbody>
                </table>
            </div>
            <div id="paginationContainer" class="pagination-container" style="margin-top:15px;"></div>

            <dialog id="descModal" style="position: fixed; inset: 0; margin: auto; border: none; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.25); z-index: 10000;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <h3 style="margin:0; color:#2d3748;">Descrição do Chamado</h3>
                    <button onclick="document.getElementById('descModal').close()" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999;">&times;</button>
                </div>
                <div id="descModalContent" style="line-height: 1.6; color: #4a5568; max-height: 60vh; overflow-y: auto; white-space: pre-wrap; font-size: 0.95rem;"></div>
                <div style="text-align:right; margin-top:20px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('descModal').close()">Fechar</button>
                </div>
            </dialog>
        `;
    }

    verDescricaoCompleta(id) {
        const chamado = this.chamados.find(c => c.id_Cham === id);
        if (chamado) {
            const modal = document.getElementById('descModal');
            document.getElementById('descModalContent').innerText = chamado.descricao_Cham;
            modal.showModal(); 
        }
    }

    triggerLoad(resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }
        this.loadChamados(true);
    }

    attachListeners() {
        const filtroStatusEl = document.getElementById('filtroStatus');
        const filtroTipoEl = document.getElementById('filtroTipo');
        const buscaEl = document.getElementById('busca');
        const refreshEl = document.getElementById('refreshChamados');

        if (filtroStatusEl) {
            filtroStatusEl.addEventListener('change', (e) => {
                this.filtroStatus = e.target.value;
                this.triggerLoad(true);
            });
        }
        if (filtroTipoEl) {
            filtroTipoEl.addEventListener('change', (e) => {
                this.filtroTipo = e.target.value;
                this.triggerLoad(true);
            });
        }
        // Debounce na busca para evitar muitas requisições
        if (buscaEl) {
            let debounceTimeout;
            buscaEl.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    this.termoBusca = e.target.value.toLowerCase();
                    this.triggerLoad(true);
                }, 300);
            });
        }
        if (refreshEl) {
            refreshEl.addEventListener('click', () => {
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
     * @method loadChamados
     * @description Busca dados do backend.
     * * O endpoint `apiGetMeusChamados` já é inteligente o suficiente para saber quem é
     * o usuário logado e filtrar os dados, mas eu envio parâmetros extras de filtro da UI.
     */
    async loadChamados() {
        const loadingDiv = document.getElementById('loadingChamados');
        const tbody = document.getElementById('tbodyChamados');

        if (loadingDiv) loadingDiv.style.display = 'block';
        if (tbody) tbody.innerHTML = '';

        try {
            const response = await apiGetMeusChamados(
                this.currentPage,
                this.pageSize,
                this.termoBusca,
                this.filtroStatus,
                this.filtroTipo 
            );

            this.chamados = response.chamados;
            this.totalCount = response.totalCount;

            // Ordenação no Cliente para garantir a consistência visual imediata
            const chamadosOrdenados = this.sortChamados(this.chamados);

            this.renderTable(chamadosOrdenados);
            this.renderPagination();

            if (this.chamados.length === 0 && tbody) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#718096;">Nenhum chamado encontrado com os filtros atuais.</td></tr>';
            }
        } catch (error) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="td-error" style="padding:20px; text-align:center; color:#e53e3e;">Erro ao carregar: ${error.message}</td></tr>`;
            console.error(error);
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    /**
     * @method sortChamados
     * @description Lógica de ordenação visual.
     * * A prioridade é mostrar primeiro o que o usuário precisa ATUAR (Em andamento + É meu).
     * Depois o que está pendente, e por fim o histórico.
     */
    sortChamados(chamados) {
        const copy = [...chamados];
        const MEU_ID = Number(this.usuarioLogadoId); 
        const STATUS_EM_ANDAMENTO = 'Em andamento';

        return copy.sort((a, b) => {
            const tecIdA = Number(a.tecResponsavel_Cham);
            const tecIdB = Number(b.tecResponsavel_Cham);
            const statusA = a.status_Cham;
            const statusB = b.status_Cham;

            const getWeight = (status, tecId) => {
                if (status === STATUS_EM_ANDAMENTO && tecId === MEU_ID) return 0; // Topo
                if (status === STATUS_EM_ANDAMENTO && !tecId) return 1; // Meio
                if (status === STATUS_EM_ANDAMENTO && tecId !== MEU_ID) return 2;
                if (status === 'Aberto') return 3;
                if (status === 'Fechado') return 4; // Fim
                return 9;
            };

            const weightA = getWeight(statusA, tecIdA);
            const weightB = getWeight(statusB, tecIdB);

            if (weightA !== weightB) return weightA - weightB;

            // Desempate por data (mais recente primeiro)
            const dateA = new Date(a.dataAbertura_Cham);
            const dateB = new Date(b.dataAbertura_Cham);
            return dateB - dateA; 
        });
    }

    /**
     * @method getActionButton
     * @description Decide qual botão exibir com base no papel do usuário no chamado.
     * * Aqui a lógica é diferente da tela de "Todos os Chamados".
     * Se eu sou o autor: Vejo "Ver Solução" (ícone Eye).
     * Se sou técnico responsável: Vejo "Resolver" (ícone Play).
     */
    getActionButton(chamadoId, status, clienteId_Cham) {
        const statusLower = status.toLowerCase();
        const isAuthor = Number(this.usuarioLogadoId) === Number(clienteId_Cham);

        // Cenário 1: Eu sou o autor (Cliente) -> Apenas visualizo a solução/progresso
        if (isAuthor) {
            return `<button class="btn-action" onclick="iniciarDetalhesIA(${chamadoId})" title="Ver Solução">
                ${ICONS.eye}
            </button>`;
        }

        // Cenário 2: Sou Técnico
        if (this.nivelAcesso >= NIVEL_TECNICO) {
            // Se o chamado está ativo, dou a opção de trabalhar nele (Play)
            if (statusLower !== 'fechado' && statusLower !== 'resolvido') {
                return `<button class="btn-action play" onclick="iniciarSolucao(${chamadoId})" title="Resolver">
                    ${ICONS.play}
                </button>`;
            }
            // Se já fechou, apenas histórico (Eye)
            return `<button class="btn-action" onclick="iniciarDetalhesIA(${chamadoId})" title="Visualizar">
                ${ICONS.eye}
            </button>`;
        }

        return `<button class="btn-action" disabled title="Visualizar">${ICONS.eye}</button>`;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const container = document.getElementById('paginationContainer');
        const instanceName = 'meusChamadosView';

        if (!container) return;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let buttons = '';
        if (this.currentPage > 1) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage - 1})">← Anterior</button>`;
        }

        for (let i = 1; i <= totalPages; i++) {
             if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                const activeClass = i === this.currentPage ? 'primary' : 'secondary';
                buttons += `<button class="btn btn-sm ${activeClass}" onclick="window.${instanceName}.goToPage(${i})">${i}</button>`;
             } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                 buttons += `<span class="pagination-ellipsis" style="padding:0 5px; color:#999;">...</span>`;
             }
        }

        if (this.currentPage < totalPages) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage + 1})">Próximo →</button>`;
        }

        container.innerHTML = `<div class="pagination" style="display:flex; gap:5px; justify-content:center; margin-top:20px;">${buttons}</div>`;
    }

    renderTable(data) {
        const tbody = document.getElementById('tbodyChamados');
        if (!tbody) return;

        tbody.innerHTML = data.map(chamado => {
            const isAuthor = Number(this.usuarioLogadoId) === Number(chamado.clienteId_Cham);
            
            // Badge visual para diferenciar origem
            const vinculoHtml = isAuthor 
                ? `<span class="badge-vinculo badge-vinculo-criado">${ICONS.user} Criado por mim</span>`
                : `<span class="badge-vinculo badge-vinculo-atribuido">${ICONS.briefcase} Atribuído a mim</span>`;

            return `
                 <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="color:#718096; text-align:center;">${chamado.id_Cham}</td>
                    <td class="col-descricao" onclick="window.meusChamadosView.verDescricaoCompleta(${chamado.id_Cham})" title="Ver descrição completa" style="cursor: pointer; color: #4a5568;">
                        ${renderDescricaoCurta(chamado.descricao_Cham, chamado.id_Cham)}
                    </td>
                    <td>${renderBadge(chamado.status_Cham)}</td>
                    <td>${getPrioridadeTexto(chamado.prioridade_Cham)}</td>
                    <td style="color:#4a5568;">${chamado.categoria_Cham || '-'}</td>
                    <td style="color:#718096; font-size:0.9em;">${formatDate(chamado.dataAbertura_Cham)}</td>
                    <td>${vinculoHtml}</td> 
                    <td style="text-align:right;">
                        ${this.getActionButton(chamado.id_Cham, chamado.status_Cham, chamado.clienteId_Cham)}
                    </td>
                 </tr>
            `;
        }).join('');
    }
}

export function renderMeusChamados() {
    window.meusChamadosView = new MeusChamadosView('view');
    window.meusChamadosView.render();
}