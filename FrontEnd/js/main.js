/*
 * =================================================================
 * HELPBOX - main.js
 * =================================================================
 * Este é o arquivo principal que controla a aplicação (SPA).
 * Ele gerencia o roteamento, autenticação e a inicialização
 * de todos os componentes da página.
 * =================================================================
 */

// --- Importações de Módulos ---
import { YEAR, API_BASE } from './utils/constants.js';
import { applyAccent } from './utils/helpers.js';
import { showConfirmationModal } from './utils/feedbackmodal.js';
import { store } from './store.js';

// Importações das "Views" (Páginas)
import { renderDashboard } from './views/dashboard.js';
import { renderAbrirChamado } from './views/abrir-chamado.js';
import { renderTodosChamados } from './views/solucionar-chamados.js';
import { renderMeusChamados } from './views/meus-chamados.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderConfig } from './views/config.js';
import { iniciarDetalhesIA } from './views/detalhes-IA.js';
import { iniciarSolucao } from './views/solucionar-chamado-detalhe.js';

// =================================================================
// --- Configuração Global ---
// =================================================================

// Níveis de Acesso
const NIVEL_ADMIN = 3;
const NIVEL_SOLUCIONADOR = 2;
const NIVEL_COMUM = 1;

/**
 * Mapeamento das rotas que exigem um nível de acesso mínimo.
 * Isso é usado pelo "Route Guard" na função navigate().
 */
const ROTAS_RESTRITAS = {
    todos: NIVEL_SOLUCIONADOR, // Apenas Nível 2+ pode ver "Solucionar Chamados"
    usuarios: NIVEL_ADMIN,     // Apenas Nível 3 (Admin) pode ver "Gerenciar Usuários"
    dashboard: NIVEL_ADMIN     // Apenas Nível 3 (Admin) pode ver "Relatórios"
};

/**
 * Mapeamento central de rotas da aplicação.
 * Associa um 'hash' (da URL) a uma função que renderiza a página.
 */
const routes = {
    dashboard: renderDashboard,
    abrir: renderAbrirChamado,
    chamados: renderMeusChamados,
    todos: renderTodosChamados,
    usuarios: renderUsuarios,
    config: renderConfig,
    solucao: iniciarSolucao, // Rota especial para ver detalhes
    detalhesIA: iniciarDetalhesIA // Rota especial para IA
};

// =================================================================
// --- 1. Autenticação e Gerenciamento de Sessão ---
// =================================================================

/**
 * Busca os dados do usuário logado na API (usando o cookie de sessão).
 * 'credentials: include' é crucial para enviar o cookie.
 */
async function getUsuarioLogado() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include'
        });
        
        // Se a resposta não for OK (ex: 401 Não Autorizado), o cookie é inválido ou expirou.
        return response.ok ? await response.json() : null;

    } catch (error) {
        console.error('Erro de rede ao buscar dados do usuário:', error);
        return null;
    }
}

/**
 * Executa o processo de logout.
 * Mostra uma confirmação, chama a API de logout e redireciona para a tela de login.
 */
async function fazerLogout() {
    const confirmed = await showConfirmationModal(
        "Confirmação de Saída",
        "Deseja realmente sair do sistema?"
    );

    if (!confirmed) {
        console.log("Logout cancelado pelo usuário.");
        return;
    }

    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        console.log("Sessão encerrada com sucesso.");
        store.usuarioLogado = null; // Limpa o store
        window.location.href = '/login/tela_login.html'; // Redireciona

    } catch (error) {
        console.error('Erro de rede ao fazer logout:', error);
        alert('Erro de conexão ao tentar sair.');
    }
}

// =================================================================
// --- 2. Roteamento (SPA Router) ---
// =================================================================

/**
 * Renderiza a página de "Não Encontrado" (Erro 404).
 */
function renderNotFound() {
    document.getElementById('view').innerHTML = '<div class="card">Página não encontrada.</div>';
}

/**
 * Renderiza uma tela de "Acesso Proibido" e redireciona o usuário
 * para sua página padrão após 3 segundos.
 */
function renderAccessDenied(hashTentado) {
    const view = document.getElementById('view');
    view.innerHTML = `
        <div class="card" style="background-color:#f8d7da; color:#842029;">
            <p><strong>Acesso Proibido!</strong></p>
            <p>Você não tem permissão para acessar a rota **/${hashTentado}**.</p>
        </div>
    `;

    // Lógica de redirecionamento seguro
    const nivelDoUsuario = store.usuarioLogado?.nivel_acesso;
    let rotaSegura = '#/abrir'; // Padrão para Comum/Admin

    if (nivelDoUsuario === NIVEL_SOLUCIONADOR) {
        rotaSegura = '#/todos'; // Padrão para Solucionador
    }

    setTimeout(() => {
        location.hash = rotaSegura;
    }, 3000);
}

