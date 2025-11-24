/*
 * =================================================================
 * HELPBOX - main.js (Refatorado & Corrigido)
 * =================================================================
 */

// --- Importações ---
import { YEAR, API_BASE } from './utils/constants.js';
import { showConfirmationModal } from './utils/feedbackmodal.js';
import { store } from './store.js';

// Views
import { renderDashboard } from './views/dashboard.js';
import { renderAbrirChamado } from './views/abrir-chamado.js';
import { renderTodosChamados } from './views/solucionar-chamados.js';
import { renderMeusChamados } from './views/meus-chamados.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderConfig } from './views/manual.js';
// import { renderConfig } from './views/config.js'; // REMOVIDO
import { iniciarDetalhesIA } from './views/detalhes-IA.js';
import { iniciarSolucao } from './views/solucionar-chamado-detalhe.js';

// --- Níveis de Acesso ---
const NIVEL_ADMIN = 3;
const NIVEL_SOLUCIONADOR = 2;
const NIVEL_COMUM = 1;

/**
 * ⚡ CONFIGURAÇÃO CENTRAL DE ROTAS (SSOT) ⚡
 */
const ROUTE_CONFIG = {
    'dashboard': { 
        view: renderDashboard, 
        minLevel: NIVEL_ADMIN, 
        menuId: 'menuDashboard' 
    },
    'usuarios': { 
        view: renderUsuarios, 
        minLevel: NIVEL_ADMIN, 
        menuId: 'menuGerenciarUsuarios' 
    },
    'todos': { 
        view: renderTodosChamados, 
        minLevel: NIVEL_SOLUCIONADOR, 
        menuId: 'menuSolucionarChamados' 
    },
    'abrir': { 
        view: renderAbrirChamado, 
        forbiddenLevels: [NIVEL_SOLUCIONADOR], 
        menuSelector: '[data-route="abrir"]' 
    },
    'chamados': { 
        view: renderMeusChamados,
        menuSelector: '[data-route="chamados"]'
    },
    'config': { 
        view: renderConfig,      
        minLevel: NIVEL_COMUM,      
        menuSelector: '[data-route="config"]' 
    },
    // Rotas ocultas ou especiais
    'solucao': { view: iniciarSolucao },
    'detalhesIA': { view: iniciarDetalhesIA }
};

// =================================================================
// --- 1. Autenticação ---
// =================================================================

async function getUsuarioLogado() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        return response.ok ? await response.json() : null;
    } catch (error) {
        console.error('Erro auth:', error);
        return null;
    }
}

async function fazerLogout() {
    const confirmed = await showConfirmationModal("Sair", "Deseja realmente sair do sistema?");
    if (!confirmed) return;

    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
        store.usuarioLogado = null;
        window.location.href = '/login/tela_login.html';
    } catch (error) {
        console.error('Erro logout:', error);
        alert('Erro ao tentar sair.');
    }
}

// =================================================================
// --- 2. Roteamento Inteligente ---
// =================================================================

function renderNotFound() {
    document.getElementById('view').innerHTML = '<div class="card">Página não encontrada.</div>';
}

function renderAccessDenied() {
    const view = document.getElementById('view');
    view.innerHTML = `<div class="card error">🚫 Acesso Negado. Redirecionando...</div>`;
    
    setTimeout(() => {
        const usuario = store.usuarioLogado || {};
        // Tenta pegar o nível de várias formas para evitar erro
        const nivel = Number(usuario.nivel_acesso || usuario.nivelAcesso || 0);
        const rotaDestino = (nivel === NIVEL_SOLUCIONADOR) ? '#/todos' : '#/abrir';
        location.hash = rotaDestino;
    }, 2000);
}

