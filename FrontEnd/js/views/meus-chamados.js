import { apiGetChamados, apiUpdateChamado } from '../api/chamados.js';
import { renderBadge, getPrioridadeTexto, formatDate } from '../utils/helpers.js';

let chamadosData = [];

/**
 * Exibe a lista de chamados com filtros
 */
export async function renderMeusChamados() {
    const view = document.getElementById('view');
    view.innerHTML = `
    <div class="toolbar">
      <select id="filtroStatus" class="select" style="max-width:220px">
        <option value="">Todos os status</option>
        <option>Aberto</option>
        <option>Em andamento</option>
        <option>Fechado</option>
      </select>
      <input id="busca" class="input" placeholder="Buscar por descrição..." style="max-width:320px"/>
      <button id="refreshChamados" class="btn">🔄 Atualizar</button>
    </div>
    <div class="loading" id="loadingChamados">Carregando chamados...</div>
    <table class="table">
      <thead>
        <tr>
          <th>ID Chamado</th>
          <th>ID Cliente </th>
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

    await loadChamadosFromDB();

    // Configurar eventos
    document.getElementById('refreshChamados').addEventListener('click', () => loadChamadosFromDB());
    document.getElementById('filtroStatus').addEventListener('change', drawChamados);
    document.getElementById('busca').addEventListener('input', drawChamados);
}

async function loadChamadosFromDB() {
    try {
        chamadosData = await apiGetChamados();
        renderChamadosTable(chamadosData);
        document.getElementById('loadingChamados').style.display = 'none';
    } catch (error) {
        document.getElementById('loadingChamados').textContent = 'Erro ao carregar chamados';
        console.error('Erro:', error);
    }
}

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
                <button class="btn" data-action="progress" data-id="${c.id_Cham}">Resolver</button>
                <button class="btn secondary" data-action="close" data-id="${c.id_Cham}">Finalizar ✓</button>
            </td>`;
        tbody.appendChild(tr);
    });

    tbody.addEventListener('click', handleChamadoActions);
}

/**
 * Filtra e exibe os chamados com base nos critérios selecionados
 */
function drawChamados() {
    if (!chamadosData) return;

    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';

    const status = document.getElementById('filtroStatus').value;
    const q = document.getElementById('busca').value.toLowerCase();

    chamadosData
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
// function getPrioridadeTexto(prioridade) {
//     const map = {
//         'A': 'Alta',
//         'M': 'Média',
//         'B': 'Baixa'
//     };
//     return map[prioridade] || prioridade;
// }

/**
 * Formata uma data para o formato brasileiro
 * @param {string} dateString - Data em formato string
 * @returns {string} Data formatada ou 'N/A' se inválida
 */
// function formatDate(dateString) {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('pt-BR');
// }

/**
 * Gera um badge colorido para o status do chamado
 * @param {string} status - Status do chamado
 * @returns {string} HTML do badge
 */
// function renderBadge(status) {
//     const map = {
//         'aberto': 'open',
//         'em andamento': 'progress',
//         'fechado': 'done'
//     };
//     const cls = map[status.toLowerCase()] || '';
//     return '<span class="badge ' + cls + '">' + status + '</span>';
// }