import { apiGetUsuarios, apiCreateUsuario, apiUpdateUsuario, apiDeleteUsuario } from '../api/usuarios.js';
import { NIVEL_ACESSO_MAP } from '../utils/constants.js';

/**
 * Exibe a interface de gerenciamento de usuários
 */
export function renderUsuarios() {
    const view = document.getElementById('view');
 
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
