import { apiGetMeusChamados } from '../api/chamados.js';

/**
 * Classe responsável por exibir, filtrar e buscar os chamados de um cliente específico.
 */
class MeusChamadosView {
    constructor(containerId = 'view') {
        this.container = document.getElementById(containerId);
        this.chamados = [];       // Armazena todos os chamados carregados
        this.filtroStatus = '';
        this.termoBusca = '';
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

    /**
     * Preenche o corpo da tabela com os dados.
     * @param {Array<Object>} data Os chamados filtrados.
     */
    renderTable(data) {
        const tbody = document.getElementById('tbodyChamados');
        if (!tbody) return;

        tbody.innerHTML = data.map(chamado => {
            
            // 🚨 NOVO: Combina o nome e sobrenome
            const nomeCompleto = `${chamado.nome_User || ''} ${chamado.sobrenome_User || ''}`.trim();
            
            return `
                <tr>
                    <td>${chamado.id_Cham}</td>
                    <td>${nomeCompleto || chamado.clienteId_Cham}</td> <td>${chamado.titulo_Cham || chamado.descricao_Cham.substring(0, 50) + '...'}</td>
                    <td>${chamado.status_Cham}</td>
                    <td>${chamado.prioridade_Cham}</td>
                    <td>${chamado.categoria_Cham}</td>
                    <td>${new Date(chamado.dataAbertura_Cham).toLocaleDateString()}</td>
                    <td> <button class="btn btn-primary btn-sm" onclick="detalharChamadoIA(${chamado.id_Cham})">
                            Ver Solução
                        </button></td>
                </tr>
            `;
        }).join('');
        
        // Se a busca/filtro não retornar resultados
        if (data.length === 0) {
             tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum chamado encontrado com os filtros atuais.</td></tr>';
        }
    }
}

// Função de ponto de entrada (para compatibilidade com o sistema)
export function renderMeusChamados() {
    const view = new MeusChamadosView('view');
    view.render();
}