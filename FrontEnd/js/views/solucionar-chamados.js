/**
 * @file solucionar-chamados.js
 * @description View Principal do Painel do Técnico (Central de Soluções).
 * * Este é o coração do sistema para a equipe de TI. Projetei este módulo focando em
 * "Actionable UI" (Interface Orientada a Ação). O objetivo é que o técnico bata o olho
 * e saiba imediatamente qual chamado precisa de atenção (botão Play) e qual está livre (botão Assumir).
 * @author [Micaias Viola - Full Stack Developer]
 */

import { apiGetChamados, apiGetChamadosTecnico, apiUpdateChamado, apiDeleteChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate, renderDescricaoCurta } from '../utils/helpers.js';
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';
import { store } from '../store.js';
import { BaseListView } from '../utils/base-list-view.js';
import { iniciarDetalhesIA } from './detalhes-IA.js'; 


// Necessário para que os botões com onclick="" gerados via Template String funcionem.
window.iniciarDetalhesIA = iniciarDetalhesIA;
window.iniciarSolucao = iniciarSolucao;

/**
 * @constant {Object} ICONS
 * @description Ícones SVG Clean (Estilo Feather).
 * * Mantive o padrão de ícones inline para evitar dependências externas pesadas.
 * O design "clean" ajuda a reduzir a poluição visual, já que esta tela pode ter muitos dados.
 */
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

/**
 * @class ChamadoManager
 * @extends BaseListView
 * @description Gerencia a lista de chamados sob a ótica do Técnico/Admin.
 * * Estendi a classe 'BaseListView' para reaproveitar lógica de paginação,
 * mas sobrecarreguei os métodos de renderização pois esta tela tem regras de negócio complexas.
 */
class ChamadoManager extends BaseListView {
    
    constructor() {
        super(DEFAULT_PAGE_SIZE); 
        this.chamadosData = [];
        this.elements = {};
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
        
        // Torna a instância acessível globalmente (útil para debug ou chamadas inline)
        window.chamadoManager = this;
    }

    /**
     * @method init
     * @description Inicialização e Gatekeeper de Segurança.
     * * Antes de renderizar qualquer coisa, eu verifico se o usuário tem permissão.
     * Se não for técnico ou admin, bloqueio a tela aqui mesmo.
     */
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

    /**
     * @method renderBaseHTML
     * @description Injeta a estrutura visual e o CSS Scoped.
     * * Decisão de Design: Criei classes CSS específicas para os estados dos botões (.play, .take).
     * Isso fornece feedback visual imediato ao passar o mouse: 
     * Verde = Trabalhar (Play), Azul = Assumir (UserPlus).
     */
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
                
