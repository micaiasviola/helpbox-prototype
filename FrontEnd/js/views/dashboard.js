import { apiGetChamados } from '../api/chamados.js';
import { apiGetUsuarios } from '../api/usuarios.js';

// --- ÍCONES SVG MODERNOS (Feather/Lucide) ---
const ICONS = {
    barChart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    users: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    checkCircle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    clock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    filter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
};

export class DashboardView {
    constructor() {
        this.container = document.getElementById('view');
        this.allChamados = [];
        this.allUsuarios = [];
    }

    async render() {
        this.renderBaseHTML();
        await this.loadData();
    }

    renderBaseHTML() {
        const styles = `
            <style>
                /* Header */
                .toolbar-title { display: flex; align-items: center; gap: 10px; margin-bottom: 30px; }
                .icon-bg { background:#eef2f6; padding:10px; border-radius:10px; color:#4a5568; display: flex; align-items: center; justify-content:center; }
                
                /* Grid de KPIs */
                .kpi-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .kpi-card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    border: 1px solid #f1f5f9;
                    transition: transform 0.2s;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                
                .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .kpi-icon { padding: 8px; border-radius: 8px; }
                .kpi-value { font-size: 2.2rem; font-weight: 700; color: #1e293b; margin: 0; line-height: 1; }
                .kpi-label { color: #64748b; font-size: 0.9rem; font-weight: 500; margin-top: 5px; }

                /* Cores Temáticas KPI */
                .theme-blue .kpi-icon { background: #eff6ff; color: #3b82f6; }
                .theme-red .kpi-icon { background: #fef2f2; color: #ef4444; }
                .theme-green .kpi-icon { background: #f0fdf4; color: #22c55e; }
                .theme-yellow .kpi-icon { background: #fefce8; color: #eab308; }

                /* Filtros */
                .report-section { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
                .section-title { font-size: 1.1rem; font-weight: 600; color: #334155; margin-bottom: 20px; display:flex; align-items:center; gap:8px; }
                
                .filter-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    align-items: end;
                    margin-bottom: 25px;
                }
                .filter-label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem; color: #475569; }
                
                /* Botões */
                .btn-icon-text { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500; }
                
                /* Tabela */
                .report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom:15px; border-bottom:1px solid #f1f5f9; }
                .result-count { font-size: 0.95rem; color: #64748b; }
            </style>
        `;

        this.container.innerHTML = `
            ${styles}
            
            <div class="toolbar-title">
                <div class="icon-bg">${ICONS.barChart}</div>
                <div>
                    <h2 style="margin:0; font-size: 1.5rem; color: #2d3748;">Dashboard & Relatórios</h2>
                    <small style="color:#718096">Visão geral e extração de dados</small>
                </div>
            </div>
            
            <div id="loadingState" class="card loading">
                <div style="text-align:center; padding: 20px;">Carregando dados analíticos...</div>
            </div>

            <div id="dashboardContent" style="display:none; animation: fadeIn 0.5s;">
                <div class="kpi-container">
                    <div class="kpi-card theme-blue">
                        <div class="kpi-header">
                            <span class="kpi-label">Total de Chamados</span>
                            <div class="kpi-icon">${ICONS.barChart}</div>
                        </div>
                        <h3 class="kpi-value" id="count-total">0</h3>
                    </div>
                    
                    <div class="kpi-card theme-red">
                        <div class="kpi-header">
                            <span class="kpi-label">Em Aberto</span>
                            <div class="kpi-icon">${ICONS.users}</div>
                        </div>
                        <h3 class="kpi-value" id="count-aberto">0</h3>
                    </div>
                    
                    <div class="kpi-card theme-green">
                        <div class="kpi-header">
                            <span class="kpi-label">Resolvidos</span>
                            <div class="kpi-icon">${ICONS.checkCircle}</div>
                        </div>
                        <h3 class="kpi-value" id="count-resolvido">0</h3>
                    </div>
                    
                    <div class="kpi-card theme-yellow">
                        <div class="kpi-header">
                            <span class="kpi-label">Pendentes (S/ Téc)</span>
                            <div class="kpi-icon">${ICONS.clock}</div>
                        </div>
                        <h3 class="kpi-value" id="count-pendente">0</h3>
                    </div>
                </div>

                <div class="report-section">
                    <div class="section-title">
                        ${ICONS.filter} Gerador de Relatório Personalizado
                    </div>
                    
                    <div class="filter-grid">
                        <div>
                            <label class="filter-label">Data Inicial</label>
                            <input type="date" id="filterDtInicio" class="input" style="width:100%">
                        </div>
                        <div>
                            <label class="filter-label">Data Final</label>
                            <input type="date" id="filterDtFim" class="input" style="width:100%">
                        </div>
                        <div>
                            <label class="filter-label">Técnico Responsável</label>
                            <select id="filterTecnico" class="select" style="width:100%">
                                <option value="">Todos os Técnicos</option>
                            </select>
                        </div>
                        <div>
                            <label class="filter-label">Status</label>
                            <select id="filterStatus" class="select" style="width:100%">
                                <option value="">Todos os Status</option>
                                <option value="Aberto">Aberto</option>
                                <option value="Em andamento">Em andamento</option>
                                <option value="Fechado">Fechado</option>
                            </select>
                        </div>
                        <div>
                            <button id="btnGerarRelatorio" class="btn primary btn-icon-text" style="width:100%; height: 42px;">
                                ${ICONS.search} Gerar
                            </button>
                        </div>
                    </div>

                    <div id="report-result" style="display:none;">
                        <div class="report-header">
                            <span class="result-count">Encontrados: <strong id="result-count" style="color:#333">0</strong> registros</span>
                            <button id="btnExportCsv" class="btn secondary small btn-icon-text">
                                ${ICONS.download} Exportar CSV
                            </button>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table">
                                <thead style="background: #f8f9fa;">
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
                </div>
            </div>
        `;

        this.attachListeners();
    }