function navigate() {
    let fullHash = location.hash.replace('#/', '');
    
    // 1. Obter nível do usuário de forma segura (Parse Int)
    const usuario = store.usuarioLogado;
    // Verifica nivel_acesso (padrão banco) ou nivelAcesso (padrão JS) ou 0
    const nivelRaw = usuario?.nivel_acesso ?? usuario?.nivelAcesso ?? 0;
    const nivelUsuario = Number(nivelRaw);

    console.log(`[Router] Navegando para: ${fullHash} | Nível Usuário: ${nivelUsuario}`);

    // 2. Rota Padrão (Home)
    if (fullHash === '') {
        const homeRoute = (nivelUsuario === NIVEL_SOLUCIONADOR) ? 'todos' : 'abrir';
        location.hash = `#/${homeRoute}`;
        return;
    }

    const [routeKey, idParam] = fullHash.split('/');
    const config = ROUTE_CONFIG[routeKey];

    // 3. Validação de Rota Inexistente
    if (!config) {
        renderNotFound();
        return;
    }

    // 4. Guarda de Rota (Permissões)
    
    // Check Nível Mínimo
    if (config.minLevel && nivelUsuario < config.minLevel) {
        console.warn(`[Router] Bloqueado. Requer: ${config.minLevel}, Tem: ${nivelUsuario}`);
        renderAccessDenied();
        return;
    }

    // Check Níveis Proibidos
    if (config.forbiddenLevels && config.forbiddenLevels.includes(nivelUsuario)) {
        console.warn(`[Router] Bloqueado. Nível ${nivelUsuario} é proibido aqui.`);
        renderAccessDenied();
        return;
    }

    // 5. UI: Atualiza Menu Ativo
    document.querySelectorAll('.menu-item').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.menu-item[href="#/${routeKey}"]`);
    if (activeLink) activeLink.classList.add('active');

    // 6. Renderiza View
    document.getElementById('view').innerHTML = ''; 
    config.view(idParam); 
}

// =================================================================
// --- 3. Controle de Interface (UI) ---
// =================================================================

function controlarAcessoMenu(usuario) {
    if (!usuario) return;
    const nivel = Number(usuario.nivel_acesso || usuario.nivelAcesso || 0);

    Object.values(ROUTE_CONFIG).forEach(config => {
        let el = null;
        if (config.menuId) el = document.getElementById(config.menuId);
        else if (config.menuSelector) el = document.querySelector(config.menuSelector);

        if (el) {
            let visivel = true;
            if (config.minLevel && nivel < config.minLevel) visivel = false;
            if (config.forbiddenLevels && config.forbiddenLevels.includes(nivel)) visivel = false;
            
            el.style.display = visivel ? '' : 'none';
        }
    });
}

function atualizarDadosUsuarioNaUI(userData) {
    // Topbar
    const userMeta = document.querySelector('.user-meta');
    if (userMeta) {
        userMeta.innerHTML = `<strong>${userData.nome || ''}</small>`;
    }

    // Dropdown Helper
    const setText = (id, txt, isHtml = false) => { 
        const el = document.getElementById(id); 
        if(el) isHtml ? el.innerHTML = txt : el.textContent = txt; 
    };

    setText('dropdownUserName', userData.nome || 'Usuário');
    setText('dropdownUserId', `ID: ${userData.id_usuario || userData.id || '?'}`);
    setText('dropdownUserEmail', `<strong>E-mail:</strong> ${userData.email}`, true);
    setText('dropdownUserRole', `<strong>Cargo:</strong> ${userData.cargo}`, true);
    setText('dropdownUserDept', `<strong>Departamento:</strong> ${userData.departamento}`, true);
    setText('dropdownUserLevel', `<strong>Nível:</strong> ${userData.nivel_acesso}`, true);
}

// =================================================================
// --- 4. Configuração de Eventos (Listeners) ---
// =================================================================

function setupUIEvents() {
    // 1. Sidebar Toggle (Mobile)
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
            toggleBtn.innerHTML = sidebar.classList.contains('open') ? '✕' : '≡';
        });

        // Fechar ao clicar fora ou em link (Mobile)
        document.addEventListener('click', (e) => {
            const isLink = e.target.closest('.menu-item');
            const isOutside = !sidebar.contains(e.target) && e.target !== toggleBtn;
            
            if (window.innerWidth <= 1024 && (isOutside || isLink)) {
                sidebar.classList.remove('open');
                toggleBtn.innerHTML = '≡';
            }
        });
    }

    // 2. User Dropdown
    const userTrigger = document.getElementById('userMenuTrigger');
    const userDropdown = document.getElementById('userDropdownMenu');
    
    if (userTrigger && userDropdown) {
        userTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => userDropdown.classList.remove('show'));
    }

    // 3. Logout Buttons
    document.querySelectorAll('#logoutBtn, .btn-logout').forEach(btn => {
        btn.addEventListener('click', fazerLogout);
    });
}

// =================================================================
// --- 5. Inicialização ---
// =================================================================

async function iniciarAplicacao() {
    const userData = await getUsuarioLogado();

    if (userData) {
        console.log("Usuário Logado:", userData); // Debug para conferir o nível
        store.usuarioLogado = userData;
        
        atualizarDadosUsuarioNaUI(userData);
        controlarAcessoMenu(userData);
        setupUIEvents();
        
        navigate(); 
    } else {
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login/tela_login.html';
        }
    }
}

// Globais
window.addEventListener('hashchange', navigate);
window.detalharChamadoIA = iniciarDetalhesIA;

// Start
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = YEAR;
    iniciarAplicacao();
});