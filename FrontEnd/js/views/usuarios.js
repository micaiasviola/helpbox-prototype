import { apiGetUsuarios, apiCreateUsuario, apiUpdateUsuario, apiDeleteUsuario } from '../api/usuarios.js';
import { showConfirmationModal } from '../utils/feedbackmodal.js';

// --- BIBLIOTECA DE ÍCONES (SVG Moderno) ---
const ICONS = {
    plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
};

/**
 * Exibe a interface de gerenciamento de usuários
 */
export function renderUsuarios() {
    const view = document.getElementById('view');

    const styles = `
        <style>
            /* --- CSS GERAL DE DIALOGS --- */
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

            /* --- BADGES (Etiquetas) --- */
            .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8em; font-weight: 600; letter-spacing: 0.3px; }
            .badge-adm { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
            .badge-tec { background-color: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb; }
            .badge-cli { background-color: #f5f5f5; color: #616161; border: 1px solid #e0e0e0; }
            
            .badge-nivel-3 { color: #d32f2f; font-weight:bold; }
            .badge-nivel-2 { color: #1976d2; }
            .badge-nivel-1 { color: #757575; }

            /* --- AJUSTES DE ÍCONES E BOTÕES --- */
            /* Isso garante que o ícone fique alinhado com o texto */
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
            
            /* Botões de ação da tabela mais compactos e modernos */
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

    // --- REFERÊNCIAS DOM E VARIÁVEIS ---
    const body = document.getElementById('uBody');
    const alertBox = document.getElementById('alert');
    const dialog = document.getElementById('userDialog');
    const btnSave = document.getElementById('btnSaveModal');
    
    // Inputs
    const inpNome = document.getElementById('novoNome');
    const inpSobrenome = document.getElementById('novoSobrenome');
    const inpEmail = document.getElementById('novoEmail');
    const inpSenha = document.getElementById('novoSenha');
    const inpConfirma = document.getElementById('confirmaSenha');
    const inpDep = document.getElementById('novoDepartamento');
    const inpCargo = document.getElementById('novoCargo');
    const inpPermissao = document.getElementById('novoPermissao');

    const nivelAcesso = { '1': 'Baixo', '2': 'Médio', '3': 'Alto' };
    let usuarios = [];
    let editId = null;

    // --- FUNÇÕES AUXILIARES ---

    function showAlert(msg, tipo = 'success') {
        alertBox.innerHTML = `<div class="card" style="padding:12px; margin-bottom:20px; border-left: 4px solid ${tipo === 'error' ? '#dc3545' : '#198754'}; background-color: white; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">${msg}</div>`;
        setTimeout(() => alertBox.innerHTML = '', 3000);
    }

    function getCargoBadge(cargo) {
        if (cargo === 'Administrador') return `<span class="badge badge-adm">Admin</span>`;
        if (cargo === 'Tecnico') return `<span class="badge badge-tec">Técnico</span>`;
        return `<span class="badge badge-cli">Cliente</span>`;
    }

    function getNivelBadge(nivel) {
        const labels = { 1: 'Baixo (1)', 2: 'Médio (2)', 3: 'Alto (3)' };
        return `<span class="badge-nivel-${nivel}">${labels[nivel] || nivel}</span>`;
    }

    function openModal(user = null) {
        inpSenha.style.borderColor = '';
        inpConfirma.style.borderColor = '';

        if (user) {
            editId = user.id_User;
            document.getElementById('modalTitle').textContent = `Editar ${user.nome_User}`;
            inpNome.value = user.nome_User;
            inpSobrenome.value = user.sobrenome_User;
            inpEmail.value = user.email_User;
            inpSenha.value = ''; 
            inpConfirma.value = '';
            inpSenha.placeholder = "Deixe vazio para manter a atual";
            inpConfirma.placeholder = "";
            inpDep.value = user.departamento_User;
            inpCargo.value = user.cargo_User;
            inpPermissao.value = user.nivelAcesso_User;
            btnSave.textContent = 'Salvar Alterações';
        } else {
            editId = null;
            document.getElementById('modalTitle').textContent = 'Novo Usuário';
            document.getElementById('userForm').reset();
            inpSenha.placeholder = "";
            inpConfirma.placeholder = "";
            btnSave.textContent = 'Criar Usuário';
        }
        dialog.showModal();
    }

    function closeModal() {
        dialog.close();
    }

    async function fetchUsuarios() {
        try {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Carregando usuários...</td></tr>';
            usuarios = await apiGetUsuarios();
            draw();
        } catch (err) {
            showAlert('Erro ao carregar usuários.', 'error');
        }
    }

    function draw() {
        body.innerHTML = '';
        if (usuarios.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f0f0f0';
            
            // Aqui usamos os botões .btn-action que criamos no CSS
            // Eles são apenas os ícones, o que deixa a tabela muito mais limpa
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

    // BOTÃO SALVAR
    btnSave.addEventListener('click', async () => {
        const nome = inpNome.value.trim();
        const sobrenome = inpSobrenome.value.trim();
        const email = inpEmail.value.trim();
        const senha = inpSenha.value.trim();
        const confirma = inpConfirma.value.trim();
        const departamento = inpDep.value.trim();
        const cargo = inpCargo.value;
        const permissao = parseInt(inpPermissao.value);

        // Validações
        if (!nome || !sobrenome || !email || !departamento) {
            return alert('Preencha os campos obrigatórios.');
        }

        if (editId === null) {
            if (!senha) return alert('Senha é obrigatória para novos usuários.');
            if (senha !== confirma) return alert('As senhas não conferem!');
        }
        if (editId !== null && senha) {
            if (senha !== confirma) return alert('A confirmação da nova senha não confere!');
        }

        // Confirmação
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
        if (senha) dados.senha_User = senha;

        // Feedback
        const textoOriginal = btnSave.innerHTML; // Salva o HTML com ícone se tiver
        btnSave.disabled = true;
        btnSave.textContent = 'Salvando...';

        try {
            if (editId !== null) {
                await apiUpdateUsuario(editId, dados);
                const index = usuarios.findIndex(u => u.id_User === editId);
                if (index !== -1) usuarios[index] = { ...usuarios[index], ...dados };
                showAlert('Usuário atualizado com sucesso!');
            } else {
                const resultado = await apiCreateUsuario({ ...dados, senha_User: senha });
                usuarios.push({ id_User: resultado.id || '?', ...dados });
                showAlert('Usuário criado com sucesso!');
            }
            closeModal(); 
            draw();
        } catch (err) {
            console.error(err);
            alert(`Erro na operação: ${err.message}`); 
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = textoOriginal;
        }
    });

    // AÇÕES DA TABELA
    body.addEventListener('click', async e => {
        // Agora procura .closest('button') para pegar o clique no SVG também
        const btn = e.target.closest('button');
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
                    usuarios = usuarios.filter(u => u.id_User !== id);
                    draw();
                    showAlert('Usuário removido.');
                } catch (err) {
                    showAlert('Erro ao remover: ' + err.message, 'error');
                }
            }
        }
    });

    fetchUsuarios();
}