/**
 * Coração do roteador SPA (Single Page Application).
 * Esta função lê o hash da URL (ex: #/todos) e decide qual
 * página renderizar, aplicando as regras de permissão (Route Guard).
 */
function navigate() {
    let fullHash = location.hash.replace('#/', '');
    const view = document.getElementById('view');

    // 1. Lógica da Rota Padrão (Se a URL estiver vazia)
    // Se o usuário acabou de logar (URL sem hash), definimos uma página padrão.
    if (fullHash === '') {
        const nivelDoUsuario = store.usuarioLogado?.nivel_acesso;

        // Rota padrão condicional:
        if (nivelDoUsuario === NIVEL_SOLUCIONADOR) {
            fullHash = 'todos'; // Solucionador vai para "Solucionar Chamados"
        } else {
            fullHash = 'abrir'; // Admin e Comum vão para "Abrir Chamado"
        }
        
        // Atualiza a URL (isso vai disparar o 'hashchange' e recarregar esta função)
        location.hash = `#/${fullHash}`;
        return; 
    }

    // 2. Parse da Rota e Parâmetros
    // Transforma 'solucao/42' em hash='solucao' e idParam='42'
    const hashParts = fullHash.split('/');
    const hash = hashParts[0];
    const idParam = hashParts[1];

    // 3. Guarda de Rota (Route Guard) - Verificação de Permissões
    const usuario = store.usuarioLogado;
    const nivelDoUsuario = usuario?.nivel_acesso;
    
    // Regra Específica: Solucionador (Nível 2) não pode abrir chamado.
    if (hash === 'abrir' && nivelDoUsuario === NIVEL_SOLUCIONADOR) {
        renderAccessDenied(hash);
        return;
    }

    // Regra Geral: Verifica as permissões do objeto ROTAS_RESTRITAS
    const nivelNecessario = ROTAS_RESTRITAS[hash];
    if (nivelNecessario) {
        // Se o usuário não existe ou seu nível é menor que o necessário
        if (!nivelDoUsuario || nivelDoUsuario < nivelNecessario) {
            renderAccessDenied(hash);
            return;
        }
    }

    // 4. Atualização do Menu Ativo
    // Remove a classe 'active' de todos e adiciona no item clicado.
    document.querySelectorAll('.menu-item').forEach(a => a.classList.remove('active'));
    const activeMenuItem = document.querySelector(`.menu-item[href="#/${hash}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }

    // 5. Renderização da View
    const renderFunction = routes[hash] || renderNotFound;
    view.innerHTML = ''; // Limpa a view antiga

    // Rotas de detalhe (como 'solucao' ou 'detalhesIA') precisam receber o ID.
    if (renderFunction === iniciarSolucao || renderFunction === iniciarDetalhesIA) {
        renderFunction(idParam);
    } else {
        renderFunction();
    }
}

// =================================================================
// --- 3. Controle de Acesso (Visibilidade da UI) ---
// =================================================================

/**
 * Esconde/mostra itens do menu lateral com base no nível de acesso do usuário.
 */
function controlarAcessoMenu(usuarioLogado) {
    if (!usuarioLogado) return;

    const nivelDoUsuario = usuarioLogado.nivel_acesso;

    // Regra Específica: Esconde "Abrir Chamado" para Nível 2
    const linkAbrir = document.querySelector('[href="#/abrir"]');
    if (linkAbrir) {
        linkAbrir.style.display = (nivelDoUsuario === NIVEL_SOLUCIONADOR) ? 'none' : '';
    }

    // Regra Geral: Itera sobre as rotas restritas e seus links
    const linksRestritos = [
        { route: 'todos', nivelMinimo: NIVEL_SOLUCIONADOR, id: 'menuSolucionarChamados' },
        { route: 'usuarios', nivelMinimo: NIVEL_ADMIN, id: 'menuGerenciarUsuarios' },
        { route: 'dashboard', nivelMinimo: NIVEL_ADMIN, id: 'menuDashboard' }
    ];

    linksRestritos.forEach(item => {
        // Procura pelo ID ou pelo data-route
        const linkElement = document.getElementById(item.id) || document.querySelector(`[data-route="${item.route}"]`);

        if (linkElement) {
            const ehPermitido = nivelDoUsuario >= item.nivelMinimo;
            linkElement.style.display = ehPermitido ? '' : 'none';
        }
    });
}

// =================================================================
// --- 4. Atualização da UI (Helpers de Renderização) ---
// =================================================================

/**
 * Popula a Topbar e o Dropdown com os dados do usuário.
 */
function atualizarDadosUsuarioNaUI(userData) {
    // 1. Atualiza a Topbar
    const userMetaDiv = document.querySelector('.user-meta');
    if (userMetaDiv) {
        userMetaDiv.innerHTML = `
            <strong>Olá, ${userData.nome || userData.email}</strong>
            <small>${userData.cargo || 'Nível ' + userData.nivel_acesso}</small>
        `;
    }

    // 2. Popula o Dropdown de Usuário
    // (Helper para evitar 'null.textContent = ...' se o elemento não for achado)
    const setContent = (id, valor, isHTML = false) => {
        const el = document.getElementById(id);
        if (el) {
            if (isHTML) el.innerHTML = valor;
            else el.textContent = valor;
        }
    };

    setContent('dropdownUserName', userData.nome || 'Usuário');
    setContent('dropdownUserId', `ID: ${userData.id_usuario || userData.id || 'N/A'}`);
    setContent('dropdownUserEmail', `<strong>E-mail:</strong> ${userData.email || 'N/A'}`, true);
    setContent('dropdownUserRole', `<strong>Cargo:</strong> ${userData.cargo || 'N/A'}`, true);
    setContent('dropdownUserDept', `<strong>Departamento:</strong> ${userData.departamento || 'N/A'}`, true);
    setContent('dropdownUserLevel', `<strong>Nível de Acesso:</strong> Nível ${userData.nivel_acesso || 'N/A'}`, true);
}


// =================================================================
// --- 5. Inicialização da Aplicação ---
// =================================================================

/**
 * Função principal que inicia a aplicação.
 * Ela é chamada assim que o DOM está pronto.
 * 1. Busca o usuário
 * 2. Se tiver usuário, popula a UI e inicia o roteador.
 * 3. Se não tiver usuário, redireciona para o login.
 */
async function iniciarAplicacao() {
    const userData = await getUsuarioLogado();

    if (userData) {
        // 1. Armazena os dados do usuário globalmente
        store.usuarioLogado = userData;

        // 2. Popula a UI (Topbar e Dropdown)
        atualizarDadosUsuarioNaUI(userData);

        // 3. Ajusta a visibilidade dos menus
        controlarAcessoMenu(userData);

        // 4. Inicia o roteador (que vai carregar a página correta)
        navigate();

    } else {
        // Usuário não logado ou sessão expirou
        document.querySelector('.user-meta').innerHTML = `<strong>Faça login</strong>`;

        // Se não estivermos na tela de login, redireciona
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login/tela_login.html';
        }
    }
}

// =================================================================
// --- 6. Event Listeners Globais ---
// =================================================================

// Dispara o roteador toda vez que o hash da URL mudar
window.addEventListener('hashchange', navigate);

// Expõe a função de detalhes ao escopo global para ser chamada
// por botões 'onclick' gerados dinamicamente (se houver).
window.detalharChamadoIA = iniciarDetalhesIA;

/**
 * Ponto de entrada principal.
 * Quando o HTML estiver pronto, iniciamos os listeners e a aplicação.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // Inicia o fluxo principal de autenticação e renderização
    iniciarAplicacao();

    // Configura listeners de UI
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.querySelector('.app').classList.toggle('compact');
    });

    // Listener para o menu dropdown do usuário
    const userMenuTrigger = document.getElementById('userMenuTrigger');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userMenuTrigger && userDropdownMenu) {
        // Abre/Fecha o menu ao clicar no gatilho
        userMenuTrigger.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o 'window.click' feche imediatamente
            userDropdownMenu.classList.toggle('show');
        });

        // Fecha o menu se o usuário clicar em qualquer outro lugar
        window.addEventListener('click', () => {
            if (userDropdownMenu.classList.contains('show')) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }

    // CORREÇÃO: Pega TODOS os botões de logout (da sidebar e do dropdown)
    // Usar querySelectorAll garante que ambos funcionem.
    const logoutButtons = document.querySelectorAll('#logoutBtn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', fazerLogout);
    });


    // Configurações iniciais de UI
    document.getElementById('year').textContent = YEAR;
    applyAccent(store.preferencias.accent);
});