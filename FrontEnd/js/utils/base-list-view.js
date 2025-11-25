/**
 * @file base-list-view.js
 * @description Classe Abstrata para Listagens.
 * * Percebi que as telas de "Meus Chamados" e "Todos os Chamados" compartilhavam 80% da lógica 
 * (paginação, filtros, estado atual). Para evitar duplicidade de código e facilitar a manutenção,
 * criei esta classe base.
 * * As telas específicas (Filhas) herdam daqui e só precisam se preocupar em buscar os dados (loadData).
 * @author [Micaías Viola - Full Stack Developer]
 */

const DEFAULT_PAGE_SIZE = 5;

/**
 * @class BaseListView
 * @description Gerenciador genérico de estado de lista.
 * * Implementa o algoritmo de "Janela Deslizante" para a paginação (ex: 1 ... 4 5 6 ... 10).
 */
export class BaseListView {
    
    /**
     * @constructor
     * @param {number} pageSize Quantidade de itens por página.
     */
    constructor(pageSize = DEFAULT_PAGE_SIZE) {
        // Estado da Paginação
        this.currentPage = 1;
        this.totalCount = 0;
        this.pageSize = pageSize;
        
        // Estado dos Filtros
        // Mantenho aqui para garantir que, ao mudar de página, os filtros não se percam.
        this.filtroStatus = '';
        this.termoBusca = '';
    }

    /**
     * @method goToPage
     * @description Navegação segura entre páginas.
     * * Valida se a página destino existe antes de tentar carregar, evitando erros de índice.
     * @param {number} page Número da página destino.
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        // Chama o método que a classe Filha vai implementar
        this.loadData(true); 
    }

    /**
     * @method triggerLoad
     * @description Disparador de recarregamento (ex: ao clicar em "Filtrar").
     * * Geralmente, quando o usuário filtra algo, queremos voltar para a página 1
     * para garantir que ele veja os resultados do início.
     * @param {boolean} resetPage Se true, volta para a página 1.
     */
    triggerLoad(resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
        }
        this.loadData(true); 
    }

    /**
     * @method renderPagination
     * @description O algoritmo visual da paginação.
     * * Esta é a parte complexa. Eu não queria mostrar apenas "Anterior/Próximo" e nem
     * uma lista gigante "1, 2, 3... 100".
     * * Implementei uma lógica que mostra sempre a primeira, a última e as páginas ao redor
     * da seleção atual (ex: 1 ... 4 [5] 6 ... 20).
     */
    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const paginationContainer = document.getElementById('paginationContainer');
        
        // Se não tiver container ou só tiver 1 página, esconde a paginação para limpar a tela.
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        // 🚨 REFLECTION PARA ONCLICK GLOBAL
        // Como o HTML é gerado como string, o onclick="window.x.goToPage()" precisa saber
        // qual é o nome da variável global que segura esta instância.
        // Verifico o nome da classe construtora para decidir.
        const instanceName = this.constructor.name === 'MeusChamadosView' ? 'meusChamadosView' : 'chamadoManager';

        let buttons = '';
        let pageNumbersToRender = [];

        // --- 1. BOTÃO "ANTERIOR" ---
        if (this.currentPage > 1) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage - 1})">← Anterior</button>`;
        }

        // --- 2. CÁLCULO DOS NÚMEROS DE PÁGINA (Algoritmo da Janela) ---
        let startPage, endPage;

        if (totalPages <= 5) {
            // Cenário Simples: Poucas páginas, mostra todas.
            startPage = 1;
            endPage = totalPages;
            for (let i = startPage; i <= endPage; i++) pageNumbersToRender.push(i);
        } else {
            // Cenário Complexo: Muitas páginas, usa reticências (...).
            
            // Define o "meio" (página atual +/- 1)
            startPage = Math.max(2, this.currentPage - 1); 
            endPage = Math.min(totalPages - 1, this.currentPage + 1);

            // Ajuste de borda: Se estiver muito no começo (ex: pág 2)
            if (this.currentPage <= 3) {
                startPage = 1;
                endPage = 3;
            } 
            // Ajuste de borda: Se estiver muito no fim
            else if (this.currentPage > totalPages - 3) {
                startPage = totalPages - 2;
                endPage = totalPages;
            }

            // Montagem do Array Visual
            // Sempre mostra a primeira página
            pageNumbersToRender.push(1);
            
            // Se houve um salto grande entre a pag 1 e o inicio do meio, põe reticências
            if (startPage > 2) {
                pageNumbersToRender.push('...');
            }

            // Adiciona o miolo
            for (let i = startPage; i <= endPage; i++) {
                if (i > 1 && i < totalPages) {
                    pageNumbersToRender.push(i);
                }
            }

            // Se houve um salto grande entre o fim do meio e a última pag, põe reticências
            if (endPage < totalPages - 1) {
                pageNumbersToRender.push('...');
            }

            // Sempre mostra a última página
            if (totalPages > 1) {
                pageNumbersToRender.push(totalPages);
            }
            
            // Limpeza de duplicatas e ordenação para garantir consistência visual
            // (O Set remove números repetidos caso a lógica de borda tenha sobreposto)
            const uniqueNumbers = [...new Set(pageNumbersToRender.filter(p => typeof p === 'number'))].sort((a, b) => a - b);
            
            // Reconstrução final com as reticências nos lugares certos
            pageNumbersToRender = [];
            let lastPageAdded = 0;
            
            for (const pageNum of uniqueNumbers) {
                if (pageNum > lastPageAdded + 1) {
                    pageNumbersToRender.push('...');
                }
                pageNumbersToRender.push(pageNum);
                lastPageAdded = pageNum;
            }
        }

        // --- 3. RENDERIZAÇÃO DO HTML DOS NÚMEROS ---
        for (const item of pageNumbersToRender) {
            if (item === '...') {
                 buttons += `<span class="pagination-ellipsis">...</span>`;
            } else {
                const pageNum = Number(item);
                // Destaca a página atual com a classe 'primary'
                const activeClass = pageNum === this.currentPage ? 'primary' : 'secondary';
                buttons += `<button class="btn btn-sm ${activeClass}" onclick="window.${instanceName}.goToPage(${pageNum})">${pageNum}</button>`;
            }
        }

        // --- 4. BOTÃO "PRÓXIMO" ---
        if (this.currentPage < totalPages) {
            buttons += `<button class="btn btn-sm" onclick="window.${instanceName}.goToPage(${this.currentPage + 1})">Próximo →</button>`;
        }

        paginationContainer.innerHTML = `<div class="pagination">${buttons}</div>`;
    }

    /**
     * @method loadData
     * @abstract
     * @description Contrato obrigatório.
     * * Este método lança um erro propositalmente se for chamado diretamente da classe Base.
     * Isso obriga o desenvolvedor a implementar a busca de dados específica na classe Filha.
     */
    async loadData() {
        throw new Error("O método loadData() deve ser implementado nas classes filhas.");
    }
}