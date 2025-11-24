/*
 * =================================================================
 * View: Solucionar Chamados (Design Clean - Apenas Ícones)
 * =================================================================
 */

import { apiGetChamados, apiGetChamadosTecnico, apiUpdateChamado, apiDeleteChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate, renderDescricaoCurta } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';
import { store } from '../store.js';
import { BaseListView } from '../utils/base-list-view.js';
import { iniciarDetalhesIA } from './detalhes-IA.js'; 

// --- ÍCONES SVG CLEAN ---
const ICONS = {
    refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    eye: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`,
    userPlus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    fileText: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
};

const NIVEL_ADMIN = 3;
const NIVEL_TECNICO = 2;
const STATUS_EM_ANDAMENTO = 'Em andamento';
const DEFAULT_PAGE_SIZE = 5;

class ChamadoManager extends BaseListView {
    
    constructor() {
        super(DEFAULT_PAGE_SIZE); 
        this.chamadosData = [];
        this.elements = {};
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
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

        const styles = `
            <style>
                /* Botões de Ação Transparentes e Clean */
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
                .btn-action:hover { background: #eef2f6; color: #1976d2; }
                
                /* Cores específicas no Hover para ações importantes */
                .btn-action.play:hover { background: #e0f2f1; color: #00695c; } /* Verde para Continuar */
                .btn-action.take:hover { background: #e3f2fd; color: #1565c0; } /* Azul para Assumir */
                .btn-action.delete:hover { background: #ffebee; color: #d32f2f; } /* Vermelho para Excluir */

                /* Botões de Toolbar */
                .btn-icon-text { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500; }
                
                /* Ajustes de Toolbar */
                .toolbar-title { display: flex; align-items: center; gap: 10px; }
                .icon-bg { background:#eef2f6; padding:8px; border-radius:8px; color:#4a5568; display: flex; align-items: center; }
            </style>
        `;

        view.innerHTML = `
            ${styles}
            
            <div class="toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <div class="toolbar-title">
                    <div class="icon-bg">${ICONS.list}</div>
                    <div>
                        <h2 style="margin:0; font-size: 1.5rem; color: #2d3748;">Central de Chamados</h2>
                        <small style="color:#718096">Gerenciamento e resolução de tickets</small>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display:flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <select id="filtroStatus" class="select" style="max-width:200px">
                    <option value="">Todos os status</option>
                    <option>Aberto</option>
                    <option>Em andamento</option>
                    <option>Fechado</option>
                </select>
                <input id="busca" class="input" autocomplete="off" placeholder="Buscar por ID ou descrição..." style="flex: 1; min-width: 250px;" />
                <button id="refreshChamados" class="btn btn-secondary btn-icon-text">
                    ${ICONS.refresh} Atualizar
                </button>
            </div>

            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            
            <div class="table-responsive" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <table class="table" style="margin-bottom: 0;">
                    <thead style="background: #f8f9fa; border-bottom: 2px solid #edf2f7;">
                        <tr>
                            <th style="width:60px; text-align:center; color: #4a5568;">ID</th>
                            <th style="color: #4a5568;">Responsável</th>
                            <th class="col-descricao" style="color: #4a5568;">Descrição</th>
                            <th style="color: #4a5568;">Status</th>
                            <th style="color: #4a5568;">Prioridade</th>
                            <th style="color: #4a5568;">Categoria</th>
                            <th style="color: #4a5568;">Data</th>
                            <th style="color: #4a5568; text-align: right; padding-right: 20px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody"></tbody>
                </table>
            </div>
            
            <div id="paginationContainer" class="pagination-container" style="margin-top: 15px;"></div>

            <dialog id="descModalSolucao" style="position: fixed; inset: 0; margin: auto; border: none; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.25); z-index: 10000;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <h3 style="margin:0; color:#2d3748;">Descrição Detalhada</h3>
                    <button onclick="document.getElementById('descModalSolucao').close()" style="background:none; border:none; font-size:24px; cursor:pointer; color: #999;">&times;</button>
                </div>
                <div id="descModalSolucaoContent" style="line-height: 1.6; color: #4a5568; max-height: 60vh; overflow-y: auto; white-space: pre-wrap; font-size: 0.95rem;"></div>
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
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #718096;">Nenhum chamado encontrado.</td></tr>';
            return;
        }

        const rows = chamados.map(c => {
            const actionButton = this.getActionButton(c);
            
            const nomeTecnico = c.tecNome 
                ? `<span style="font-weight:500; color:#2d3748">${c.tecNome} ${c.tecSobrenome}</span>` 
                : (c.tecResponsavel_Cham ? `ID: ${c.tecResponsavel_Cham}` : '<span style="color:#a0aec0; font-style:italic; font-size:0.9em;">Não atribuído</span>');
            
            return `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="text-align:center; color:#718096;">${c.id_Cham}</td>
                    <td>${nomeTecnico}</td>
                    
                    <td class="col-descricao"
                        onclick="window.chamadoManager.verDescricaoCompleta(${c.id_Cham})"
                        title="Clique para ler a descrição completa"
                        style="cursor: pointer; color: #4a5568;"
                    >
                        ${renderDescricaoCurta(c.descricao_Cham || '', c.id_Cham)}
                    </td>
                    
                    <td>${renderBadge(c.status_Cham)}</td>
                    <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
                    <td style="color:#4a5568;">${c.categoria_Cham || '-'}</td>
                    <td style="color:#718096; font-size:0.9em;">${formatDate(c.dataAbertura_Cham)}</td>
                    <td style="text-align: right; white-space: nowrap;">${actionButton}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = rows;
    }

    // =========================================================
    // 🎨 LÓGICA DE BOTÕES ATUALIZADA (ÍCONES TRANSPARENTES)
    // =========================================================
    getActionButton(c) {
        const meuId = Number(this.usuarioLogadoId);
        const tecId = Number(c.tecResponsavel_Cham);
        const criadorId = Number(c.clienteId_Cham); 
        const isAdmin = this.nivelAcesso === NIVEL_ADMIN;
        
        // 1. FECHADO
        if (c.status_Cham === 'Fechado') {
            if (isAdmin) {
                return `
                    <button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Histórico">${ICONS.eye}</button>
                    <button class="btn-action delete" data-action="delete" data-id="${c.id_Cham}" title="Excluir Histórico">${ICONS.trash}</button>
                `;
            }
            return `<button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Histórico">${ICONS.eye}</button>`;
        }

        // 2. EM ANDAMENTO
        if (c.status_Cham === STATUS_EM_ANDAMENTO) {
            // É meu chamado (Sou o técnico): Play (Verde no Hover)
            if (tecId === meuId) {
                return `<button class="btn-action play" data-action="continue" data-id="${c.id_Cham}" title="Continuar Resolução">${ICONS.play}</button>`;
            }
            
            // Sem técnico: Verificar se posso assumir
            if (!c.tecResponsavel_Cham) {
                // Se EU criei, não posso assumir -> Apenas olho
                if (meuId === criadorId) {
                    return `<button class="btn-action" data-action="view-author" data-id="${c.id_Cham}" title="Seu Chamado (Aguardando Técnico)">${ICONS.eye}</button>`;
                }

                // Se não sou o criador -> Posso assumir (Azul no Hover)
                return `<button class="btn-action take" data-action="take" data-id="${c.id_Cham}" title="Assumir Chamado">${ICONS.userPlus}</button>`;
            }

            // De outro técnico: Apenas olho
            return `<button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Detalhes (Atribuído)">${ICONS.eye}</button>`;
        }
        
        // 3. ABERTO
        // Se for meu chamado
        if (meuId === criadorId) {
             return `<button class="btn-action" data-action="view-author" data-id="${c.id_Cham}" title="Ver Detalhes">${ICONS.fileText}</button>`;
        }

        return `<button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Detalhes">${ICONS.fileText}</button>`;
    }

    async loadData() {
        this.toggleLoading(true);
        
        try {
            const filtroStatus = this.elements.filtroStatus.value;
            let termoBusca = this.elements.busca.value.trim();
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
            this.elements.tbody.innerHTML = '<tr><td colspan="8" class="td-error" style="text-align:center; padding:20px; color:#e53e3e;">Erro ao carregar dados. Tente novamente.</td></tr>';
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
            
            const getWeight = (chamado) => {
                const status = chamado.status_Cham;
                const tecId = Number(chamado.tecResponsavel_Cham || 0);
                const criadorId = Number(chamado.clienteId_Cham || 0);

                if (status === 'Em andamento' && tecId === meuId) return 0; // Continuar
                if (status === 'Em andamento' && tecId === 0 && criadorId !== meuId) return 1; // Assumir
                return 2; // Olho (Resto)
            };

            const weightA = getWeight(a);
            const weightB = getWeight(b);

            if (weightA !== weightB) return weightA - weightB;

            if (weightA === 2) {
                const isAbertoA = a.status_Cham === 'Aberto';
                const isAbertoB = b.status_Cham === 'Aberto';
                if (isAbertoA && !isAbertoB) return -1;
                if (!isAbertoA && isAbertoB) return 1;
            }

            const dateA = new Date(a.dataAbertura_Cham);
            const dateB = new Date(b.dataAbertura_Cham);
            
            return dateB - dateA; 
        });

        this.renderChamadosTable(chamadosOrdenados);
    }

    setupEvents() {
        this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        this.elements.filtroStatus.addEventListener('change', () => { this.currentPage = 1; this.loadData(); });
        
        let timeout;
        this.elements.busca.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => { this.currentPage = 1; this.loadData(); }, 300);
        });

        this.elements.tbody.addEventListener('click', (e) => this.handleTableClick(e));
    }

    async handleTableClick(e) {
        // Agora buscamos a classe btn-action ou o elemento button
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

                case 'view-author':
                    iniciarDetalhesIA(id);
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