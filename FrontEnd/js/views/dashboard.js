import { apiGetChamados } from '../api/chamados.js';
import { apiGetUsuarios } from '../api/usuarios.js';

export async function renderDashboard() {
    const view = document.getElementById('view');

    // CSS Específico para o Dashboard
    const styles = `
        <style>
            .kpi-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .kpi-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                text-align: center;
            }
            .kpi-card h3 { font-size: 2.5rem; margin: 10px 0; color: #333; }
            .kpi-card p { color: #666; margin: 0; font-weight: bold; text-transform: uppercase; font-size: 0.9rem; }
            
            /* Cores para os status */
            .kpi-total { border-left: 5px solid #0d6efd; }
            .kpi-aberto { border-left: 5px solid #dc3545; } /* Vermelho */
            .kpi-resolvido { border-left: 5px solid #198754; } /* Verde */
            .kpi-pendente { border-left: 5px solid #ffc107; } /* Amarelo */

            .filter-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                margin-bottom: 20px;
            }
            .filter-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                align-items: end;
            }
            .report-table-container { margin-top: 20px; overflow-x: auto; }
        </style>
    `;

    view.innerHTML = `
        ${styles}
        <h2>Dashboard Geral</h2>
        
        <div id="kpi-loading" class="card loading">Carregando indicadores...</div>
        <div id="kpi-display" class="kpi-container" style="display:none;">
            <div class="kpi-card kpi-total">
                <h3 id="count-total">0</h3>
                <p>Total de Chamados</p>
            </div>
            <div class="kpi-card kpi-aberto">
                <h3 id="count-aberto">0</h3>
                <p>Em Aberto</p>
            </div>
            <div class="kpi-card kpi-resolvido">
                <h3 id="count-resolvido">0</h3>
                <p>Resolvidos / Fechados</p>
            </div>
            <div class="kpi-card kpi-pendente">
                <h3 id="count-pendente">0</h3>
                <p>Pendentes</p>
            </div>
        </div>

        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #ccc;">

        <h3>Gerador de Relatório Detalhado</h3>
        <div class="filter-section">
            <div class="filter-grid">
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Data Inicial</label>
                    <input type="date" id="filterDtInicio" class="input" style="width:100%">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Data Final</label>
                    <input type="date" id="filterDtFim" class="input" style="width:100%">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Técnico (Opcional)</label>
                    <select id="filterTecnico" class="select" style="width:100%">
                        <option value="">Todos os Técnicos</option>
                        </select>
                </div>
                <div>
                    <button id="btnGerarRelatorio" class="btn primary" style="width:100%">Gerar Relatório</button>
                </div>
            </div>
        </div>

        <div id="report-result" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4>Resultados da Busca: <span id="result-count">0</span> registros</h4>
                <button id="btnExportCsv" class="btn secondary small">Exportar CSV</button>
            </div>
            <div class="report-table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Data</th>
                            <th>Assunto</th>
                            <th>Status</th>
                            <th>Técnico</th>
                            <th>Cliente</th>
                        </tr>
                    </thead>
                    <tbody id="report-body"></tbody>
                </table>
            </div>
        </div>
    `;

    // --- LÓGICA DO DASHBOARD ---

    let allChamados = [];
    let allUsuarios = [];

    // Referencias DOM
    const kpiDisplay = document.getElementById('kpi-display');
    const kpiLoading = document.getElementById('kpi-loading');
    const selectTecnico = document.getElementById('filterTecnico');
    const btnGerar = document.getElementById('btnGerarRelatorio');
    const reportResult = document.getElementById('report-result');
    const reportBody = document.getElementById('report-body');
    const btnExport = document.getElementById('btnExportCsv');
    /**
         * Carrega dados iniciais (Chamados e Usuarios)
         */
    async function loadData() {
        try {
            // CORREÇÃO 1: Aumentar o pageSize. 
            // Como sua API pagina por padrão (5 itens), o dashboard mostraria estatísticas erradas.
            // Passamos 1000 para tentar pegar todos os registros para calcular os KPIs corretamente.
            const [chamadosRaw, usuariosRaw] = await Promise.all([
                apiGetChamados(1, 1000),
                apiGetUsuarios()
            ]);

            // CORREÇÃO 2: Ajustar a leitura do objeto de retorno

            // Tenta verificar se veio { chamados: [...] } (Seu padrão atual)
            if (chamadosRaw.chamados && Array.isArray(chamadosRaw.chamados)) {
                allChamados = chamadosRaw.chamados;
            }
            // Tenta verificar se veio um Array direto (Fallback)
            else if (Array.isArray(chamadosRaw)) {
                allChamados = chamadosRaw;
            }
            // Tenta verificar se veio { data: [...] } (Padrão comum de outras APIs)
            else if (chamadosRaw.data && Array.isArray(chamadosRaw.data)) {
                allChamados = chamadosRaw.data;
            }
            else {
                console.error("Formato inesperado da API Chamados:", chamadosRaw);
                allChamados = [];
            }

            // Tratamento dos Usuários
            if (Array.isArray(usuariosRaw)) {
                allUsuarios = usuariosRaw;
            } else if (usuariosRaw.data && Array.isArray(usuariosRaw.data)) {
                allUsuarios = usuariosRaw.data;
            } else {
                // Usuários geralmente retorna array direto na sua API, mas deixamos seguro
                allUsuarios = [];
                console.error("Formato inesperado da API Usuários:", usuariosRaw);
            }

            calculateKPIs();
            populateTechnicians();

            kpiLoading.style.display = 'none';
            kpiDisplay.style.display = 'grid';

        } catch (error) {
            kpiLoading.textContent = `Erro ao carregar dados: ${error.message}`;
            kpiLoading.classList.add('error');
            console.error(error);
        }
    }

    /**
     * 1. Calcula e exibe os números dos cards superiores
     */
    function calculateKPIs() {
        const total = allChamados.length;

        // Abertos: Chamados novos que ainda estão com a IA ou recém criados
        const abertos = allChamados.filter(c => c.status_Cham === 'Aberto').length;

        // Resolvidos: Chamados finalizados
        const resolvidos = allChamados.filter(c => c.status_Cham === 'Fechado' || c.status_Cham === 'Resolvido').length;

        // --- CORREÇÃO AQUI ---
        // Pendentes: Chamados que foram encaminhados (Em andamento) MAS ninguém pegou ainda (tecResponsavel_Cham é null)
        const pendentes = allChamados.filter(c => {
            const status = c.status_Cham || '';
            // Aceita 'Em andamento' ou 'Em Andamento' (case insensitive por segurança)
            const isAndamento = status.toLowerCase() === 'em andamento';
            
            // Verifica se NÃO tem técnico (null, undefined ou 0)
            const semTecnico = !c.tecResponsavel_Cham;

            return isAndamento && semTecnico;
        }).length;

        // Atualiza a tela
        document.getElementById('count-total').textContent = total;
        document.getElementById('count-aberto').textContent = abertos;
        document.getElementById('count-resolvido').textContent = resolvidos;
        document.getElementById('count-pendente').textContent = pendentes;
    }

    /**
     * Preenche o Select de Técnicos (Apenas quem é admin ou técnico)
     */
    function populateTechnicians() {
        // Filtra usuarios que podem atender chamados (Ex: Admin e Tecnico)
        const tecnicos = allUsuarios.filter(u => u.cargo_User === 'Tecnico' || u.cargo_User === 'Administrador');

        tecnicos.forEach(tec => {
            const option = document.createElement('option');
            option.value = tec.id_User; // Assumindo que o chamado guarda o ID do tecnico
            option.textContent = `${tec.nome_User} ${tec.sobrenome_User}`;
            selectTecnico.appendChild(option);
        });
    }

    /**
     * 2. Gera o Relatório filtrado
     */
    btnGerar.addEventListener('click', () => {
        const dtInicioVal = document.getElementById('filterDtInicio').value;
        const dtFimVal = document.getElementById('filterDtFim').value;
        const idTecnico = selectTecnico.value;

        const dtInicio = dtInicioVal ? new Date(dtInicioVal) : null;
        const dtFim = dtFimVal ? new Date(dtFimVal) : null;
        if (dtFim) dtFim.setHours(23, 59, 59, 999);

        const filtrados = allChamados.filter(chamado => {
            const dataChamado = new Date(chamado.dataAbertura_Cham);
            
            // Filtro de Data
            if (dtInicio && dataChamado < dtInicio) return false;
            if (dtFim && dataChamado > dtFim) return false;

            // Filtro de Técnico
            if (idTecnico) {
                // CORREÇÃO AQUI: Usar 'tecResponsavel_Cham' em vez de 'id_Tecnico'
                // Comparamos como String para evitar erro de tipo (número vs texto)
                if (String(chamado.tecResponsavel_Cham) !== String(idTecnico)) return false; 
            }

            return true;
        });

        renderTable(filtrados);
    });

    /**
     * Renderiza a tabela de resultados
     */
    function renderTable(dados) {
        reportResult.style.display = 'block';
        document.getElementById('result-count').textContent = dados.length;
        reportBody.innerHTML = '';

        if (dados.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum chamado encontrado com estes filtros.</td></tr>';
            return;
        }

        dados.forEach(c => {
            const dataF = new Date(c.dataAbertura_Cham).toLocaleDateString();
            
            // CORREÇÃO AQUI: Lógica para exibir o nome do técnico
            let nomeTecnico = 'Não atribuído';
            
            // 1. Tenta pegar direto da API (sua rota Admin já traz tecNome)
            if (c.tecNome) {
                nomeTecnico = `${c.tecNome} ${c.tecSobrenome || ''}`;
            } 
            // 2. Fallback: Tenta achar pelo ID na lista de usuários carregada
            else if (c.tecResponsavel_Cham) {
                const tec = allUsuarios.find(u => u.id_User == c.tecResponsavel_Cham);
                if (tec) nomeTecnico = `${tec.nome_User} ${tec.sobrenome_User}`;
            }

            // Tratamento para nome do cliente também
            let nomeCliente = c.clienteNome || 'Cliente';
            // Se a API não trouxe o nome (rota diferente), tenta achar na lista
            if (!c.clienteNome && c.clienteId_Cham) {
                 const cli = allUsuarios.find(u => u.id_User == c.clienteId_Cham);
                 if (cli) nomeCliente = cli.nome_User;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.id_Cham}</td>
                <td>${dataF}</td>
                <td>${c.titulo_Cham}</td>
                <td><span class="badge ${c.status_Cham.toLowerCase()}">${c.status_Cham}</span></td>
                <td>${nomeTecnico}</td>
                <td>${nomeCliente}</td>
            `;
            reportBody.appendChild(tr);
        });
    }

    /**
     * (Bônus) Exportar tabela atual para CSV
     */
    btnExport.addEventListener('click', () => {
        const rows = Array.from(document.querySelectorAll('#report-body tr'));
        if (rows.length === 0 || rows[0].textContent.includes('Nenhum chamado')) return alert('Nada para exportar');

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Data,Assunto,Status,Tecnico,Cliente\n"; // Cabeçalho

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            const rowData = Array.from(cols).map(col => `"${col.innerText}"`).join(",");
            csvContent += rowData + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_chamados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Inicializa
    loadData();
}