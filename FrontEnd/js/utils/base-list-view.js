const DEFAULT_PAGE_SIZE = 5;

/**
 * Classe base para gerenciar estado, paginação e filtragem em Views de lista.
 * As classes filhas devem implementar 'loadData()'.
 */
export class BaseListView {
    
    constructor(pageSize = DEFAULT_PAGE_SIZE) {
        this.currentPage = 1;
        this.totalCount = 0;
        this.pageSize = pageSize;
        
        // Mantém o estado dos filtros (será usado nas chamadas de API)
        this.filtroStatus = '';
        this.termoBusca = '';
    }

    /**
     * NAVEGAÇÃO: Atualiza a página e carrega novos dados.
     * @param {number} page A página para qual navegar.
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.loadData(true); // Chamada para a função abstrata de carregamento da filha
    }

    /**
     * DISPARADOR: Reseta a página para 1 e força o recarregamento.
     * @param {boolean} resetPage Se a página atual deve ser resetada para 1.
     */
    triggerLoad(resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }
        this.loadData(true); 
    }

    /**
     * Renderiza os botões de paginação.
     * Depende do elemento com ID 'paginationContainer' no template da classe filha.
     */
    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const paginationContainer = document.getElementById('paginationContainer');

        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        // Define o nome da instância global para o onclick (ChamadoManager ou MeusChamadosView)
        const instanceName = this.constructor.name === 'MeusChamadosView' ? 'meusChamadosView' : 'chamadoManager';

        let buttons = '';
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        buttons += `<button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.${instanceName}.goToPage(${this.currentPage - 1})">← Anterior</button>`;

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'primary' : 'secondary';
            buttons += `<button class="btn btn-sm ${activeClass}" onclick="window.${instanceName}.goToPage(${i})">${i}</button>`;
        }

        buttons += `<button class="btn btn-sm" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window.${instanceName}.goToPage(${this.currentPage + 1})">Próximo →</button>`;
        
        paginationContainer.innerHTML = `<div class="pagination">${buttons}</div>`;
    }

    /**
     * MÉTODO ABSTRATO: Deve ser implementado na classe filha.
     * Responsável por chamar a API e atualizar this.chamados e this.totalCount.
     */
    async loadData() {
        throw new Error("O método loadData() deve ser implementado nas classes filhas.");
    }
}