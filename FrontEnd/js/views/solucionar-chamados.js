/*
 * =================================================================
 * View: Solucionar Chamados (Refatorado)
 * =================================================================
 */

import { apiGetChamados, apiGetChamadosTecnico, apiUpdateChamado, apiDeleteChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate, renderDescricaoCurta } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';
import { store } from '../store.js';
import { BaseListView } from '../utils/base-list-view.js';

const NIVEL_ADMIN = 3;
const NIVEL_TECNICO = 2;
const STATUS_EM_ANDAMENTO = 'Em andamento';
const DEFAULT_PAGE_SIZE = 5;

class ChamadoManager extends BaseListView {
    
    constructor() {
        super(DEFAULT_PAGE_SIZE); 
        this.chamadosData = [];
        
        // Elementos DOM (Cache)
        this.elements = {};
        
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;

        // Garante acesso global para onclicks (descrição, paginação)
        window.chamadoManager = this;
    }

    async init() {
        if (!this.usuarioLogadoId || this.nivelAcesso < NIVEL_TECNICO) {
            document.getElementById('view').innerHTML = '<div class="card">Acesso não autorizado.</div>';
            return;
        }
        
        this.renderBaseHTML();
        this.cacheElements();
        this.setupEvents();
        await this.loadData(); 
    }

    cacheElements() {
        this.elements = {
            tbody: document.getElementById('tbody'),
            loading: document.getElementById('loadingChamados'),
            filtroStatus: document.getElementById('filtroStatus'),
            busca: document.getElementById('busca'),
            refreshBtn: document.getElementById('refreshChamados'),
            pagination: document.getElementById('paginationContainer')
        };
    }

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
                <input id="busca" class="input" autocomplete="off" placeholder="Buscar por ID ou descrição..." style="max-width:320px"/>
                <button id="refreshChamados" class="btn">🔄 Atualizar</button>
            </div>

            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width:60px; text-align:center;">ID</th>
                            <th>Responsável</th>
                            <th class="col-descricao">Descrição</th>
                            <th>Status</th>
                            <th>Prioridade</th>
                            <th>Categoria</th>
                            <th>Data</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody"></tbody>
                </table>
            </div>
            <div id="paginationContainer" class="pagination-container"></div>

            <dialog id="descModalSolucao" style="position: fixed; inset: 0; margin: auto; border: none; border-radius: 8px; padding: 20px; max-width: 600px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 10000;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; color:#333;">Descrição Detalhada</h3>
                    <button onclick="document.getElementById('descModalSolucao').close()" style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
                </div>
                <div id="descModalSolucaoContent" style="line-height: 1.6; color: #555; max-height: 60vh; overflow-y: auto; white-space: pre-wrap; padding-right: 5px;"></div>
                <div style="text-align:right; margin-top:20px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('descModalSolucao').close()">Fechar</button>
                </div>
            </dialog>
        `;
    }

    verDescricaoCompleta(id) {
        const chamado = this.chamadosData.find(c => c.id_Cham === id);
        if (chamado) {
            const modal = document.getElementById('descModalSolucao');
            document.getElementById('descModalSolucaoContent').innerText = chamado.descricao_Cham;
            modal.showModal();
        }
    }

    renderChamadosTable(chamados) {
        const tbody = this.elements.tbody;
        if (!tbody) return;

        if (chamados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum chamado encontrado.</td></tr>';
            return;
        }

        const rows = chamados.map(c => {
            const actionButton = this.getActionButton(c);
            
            const nomeTecnico = c.tecNome 
                ? `${c.tecNome} ${c.tecSobrenome}` 
                : (c.tecResponsavel_Cham ? `ID: ${c.tecResponsavel_Cham}` : '<span style="color:#999; font-style:italic;">Sem técnico</span>');
            
            return `
                <tr>
                    <td style="text-align:center;"><strong>${c.id_Cham}</strong></td>
                    <td>${nomeTecnico}</td>
                    
                    <td class="col-descricao"
                        onclick="window.chamadoManager.verDescricaoCompleta(${c.id_Cham})"
                        title="Clique para ler a descrição completa"
                        style="cursor: pointer; color: #2d3436;"
                    >
                        ${renderDescricaoCurta(c.descricao_Cham || '', c.id_Cham)}
                    </td>
                    
