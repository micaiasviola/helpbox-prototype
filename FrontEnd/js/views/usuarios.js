import { apiGetUsuarios, apiCreateUsuario, apiUpdateUsuario, apiDeleteUsuario } from '../api/usuarios.js';

import { showConfirmationModal } from '../utils/feedbackmodal.js'; 

/**
 * Exibe a interface de gerenciamento de usuários
 */
export function renderUsuarios() {
    const view = document.getElementById('view');

    // Atualizei o CSS para ser mais específico (#userDialog)
    // Assim ele não afeta o <dialog> de confirmação que acabamos de criar acima
    const styles = `
        <style>
            /* Estilo para o Backgrop de QUALQUER dialog */
            dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
            
            /* Estilo ESPECÍFICO para o formulário de usuário */
            #userDialog { 
                position: fixed; 
                inset: 0;        
                margin: auto;    
                border: none; 
                border-radius: 8px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                padding: 20px; 
                width: 90%; 
                max-width: 600px; 
            }
            
            .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .full-width { grid-column: span 2; }
            .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
        </style>
    `;

    view.innerHTML = `
    ${styles}
    
    <div class="toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2>Gerenciar Usuários</h2>
      <button id="btnOpenModal" class="btn btn-primary">Novo Usuário</button>
    </div>

    <div id="alert"></div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th><th>Nome</th><th>Sobrenome</th><th>Email</th><th>Departamento</th><th>Cargo</th><th>Nível</th><th>Ações</th>
        </tr>
      </thead>
      <tbody id="uBody"></tbody>
    </table>

    <dialog id="userDialog">
        <h3 id="modalTitle" style="margin-top:0; margin-bottom:15px;">Novo Usuário</h3>
        <form id="userForm">
            <div class="form-grid">
                <input id="novoNome" class="input" placeholder="Nome" required />
                <input id="novoSobrenome" class="input" placeholder="Sobrenome" required />
                <input id="novoEmail" class="input full-width" placeholder="Email" type="email" required />
                <input id="novoDepartamento" class="input full-width" placeholder="Departamento" required />
                <input id="novoSenha" class="input" placeholder="Senha" type="password" />
                <input id="confirmaSenha" class="input" placeholder="Confirme a Senha" type="password" />
                
                <select id="novoCargo" class="select">
                    <option>Cliente</option>
                    <option>Tecnico</option>
                    <option>Administrador</option>
                </select>
                
                <select id="novoPermissao" class="select">
                    <option value="1">Acesso: Baixo (1)</option>
                    <option value="2">Acesso: Médio (2)</option>
                    <option value="3">Acesso: Alto (3)</option>
                </select>
            </div>
            
            <div class="modal-actions">
                <button type="button" id="btnCancelModal" class="btn btn-secondary">Cancelar</button>
                <button type="button" id="btnSaveModal" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    </dialog>
  `;

    // Referências DOM
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

    function showAlert(msg, tipo = 'success') {
        alertBox.innerHTML = `<div class="card" style="padding:10px; margin-bottom:15px; background-color:${tipo === 'error' ? '#f8d7da' : '#d4edda'}; color:${tipo === 'error' ? '#842029' : '#0f5132'}; border-radius:4px;">${msg}</div>`;
        setTimeout(() => alertBox.innerHTML = '', 3000);
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
            inpSenha.placeholder = "Nova senha (deixe vazio para manter)";
            inpConfirma.placeholder = "Confirme a nova senha";
            inpDep.value = user.departamento_User;
            inpCargo.value = user.cargo_User;
            inpPermissao.value = user.nivelAcesso_User;
        } else {
            editId = null;
            document.getElementById('modalTitle').textContent = 'Novo Usuário';
            document.getElementById('userForm').reset();
            inpSenha.placeholder = "Senha";
            inpConfirma.placeholder = "Confirme a Senha";
        }
        dialog.showModal();
    }

    function closeModal() {
        dialog.close();
    }

    async function fetchUsuarios() {
        try {
            usuarios = await apiGetUsuarios();
            draw();
        } catch (err) {
            showAlert('Erro ao carregar usuários.', 'error');
        }
    }

    function draw() {
        body.innerHTML = '';
        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${u.id_User}</td>
        <td>${u.nome_User}</td>
        <td>${u.sobrenome_User}</td>
        <td>${u.email_User}</td>
        <td>${u.departamento_User}</td>
        <td>${u.cargo_User}</td>
        <td>${nivelAcesso[u.nivelAcesso_User] || u.nivelAcesso_User}</td>
        <td>
          <button class="btn primary small" data-id="${u.id_User}" data-action="editar">Editar</button>
          <button class="btn btn-secondary small" data-id="${u.id_User}" data-action="remover">Remover</button>
        </td>`;
            body.appendChild(tr);
        });
    }

    // --- EVENT LISTENERS ---

    document.getElementById('btnOpenModal').addEventListener('click', () => openModal());
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    // BOTÃO SALVAR (CONFIRMAÇÃO ADICIONADA)
    btnSave.addEventListener('click', async () => {
        const nome = inpNome.value.trim();
        const sobrenome = inpSobrenome.value.trim();
        const email = inpEmail.value.trim();
        const senha = inpSenha.value.trim();
        const confirma = inpConfirma.value.trim();
        const departamento = inpDep.value.trim();
        const cargo = inpCargo.value;
        const permissao = parseInt(inpPermissao.value);

        // 1. Validações Básicas
        if (!nome || !sobrenome || !email || !departamento) {
            return alert('Preencha os campos obrigatórios.');
        }

        // 2. Validação de Senha
        if (editId === null) {
            if (!senha) return alert('Senha é obrigatória para novos usuários.');
            if (senha !== confirma) {
                inpSenha.style.borderColor = 'red';
                inpConfirma.style.borderColor = 'red';
                return alert('As senhas não conferem!');
            }
        }
        if (editId !== null && senha) {
            if (senha !== confirma) return alert('A confirmação da nova senha não confere!');
        }
        
        inpSenha.style.borderColor = '';
        inpConfirma.style.borderColor = '';

        // 3. CHAMADA DO MODAL DE CONFIRMAÇÃO
        const actionVerb = editId ? 'editar' : 'criar';
        const userConfirmed = await showConfirmationModal(
            'Confirmar Ação', 
            `Deseja realmente ${actionVerb} o usuário <b>${nome}</b>?`
        );

        // Se usuário clicou em "Não", paramos aqui. O formulário continua aberto.
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

        // 4. Feedback de Loading (Só acontece se confirmou)
        const textoOriginal = btnSave.textContent;
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
            closeModal(); // Fecha o formulário apenas no sucesso
            draw();
        } catch (err) {
            console.error(err);
            // Usamos alert nativo aqui para erro de API para garantir que o usuário veja sobre o modal
            alert(`Erro na operação: ${err.message}`); 
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = textoOriginal;
        }
    });

    // AÇÕES DA TABELA (REMOVER COM CONFIRMAÇÃO)
    body.addEventListener('click', async e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const id = +btn.dataset.id;
        const action = btn.dataset.action;
        const user = usuarios.find(u => u.id_User === id);

        if (action === 'editar') {
            openModal(user);
        } else if (action === 'remover') {
            // Substituímos o confirm() nativo pelo seu Modal
            const shouldDelete = await showConfirmationModal(
                'Remover Usuário',
                `Tem certeza que deseja remover o usuário <b>${user.nome_User}</b>? Esta ação não pode ser desfeita.`
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