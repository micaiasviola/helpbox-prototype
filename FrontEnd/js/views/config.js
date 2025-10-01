import { applyAccent } from '../utils/helpers.js';

/**
 * Exibe a página de configurações
 */
export function renderConfig() {
    const view = document.getElementById('view');
    view.innerHTML = `
    <div class="card" style="max-width:640px">
      <h3 style="margin-top:0">Configurações</h3>
      <div class="form">
        <div>
          <label class="label">Cor de destaque</label>
          <input id="accent" type="color" class="input" value="${store.preferencias.accent}" />
        </div>
        <div class="actions">
          <button class="btn" id="saveCfg">Salvar</button>
          <button class="btn ghost" id="resetCfg">Resetar</button>
        </div>
      </div>
    </div>
  `;

    // Configuração de eventos
    document.getElementById('saveCfg').addEventListener('click', () => {
        const color = document.getElementById('accent').value;
        store.preferencias.accent = color;
        applyAccent(color);
        alert('Preferência salva.');
    });

    document.getElementById('resetCfg').addEventListener('click', () => {
        store.preferencias.accent = '#007BFF';
        document.getElementById('accent').value = '#007BFF';
        applyAccent(store.preferencias.accent);
    });
}