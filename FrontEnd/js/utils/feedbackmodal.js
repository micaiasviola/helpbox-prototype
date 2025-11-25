/**
 * @file feedbackmodal.js
 * @description Utilitário de Confirmação Assíncrona.
 * * Eu criei este módulo para resolver o "Callback Hell" em modais de confirmação.
 * * Em vez de criar divs, esconder/mostrar e passar funções de callback, encapsulei toda
 * a lógica em uma Promise. Isso permite usar "await" na interface, parando a execução
 * do código até o usuário clicar em "Sim" ou "Não".
 * @author [Micaias Viola - Full Stack Developer]
 */

/**
 * @function showConfirmationModal
 * @description Cria, exibe e gerencia o ciclo de vida de um modal de confirmação.
 * * Design Pattern: "Fire and Forget" com auto-limpeza. O modal é criado dinamicamente,
 * usado uma vez e depois destruído (removido do DOM) para não deixar lixo na memória.
 * * @param {string} title O título do modal.
 * @param {string} message A mensagem explicativa.
 * @returns {Promise<boolean>} Resolve true se o usuário confirmar, false se cancelar.
 */
export function showConfirmationModal(title, message) {
    
    // Construção do Template HTML
    // Uso estilos inline aqui propositalmente para tornar este utilitário "portável".
    // Você pode copiar este arquivo para outro projeto e ele funcionará sem depender de CSS externo.
    const modalHTML = `
        <dialog id="confirm-dialog" style="margin: auto; inset: 0; border: none; border-radius: 8px; padding: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.5); min-width: 300px; background: transparent;">
            <div class="card" style="padding: 20px; background-color: white; border-radius: 8px;">
                <h3 style="margin-top:0; color: #333;">${title}</h3>
                <p style="color: #666;">${message}</p>
                <div class="actions" style="margin-top: 20px; text-align: right;">
                    <button id="modal-btn-cancel" class="btn secondary" style="cursor:pointer; padding: 8px 16px; border: 1px solid #ccc; background: #fff; border-radius:4px;">Não</button>
                    <button id="modal-btn-confirm" class="btn primary" style="cursor:pointer; margin-left: 10px; background-color: #dc3545; color: white; padding: 8px 16px; border: none; border-radius:4px;">Sim</button>
                </div>
            </div>
        </dialog>
    `;

    // Retorno uma Promise para que quem chamou possa usar 'await'
    return new Promise((resolve) => {
        // Injeta o HTML no final do body.
        // Uso 'insertAdjacentHTML' em vez de innerHTML para não quebrar event listeners existentes no body.
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const dialog = document.getElementById('confirm-dialog');
        const confirmBtn = document.getElementById('modal-btn-confirm');
        const cancelBtn = document.getElementById('modal-btn-cancel');

        // Uso a API nativa <dialog> do HTML5.
        // O método .showModal() automaticamente cria o "backdrop" (fundo escuro) e prende o foco.
        dialog.showModal();

        /**
         * Função de Limpeza (Cleanup)
         * Fundamental para Single Page Applications (SPAs).
         * Se eu não remover o elemento do DOM, cada clique criaria um novo modal duplicado na memória.
         */
        const cleanup = (result) => {
            dialog.close();
            dialog.remove(); // Remove do DOM para não acumular
            resolve(result); // Retorna a resposta para o código que chamou
        };

        // --- EVENTOS ---

        confirmBtn.addEventListener('click', () => cleanup(true));
        cancelBtn.addEventListener('click', () => cleanup(false));
        
        // Detecta clique fora do modal (Backdrop Click)
        // A tag <dialog> nativa trata o backdrop como parte do elemento, então precisamos calcular
        // se o clique foi dentro do retângulo do conteúdo ou fora (no backdrop).
        dialog.addEventListener('click', (e) => {
            const rect = dialog.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
              rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            
            // Se clicou fora, considera como "Cancelar"
            if (!isInDialog) {
                cleanup(false);
            }
        });
    });
}