                /* --- SEMÂNTICA DE CORES NO HOVER --- */
                .btn-action.play:hover { background: #e0f2f1; color: #00695c; } /* Verde: Ação de Prosseguir */
                .btn-action.take:hover { background: #e3f2fd; color: #1565c0; } /* Azul: Ação de Pegar */
                .btn-action.delete:hover { background: #ffebee; color: #d32f2f; } /* Vermelho: Perigo */

                .btn-icon-text { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500; }
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
            // Aqui decidimos qual botão mostrar para cada linha
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

    /**
     * @method getActionButton
     * @description O "Cérebro" da UI. Decide qual ação está disponível para o técnico.
     * * A lógica de botões é complexa, então isolei aqui. Os cenários são:
     * 1. É meu e está em andamento? -> Ícone Play (Trabalhar).
     * 2. Está livre? -> Ícone UserPlus (Assumir).
     * 3. Eu abri o chamado (sou cliente também)? -> Apenas olho (não posso assumir o meu próprio).
     * 4. Fechado ou de outro técnico? -> Apenas olho (Histórico).
     * * @param {Object} c Objeto do chamado
     * @returns {string} HTML do botão
     */
    getActionButton(c) {
        const meuId = Number(this.usuarioLogadoId);
        const tecId = Number(c.tecResponsavel_Cham);
        const criadorId = Number(c.clienteId_Cham); 
        const isAdmin = this.nivelAcesso === NIVEL_ADMIN;
        
        // --- CENÁRIO 1: CHAMADO JÁ FINALIZADO ---
        if (c.status_Cham === 'Fechado') {
            if (isAdmin) {
                // Admin pode ver e excluir histórico
                return `
                    <button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Histórico">${ICONS.eye}</button>
                    <button class="btn-action delete" data-action="delete" data-id="${c.id_Cham}" title="Excluir Histórico">${ICONS.trash}</button>
                `;
            }
            return `<button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Histórico">${ICONS.eye}</button>`;
        }

        // --- CENÁRIO 2: EM ANDAMENTO (Onde a mágica acontece) ---
        if (c.status_Cham === STATUS_EM_ANDAMENTO) {
            
            // 2.1. O chamado já é meu.
            // Exibo o ícone PLAY (classe .play) para incentivar a resolução.
            if (tecId === meuId) {
                return `<button class="btn-action play" data-action="continue" data-id="${c.id_Cham}" title="Continuar Resolução">${ICONS.play}</button>`;
            }
            
            // 2.2. Chamado sem técnico (Livre).
            if (!c.tecResponsavel_Cham) {
                // Regra de Negócio: Se EU criei o chamado, não posso assumir (conflito de interesse).
                if (meuId === criadorId) {
                    return `<button class="btn-action" data-action="view-author" data-id="${c.id_Cham}" title="Seu Chamado (Aguardando Técnico)">${ICONS.eye}</button>`;
                }

                // Se está livre e não é meu -> Posso Assumir (classe .take).
                return `<button class="btn-action take" data-action="take" data-id="${c.id_Cham}" title="Assumir Chamado">${ICONS.userPlus}</button>`;
            }

            // 2.3. Pertence a outro técnico. Apenas observo.
            return `<button class="btn-action" data-action="view" data-id="${c.id_Cham}" title="Ver Detalhes (Atribuído)">${ICONS.eye}</button>`;
        }
        
        // --- CENÁRIO 3: ABERTO (IA) ---
        // Se eu sou o autor, vejo o que a IA respondeu.
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
            // Admins veem tudo, Técnicos têm filtros específicos (ex: priorizar os seus)
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

    /**
     * @method drawChamados
     * @description Ordenação Visual no Cliente.
     * * Embora o Backend já envie ordenado, eu reforço a ordenação aqui para garantir a consistência visual
     * imediata, especialmente em casos de atualizações parciais.
     * * Ordem de Prioridade (Weights):
     * 0: Meus em andamento (Urgente!)
     * 1: Livres para pegar (Oportunidade)
     * 2: Todo o resto (Histórico/Outros)
     */
    drawChamados() {
        const chamadosOrdenados = [...this.chamadosData].sort((a, b) => {
            const meuId = Number(this.usuarioLogadoId);
            
            const getWeight = (chamado) => {
                const status = chamado.status_Cham;
                const tecId = Number(chamado.tecResponsavel_Cham || 0);
                const criadorId = Number(chamado.clienteId_Cham || 0);

                if (status === 'Em andamento' && tecId === meuId) return 0; // Topo
                if (status === 'Em andamento' && tecId === 0 && criadorId !== meuId) return 1; // Meio
                return 2; // Fim
            };

            const weightA = getWeight(a);
            const weightB = getWeight(b);

            if (weightA !== weightB) return weightA - weightB;

            // Desempate visual: Mostrar Abertos (Novos) antes de Fechados (Velhos) no fim da lista
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

    /**
     * @method setupEvents
     * @description Delegação de Eventos.
     * * Em vez de adicionar um listener em cada botão (o que pesaria na memória com listas grandes),
     * eu escuto cliques na tabela inteira (tbody) e detecto se o alvo foi um botão de ação.
     */
    setupEvents() {
        this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        this.elements.filtroStatus.addEventListener('change', () => { this.currentPage = 1; this.loadData(); });
        
        let timeout;
        // Debounce na busca para não spamar a API a cada letra digitada
        this.elements.busca.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => { this.currentPage = 1; this.loadData(); }, 300);
        });

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
                    // Abre a tela de chat/resolução
                    iniciarSolucao(id); 
                    break;

                case 'view-author':
                    // Abre apenas a visualização da IA (para chamados que eu mesmo criei)
                    iniciarDetalhesIA(id);
                    break;

                case 'take':
                    // Ação de Assumir: Atualiza o status e define o técnico como "Eu"
                    await apiUpdateChamado(id, {
                        status_Cham: STATUS_EM_ANDAMENTO, 
                        tecResponsavel_Cham: this.usuarioLogadoId 
                    });
                    iniciarSolucao(id); // Já abre a tela para começar a trabalhar
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