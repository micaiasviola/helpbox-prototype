import { apiGetMeusChamados } from '../api/chamados.js';
import { store } from '../store.js'; 
import { iniciarSolucao } from './solucionar-chamado-detalhe.js';

const NIVEL_TECNICO = 2; 
/**
 * Classe responsável por exibir, filtrar e buscar os chamados de um cliente específico.
 */
class MeusChamadosView {
    constructor(containerId = 'view') {
        this.container = document.getElementById(containerId);
        this.chamados = [];      
        this.filtroStatus = '';
        this.termoBusca = '';
        // 🚨 NOVO: ID e Nível do usuário logado
        this.usuarioLogadoId = store.usuarioLogado?.id || null;
        this.nivelAcesso = store.usuarioLogado?.nivel_acesso || 0;
    }

    /**
     * Renderiza o template inicial e carrega os dados.
     */
    async render() {
        this.container.innerHTML = this.getTemplate();
        this.attachListeners();
        await this.loadChamados();
    }

    /**
     * Retorna o template HTML (toolbar e tabela).
     */
    getTemplate() {
        return `
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
                        <th>Cliente</th> 
                        <th>Título</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Categoria</th>
                        <th>Data Abertura</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="tbodyChamados"></tbody>
            </table>
        `;
    }

    /**
     * Anexa os listeners de eventos aos elementos da toolbar.
     */
    attachListeners() {
        document.getElementById('filtroStatus').addEventListener('change', (e) => {
            this.filtroStatus = e.target.value;
            this.applyFilters();
        });

        document.getElementById('busca').addEventListener('input', (e) => {
            this.termoBusca = e.target.value.toLowerCase();
            this.applyFilters();
        });

        document.getElementById('refreshChamados').addEventListener('click', () => {
            this.loadChamados(true); // Força recarregar os dados do servidor
        });
    }

    /**
     * Carrega os chamados do servidor.
     * @param {boolean} forceReload Se deve forçar a busca na API.
     */
    async loadChamados(forceReload = false) {
        if (this.chamados.length > 0 && !forceReload) {
            this.renderTable(this.chamados);
            return;
        }

        const loadingDiv = document.getElementById('loadingChamados');
        const tbody = document.getElementById('tbodyChamados');
        
        loadingDiv.style.display = 'block';
        tbody.innerHTML = ''; // Limpa a tabela

        try {
            // Assume que o ID do cliente está em uma variável global ou que a API o ignora
            // e usa a sessão para saber quem é o cliente logado (Opção 2 do item 1).
            this.chamados = await apiGetMeusChamados(); 
            this.renderTable(this.chamados);
            
            if (this.chamados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum chamado encontrado.</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Erro ao carregar chamados: ${error.message}</td></tr>`;
            console.error(error);
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    /**
     * Aplica os filtros e termo de busca e renderiza o resultado.
     */
    applyFilters() {
        let chamadosFiltrados = this.chamados;

        // 1. Filtrar por status
        if (this.filtroStatus) {
            chamadosFiltrados = chamadosFiltrados.filter(c => c.status_Cham === this.filtroStatus);
        }

        // 2. Filtrar por busca (descrição/título)
        if (this.termoBusca) {
            chamadosFiltrados = chamadosFiltrados.filter(c => 
                c.descricao_Cham.toLowerCase().includes(this.termoBusca) ||
                (c.titulo_Cham && c.titulo_Cham.toLowerCase().includes(this.termoBusca))
            );
        }

        this.renderTable(chamadosFiltrados);
    }

    getActionButton(chamadoId, status) {
        const statusLower = status.toLowerCase();
        
        // Se for Técnico/Admin (Nível 2 ou 3)
        if (this.nivelAcesso >= NIVEL_TECNICO) {
            
            // O Técnico/Admin só vê chamados atribuídos a ele em /meus (conforme rota /meus)
            // O botão deve ser "Continuar Solucionando"
            if (statusLower !== 'fechado') {
                return `
                    <button class="btn btn-primary btn-sm" onclick="iniciarSolucao(${chamadoId})">
                        Continuar Solucionando
                    </button>
                `;
            }
        }

        // Se for Cliente (Nível 1) ou se o chamado estiver fechado para Técnicos
        // Cliente sempre vê a tela de detalhes dele.
        return `
            <button class="btn btn-primary btn-sm" onclick="detalharChamadoIA(${chamadoId})">
                Ver Solução
            </button>
        `;
    }
    
    /**
     * Preenche o corpo da tabela com os dados.
     * @param {Array<Object>} data Os chamados filtrados.
     */
    renderTable(data) {
        const tbody = document.getElementById('tbodyChamados');
        if (!tbody) return;

        tbody.innerHTML = data.map(chamado => {
            const nomeCompleto = `${chamado.nome_User || ''} ${chamado.sobrenome_User || ''}`.trim();
            
            // 🚨 NOVO: Chamada ao método que decide qual botão mostrar
            const actionButton = this.getActionButton(chamado.id_Cham, chamado.status_Cham);

            return `
                 <tr>
                     <td>${chamado.id_Cham}</td>
                     <td>${nomeCompleto || chamado.clienteId_Cham}</td> 
                     <td>${chamado.titulo_Cham || chamado.descricao_Cham.substring(0, 50) + '...'}</td>
                     <td>${chamado.status_Cham}</td>
                     <td>${chamado.prioridade_Cham}</td>
                     <td>${chamado.categoria_Cham}</td>
                     <td>${new Date(chamado.dataAbertura_Cham).toLocaleDateString()}</td>
                     <td>
                        ${actionButton}
                     </td>
                 </tr>
             `;
        }).join('');
        
        // Se a busca/filtro não retornar resultados
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum chamado encontrado com os filtros atuais.</td></tr>';
        }
    }
}

window.iniciarSolucao = iniciarSolucao; 

// Função de ponto de entrada (para compatibilidade com o sistema)
export function renderMeusChamados() {
    const view = new MeusChamadosView('view');
    view.render();
}