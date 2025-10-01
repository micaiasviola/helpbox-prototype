// HELPBOX SPA - Sistema de Gerenciamento de Chamados
// Roteador simples baseado em hash (#) na URL

// ===== CONFIGURAÇÕES INICIAIS =====
// Elementos principais da interface
const view = document.getElementById('view');          // Área onde o conteúdo é exibido
const yearEl = document.getElementById('year');        // Elemento para exibir o ano atual

// Configuração do ano atual no footer
yearEl.textContent = new Date().getFullYear();

// URL base da API (backend)
const API_BASE = 'http://localhost:3000';

// ===== FUNÇÕES DE API PARA CHAMADOS =====

/**
 * Busca todos os chamados da API
 * @returns {Array} Lista de chamados ou array vazio em caso de erro
 */
async function apiGetChamados() {
  try {
    const response = await fetch(`${API_BASE}/chamados`);
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Erro ao buscar chamados');
  } catch (error) {
    console.error('Erro API:', error);
    return [];
  }
}

/**
 * Atualiza um chamado específico na API
 * @param {number} id - ID do chamado a ser atualizado
 * @param {object} dados - Novos dados para o chamado
 * @returns {object} Chamado atualizado
 */
async function apiUpdateChamado(id, dados) {
  try {
    const response = await fetch(`${API_BASE}/chamados/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Erro ao atualizar chamado');
  } catch (error) {
    console.error('Erro API:', error);
    throw error;
  }
}

// ===== FUNÇÕES DE API PARA USUÁRIOS =====
// NOTA: Estas funções estão implementadas de forma inline em renderUsuarios()
// mas poderiam ser extraídas como as funções de chamados

/**
 * Aplica a cor de destaque selecionada na interface
 * @param {string} color - Cor em formato hexadecimal
 */
function applyAccent(color) {
  document.documentElement.style.setProperty('--primary', color);
  const primaryElements = document.querySelectorAll('.btn:not(.ghost), .badge, .menu-item.active');
  primaryElements.forEach(el => {
    el.style.backgroundColor = color;
    if (el.classList.contains('menu-item')) el.style.borderLeftColor = color;
  });
}

// ===== FUNÇÕES DE RENDERIZAÇÃO (EXIBIÇÃO) =====

/**
 * Exibe o dashboard principal
 */
function renderDashboard() {
  view.innerHTML = `<div class="card">Dashboard em construção</div>`;
}

/**
 * Exibe o formulário para abrir um novo chamado
 */
function renderAbrirChamado() {
  view.innerHTML = `
    <form class="form" id="formChamado">
      <div>
        <label class="label">Título</label>
        <input class="input" name="titulo" required placeholder="Descreva brevemente o problema" />
      </div>
      <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap:12px;">
        <div>
          <label class="label">Categoria</label>
          <select class="select" name="categoria">
            <option>Software</option><option>Hardware</option><option>Rede</option><option>Outros</option>
          </select>
        </div>
        <div>
          <label class="label">Anexo</label>
          <input class="input" name="anexo" type="file"/>
        </div>
      </div>
      <div>
        <label class="label">Descrição</label>
        <textarea class="textarea" name="descricao" placeholder="Detalhe o que está acontecendo"></textarea>
      </div>
      <div class="actions">
        <button class="btn" type="submit">Enviar</button>
        <button class="btn ghost" type="reset">Limpar</button>
      </div>
    </form>
    <div id="alert" style="margin-top:10px;"></div>
  `;

  // Configura o evento de envio do formulário
  document.getElementById('formChamado').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const novo = {
      id: (store.chamados.length ? Math.max(...store.chamados.map(c => c.id)) : 0) + 1,
      titulo: f.get('titulo'),
      status: 'Aberto',
      criado: new Date().toISOString().slice(0, 10)
    };
    store.chamados.unshift(novo);
    document.getElementById('alert').innerHTML = `<div class="card">✅ Chamado aberto com sucesso (#${novo.id}).</div>`;
    e.target.reset();
  });
}

/**
 * Exibe a lista de chamados com filtros
 */
async function renderMeusChamados() {
  view.innerHTML = `
    <div class="toolbar">
      <select id="filtroStatus" class="select" style="max-width:220px">
        <option value="">Todos os status</option>
        <option>aberto</option>
        <option>em andamento</option>
        <option>fechado</option>
      </select>
      <input id="busca" class="input" placeholder="Buscar por descrição..." style="max-width:320px"/>
      <button id="refreshChamados" class="btn">🔄 Atualizar</button>
    </div>
    <div class="loading" id="loadingChamados">Carregando chamados...</div>
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Descrição</th>
          <th>Status</th>
          <th>Prioridade</th>
          <th>Categoria</th>
          <th>Data Abertura</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
  `;

  // Carrega os chamados do banco de dados
  await loadChamadosFromDB();

  // Configura os eventos de filtro e busca
  document.getElementById('refreshChamados').addEventListener('click', () => loadChamadosFromDB());
  document.getElementById('filtroStatus').addEventListener('change', drawChamados);
  document.getElementById('busca').addEventListener('input', drawChamados);
}

/**
 * Carrega chamados da API e exibe na tabela
 */
async function loadChamadosFromDB() {
  try {
    const chamados = await apiGetChamados();
    window.chamadosData = chamados; // Armazena globalmente para filtros
    renderChamadosTable(chamados);
    document.getElementById('loadingChamados').style.display = 'none';
  } catch (error) {
    document.getElementById('loadingChamados').textContent = 'Erro ao carregar chamados';
    console.error('Erro:', error);
  }
}

/**
 * Renderiza a tabela de chamados
 * @param {Array} chamados - Lista de chamados a serem exibidos
 */
function renderChamadosTable(chamados) {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  chamados.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id_Cham}</td>
      <td>${c.descricao_Cham || 'Sem descrição'}</td>
      <td>${renderBadge(c.status_Cham)}</td>
      <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
      <td>${c.categoria_Cham || 'Não definida'}</td>
      <td>${formatDate(c.dataAbertura_Cham)}</td>
      <td>
        <button class="btn" data-action="progress" data-id="${c.id_Cham}">Mover ↻</button>
        <button class="btn secondary" data-action="close" data-id="${c.id_Cham}">Finalizar ✓</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // Adiciona os eventos aos botões de ação
  tbody.addEventListener('click', handleChamadoActions);
}