                    <td>${renderBadge(c.status_Cham)}</td>
                    <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
                    <td>${c.categoria_Cham || '-'}</td>
                    <td>${formatDate(c.dataAbertura_Cham)}</td>
                    <td>${actionButton}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = rows;
    }

    getActionButton(c) {
        const meuId = Number(this.usuarioLogadoId);
        const tecId = Number(c.tecResponsavel_Cham);
        const isAdmin = this.nivelAcesso === NIVEL_ADMIN;
        
        // 1. Fechado (Histórico ou Exclusão)
        if (c.status_Cham === 'Fechado') {
            if (isAdmin) return `<button class="btn btn-secondary small" data-action="delete" data-id="${c.id_Cham}">🗑️</button>
            <button class="btn btn-danger small" data-action="view" data-id="${c.id_Cham}" title="Atribuído a outro">👁️</button>`;
            return `<button class="btn btn-secondary small" data-action="view" data-id="${c.id_Cham}">Histórico</button>`;
        }

        // 2. Em Andamento
        if (c.status_Cham === STATUS_EM_ANDAMENTO) {
            if (tecId === meuId) return `<button class="btn btn-third small" data-action="continue" data-id="${c.id_Cham}">Continuar</button>`;
            if (!c.tecResponsavel_Cham) return `<button class="btn btn-primary small" data-action="take" data-id="${c.id_Cham}">Assumir</button>`;
            return `<button class="btn btn-danger small" data-action="view" data-id="${c.id_Cham}" title="Atribuído a outro">👁️</button>`;
        }
        
        // 3. Aberto
        return `<button class="btn btn-fourth small" data-action="view" data-id="${c.id_Cham}">Detalhes</button>`;
    }

    async loadData() {
        this.toggleLoading(true);
        
        try {
            const filtroStatus = this.elements.filtroStatus.value;
            let termoBusca = this.elements.busca.value.trim();

            // DICA: Se for número, podemos enviar como busca também (sua API SQL deve usar LIKE OR id = X)
            const apiParams = [this.currentPage, this.pageSize, termoBusca, filtroStatus];
            
            let response;
            if (this.nivelAcesso === NIVEL_ADMIN) {
                response = await apiGetChamados(...apiParams);
            } else {
                response = await apiGetChamadosTecnico(...apiParams);
            }

            this.chamadosData = response.chamados || [];
            this.totalCount = response.totalCount || 0; 

            this.drawChamados();
            this.renderPagination();

        } catch (error) {
            console.error('Erro loadData:', error);
            this.elements.tbody.innerHTML = '<tr><td colspan="8" class="td-error">Erro ao carregar dados.</td></tr>';
        } finally {
            this.toggleLoading(false);
        }
    }

    toggleLoading(show) {
        if (this.elements.loading) this.elements.loading.style.display = show ? 'block' : 'none';
    }

   drawChamados() {
        const chamadosOrdenados = [...this.chamadosData].sort((a, b) => {
            const meuId = Number(this.usuarioLogadoId);
            const tecIdA = Number(a.tecResponsavel_Cham);
            const tecIdB = Number(b.tecResponsavel_Cham);
            const statusA = a.status_Cham;
            const statusB = b.status_Cham;

            // 1. Define o Grupo (Peso)
            const getWeight = (status, tecId) => {
                if (status === 'Em andamento') {
                    if (tecId === meuId) return 0; // Meus
                    if (!tecId) return 1;          // Livres
                    return 2;                      // Outros
                }
                if (status === 'Aberto') return 3;
                if (status === 'Fechado') return 4;
                return 9;
            };

            const weightA = getWeight(statusA, tecIdA);
            const weightB = getWeight(statusB, tecIdB);

            // 2. Ordena pelo Grupo
            if (weightA !== weightB) {
                return weightA - weightB;
            }

            // 3. Desempate por DATA (Mais recente primeiro)
            // Convertendo para data garante precisão, ou use ID se for auto-increment
            const dateA = new Date(a.dataAbertura_Cham);
            const dateB = new Date(b.dataAbertura_Cham);
            
            return dateB - dateA; 
        });

        this.renderChamadosTable(chamadosOrdenados);
    }

    setupEvents() {
        // Atualizar
        this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        
        // Filtros (Debounce na busca)
        this.elements.filtroStatus.addEventListener('change', () => { this.currentPage = 1; this.loadData(); });
        
        let timeout;
        this.elements.busca.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => { this.currentPage = 1; this.loadData(); }, 300);
        });

        // Delegação de Eventos da Tabela
        this.elements.tbody.addEventListener('click', (e) => this.handleTableClick(e));
    }

    async handleTableClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return; 

        const id = +btn.dataset.id; 
        const action = btn.dataset.action;
        if (!action || !id) return; 

        try {
            switch (action) {
                case 'view':
                case 'continue':
                    iniciarSolucao(id); 
                    break;

                case 'take':
                    await apiUpdateChamado(id, {
                        status_Cham: STATUS_EM_ANDAMENTO, 
                        tecResponsavel_Cham: this.usuarioLogadoId 
                    });
                    iniciarSolucao(id); 
                    break;
                
                case 'delete':
                    if (!confirm(`Tem certeza que deseja excluir o chamado #${id}?`)) return;
                    await apiDeleteChamado(id);
                    await this.loadData(); 
                    break;
            }
        } catch (error) {
            alert('Erro na ação: ' + error.message);
        }
    }
}

export async function renderTodosChamados() {
    window.chamadoManager = new ChamadoManager();
    await window.chamadoManager.init();
}