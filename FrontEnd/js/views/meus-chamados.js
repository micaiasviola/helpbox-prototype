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
        this.chamados = [];

        // Filtros
        this.filtroStatus = '';
        this.filtroTipo = '';
        this.termoBusca = '';

        this.currentPage = 1;
        this.totalCount = 0;
        this.pageSize = DEFAULT_PAGE_SIZE;
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;

        // Garante a instância global para os onclicks
        window.meusChamadosView = this;
    }

    async render() {
        this.container.innerHTML = this.getTemplate();
        this.attachListeners();
        await this.loadChamados();
    }

    getTemplate() {
        const selectTipoHtml = this.nivelAcesso >= NIVEL_TECNICO ? `
            <select id="filtroTipo" class="select" style="max-width:200px; border-left: 3px solid #6c5ce7;">
                <option value="">Todos os Vínculos</option>
                <option value="atribuido" ${this.filtroTipo === 'atribuido' ? 'selected' : ''}>🛠️ Para eu resolver</option>
                <option value="criado" ${this.filtroTipo === 'criado' ? 'selected' : ''}>👤 Que eu abri</option>
            </select>
        ` : '';

        return `
            <div class="toolbar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                ${selectTipoHtml}

                <select id="filtroStatus" class="select" style="max-width:180px">
                    <option value="">Todos os status</option>
                    <option ${this.filtroStatus === 'Aberto' ? 'selected' : ''}>Aberto</option>
                    <option ${this.filtroStatus === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                    <option ${this.filtroStatus === 'Fechado' ? 'selected' : ''}>Fechado</option>
                </select>
                
                <input id="busca" class="input" autocomplete="off" placeholder="Buscar por descrição..." value="${this.termoBusca}" style="max-width:300px"/>
                
                <button id="refreshChamados" class="btn">🔄 Atualizar</button>
            </div>
            
            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th class="col-descricao">Descrição</th>
                            <th>Status</th>
                            <th>Prioridade</th>
                            <th>Categoria</th>
                            <th>Data</th>
                            <th>Vínculo</th> 
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyChamados"></tbody>
                </table>
            </div>
            <div id="paginationContainer" class="pagination-container"></div>

            <dialog id="descModal" style="
                position: fixed;
                inset: 0;
                margin: auto;
                border: none; 
                border-radius: 8px; 
                padding: 20px; 
                max-width: 600px; 
                width: 90%; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 10000;
            ">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; color:#333;">Descrição do Chamado</h3>
                    <button onclick="document.getElementById('descModal').close()" style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
                </div>
                
                <div id="descModalContent" style="
                    line-height: 1.6; 
                    color: #555; 
                    max-height: 60vh; 
                    overflow-y: auto; 
                    white-space: pre-wrap;
                    padding-right: 5px;
                "></div>
                
                <div style="text-align:right; margin-top:20px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('descModal').close()">Fechar</button>
                </div>
            </dialog>
        `;
    }

    /**
     * Busca o texto completo e abre o modal
     */
    verDescricaoCompleta(id) {
        const chamado = this.chamados.find(c => c.id_Cham === id);
        if (chamado) {
            const modal = document.getElementById('descModal');
            const content = document.getElementById('descModalContent');
            content.innerText = chamado.descricao_Cham;
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

            this.renderTable(this.chamados);
            this.renderPagination();

            if (this.chamados.length === 0 && tbody) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Nenhum chamado encontrado com os filtros atuais.</td></tr>';
            }
        } catch (error) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="td-error">Erro ao carregar chamados: ${error.message}</td></tr>`;
            console.error(error);
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    getActionButton(chamadoId, status, clienteId_Cham) {
        const statusLower = status.toLowerCase();
        const isAuthor = Number(this.usuarioLogadoId) === Number(clienteId_Cham);

        if (isAuthor) {
            return `<button class="btn btn-primary btn-sm" onclick="detalharChamadoIA(${chamadoId})">Ver Solução</button>`;
        }

        if (this.nivelAcesso >= NIVEL_TECNICO) {
            if (statusLower !== 'fechado' && statusLower !== 'resolvido') {
                return `<button class="btn btn-third btn-sm" onclick="iniciarSolucao(${chamadoId})">Resolver</button>`;
            }
            return `<button class="btn btn-secondary btn-sm" onclick="detalharChamadoIA(${chamadoId})">Visualizar</button>`;
        }

        return `<button class="btn btn-secondary btn-sm" disabled>Visualizar</button>`;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const paginationContainer = document.getElementById('paginationContainer');
        const instanceName = 'meusChamadosView';

        if (!paginationContainer) return;
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let buttons = '';

        if (this.currentPage > 1) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage - 1})">←</button>`;
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                const activeClass = i === this.currentPage ? 'primary' : 'secondary';
                buttons += `<button class="btn btn-sm ${activeClass}" onclick="window.${instanceName}.goToPage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                buttons += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        if (this.currentPage < totalPages) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage + 1})">→</button>`;
        }

        paginationContainer.innerHTML = `<div class="pagination" style="display:flex; gap:5px; justify-content:center; margin-top:15px;">${buttons}</div>`;
    }

    renderTable(data) {
        const tbody = document.getElementById('tbodyChamados');
        if (!tbody) return;

        tbody.innerHTML = data.map(chamado => {
            const isAuthor = Number(this.usuarioLogadoId) === Number(chamado.clienteId_Cham);

            let vinculoHtml = '';
            if (isAuthor) {
                vinculoHtml = '<span class="badge" style="background:#e2e8f0; color:#475569;">👤 Criado por mim</span>';
            } else {
                vinculoHtml = '<span class="badge" style="background:#dbeafe; color:#1e40af;">🛠️ Atribuído a mim</span>';
            }

            const actionButton = this.getActionButton(chamado.id_Cham, chamado.status_Cham, chamado.clienteId_Cham);

            // 🚨 CÉLULA DE DESCRIÇÃO LIMPA
            return `
                 <tr>
                    <td>${chamado.id_Cham}</td>
       
       <td class="col-descricao"
           onclick="window.meusChamadosView.verDescricaoCompleta(${chamado.id_Cham})"
           title="Clique para ver a descrição completa"
           style="cursor: pointer; color: #2d3436;" 
       >
           ${renderDescricaoCurta(chamado.descricao_Cham, chamado.id_Cham)}
       </td>

                    <td>${renderBadge(chamado.status_Cham)}</td>
                    <td>${getPrioridadeTexto(chamado.prioridade_Cham)}</td>
                    <td>${chamado.categoria_Cham}</td>
                    <td>${new Date(chamado.dataAbertura_Cham).toLocaleDateString()}</td>
                    <td>${vinculoHtml}</td> 
                    <td>${actionButton}</td>
                 </tr>
             `;
        }).join('');
    }
}

export function renderMeusChamados() {
    window.meusChamadosView = new MeusChamadosView('view');
    window.meusChamadosView.render();
}