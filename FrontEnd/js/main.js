import { YEAR } from './utils/constants.js';
import { API_BASE } from './utils/constants.js';
import { applyAccent } from './utils/helpers.js';
import { renderDashboard } from './views/dashboard.js';
import { renderAbrirChamado } from './views/abrir-chamado.js';
// Mantendo o import original (que aponta para solucionar-chamados.js, mas o nome é renderMeusChamados)
import { renderTodosChamados } from './views/solucionar-chamados.js';
import { renderMeusChamados } from './views/meus-chamados.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderConfig } from './views/config.js';
import { store } from './store.js';
import { iniciarDetalhesIA } from './views/detalhes-IA.js'; 
// Constantes de Nível de Acesso
const NIVEL_ADMIN = 3;
const NIVEL_SOLUCIONADOR = 2; // Assumindo que o acesso a "Solucionar Chamados" começa no nível 2 (Técnico)
const NIVEL_CLIENTE = 1;

// Mapeamento de Rotas Restritas (Guarda de Rota)
const ROTA_NIVEL_MINIMO = {
    // Rota /todos (Solucionar Chamados) - Acesso bloqueado para Nível 1
    todos: NIVEL_SOLUCIONADOR, 
    // Rota /usuarios (Gerenciar Usuários) - Acesso bloqueado para Nível 1 e 2
    usuarios: NIVEL_ADMIN 
};

// Configuração inicial (Mantida no topo)
const yearEl = document.getElementById('year');
yearEl.textContent = YEAR;

// Sistema de rotas (Mantido no formato original)
const routes = {
    'pagina-inicial': renderDashboard, 
    dashboard: renderDashboard,
    abrir: renderAbrirChamado,
    chamados: renderMeusChamados,
    todos: renderTodosChamados,
    usuarios: renderUsuarios,
    config: renderConfig
};

// =================================================================
// 1. FUNÇÕES DE ROTEAMENTO E GUARDA DE ROTA
// =================================================================

function renderNotFound() {
    const view = document.getElementById('view');
    view.innerHTML = '<div class="card">Página não encontrada.</div>';
}

function renderAccessDenied(hashTentado) {
    const view = document.getElementById('view');
    view.innerHTML = `
        <div class="card" style="background-color:#f8d7da; color:#842029;">
            <p><strong>Acesso Proibido!</strong></p>
            <p>Você não tem permissão para acessar a rota **/${hashTentado}**.</p>
        </div>
    `;
    // Redireciona o usuário para uma rota segura (página inicial)
    setTimeout(() => {
        location.hash = '#/pagina-inicial';
    }, 3000);
}

/**
 * Função principal de navegação e Guarda de Rota (Route Guard).
 */
function navigate() {
    const fullHash = location.hash.replace('#/', '') || 'pagina-inicial'; 
    
    // 2. 🚨 NOVO: Extrai apenas a parte principal da rota (ex: 'chamados' de 'chamados/detalhe/42')
    const hashParts = fullHash.split('/');
    const hash = hashParts[0];
    // Pega o objeto do usuário (GARANTIDO de estar carregado pela initializeApp)
    const usuario = store.usuarioLogado; 

    // 1. GUARDA DE ROTA: Checagem de Acesso
    const nivelNecessario = ROTA_NIVEL_MINIMO[hash];

    if (nivelNecessario) {
        // Verifica se o usuário tem a propriedade de nível (e qual é o nível)
        const nivelDoUsuario = usuario?.nivel_acesso;

        if (!nivelDoUsuario || nivelDoUsuario < nivelNecessario) {
            renderAccessDenied(hash);
            return; // Bloqueia a navegação
        }
    }

    // 2. Atualiza o menu ativo
    document.querySelectorAll('.menu-item').forEach(a => a.classList.remove('active'));
    const active = document.querySelector(`.menu-item[href="#/${hash}"]`);
    if (active) active.classList.add('active');

    // 3. Executa a função correspondente à rota
    const fn = routes[hash] || renderNotFound;
    const view = document.getElementById('view');
    view.innerHTML = '';
    fn();
}


