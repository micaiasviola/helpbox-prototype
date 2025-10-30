// feedback-modal.js

/**
 * Exibe um modal de confirmação com botões 'Sim' e 'Não'.
 * * @param {string} title O título da janela de confirmação (Ex: "Confirmação").
 * @param {string} message A mensagem a ser exibida (Ex: "Deseja realmente sair?").
 * @returns {Promise<boolean>} Resolve para true se o usuário clicar em 'Sim', e false se clicar em 'Não' ou fechar.
 */
export function showConfirmationModal(title, message) {
    
    // 1. Cria o elemento modal (Use classes CSS existentes como 'card' para estilo)
    const modalHTML = `
        <div id="overlay-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div class="card" style="width: 400px; padding: 20px; background-color: white;">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="actions" style="margin-top: 20px; text-align: right;">
                    <button id="modal-btn-cancel" class="btn btn-secondary">Não</button>
                    <button id="modal-btn-confirm" class="btn btn-danger" style="margin-left: 10px;">Sim</button>
                </div>
            </div>
        </div>
    `;

    // 2. Retorna uma Promise para esperar pela ação do usuário
    return new Promise((resolve) => {
        // Injeta o HTML no corpo do documento
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const overlay = document.getElementById('overlay-modal');
        const confirmBtn = document.getElementById('modal-btn-confirm');
        const cancelBtn = document.getElementById('modal-btn-cancel');

        // Função de fechamento e limpeza
        const closeModal = (result) => {
            overlay.remove();
            resolve(result); // Resolve a Promise com true (Sim) ou false (Não)
        };

        // 3. Anexa Listeners
        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        
        // Permite fechar clicando fora do modal (opcional)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(false);
            }
        });
    });
}