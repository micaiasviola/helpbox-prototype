/**
 * @file usuarios.js
 * @description Módulo de Gerenciamento de Usuários.
 * * Eu projetei este arquivo para ser autossuficiente na renderização e lógica da tela de usuários.
 * Ele consome a API, gerencia o estado local da tabela e manipula o DOM diretamente.
 * Optei por não usar frameworks reativos aqui para manter o código leve e "vanilla",
 * ideal para quem quer entender os fundamentos do JavaScript moderno.
 * * @author [Micaías Viola - Full Stack Developer]
 */

import { apiGetUsuarios, apiCreateUsuario, apiUpdateUsuario, apiDeleteUsuario } from '../api/usuarios.js';
import { showConfirmationModal } from '../utils/feedbackmodal.js';

/**
 * @constant {Object} ICONS
 * @description Biblioteca de ícones SVG inline.
 * * Decidi declarar os ícones diretamente aqui como constantes de string.
 * Isso evita requisições HTTP extras para carregar bibliotecas externas (como FontAwesome)
 * e garante que o carregamento da interface seja instantâneo.
 */
const ICONS = {
    plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
};

/**
 * Função Principal: renderUsuarios
 * * Esta é a única função exportada. Ela atua como o "Componente" da página.
 * Eu sigo uma abordagem de "Destruir e Recriar": quando chamada, ela limpa a view atual
 * e injeta o HTML/CSS novo. Isso garante que não haja lixo de memória de telas anteriores.
 */
