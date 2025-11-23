# 📦 HelpBox - Sistema Inteligente de Chamados

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green)
![SQL Server](https://img.shields.io/badge/Database-SQL_Server-red)
![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-blue)

O **HelpBox** é um sistema de Help Desk (Service Desk) moderno e responsivo, projetado para facilitar a abertura, gestão e solução de chamados de TI. O diferencial do sistema é a integração com **Inteligência Artificial (Google Gemini/Vertex AI)**, que analisa automaticamente a descrição do problema para sugerir prioridade, categoria e possíveis soluções técnicas.

---

## ✨ Funcionalidades Principais

### 🤖 Integração com IA
* **Classificação Automática:** Ao abrir um chamado, a IA define a prioridade (Alta, Média, Baixa) baseada no impacto e urgência descritos.
* **Sugestão de Solução:** A IA fornece uma pré-análise técnica e passos para resolução para auxiliar o técnico.

### 👤 Perfil: Cliente (Nível 1)
* Abertura de chamados com formulário detalhado.
* Visualização do histórico de "Meus Chamados".
* Acompanhamento de status em tempo real.
* Validação de solução (Fechar ou Reabrir chamado).

### 🛠️ Perfil: Técnico (Nível 2)
* **Fila Inteligente:** Visualização de chamados "Em andamento" e livres.
* **Ordenação Prioritária:** Chamados atribuídos ao técnico aparecem sempre no topo.
* **Atribuição:** Funcionalidade de "Pegar Chamado" da fila.
* Registro de solução técnica e encerramento.

### 🛡️ Perfil: Administrador (Nível 3)
* Visão global de todos os chamados do sistema.
* Permissão para excluir chamados (apenas status Fechado).
* Gerenciamento de usuários (previsto).
* Escalonamento de chamados.

### 💻 Interface (UI/UX)
* **Design Responsivo:** Tabela adaptável para mobile com barra de rolagem horizontal.
* **Filtros Dinâmicos:** Filtragem por status (Aberto, Em Andamento, Fechado) e busca por texto.
* **Paginação:** Paginação no servidor (Server-side pagination) para lidar com grande volume de dados.

---

## 🚀 Como rodar o projeto

Siga os passos abaixo para executar o sistema em sua máquina local ou servidor.

### 📋 Pré-requisitos

Certifique-se de ter instalado:
1.  **[Node.js](https://nodejs.org/)** (Versão 16 ou superior).
2.  **[SQL Server](https://www.microsoft.com/pt-br/sql-server/sql-server-downloads)** (Local ou Azure SQL).
3.  Uma conta no **Google Cloud Platform** (para a API da IA).

### 🔧 Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/seu-usuario/helpbox.git](https://github.com/seu-usuario/helpbox.git)
    cd helpbox
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure o Banco de Dados:**
    * Certifique-se de que seu SQL Server está rodando.
    * Crie um banco de dados chamado `HelpDeskDB` (ou o nome que preferir).
    * Execute o script SQL (localizado na pasta `/database` ou similar) para criar as tabelas `Usuario` e `Chamado`.

4.  **Configure as Credenciais do Google (IA):**
    * Baixe sua chave de conta de serviço do Google Cloud em formato `.json`.
    * Renomeie o arquivo para `google-credentials.json`.
    * Coloque-o na **raiz** do projeto.

5.  **Configure as Variáveis de Ambiente:**
    * Crie um arquivo `.env` na raiz do projeto.
    * Preencha com os seus dados (baseado no `.env.example`):

    ```env
    # Configuração do Servidor
    PORT=3000
    SESSION_SECRET=sua_chave_secreta_para_sessao

    # Configuração do Banco de Dados (SQL Server)
    DB_USER=seu_usuario_sql
    DB_PWD=sua_senha_sql
    DB_SERVER=localhost (ou seu servidor azure)
    DB_NAME=HelpDeskDB

    # Configuração da IA (Google)
    GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
    PROJECT_ID="id-do-seu-projeto-gcp"
    LOCATION="us-central1"
    ```

### ▶️ Executando

1.  **Inicie o servidor:**
    ```bash
    npm start
    # ou para desenvolvimento:
    npm run dev
    ```

2.  **Acesse no navegador:**
    Abra `http://localhost:3000`

---

## 📂 Estrutura do Projeto