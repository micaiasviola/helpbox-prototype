/**
 * @file usuarios.test.js
 * @description Teste de Integração da View de Usuários.
 * Inclui correção para o JSDOM (que não suporta <dialog> nativamente).
 */

import { jest, describe, test, expect, beforeEach, beforeAll } from '@jest/globals';

// --- VARIÁVEIS PARA ARMAZENAR MÓDULOS ---
let renderUsuarios;
let apiUsuarios;
let feedbackModal;

// --- CONFIGURAÇÃO DE MOCKS E AMBIENTE ---
beforeAll(async () => {
    // 1. CORREÇÃO DO JSDOM PARA <DIALOG>
    // Injetamos os métodos que faltam no protótipo do HTMLDialogElement
    // antes de qualquer código rodar.
    HTMLDialogElement.prototype.showModal = jest.fn(function() {
        this.setAttribute('open', 'true'); // Simula visualmente que abriu
    });
    
    HTMLDialogElement.prototype.close = jest.fn(function() {
        this.removeAttribute('open'); // Simula visualmente que fechou
    });

    // 2. Mocks da API
    jest.unstable_mockModule('../api/usuarios.js', () => ({
        apiGetUsuarios: jest.fn(),
        apiCreateUsuario: jest.fn(),
        apiUpdateUsuario: jest.fn(),
        apiDeleteUsuario: jest.fn(),
    }));

    // 3. Mock do Modal de Feedback
    jest.unstable_mockModule('../utils/feedbackmodal.js', () => ({
        showConfirmationModal: jest.fn(),
    }));

    // 4. Importação Dinâmica (Agora segura, pois o ambiente e mocks estão prontos)
    const usuariosModule = await import('./usuarios.js');
    renderUsuarios = usuariosModule.renderUsuarios;

    apiUsuarios = await import('../api/usuarios.js');
    feedbackModal = await import('../utils/feedbackmodal.js');
});

describe('View: Usuários', () => {
    
    beforeEach(() => {
        // Limpa o DOM
        document.body.innerHTML = '<div id="view"></div><div id="alert"></div>';
        
        // Limpa mocks
        jest.clearAllMocks();

        // Mock padrão do window.alert (JSDOM também não tem isso)
        window.alert = jest.fn();

        // Mock padrão da API (retorna lista vazia)
        apiUsuarios.apiGetUsuarios.mockResolvedValue([]);
    });

    test('Deve renderizar a tabela vazia e o botão de criar', async () => {
        await renderUsuarios(); 

        const titulo = document.querySelector('h2');
        expect(titulo).toBeTruthy();
        expect(titulo.textContent).toBe('Gerenciar Usuários');
    });

    test('Deve preencher o formulário e enviar dados para API (Criar Usuário)', async () => {
        // --- PREPARAÇÃO DO CENÁRIO ---
        apiUsuarios.apiCreateUsuario.mockResolvedValue({ id: 123 });
        feedbackModal.showConfirmationModal.mockResolvedValue(true);

        await renderUsuarios();
        await new Promise(process.nextTick); // Aguarda render

        // 1. Abre o Modal
        const btnNovo = document.getElementById('btnOpenModal');
        btnNovo.click();

        // Verifica se a função mockada showModal foi chamada
        const dialog = document.getElementById('userDialog');
        expect(dialog.showModal).toHaveBeenCalled();

        // 2. Preenche o Formulário
        document.getElementById('novoNome').value = 'Maria';
        document.getElementById('novoSobrenome').value = 'Souza';
        document.getElementById('novoEmail').value = 'maria@teste.com';
        document.getElementById('novoDepartamento').value = 'Financeiro';
        document.getElementById('novoCargo').value = 'Administrador';
        document.getElementById('novoPermissao').value = '3';
        document.getElementById('novoSenha').value = 'senha123';
        document.getElementById('confirmaSenha').value = 'senha123';

        // 3. Clica em Salvar
        const btnSalvar = document.getElementById('btnSaveModal');
        btnSalvar.click();

        await new Promise(process.nextTick); // Aguarda promises internas

        // --- VERIFICAÇÕES ---
        expect(feedbackModal.showConfirmationModal).toHaveBeenCalled();
        
        expect(apiUsuarios.apiCreateUsuario).toHaveBeenCalledWith({
            nome_User: 'Maria',
            sobrenome_User: 'Souza',
            email_User: 'maria@teste.com',
            departamento_User: 'Financeiro',
            cargo_User: 'Administrador',
            nivelAcesso_User: 3,
            senha_User: 'senha123'
        });

        // Verifica se tentou fechar o modal no final
        expect(dialog.close).toHaveBeenCalled();
    });

    test('Não deve enviar para API se as senhas forem diferentes', async () => {
        await renderUsuarios();
        await new Promise(process.nextTick);

        document.getElementById('btnOpenModal').click();

        // Dados válidos exceto senha
        document.getElementById('novoNome').value = 'Teste';
        document.getElementById('novoSobrenome').value = 'Teste';
        document.getElementById('novoEmail').value = 't@t.com';
        document.getElementById('novoDepartamento').value = 'D';

        // Senhas diferentes
        document.getElementById('novoSenha').value = '123';
        document.getElementById('confirmaSenha').value = '456';

        document.getElementById('btnSaveModal').click();
        await new Promise(process.nextTick);

        // Verifica chamada do alert
        expect(window.alert).toHaveBeenCalledWith('As senhas não conferem!');
        
        // Garante que a API NÃO foi chamada
        expect(apiUsuarios.apiCreateUsuario).not.toHaveBeenCalled();
    });
});