export function renderUsuarios() {
    const view = document.getElementById('view');

    /**
     * @section CSS Injection
     * Optei por usar CSS-in-JS (via Template String) aqui.
     * Isso mantém o estilo encapsulado junto com a lógica. Se eu apagar este arquivo JS,
     * o estilo vai junto, facilitando a manutenção futura.
     */
    const styles = `
        <style>
            /* --- CSS GERAL DE DIALOGS --- */
            /* O backdrop-filter dá aquele efeito de desfoque moderno no fundo */
            dialog::backdrop { background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px); }
            
            /* --- CSS ESPECÍFICO DESTA TELA --- */
            #userDialog { 
                position: fixed; inset: 0; margin: auto; border: none; border-radius: 12px; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 24px; 
                width: 90%; max-width: 600px; z-index: 1000;
                background: #fff;
            }
            .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .full-width { grid-column: span 2; }
            .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }

            /* --- BADGES (Etiquetas Visuais) --- */
            /* Uso cores semânticas para diferenciar hierarquias rapidamente */
            .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8em; font-weight: 600; letter-spacing: 0.3px; }
            .badge-adm { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
            .badge-tec { background-color: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb; }
            .badge-cli { background-color: #f5f5f5; color: #616161; border: 1px solid #e0e0e0; }
            
            .badge-nivel-3 { color: #d32f2f; font-weight:bold; }
            .badge-nivel-2 { color: #1976d2; }
            .badge-nivel-1 { color: #757575; }

            /* --- BOTÕES E AÇÕES --- */
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
            
            /* Criei classes específicas .btn-action para limpar a tabela visualmente */
            .btn-action {
                padding: 6px;
                border-radius: 6px;
                border: 1px solid transparent;
                background: transparent;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-action.edit:hover { background: #e3f2fd; color: #1976d2; }
            .btn-action.delete:hover { background: #ffebee; color: #d32f2f; }
            
        </style>
    `;

    /**
     * @section HTML Structure
     * Monto a estrutura da página. 
     * Uso a tag <dialog> nativa do HTML5 para o modal, pois ela resolve nativamente
     * questões de acessibilidade e sobreposição (z-index) que antigamente davam muito trabalho.
     */
    view.innerHTML = `
    ${styles}
    
    <div class="toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:10px;">
         <div style="background:#eef2f6; padding:8px; border-radius:8px; color:#4a5568;">
            ${ICONS.user}
         </div>
         <div>
            <h2 style="margin:0; font-size: 1.5rem; color: #2d3748;">Gerenciar Usuários</h2>
            <small style="color:#718096">Controle de acesso e permissões do sistema</small>
         </div>
      </div>
      <button id="btnOpenModal" class="btn btn-primary">
        ${ICONS.plus} Novo Usuário
      </button>
    </div>

    <div id="alert"></div>

    <div class="table-responsive" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <table class="table" style="margin-bottom: 0;">
            <thead style="background: #f8f9fa; border-bottom: 2px solid #edf2f7;">
                <tr>
                    <th style="width:50px; text-align:center; color: #4a5568;">ID</th>
                    <th style="color: #4a5568;">Nome Completo</th>
                    <th style="color: #4a5568;">Email</th>
                    <th style="color: #4a5568;">Departamento</th>
                    <th style="text-align:center; color: #4a5568;">Cargo</th>
                    <th style="text-align:center; color: #4a5568;">Nível</th>
                    <th style="text-align:center; color: #4a5568; width: 100px;">Ações</th>
                </tr>
            </thead>
            <tbody id="uBody"></tbody>
        </table>
    </div>

    <dialog id="userDialog">
        <h3 id="modalTitle" style="margin-top:0; margin-bottom:20px; font-size:1.25rem; border-bottom:1px solid #eee; padding-bottom:10px;">Novo Usuário</h3>
        <form id="userForm">
            <div class="form-grid">
                <div>
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Nome</label>
                    <input id="novoNome" class="input" style="width:100%" required />
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Sobrenome</label>
                    <input id="novoSobrenome" class="input" style="width:100%" required />
                </div>
                <div class="full-width">
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Email Corporativo</label>
                    <input id="novoEmail" class="input" type="email" style="width:100%" required />
                </div>
                <div class="full-width">
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Departamento</label>
                    <input id="novoDepartamento" class="input" style="width:100%" required />
                </div>
                
                <div>
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Senha</label>
                    <input id="novoSenha" class="input" type="password" style="width:100%" />
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Confirmar Senha</label>
                    <input id="confirmaSenha" class="input" type="password" style="width:100%" />
                </div>
                
                <div>
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Cargo</label>
                    <select id="novoCargo" class="select" style="width:100%">
                        <option>Cliente</option>
                        <option>Tecnico</option>
                        <option>Administrador</option>
                    </select>
                </div>
                
                <div>
                    <label style="display:block; margin-bottom:5px; font-size:0.85rem; color:#666;">Nível de Permissão</label>
                    <select id="novoPermissao" class="select" style="width:100%">
                        <option value="1">Acesso: Baixo (1)</option>
                        <option value="2">Acesso: Médio (2)</option>
                        <option value="3">Acesso: Alto (3)</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" id="btnCancelModal" class="btn btn-secondary">Cancelar</button>
                <button type="button" id="btnSaveModal" class="btn btn-primary">Salvar Usuário</button>
            </div>
        </form>
    </dialog>
    `;

    // --- REFERÊNCIAS DOM E VARIÁVEIS DE ESTADO ---
    // Eu capturo todos os elementos que vou precisar manipular logo no início.
    // Isso é uma boa prática para evitar ficar varrendo o DOM repetidamente (performance).
    const body = document.getElementById('uBody');
    const alertBox = document.getElementById('alert');
    const dialog = document.getElementById('userDialog');
    const btnSave = document.getElementById('btnSaveModal');
    
    // Inputs do formulário
    const inpNome = document.getElementById('novoNome');
    const inpSobrenome = document.getElementById('novoSobrenome');
    const inpEmail = document.getElementById('novoEmail');
    const inpSenha = document.getElementById('novoSenha');
    const inpConfirma = document.getElementById('confirmaSenha');
    const inpDep = document.getElementById('novoDepartamento');
    const inpCargo = document.getElementById('novoCargo');
    const inpPermissao = document.getElementById('novoPermissao');

    // Estado Local
    const nivelAcesso = { '1': 'Baixo', '2': 'Médio', '3': 'Alto' };
    
    /** * @type {Array} 
     * Armazeno os usuários localmente para permitir operações rápidas (como filtro e busca futura)
     * sem precisar bater na API toda hora.
     */
    let usuarios = [];
    
    /** * @type {number|null} 
     * Variável de controle essencial: se for null, o modal está em modo CRIAÇÃO.
     * Se tiver um ID, o modal está em modo EDIÇÃO.
     */
    let editId = null;

    // --- FUNÇÕES AUXILIARES ---

    /**
     * @function showAlert
     * @description Exibe feedback visual temporário para o usuário.
     * @param {string} msg Mensagem a ser exibida.
     * @param {string} tipo 'success' ou 'error'.
     */
    function showAlert(msg, tipo = 'success') {
        alertBox.innerHTML = `<div class="card" style="padding:12px; margin-bottom:20px; border-left: 4px solid ${tipo === 'error' ? '#dc3545' : '#198754'}; background-color: white; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">${msg}</div>`;
        setTimeout(() => alertBox.innerHTML = '', 3000);
    }

    /**
     * @function getCargoBadge
     * @description Transforma o texto do cargo em um componente visual (Badge).
     */
    function getCargoBadge(cargo) {
        if (cargo === 'Administrador') return `<span class="badge badge-adm">Admin</span>`;
        if (cargo === 'Tecnico') return `<span class="badge badge-tec">Técnico</span>`;
        return `<span class="badge badge-cli">Cliente</span>`;
    }

    function getNivelBadge(nivel) {
        const labels = { 1: 'Baixo (1)', 2: 'Médio (2)', 3: 'Alto (3)' };
        return `<span class="badge-nivel-${nivel}">${labels[nivel] || nivel}</span>`;
    }

    /**
     * @function openModal
     * @description Prepara e abre o modal.
     * * Aqui está a lógica inteligente: eu uso a mesma função para criar e editar.
     * Se receber um objeto 'user', preencho o formulário e mudo o texto do botão.
     * Se não, limpo tudo para um novo cadastro.
     * * @param {Object|null} user O objeto usuário se for edição, ou null se for novo.
     */
    function openModal(user = null) {
        // Reseto estilos de validação visual
        inpSenha.style.borderColor = '';
        inpConfirma.style.borderColor = '';

        if (user) {
            // --- MODO EDIÇÃO ---
            editId = user.id_User;
            document.getElementById('modalTitle').textContent = `Editar ${user.nome_User}`;
            
            // Populo os inputs
            inpNome.value = user.nome_User;
            inpSobrenome.value = user.sobrenome_User;
            inpEmail.value = user.email_User;
            inpDep.value = user.departamento_User;
            inpCargo.value = user.cargo_User;
            inpPermissao.value = user.nivelAcesso_User;
            
            // A senha não é obrigatória na edição, então deixo vazio
            inpSenha.value = ''; 
            inpConfirma.value = '';
            inpSenha.placeholder = "Deixe vazio para manter a atual";
            inpConfirma.placeholder = "";
            
            btnSave.textContent = 'Salvar Alterações';
        } else {
            // --- MODO CRIAÇÃO ---
            editId = null;
            document.getElementById('modalTitle').textContent = 'Novo Usuário';
            document.getElementById('userForm').reset(); // Limpa o formulário nativamente
            
            inpSenha.placeholder = "";
            inpConfirma.placeholder = "";
            btnSave.textContent = 'Criar Usuário';
        }
        dialog.showModal(); // Método nativo do browser, lida com foco e backdrop
    }

    function closeModal() {
        dialog.close();
    }

    /**
     * @function fetchUsuarios
     * @async
     * @description Busca inicial de dados. Exibe um loader simples enquanto aguarda.
     */
    async function fetchUsuarios() {
        try {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Carregando usuários...</td></tr>';
            usuarios = await apiGetUsuarios();
            draw();
        } catch (err) {
            showAlert('Erro ao carregar usuários.', 'error');
        }
    }

    /**
     * @function draw
     * @description Renderiza a tabela baseada no estado local (array 'usuarios').
     * * Eu sempre limpo o tbody e recrio as linhas. Para listas pequenas/médias,
     * isso é extremamente rápido e simplifica muito a lógica de atualização (não preciso achar a linha exata no DOM para mudar).
     */
    function draw() {
        body.innerHTML = '';
        if (usuarios.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f0f0f0';
            
            // Injeção de HTML seguro.
            // Note o uso de data-attributes (data-id) nos botões. 
            // Isso permite que eu identifique onde cliquei depois, sem criar um listener para cada botão.
            tr.innerHTML = `
                <td style="text-align:center; color:#666;">${u.id_User}</td>
                <td style="font-weight:500; color:#2d3748;">${u.nome_User} ${u.sobrenome_User}</td>
                <td style="color:#4a5568;">${u.email_User}</td>
                <td style="color:#4a5568;">${u.departamento_User}</td>
                <td style="text-align:center;">${getCargoBadge(u.cargo_User)}</td>
                <td style="text-align:center;">${getNivelBadge(u.nivelAcesso_User)}</td>
                <td style="text-align:center;">
                    <button class="btn-action edit" data-id="${u.id_User}" data-action="editar" title="Editar Usuário">
                        ${ICONS.edit}
                    </button>
                    <button class="btn-action delete" data-id="${u.id_User}" data-action="remover" title="Remover Usuário">
                        ${ICONS.trash}
                    </button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    // --- EVENT LISTENERS ---

    document.getElementById('btnOpenModal').addEventListener('click', () => openModal());
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    /**
     * @listener Botão Salvar
     * @description Gerencia tanto a criação quanto a edição.
     * * Eu prefiro validar os dados aqui no front-end antes de enviar para poupar requisições ao servidor.
     */
    btnSave.addEventListener('click', async () => {
        const nome = inpNome.value.trim();
        const sobrenome = inpSobrenome.value.trim();
        const email = inpEmail.value.trim();
        const senha = inpSenha.value.trim();
        const confirma = inpConfirma.value.trim();
        const departamento = inpDep.value.trim();
        const cargo = inpCargo.value;
        const permissao = parseInt(inpPermissao.value);

        // Validação básica
        if (!nome || !sobrenome || !email || !departamento) {
            return alert('Preencha os campos obrigatórios.');
        }

        // Validação de Senha (Lógica Condicional)
        if (editId === null) {
            // Novo Usuário: Senha Obrigatória
            if (!senha) return alert('Senha é obrigatória para novos usuários.');
            if (senha !== confirma) return alert('As senhas não conferem!');
        }
        if (editId !== null && senha) {
            // Edição: Senha Opcional (só valida se digitou algo)
            if (senha !== confirma) return alert('A confirmação da nova senha não confere!');
        }

        // UX: Modal de Confirmação antes de cometer a ação
        const actionVerb = editId ? 'editar' : 'criar';
        const userConfirmed = await showConfirmationModal(
            'Confirmar Ação', 
            `Deseja realmente ${actionVerb} o usuário <b>${nome}</b>?`
        );

        if (!userConfirmed) return;

        const dados = {
            nome_User: nome,
            sobrenome_User: sobrenome,
            email_User: email,
            departamento_User: departamento,
            cargo_User: cargo,
            nivelAcesso_User: permissao
        };
        // Só envio a senha se ela foi alterada/criada
        if (senha) dados.senha_User = senha;

        // Feedback Visual de "Salvando..."
        const textoOriginal = btnSave.innerHTML; 
        btnSave.disabled = true;
        btnSave.textContent = 'Salvando...';

        try {
            if (editId !== null) {
                // Atualização (PUT)
                await apiUpdateUsuario(editId, dados);
                
                // Otimização: Atualizo o array local manualmente. 
                // Isso evita ter que buscar todos os usuários do banco de novo (fetchUsuarios).
                const index = usuarios.findIndex(u => u.id_User === editId);
                if (index !== -1) usuarios[index] = { ...usuarios[index], ...dados };
                showAlert('Usuário atualizado com sucesso!');
            } else {
                // Criação (POST)
                const resultado = await apiCreateUsuario({ ...dados, senha_User: senha });
                // Adiciono na lista local
                usuarios.push({ id_User: resultado.id || '?', ...dados });
                showAlert('Usuário criado com sucesso!');
            }
            closeModal(); 
            draw(); // Redesenha a tabela com os novos dados
        } catch (err) {
            console.error(err);
            alert(`Erro na operação: ${err.message}`); 
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = textoOriginal;
        }
    });

    /**
     * @listener Delegação de Eventos na Tabela
     * @description A técnica chave aqui é "Delegação de Eventos".
     * * Em vez de adicionar um 'click listener' em cada botão de editar/excluir (o que seria pesado
     * se tivéssemos 1000 usuários), eu adiciono UM único listener no corpo da tabela.
     * Quando alguém clica, eu verifico se o alvo foi um botão (.closest) e leio a ação desejada.
     */
    body.addEventListener('click', async e => {
        const btn = e.target.closest('button'); // Captura o clique mesmo se for no ícone SVG dentro do botão
        if (!btn) return;
        
        const id = +btn.dataset.id;
        const action = btn.dataset.action;
        const user = usuarios.find(u => u.id_User === id);

        if (action === 'editar') {
            openModal(user);
        } else if (action === 'remover') {
            const shouldDelete = await showConfirmationModal(
                'Remover Usuário',
                `Tem certeza que deseja remover o usuário <b>${user.nome_User}</b>?`
            );

            if (shouldDelete) {
                try {
                    await apiDeleteUsuario(id);
                    // Removo do array local e redesenho
                    usuarios = usuarios.filter(u => u.id_User !== id);
                    draw();
                    showAlert('Usuário removido.');
                } catch (err) {
                    showAlert('Erro ao remover: ' + err.message, 'error');
                }
            }
        }
    });

    // Início: Dispara o carregamento assim que o módulo é montado.
    fetchUsuarios();
}