    attachListeners() {
        document.getElementById('btnGerarRelatorio').addEventListener('click', () => this.filtrarRelatorio());
        document.getElementById('btnExportCsv').addEventListener('click', () => this.exportarCSV());
    }

    async loadData() {
        try {
            // Busca 1000 registros para ter base estatística suficiente
            // Idealmente a API teria um endpoint /stats, mas calcularemos no front por enquanto
            const [chamadosRaw, usuariosRaw] = await Promise.all([
                apiGetChamados(1, 1000),
                apiGetUsuarios()
            ]);

            // Normalização dos Chamados
            if (chamadosRaw.chamados && Array.isArray(chamadosRaw.chamados)) {
                this.allChamados = chamadosRaw.chamados;
            } else if (Array.isArray(chamadosRaw)) {
                this.allChamados = chamadosRaw;
            } else if (chamadosRaw.data && Array.isArray(chamadosRaw.data)) {
                this.allChamados = chamadosRaw.data;
            } else {
                this.allChamados = [];
            }

            // Normalização dos Usuários
            if (Array.isArray(usuariosRaw)) {
                this.allUsuarios = usuariosRaw;
            } else if (usuariosRaw.data && Array.isArray(usuariosRaw.data)) {
                this.allUsuarios = usuariosRaw.data;
            } else {
                this.allUsuarios = [];
            }

            this.calculateKPIs();
            this.populateTechnicians();

            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('dashboardContent').style.display = 'block';

        } catch (error) {
            document.getElementById('loadingState').innerHTML = `<div class="td-error">Erro ao carregar dados: ${error.message}</div>`;
            console.error(error);
        }
    }

    calculateKPIs() {
        const total = this.allChamados.length;

        // Abertos: Status 'Aberto'
        const abertos = this.allChamados.filter(c => c.status_Cham === 'Aberto').length;

        // Resolvidos: Status 'Fechado' ou 'Resolvido'
        const resolvidos = this.allChamados.filter(c => 
            c.status_Cham === 'Fechado' || c.status_Cham === 'Resolvido'
        ).length;

        // Pendentes: 'Em andamento' MAS sem técnico responsável
        const pendentes = this.allChamados.filter(c => {
            const status = (c.status_Cham || '').toLowerCase();
            const semTecnico = !c.tecResponsavel_Cham; // null, 0 ou undefined
            return status === 'em andamento' && semTecnico;
        }).length;

        // Animação simples dos números
        document.getElementById('count-total').textContent = total;
        document.getElementById('count-aberto').textContent = abertos;
        document.getElementById('count-resolvido').textContent = resolvidos;
        document.getElementById('count-pendente').textContent = pendentes;
    }

