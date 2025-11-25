/**
 * @file abrir-chamado.js
 * @description Módulo de Criação de Chamados.
 * * Esta é a "porta de entrada" do sistema para o usuário final.
 * * Meu foco aqui foi criar uma interface limpa e intuitiva, garantindo que o usuário
 * forneça todas as informações críticas (como data e impacto) antes de enviar.
 * @author [Micaías Viola - Full Stack Developer]
 */

import { apiCreateChamado } from '../api/chamados.js';
import { showConfirmationModal } from '../utils/feedbackmodal.js';

// --- ÍCONES (Consistência Visual) ---
const ICONS = {
    refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`,
    user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    briefcase: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
};

/**
 * @class AbrirChamadoView
 * @description Controlador de Formulário.
 * Encapsula a lógica de validação, feedback e envio.
 */
class AbrirChamadoView {
    constructor(containerId = 'view', alertId = 'alert') {
        this.container = document.getElementById(containerId);
        this.alertContainerId = alertId;
        this.formId = 'formChamado';
    }

    /**
     * @method render
     * @description Ponto de entrada. Injeta o HTML e ativa os eventos.
     */
    render() {
        this.container.innerHTML = this.getTemplate();
        this.attachListeners();
    }
    
    /**
     * @method getTemplate
     * @description Retorna a estrutura HTML do formulário.
     * * Utilizei um Grid Layout para campos menores (Categoria/Data) e blocos completos
     * para as perguntas de impacto, facilitando a leitura em "Z" do usuário.
     */
    getTemplate() {
        return `
                <header>
                 <h2 style="margin:0; font-size: 1.5rem; color: #2d3748;">Abrir Chamado </h2>
                 <small style="color:#718096">Preencha as informações para solicitar um novo atendimento</small>
                </header>
                
                <form class="form" id="${this.formId}">
                
                <div>
                    <label class="label">Assunto</label>
                    <input class="input" autocomplete="off" name="titulo" required placeholder="Descreva brevemente o problema" />
                </div>
                
                <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap:12px;">
                    <div>
                        <label class="label">Categoria <span class="info" title="Software: Sistemas/Apps. Hardware: Equipamentos físicos.">ℹ️</span> </label>
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
                    <label class="demanda"> <input type="radio" name="impacto" value="Alto" required> Impede a execução do trabalho </label>
                    <label class="demanda"> <input type="radio" name="impacto" value="Medio"> Causa atraso mas o trabalho continua </label>
                    <label class="demanda"> <input type="radio" name="impacto" value="Baixo"> Impacto mínimo e sem prejuízos operacionais </label>
                </div>
                
                <div id="usuario">
                    <label class="label"> Ocorre com todos os usuários ou apenas com você? <span style="color:red" >* </span> </label>
                    <label class="usuario"> <input type="radio" name="usuarios" value="Todos" required> Todos os usuários </label>
                    <label class="usuario"> <input type="radio" name="usuarios" value="Com um grupo específico"> Atinge apenas um grupo específico </label>
                    <label class="usuario"> <input type="radio" name="usuarios" value="Somente com o usuário"> Apenas comigo </label>
                </div>
                
                <div id="tempo">
                    <label class="label"> Qual a frequência que ocorre o problema? <span style="color:red" >* </span> </label>
                    <label class="tempo"> <input type="radio" name="frequencia" value="Ocasional"> Ocasionalmente </label>
                    <label class="tempo"> <input type="radio" name="frequencia" value="Sempre"> Continuadamente </label>
                </div>
                
                <div>
                    <label class="label">Descrição<span style="color:red" > * </span></label>
                    <textarea class="textarea" name="descricao" required placeholder="Detalhe o que está acontecendo"></textarea>
                </div>
                
                <footer class="actions">
                 <button class="btn btn-secondary" type="reset">Limpar</button>
                 <button class="btn" type="submit">Enviar</button>
                </footer>
                
            </form>
            <div id="${this.alertContainerId}" style="margin-top:10px;"></div>
        `;
    }

    /**
     * @method attachListeners
     * @description Configura o comportamento do formulário.
     * * Inclui um truque de UX interessante: permite "desmarcar" um botão de rádio
     * clicando nele novamente, algo que o HTML padrão não permite.
     */
    attachListeners() {
        const form = document.getElementById(this.formId);
        if (form) {
            // Bind(this) é crucial para que 'this' dentro do handleSubmit continue sendo a classe, e não o form HTML.
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        // UX: Permitir desmarcar rádios
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
     * @method validateDataProblema
     * @description Validação Lógica de Negócio.
     * * Regra: Não permitimos registrar problemas com data futura (previsão), 
     * apenas ocorrências passadas ou presentes.
     */
    validateDataProblema(dataProblemaString) {
        if (!dataProblemaString) return true; // Campo vazio é ok (se não for required no HTML)

        const dataProblema = new Date(dataProblemaString);
        const hoje = new Date();

        // Normalização para ignorar horas
        dataProblema.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);

        return dataProblema <= hoje;
    }

    /**
     * @method handleSubmit
     * @async
     * @description Controlador principal do envio.
     * 1. Valida dados customizados.
     * 2. Pede confirmação via Modal (Segurança).
     * 3. Envia para a API.
     * 4. Trata erros de forma amigável.
     */
    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const f = new FormData(form);

        const dataProblema = f.get('data');

        if (!this.validateDataProblema(dataProblema)) {
            this.showAlert('❌ A data do problema não pode ser futura.', true);
            return;
        }

        // Modal de Confirmação
        const confirmed = await showConfirmationModal(
            "Confirmar Abertura de Chamado",
            "Deseja realmente enviar este chamado? Certifique-se de que todos os dados estão corretos."
        );

        if (!confirmed) {
            this.showAlert('', false); // Limpa alertas se cancelar
            return; 
        }
        
        // Feedback de Carregamento
        this.showAlert('⏳ Enviando chamado...', false);
        
        try {
            const novoChamado = {
                titulo: f.get('titulo'),
                categoria: f.get('categoria'),
                descricao: f.get('descricao'),
                
                // Metadados automáticos
                dataAbertura: new Date().toISOString(),
                dataProblema: dataProblema || null, 
                status: 'Aberto', 
                
                // Classificação IA
                impacto: f.get('impacto'),
                usuarios: f.get('usuarios'),
                frequencia: f.get('frequencia')
            };

            const resultado = await apiCreateChamado(novoChamado);
            const idGerado = resultado.id_Cham || resultado.id || '?';

            // Sucesso!
            this.showAlert(`✅ Chamado #${idGerado} aberto com sucesso.`, false);
            form.reset();

        } catch (error) {
            // Tratamento de Erros Robusto
            let mensagemUsuario = 'Ocorreu um erro desconhecido. Tente novamente.';

            if (error instanceof Error) {
                mensagemUsuario = error.message;
            }

            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                mensagemUsuario = '🚨 Erro de conexão: O servidor de chamados está inacessível.';
            }

            this.showAlert(`❌ ${mensagemUsuario}`, true);
        }
    }

    /**
     * @method showAlert
     * @description Sistema de feedback visual simples.
     */
    showAlert(message, isError) {
        const alertDiv = document.getElementById(this.alertContainerId);
        if (alertDiv) {
            const errorClass = isError ? ' error' : '';
            alertDiv.innerHTML = `<div class="card${errorClass}">${message}</div>`;
        }
    }
}

// Função exportada para o Router
export function renderAbrirChamado() {
    const chamadoView = new AbrirChamadoView();
    chamadoView.render();
}

export { AbrirChamadoView };