// utils/base-list-view.js

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
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.loadData(true); // Chamada para a função abstrata de carregamento da filha
    }

    /**
     * DISPARADOR: Reseta a página para 1 e força o recarregamento.
     */
    triggerLoad(resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }
        this.loadData(true); 
    }

    /**
     * Renderiza os botões de paginação com Página 1/Última Fixa e 3 botões centrais.
     */
    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const paginationContainer = document.getElementById('paginationContainer');
        
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        // Define o nome da instância global para o onclick
        const instanceName = this.constructor.name === 'MeusChamadosView' ? 'meusChamadosView' : 'chamadoManager';

        let buttons = '';
        let pageNumbersToRender = [];

        // --- 1. BOTÃO "ANTERIOR" (Renderizado na ordem correta) ---
        // Renderiza o botão Anterior SOMENTE se a página atual for > 1
        if (this.currentPage > 1) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage - 1})">← Anterior</button>`;
        }


        // 2. Lógica para determinar o intervalo de páginas centrais
        let startPage;
        let endPage;

        if (totalPages <= 5) {
            // Se houver 5 ou menos páginas, mostra todas.
            startPage = 1;
            endPage = totalPages;
        } else {
            // Caso: 1, ..., (P-1), P, (P+1), ..., Última
            
            // Define o intervalo central de 3 páginas
            startPage = Math.max(2, this.currentPage - 1); 
            endPage = Math.min(totalPages - 1, this.currentPage + 1);

            // Ajuste para o início (ex: Pág 2, mostra 1, 2, 3)
            if (this.currentPage <= 3) {
                startPage = 1;
                endPage = 3;
            } 
            
            // Ajuste para o fim (ex: Última-1, mostra Última-2, Última-1, Última)
            else if (this.currentPage > totalPages - 3) {
                startPage = totalPages - 2;
                endPage = totalPages;
            }

            // Adiciona a Página 1 (fixa)
            pageNumbersToRender.push(1);
            
            // Adiciona Reticências Iniciais se o início do intervalo for maior que 2
            if (startPage > 2) {
                pageNumbersToRender.push('...');
            }

            // Adiciona os botões centrais (excluindo 1 e totalPages)
            for (let i = startPage; i <= endPage; i++) {
                if (i > 1 && i < totalPages) {
                    pageNumbersToRender.push(i);
                }
            }

            // Adiciona Reticências Finais se o fim do intervalo for menor que totalPages - 1
            if (endPage < totalPages - 1) {
                pageNumbersToRender.push('...');
            }

            // Adiciona a Última Página (fixa)
            if (totalPages > 1) {
                pageNumbersToRender.push(totalPages);
            }

            // Filtra duplicatas e ordena para processamento (necessário devido à lógica de reticências separada)
            const filteredPages = [...new Set(pageNumbersToRender.filter(p => typeof p === 'number'))].sort((a, b) => a - b);
            
            // Reconstroi a lista final, mantendo a ordem das reticências
            pageNumbersToRender = [];
            let lastPageAdded = 0;
            
            for (const pageNum of filteredPages) {
                if (pageNum > lastPageAdded + 1) {
                    pageNumbersToRender.push('...');
                }
                pageNumbersToRender.push(pageNum);
                lastPageAdded = pageNum;
            }

        } // Fim do 'else' para totalPages > 5


        // 3. RENDERIZAÇÃO DOS BOTÕES NUMÉRICOS FINAIS

        // Se totalPages <= 5, pageNumbersToRender já está correto
        if (totalPages <= 5) {
             for (let i = startPage; i <= endPage; i++) {
                pageNumbersToRender.push(i);
            }
        }
        
        // Remove duplicatas (caso simples, onde o '1' e o 'totalPages' podem ter sido adicionados várias vezes)
        pageNumbersToRender = [...new Set(pageNumbersToRender)];
        

        for (const item of pageNumbersToRender) {
            if (item === '...') {
                 buttons += `<span class="pagination-ellipsis">...</span>`;
            } else {
                const pageNum = Number(item);
                const activeClass = pageNum === this.currentPage ? 'primary' : 'secondary';
                buttons += `<button class="btn btn-sm ${activeClass}" onclick="window.${instanceName}.goToPage(${pageNum})">${pageNum}</button>`;
            }
        }

        // --- 4. BOTÃO "PRÓXIMO" (Renderizado na ordem correta) ---
        // Renderiza o botão Próximo SOMENTE se a página atual for < totalPages
        if (this.currentPage < totalPages) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage + 1})">Próximo →</button>`;
        }


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