/**
 * Filtra e exibe os chamados com base nos critérios selecionados
 */
function drawChamados() {
  if (!window.chamadosData) return;

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  const status = document.getElementById('filtroStatus').value;
  const q = document.getElementById('busca').value.toLowerCase();

  window.chamadosData
    .filter(c => {
      const statusMatch = !status || c.status_Cham.toLowerCase() === status.toLowerCase();
      const searchMatch = !q ||
        (c.descricao_Cham && c.descricao_Cham.toLowerCase().includes(q)) ||
        (c.categoria_Cham && c.categoria_Cham.toLowerCase().includes(q));
      return statusMatch && searchMatch;
    })
    .forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.id_Cham}</td>
        <td>${c.descricao_Cham || 'Sem descrição'}</td>
        <td>${renderBadge(c.status_Cham)}</td>
        <td>${getPrioridadeTexto(c.prioridade_Cham)}</td>
        <td>${c.categoria_Cham || 'Não definida'}</td>
        <td>${formatDate(c.dataAbertura_Cham)}</td>
        <td>
          <button class="btn" data-action="progress" data-id="${c.id_Cham}">Mover ↻</button>
          <button class="btn secondary" data-action="close" data-id="${c.id_Cham}">Finalizar ✓</button>
        </td>`;
      tbody.appendChild(tr);
    });
}

/**
 * Manipula as ações dos botões na tabela de chamados
 * @param {Event} e - Evento de clique
 */
async function handleChamadoActions(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id = +btn.dataset.id;
  const action = btn.dataset.action;

  try {
    if (action === 'progress') {
      await apiUpdateChamado(id, { status_Cham: 'em andamento' });
    } else if (action === 'close') {
      await apiUpdateChamado(id, {
        status_Cham: 'fechado',
        dataFechamento_Cham: new Date().toISOString().slice(0, 10)
      });
    }

    // Recarrega a lista após a atualização
    await loadChamadosFromDB();

  } catch (error) {
    alert('Erro ao atualizar chamado: ' + error.message);
  }
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Converte código de prioridade em texto legível
 * @param {string} prioridade - Código de prioridade (A, M, B)
 * @returns {string} Texto descritivo da prioridade
 */
function getPrioridadeTexto(prioridade) {
  const map = {
    'A': 'Alta',
    'M': 'Média',
    'B': 'Baixa'
  };
  return map[prioridade] || prioridade;
}

/**
 * Formata uma data para o formato brasileiro
 * @param {string} dateString - Data em formato string
 * @returns {string} Data formatada ou 'N/A' se inválida
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Gera um badge colorido para o status do chamado
 * @param {string} status - Status do chamado
 * @returns {string} HTML do badge
 */
function renderBadge(status) {
  const map = {
    'aberto': 'open',
    'em andamento': 'progress',
    'fechado': 'done'
  };
  const cls = map[status.toLowerCase()] || '';
  return '<span class="badge ' + cls + '">' + status + '</span>';
}

/**
 * Exibe a interface de gerenciamento de usuários
 */
function renderUsuarios() {
  view.innerHTML = `
    <div class="toolbar">
      <input id="novoNome" class="input" placeholder="Nome do usuário" style="max-width:180px"/>
      <input id="novoSobrenome" class="input" placeholder="Sobrenome do usuário" style="max-width:180px"/>
      <input id="novoEmail" class="input" placeholder="Email do usuário" style="max-width:240px"/>
      <input id="novoSenha" class="input" placeholder="Senha" type="password" style="max-width:150px"/>
      <input id="novoDepartamento" class="input" placeholder="Departamento" style="max-width:150px"/>
      <select id="novoCargo" class="select" style="max-width:150px">
        <option>Cliente</option>
        <option>Tecnico</option>
        <option>Administrador</option>
      </select>
      <select id="novoPermissao" class="select" style="max-width:100px">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
      <button id="addUser" class="btn">Adicionar</button>
    </div>
    <div id="alert" style="margin-top:10px;"></div>
    <table class="table">
      <thead>
        <tr>
          <th>ID</th><th>Nome</th><th>Sobrenome</th><th>Email</th><th>Senha</th><th>Departamento</th><th>Cargo</th><th>Nível de Acesso</th><th>Ações</th>
        </tr>
      </thead>
      <tbody id="uBody"></tbody>
    </table>
  `;

  const body = document.getElementById('uBody');
  const alertBox = document.getElementById('alert');
  const nivelAcesso = { '1': 'Baixo', '2': 'Médio', '3': 'Alto' };
  let usuarios = [];
  let editId = null;

  /**
   * Exibe uma mensagem de alerta temporária
   * @param {string} msg - Mensagem a ser exibida
   * @param {string} tipo - Tipo de alerta (success ou error)
   */
  function showAlert(msg, tipo = 'success') {
    alertBox.innerHTML = `<div class="card" style="background-color:${tipo === 'error' ? '#f8d7da' : '#d4edda'};color:${tipo === 'error' ? '#842029' : '#0f5132'}">${msg}</div>`;
    setTimeout(() => alertBox.innerHTML = '', 3000);
  }

  /**
   * Busca usuários da API
   */
  async function fetchUsuarios() {
    try {
      const res = await fetch('http://localhost:3000/usuarios');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      usuarios = await res.json();
      draw();
    } catch (err) {
      showAlert('Erro ao carregar usuários: ' + err.message, 'error');
    }
  }

  /**
   * Renderiza a tabela de usuários
   */
  function draw() {
    body.innerHTML = '';
    usuarios.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id_User}</td>
        <td>${u.nome_User}</td>
        <td>${u.sobrenome_User}</td>
        <td>${u.email_User}</td>
        <td>******</td>
        <td>${u.departamento_User}</td>
        <td>${u.cargo_User}</td>
        <td>${nivelAcesso[u.nivelAcesso_User]}</td>
        <td>
          <button class="btn secondary" data-id="${u.id_User}" data-action="remover">Remover</button>
          <button class="btn primary" data-id="${u.id_User}" data-action="editar">Editar</button>
        </td>`;
      body.appendChild(tr);
    });
  }

  // Evento para adicionar/editar usuário
  document.getElementById('addUser').addEventListener('click', async () => {
    const nome = document.getElementById('novoNome').value.trim();
    const sobrenome = document.getElementById('novoSobrenome').value.trim();
    const email = document.getElementById('novoEmail').value.trim();
    const senha = document.getElementById('novoSenha').value.trim();
    const departamento = document.getElementById('novoDepartamento').value.trim();
    const cargo = document.getElementById('novoCargo').value;
    const permissao = parseInt(document.getElementById('novoPermissao').value);

    if (!nome || !sobrenome || !email || !senha || !departamento) return showAlert('Preencha todos os campos', 'error');

    try {
      if (editId !== null) {
        // Modo edição
        const res = await fetch(`http://localhost:3000/usuarios/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome_User: nome, sobrenome_User: sobrenome, email_User: email, senha_User: senha, departamento_User: departamento, cargo_User: cargo, nivelAcesso_User: permissao })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const user = usuarios.find(u => u.id_User === editId);
        Object.assign(user, { nome_User: nome, sobrenome_User: sobrenome, email_User: email, departamento_User: departamento, cargo_User: cargo, nivelAcesso_User: permissao });
        editId = null;
        document.getElementById('addUser').textContent = 'Adicionar';
        showAlert('Usuário atualizado com sucesso!');
      } else {
        // Modo criação
        const res = await fetch('http://localhost:3000/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome_User: nome, sobrenome_User: sobrenome, email_User: email, senha_User: senha, departamento_User: departamento, cargo_User: cargo, nivelAcesso_User: permissao })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        usuarios.push({ id_User: data.id, nome_User: nome, sobrenome_User: sobrenome, email_User: email, departamento_User: departamento, cargo_User: cargo, nivelAcesso_User: permissao });
        showAlert('Usuário adicionado com sucesso!');
      }
      document.getElementById('novoNome').value = '';
      document.getElementById('novoSobrenome').value = '';
      document.getElementById('novoEmail').value = '';
      document.getElementById('novoSenha').value = '';
      document.getElementById('novoDepartamento').value = '';
      draw();
    } catch (err) {
      showAlert('Erro ao salvar usuário: ' + err.message, 'error');
    }
  });

  // Eventos para os botões de ação na tabela de usuários
  body.addEventListener('click', async e => {
    if (!e.target.matches('button')) return;
    const id = +e.target.dataset.id;
    const action = e.target.dataset.action;
    const user = usuarios.find(u => u.id_User === id);

    if (action === 'remover') {
      try {
        const res = await fetch(`http://localhost:3000/usuarios/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        usuarios = usuarios.filter(u => u.id_User !== id);
        draw();
        showAlert('Usuário removido com sucesso!');
      } catch (err) {
        showAlert('Erro ao remover usuário: ' + err.message, 'error');
      }
    } else if (action === 'editar') {
      document.getElementById('novoNome').value = user.nome_User;
      document.getElementById('novoSobrenome').value = user.sobrenome_User;
      document.getElementById('novoEmail').value = user.email_User;
      document.getElementById('novoSenha').value = ''; // não mostra a senha real
      document.getElementById('novoDepartamento').value = user.departamento_User;
      document.getElementById('novoCargo').value = user.cargo_User;
      document.getElementById('novoPermissao').value = user.nivelAcesso_User;
      editId = id;
      document.getElementById('addUser').textContent = 'Salvar';
    }
  });

  fetchUsuarios();
}

/**
 * Exibe a página de configurações
 */
function renderConfig() {
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

/**
 * Exibe página não encontrada
 */
function renderNotFound() {
  view.innerHTML = '<div class="card">Página não encontrada.</div>';
}

// ===== SISTEMA DE ROTAS =====
// Mapeamento das rotas (URLs) para funções de renderização
const routes = {
  dashboard: renderDashboard,
  abrir: renderAbrirChamado,
  meus: renderMeusChamados,
  usuarios: renderUsuarios,
  config: renderConfig
};

/**
 * Navega para a rota especificada no hash da URL
 */
function navigate() {
  const hash = location.hash.replace('#/', '') || 'dashboard';

  // Atualiza o menu ativo
  document.querySelectorAll('.menu-item').forEach(a => a.classList.remove('active'));
  const active = document.querySelector(`.menu-item[href="#/${hash}"]`);
  if (active) active.classList.add('active');

  // Executa a função correspondente à rota
  const fn = routes[hash] || renderNotFound;
  view.innerHTML = '';
  fn();
}

// ===== CONFIGURAÇÃO DE EVENTOS =====

// Navega quando a hash muda ou quando a página carrega
window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// Alternar a barra lateral
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