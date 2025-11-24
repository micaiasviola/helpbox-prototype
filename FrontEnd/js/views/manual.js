export function renderConfig() {
    const view = document.getElementById('view');
    
    view.innerHTML = `
    <div class="content-header">
        <h2>📖 Manual do Sistema HelpBox</h2>
        <p class="text-muted">Guia de referência para utilização das funcionalidades do sistema.</p>
    </div>

    <div class="card">
        <h3>1. Introdução</h3>
        <p>O HelpBox é um sistema de gerenciamento de chamados internos focado na agilidade e organização das solicitações de TI e manutenção.</p>
        <hr>

        <details>
            <summary><strong>👤 Perfil Usuário Comum</strong></summary>
            <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-top: 10px;">
                <p>O usuário básico tem acesso às seguintes funções:</p>
                <ul>
                    <li><strong>Abrir Chamado:</strong> Utilize o menu "Abrir Chamado" para registrar uma nova solicitação. Preencha o título, descrição e urgência com atenção.</li>
                    <li><strong>Meus Chamados:</strong> Acompanhe o status (Pendente, Em Andamento, Concluído) das suas solicitações e veja as respostas dos técnicos.</li>
                </ul>
            </div>
        </details>

        <details style="margin-top: 10px;">
            <summary><strong>🛠️ Perfil Solucionador (Técnico)</strong></summary>
            <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-top: 10px;">
                <p>Além das funções básicas, o técnico pode:</p>
                <ul>
                    <li><strong>Solucionar Chamados:</strong> Visualizar a fila geral de chamados de todos os setores.</li>
                    <li><strong>Interagir:</strong> Assumir a responsabilidade de um chamado, adicionar comentários técnicos e finalizar a solicitação.</li>
                    <li><strong>Diagnóstico:</strong> Utilizar ferramentas de IA (quando disponíveis) para obter sugestões de solução.</li>
                </ul>
            </div>
        </details>

        <details style="margin-top: 10px;">
            <summary><strong>🛡️ Perfil Administrador</strong></summary>
            <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-top: 10px;">
                <p>Gestão total do sistema:</p>
                <ul>
                    <li><strong>Dashboard:</strong> Acesso a gráficos e métricas de desempenho (SLA, volume de chamados).</li>
                    <li><strong>Gerenciar Usuários:</strong> Criar novos usuários, alterar níveis de permissão e resetar senhas.</li>
                </ul>
            </div>
        </details>

        <hr>
        <h3>📞 Suporte</h3>
        <p>Caso encontre erros no sistema, entre em contato com o departamento de TI ou envie um e-mail para <strong>suporte@helpbox.com</strong>.</p>
    </div>
    `;
}