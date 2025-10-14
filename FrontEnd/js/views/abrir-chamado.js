import { apiCreateChamado } from '../api/chamados.js';

/**
 * Classe responsável por gerenciar a view e a lógica do formulário Abrir Chamado.
 */
class AbrirChamadoView {
    constructor(containerId = 'view', alertId = 'alert') {
        this.container = document.getElementById(containerId);
        this.alertContainerId = alertId;
        this.formId = 'formChamado';
    }

    /**
     * Define o HTML da view e anexa os listeners de eventos.
     */
    render() {
        this.container.innerHTML = this.getTemplate();
        this.attachListeners();
    }

    /**
     * Retorna o template HTML do formulário.
     */
    getTemplate() {
        // O HTML do seu formulário é colocado aqui, quase idêntico ao original.
        return `
            <form class="form" id="${this.formId}">
                <div>
                    <label class="label">Assunto</label>
                    <input class="input" name="titulo" required placeholder="Descreva brevemente o problema" />
                </div>
                <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap:12px;">
                    <div>
                        <label class="label">Categoria <span class="info" title="Software: chamados relacionados a sistemas, aplicativos ou programas. Hardware: chamados relacionados a peças físicas, como computador, impressora, etc.">ℹ️</span> </label>
                        <select class="select" name="categoria">
                            <option>Software</option><option>Hardware</option>
                        </select>
                    </div>
                    <div>
                        <label class="label"> Quando começou o problema? <span style="color:red" >* </span> </label>
                        <input type="date" id="data" name="data">
                    </div>
                </div>
                <div id="demanda">
                    <label class="label"> Qual o impacto na demanda? <span style="color:red" >* </span> </label>
                    <label class="demanda"> <input type="radio" name="impacto" value="alto" required> Impede a execução do trabalho </label>
                    <label class="demanda"> <input type="radio" name="impacto" value="medio"> Causa atraso mas o trabalho continua </label>
                    <label class="demanda"> <input type="radio" name="impacto" value="baixo"> Impacto mínimo e sem prejuízos operacionais </label>
                </div>
                <div id="usuario">
                    <label class="label"> Ocorre com todos os usuários ou apenas com você? <span style="color:red" >* </span> </label>
                    <label class="usuario"> <input type="radio" name="usuarios" value="todos" required> Todos os usuários </label>
                    <label class="usuario"> <input type="radio" name="usuarios" value="cinq"> Atinge apenas um grupo específico </label>
                    <label class="usuario"> <input type="radio" name="usuarios" value="eu"> Apenas comigo </label>
                </div>
                <div id="tempo">
                    <label class="label"> Qual a frequência que ocorre o problema? <span style="color:red" >* </span> </label>
                    <label class="tempo"> <input type="radio" name="frequencia" value="Ocasional"> Ocasionalmente </label>
                    <label class="tempo"> <input type="radio" name="frequencia" value="Sempre"> Continuadamente </label>
                </div>
                <div>
                    <label class="label">Descrição</label>
                    <textarea class="textarea" name="descricao" placeholder="Detalhe o que está acontecendo"></textarea>
                </div>
                <div class="actions">
                    <button class="btn" type="submit">Enviar</button>
                    <button class="btn btn-secondary" type="reset">Limpar</button>
                </div>
            </form>
            <div id="${this.alertContainerId}" style="margin-top:10px;"></div>
        `;
    }

    /**
     * Anexa todos os manipuladores de eventos.
     */
    attachListeners() {
        const form = document.getElementById(this.formId);
        if (form) {
            // Usa .bind(this) para manter o contexto da classe AbrirChamadoView
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        // Lógica para desfazer a seleção do rádio
        let ultimoClicado = null;
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('click', function () {
                if (ultimoClicado === this) {
                    this.checked = false;
                    ultimoClicado = null;
                } else {
                    ultimoClicado = this;
                }
            });
        });
    }

    /**
     * Valida se a data do problema é menor ou igual à data atual.
     * @param {string} dataProblemaString A data de problema em formato string (YYYY-MM-DD).
     * @returns {boolean} True se a data for válida, False caso contrário.
     */
    validateDataProblema(dataProblemaString) {
        if (!dataProblemaString) return true; // Se o campo for opcional, trate como válido se vazio.

        // Cria objetos Date para comparação
        const dataProblema = new Date(dataProblemaString);
        const hoje = new Date();

        // Zera as horas/minutos para garantir que a comparação seja apenas pela data
        dataProblema.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);

        // A data do problema DEVE ser menor ou igual à data de hoje.
        return dataProblema <= hoje;
    }

    /**
     * Manipula o envio do formulário.
     * @param {Event} e O evento de envio do formulário.
     */
    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const f = new FormData(form);

        const dataProblema = f.get('data');

        if (!this.validateDataProblema(dataProblema)) {
            // Este erro é capturado ANTES de ir para a API
            this.showAlert('❌ A data do problema não pode ser futura.', true);
            return;
        }

        try {
            const novoChamado = {
                // ... (dados do formulário) ...
                titulo: f.get('titulo'),
                categoria: f.get('categoria'),
                descricao: f.get('descricao'),
                status: 'Aberto',
                dataAbertura: new Date().toISOString(),
                dataProblema: dataProblema,
                impacto: f.get('impacto'),
                usuarios: f.get('usuarios'),
                frequencia: f.get('frequencia')
            };

            // Exemplo de feedback enquanto espera
            this.showAlert('⏳ Enviando chamado...', false); 
            
            await apiCreateChamado(novoChamado);
            
            // Sucesso
            this.showAlert('✅ Chamado aberto com sucesso.', false);
            form.reset();

        } catch (error) {
            // --- TRATAMENTO ROBUSTO DE ERRO NO FRONTEND ---
            let mensagemUsuario = 'Ocorreu um erro desconhecido. Tente novamente.';

            // 1. Erros lançados pela função API (incluindo erros 400/500 do backend)
            if (error instanceof Error) {
                // Usamos a mensagem de erro que a API extraiu do backend.
                mensagemUsuario = error.message; 
            }
            
            // 2. Erros de rede (como API fora do ar)
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                mensagemUsuario = '🚨 Erro de conexão: O servidor de chamados está inacessível.';
            }

            // Exibir a mensagem mais específica
            this.showAlert(`❌ ${mensagemUsuario}`, true);
        }
    }

    /**
     * Exibe uma mensagem de alerta na tela.
     * @param {string} message A mensagem a ser exibida.
     * @param {boolean} isError Define se a mensagem é um erro (usa classe 'error').
     */
    showAlert(message, isError) {
        const alertDiv = document.getElementById(this.alertContainerId);
        if (alertDiv) {
            const errorClass = isError ? ' error' : '';
            alertDiv.innerHTML = `<div class="card${errorClass}">${message}</div>`;
        }
    }
}

// A função de exportação externa (como seu código original):
export function renderAbrirChamado() {
    const chamadoView = new AbrirChamadoView();
    chamadoView.render();
}