// CORRIJA ESTAS IMPORTACOES:
import { YEAR } from './utils/constants.js';
import { applyAccent } from './utils/helpers.js';
import { renderDashboard } from './views/dashboard.js';
import { renderAbrirChamado } from './views/abrir-chamado.js';
import { renderMeusChamados } from './views/meus-chamados.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderConfig } from './views/config.js';
import { store } from './store.js';

// Configuração inicial
const yearEl = document.getElementById('year');
yearEl.textContent = YEAR;

// Sistema de rotas
const routes = {
    dashboard: renderDashboard,
    abrir: renderAbrirChamado,
    meus: renderMeusChamados,
    usuarios: renderUsuarios,
    config: renderConfig
};

function navigate() {
    const hash = location.hash.replace('#/', '') || 'dashboard';

    // Atualiza o menu ativo
    document.querySelectorAll('.menu-item').forEach(a => a.classList.remove('active'));
    const active = document.querySelector(`.menu-item[href="#/${hash}"]`);
    if (active) active.classList.add('active');

    // Executa a função correspondente à rota
    const fn = routes[hash] || renderNotFound;
    const view = document.getElementById('view');
    view.innerHTML = '';
    fn();
}

function renderNotFound() {
    const view = document.getElementById('view');
    view.innerHTML = '<div class="card">Página não encontrada.</div>';
}

// Configuração de eventos globais
window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.querySelector('.app').classList.toggle('compact');
});

// Busca global (demo)
document.getElementById('globalSearch').addEventListener('change', e => {
    const q = e.target.value.toLowerCase();
    location.hash = '#/meus';
    setTimeout(() => {
        const input = document.getElementById('busca');
        if (input) { input.value = q; input.dispatchEvent(new Event('input')); }
    }, 0);
});

// Aplica a cor de destaque inicial
applyAccent(store.preferencias.accent);