// =================================================================
// 2. FUNÇÕES DE UTILIDADE E CONTROLE DE ACESSO
// =================================================================

/**
 * Controla a visibilidade dos itens de menu restritos.
 */
function controlarAcessoMenu(usuarioLogado) {
    if (!usuarioLogado) return;
    
    // Mantendo a verificação original do nome da variável
    const nivelDoUsuario = usuarioLogado.nivel_acesso; 

    const linksRestritos = [
        // Rota 'todos' (Solucionar Chamados)
        { route: 'todos', nivelMinimo: NIVEL_SOLUCIONADOR, id: 'menuSolucionarChamados' }, 
        // Rota 'usuarios' (Gerenciar Usuários)
        { route: 'usuarios', nivelMinimo: NIVEL_ADMIN, id: 'menuGerenciarUsuarios' }, 

        {route: 'dashboard', nivelMinimo: NIVEL_ADMIN, id: 'menuDashboard'}
    ];

    linksRestritos.forEach(item => {
        const linkElement = document.getElementById(item.id) || document.querySelector(`[data-route="${item.route}"]`);

        if (linkElement) {
            const ehPermitido = nivelDoUsuario >= item.nivelMinimo;
            linkElement.style.display = ehPermitido ? '' : 'none';
        }
    });
}


// =================================================================
// 3. FUNÇÕES DE AUTENTICAÇÃO
// =================================================================

async function getUsuarioLogado() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, { // USANDO API_BASE
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar dados do usuário logado:', error);
        return null;
    }
}

async function fazerLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        console.log("Sessão encerrada com sucesso.");
        store.usuarioLogado = null; 
        window.location.href = '/login/login_teste.html';

    } catch (error) {
        console.error('Erro de rede ao fazer logout:', error);
        alert('Erro de conexão.');
    }
}


// =================================================================
// 4. FUNÇÃO CENTRAL DE INICIALIZAÇÃO (CORREÇÃO DO BUG DE RECARGA)
// =================================================================

/**
 * Função central que carrega os dados do usuário e só então inicia a aplicação.
 */
async function atualizarMetaUsuario() {
    const userData = await getUsuarioLogado();
    const userMetaDiv = document.querySelector('.user-meta');

    if (userData) {
        // Armazena no store antes de qualquer chamada a navigate()
        store.usuarioLogado = userData;
        
        // Atualiza a interface do usuário
        userMetaDiv.innerHTML = `
            <strong>Olá, ${userData.nome || userData.email}</strong>
            <small>${userData.cargo || 'Nível ' + userData.nivel_acesso} </small>
        `;
        
        // Controla a visibilidade do menu
        controlarAcessoMenu(userData); 
        
    } else {
        // Usuário não logado
        userMetaDiv.innerHTML = `<strong>Faça login</strong>`;
        
        // Redireciona para login
        if (!window.location.pathname.includes('login')) {
             window.location.href = '/login/login_teste.html';
             return; // Para não tentar navegar sem autenticação
        }
    }
    
    // *** SOLUÇÃO DO BUG: A navegação é iniciada AQUI, após store.usuario estar definido. ***
    navigate();
}


// =================================================================
// 5. LISTENERS GLOBAIS E INICIALIZAÇÃO
// =================================================================

// Evento de navegação (para clique no menu ou hash manual)
window.addEventListener('hashchange', navigate);
window.detalharChamadoIA = iniciarDetalhesIA;

document.addEventListener('DOMContentLoaded', () => {
    // Configura o botão de logout
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', fazerLogout);
    }
    
    // 1. Inicia o fluxo de autenticação e carregamento de dados
    atualizarMetaUsuario(); 

    // 2. Aplica a cor de destaque inicial
    applyAccent(store.preferencias.accent);
});

// Outros eventos
document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.querySelector('.app').classList.toggle('compact');
});

document.getElementById('globalSearch').addEventListener('change', e => {
    const q = e.target.value.toLowerCase();
    // location.hash = '#/todos';
    setTimeout(() => {
        const input = document.getElementById('busca');
        if (input) { input.value = q; input.dispatchEvent(new Event('input')); }
    }, 0);
});