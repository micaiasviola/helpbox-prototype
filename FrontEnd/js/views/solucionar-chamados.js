/*
 * =================================================================
 * View: Solucionar Chamados (solucionar-chamados.js)
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
        this.tbody = null;
        this.loadingIndicator = null;
        this.filtroStatusEl = null;
        this.buscaInputEl = null;
        
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
    }

    async init() {
        if (!this.usuarioLogadoId || this.nivelAcesso < NIVEL_TECNICO) {
            document.getElementById('view').innerHTML = '<div class="card">Acesso não autorizado.</div>';
            return;
        }
        this.renderBaseHTML();
        this.assignDOMelements();
        this.setupEvents();
        await this.loadData(); 
    }

    assignDOMelements() {
        this.tbody = document.getElementById('tbody');
        this.loadingIndicator = document.getElementById('loadingChamados');
        this.filtroStatusEl = document.getElementById('filtroStatus');
        this.buscaInputEl = document.getElementById('busca');
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
                <input id="busca" class="input" placeholder="Buscar por descrição..." style="max-width:320px"/>
                <button id="refreshChamados" class="btn">🔄 Atualizar</button>
            </div>

            <div class="loading" id="loadingChamados">Carregando chamados...</div>
            
            <div class="table-responsive">
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
            </div>
            <div id="paginationContainer" style="margin-top: 15px; text-align: center;"></div>
        `;
    }

    renderChamadosTable(chamados) {
        if (!this.tbody) return;

        if (chamados.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum chamado encontrado.</td></tr>';
            return;
        }

        const rows = chamados.map(c => {
            const actionButton = this.getActionButton(c);
            
            const nomeTecnico = c.tecNome 
                ? `${c.tecNome} ${c.tecSobrenome}` 
                : (c.tecResponsavel_Cham ? `ID: ${c.tecResponsavel_Cham}` : 'Sem técnico');
            
            // 🚨 CORREÇÃO AQUI:
            // Adicionamos (c.descricao_Cham || '') para garantir que nunca seja null
            const descricaoSegura = c.descricao_Cham || ''; 

            return `
                <tr>
                    <td>${c.id_Cham}</td>
                    <td>${nomeTecnico}</td>
                    
                    <td>${renderDescricaoCurta(descricaoSegura, c.id_Cham)}</td>
                    
                    <td>${renderBadge(c.status_Cham)}</td>
                    <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
                    <td>${c.categoria_Cham || 'Não definida'}</td>
                    <td>${formatDate(c.dataAbertura_Cham)}</td>
                    <td>${actionButton}</td>
                </tr>
            `;
        }).join('');
        
        this.tbody.innerHTML = rows;
    }

    getActionButton(c) {
        const meuId = Number(this.usuarioLogadoId);
        const tecId = Number(c.tecResponsavel_Cham);
        const clienteId = Number(c.clienteId_Cham);
        const isAdmin = this.nivelAcesso === NIVEL_ADMIN;
        
        // 1. Fechado
        if (c.status_Cham === 'Fechado') {
            if (isAdmin) {
                return `<button class="btn btn-danger" data-action="delete" data-id="${c.id_Cham}">🗑️ Excluir</button>`;
            } else {
                return `<button class="btn btn-secondary" data-action="view" data-id="${c.id_Cham}">Histórico</button>`;
            }
        }

        // 2. Em Andamento
        if (c.status_Cham === STATUS_EM_ANDAMENTO) {
            // É meu -> Continuar
            if (tecId === meuId) {
                return `<button class="btn btn-third" data-action="continue" data-id="${c.id_Cham}">Continuar Solucionando</button>`;
            } 
            // Livre -> Pegar (exceto se for autor)
            if (!c.tecResponsavel_Cham) {
                if (clienteId === meuId) {
                    return `<button class="btn btn-secondary" data-action="view" data-id="${c.id_Cham}">👁️ Você é o Autor</button>`;
                }
                return `<button class="btn btn-primary" data-action="take" data-id="${c.id_Cham}">🛠️ Solucionar Chamado</button>`;
            }
            // De outro -> Visualizar
            return `<button class="btn btn-secondary" data-action="view" data-id="${c.id_Cham}">👁️ Atribuído</button>`;
        }
        
        // 3. Aberto -> Visualizar
        if (c.status_Cham === 'Aberto') {
            return `<button class="btn btn-fourth" data-action="view" data-id="${c.id_Cham}">👁️ Aguardando IA/Cliente</button>`;
        }

        return '';
    }

    async loadData() {
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
        
        try {
            const apiParams = [this.currentPage, this.pageSize, this.termoBusca, this.filtroStatus];
            let response;

            if (this.nivelAcesso === NIVEL_ADMIN) {
                response = await apiGetChamados(...apiParams);
            } else {
                response = await apiGetChamadosTecnico(...apiParams);
            }

            this.chamadosData = response.chamados;
            this.totalCount = response.totalCount; 

            this.drawChamados();
            this.renderPagination();

        } catch (error) {
            console.error('Erro:', error);
            if (this.loadingIndicator) this.loadingIndicator.textContent = 'Erro ao carregar.';
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    drawChamados() {
        const chamadosOrdenados = this.sortChamados(this.chamadosData);
        this.renderChamadosTable(chamadosOrdenados);
    }

    sortChamados(chamados) {
        const copy = [...chamados];
        // Pegamos o ID do store diretamente aqui para garantir que não seja null
        const MEU_ID = Number(store.usuarioLogado?.id); 
        
        return copy.sort((a, b) => {
            const tecIdA = Number(a.tecResponsavel_Cham);
            const tecIdB = Number(b.tecResponsavel_Cham);

            const isMineA = a.status_Cham === STATUS_EM_ANDAMENTO && tecIdA === MEU_ID;
            const isMineB = b.status_Cham === STATUS_EM_ANDAMENTO && tecIdB === MEU_ID;

            if (isMineA && !isMineB) return -1;
            if (!isMineA && isMineB) return 1;
            
            return b.id_Cham - a.id_Cham;
        });
    }

    setupEvents() {
        document.getElementById('refreshChamados').addEventListener('click', () => this.triggerLoad(false));
        this.filtroStatusEl.addEventListener('change', (e) => { this.filtroStatus = e.target.value; this.triggerLoad(true); });
        this.buscaInputEl.addEventListener('input', (e) => { this.termoBusca = e.target.value; this.triggerLoad(true); });
        this.tbody.addEventListener('click', (e) => this.handleChamadoActions(e));
    }

    async handleChamadoActions(e) {
        const btn = e.target.closest('button');
        if (!btn) return; 

        const id = +btn.dataset.id; 
        const action = btn.dataset.action;

        if (!action || !id) return; 

        try {
            // Ações de Navegação (View ou Continue)
            if (action === 'view' || action === 'continue') {
                iniciarSolucao(id); // Não passamos mais parâmetros, a view se resolve sozinha
                return; 
            }

            // Ação de Pegar (Take)
            if (action === 'take') {
                await apiUpdateChamado(id, {
                    status_Cham: STATUS_EM_ANDAMENTO, 
                    tecResponsavel_Cham: this.usuarioLogadoId 
                });
                iniciarSolucao(id); 
                return; 
            }
            
            // Ação de Excluir
            if (action === 'delete') {
                if (this.nivelAcesso !== NIVEL_ADMIN) return alert('Acesso negado.');
                if (!confirm(`Excluir chamado ${id}?`)) return; 
                await apiDeleteChamado(id);
                await this.loadData(); 
            }

        } catch (error) {
            alert('Erro: ' + error.message);
        }
    }
}

export async function renderTodosChamados() {
    window.chamadoManager = new ChamadoManager();
    await window.chamadoManager.init();
}