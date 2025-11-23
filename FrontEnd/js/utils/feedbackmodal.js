

export function showConfirmationModal(title, message) {
    

    const modalHTML = `
        <dialog id="confirm-dialog" style="margin: auto; inset: 0; border: none; border-radius: 8px; padding: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.5); min-width: 300px; background: transparent;">
            <div class="card" style="padding: 20px; background-color: white; border-radius: 8px;">
                <h3 style="margin-top:0">${title}</h3>
                <p>${message}</p>
                <div class="actions" style="margin-top: 20px; text-align: right;">
                    <button id="modal-btn-cancel" class="btn secondary">Não</button>
                    <button id="modal-btn-confirm" class="btn primary" style="margin-left: 10px; background-color: #dc3545; color: white;">Sim</button>
                </div>
            </div>
        </dialog>
    `;

    return new Promise((resolve) => {
        // Injeta o HTML
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const dialog = document.getElementById('confirm-dialog');
        const confirmBtn = document.getElementById('modal-btn-confirm');
        const cancelBtn = document.getElementById('modal-btn-cancel');

        // Abre na camada superior (Top Layer)
        dialog.showModal();

        // Função de limpeza
        const cleanup = (result) => {
            dialog.close();
            dialog.remove(); // Remove do DOM para não acumular
            resolve(result);
        };

        // Eventos
        confirmBtn.addEventListener('click', () => cleanup(true));
        cancelBtn.addEventListener('click', () => cleanup(false));
        
        // Fechar ao clicar fora (Backdrop click)
        dialog.addEventListener('click', (e) => {
            const rect = dialog.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
              rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            
            if (!isInDialog) {
                cleanup(false);
            }
        });
    });
}