    populateTechnicians() {
        const select = document.getElementById('filterTecnico');
        const tecnicos = this.allUsuarios.filter(u => 
            u.cargo_User === 'Tecnico' || u.cargo_User === 'Administrador'
        );

        tecnicos.forEach(tec => {
            const option = document.createElement('option');
            option.value = tec.id_User;
            option.textContent = `${tec.nome_User} ${tec.sobrenome_User}`;
            select.appendChild(option);
        });
    }

    filtrarRelatorio() {
        const dtInicioVal = document.getElementById('filterDtInicio').value;
        const dtFimVal = document.getElementById('filterDtFim').value;
        const idTecnico = document.getElementById('filterTecnico').value;
        const statusFilter = document.getElementById('filterStatus').value;

        const dtInicio = dtInicioVal ? new Date(dtInicioVal) : null;
        const dtFim = dtFimVal ? new Date(dtFimVal) : null;
        if (dtFim) dtFim.setHours(23, 59, 59, 999);

        const filtrados = this.allChamados.filter(chamado => {
            const dataChamado = new Date(chamado.dataAbertura_Cham);
            
            // Filtro Data
            if (dtInicio && dataChamado < dtInicio) return false;
            if (dtFim && dataChamado > dtFim) return false;

            // Filtro Técnico
            if (idTecnico && String(chamado.tecResponsavel_Cham) !== String(idTecnico)) return false;

            // Filtro Status
            if (statusFilter && chamado.status_Cham !== statusFilter) return false;

            return true;
        });

        this.renderTable(filtrados);
    }

    renderTable(dados) {
        const reportResult = document.getElementById('report-result');
        const reportBody = document.getElementById('report-body');
        const countSpan = document.getElementById('result-count');

        reportResult.style.display = 'block';
        countSpan.textContent = dados.length;
        reportBody.innerHTML = '';

        if (dados.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        dados.forEach(c => {
            const dataF = new Date(c.dataAbertura_Cham).toLocaleDateString();
            
            // Resolver Nome Técnico
            let nomeTecnico = '<span style="color:#999; font-style:italic">Não atribuído</span>';
            if (c.tecNome) {
                nomeTecnico = `${c.tecNome} ${c.tecSobrenome || ''}`;
            } else if (c.tecResponsavel_Cham) {
                const tec = this.allUsuarios.find(u => u.id_User == c.tecResponsavel_Cham);
                if (tec) nomeTecnico = `${tec.nome_User} ${tec.sobrenome_User}`;
            }

            // Resolver Nome Cliente
            let nomeCliente = c.clienteNome || 'Cliente';
            if (!c.clienteNome && c.clienteId_Cham) {
                 const cli = this.allUsuarios.find(u => u.id_User == c.clienteId_Cham);
                 if (cli) nomeCliente = cli.nome_User;
            }

            // Badge Status
            const statusClass = c.status_Cham.toLowerCase().replace(/\s/g, ''); // emandamento, aberto
            const statusBadge = `<span class="badge ${statusClass}">${c.status_Cham}</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:#666">${c.id_Cham}</td>
                <td>${dataF}</td>
                <td style="font-weight:500; color:#2d3748">${c.titulo_Cham}</td>
                <td>${statusBadge}</td>
                <td>${nomeTecnico}</td>
                <td>${nomeCliente}</td>
            `;
            reportBody.appendChild(tr);
        });
    }

    exportarCSV() {
        const rows = Array.from(document.querySelectorAll('#report-body tr'));
        if (rows.length === 0 || rows[0].textContent.includes('Nenhum registro')) {
            return alert('Não há dados na tabela para exportar.');
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF força o Excel a ler como UTF-8
        csvContent += "ID;Data;Assunto;Status;Tecnico;Cliente\n"; // Cabeçalho (Ponto e vírgula é melhor para Excel BR)

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            // Limpa o HTML e aspas dos dados
            const rowData = Array.from(cols).map(col => {
                let text = col.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
                return `"${text}"`; // Envolve em aspas para proteger virgulas internas
            }).join(";");
            csvContent += rowData + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_chamados_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export async function renderDashboard() {
    const dashboard = new DashboardView();
    await dashboard.render();
}