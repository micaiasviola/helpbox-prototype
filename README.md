# HelpBox - Prototype

Descrição: protótipo de um sistema de chamados (helpdesk) com frontend SPA em JavaScript puro, backend em Node.js/Express, integração com IA para sugestões automáticas e persistência em Microsoft SQL Server.

**Visão Geral**:
- **Frontend**: SPA estática servida pela pasta `FrontEnd/` (HTML, CSS, JavaScript). O roteamento é feito por hash (`location.hash`) e o arquivo principal é `FrontEnd/js/main.js`.
- **Backend**: API REST construída com `Node.js` e `Express` localizada em `BackEnd/`. Usa `express-session` para gerenciamento de sessão (cookie de sessão) e comunica-se com um banco Microsoft SQL Server via `mssql`.
- **IA**: Serviço de apoio à abertura de chamados em `BackEnd/services/iaService.js` (integração com `@google/genai`) para gerar prioridades e sugestões de solução automatizadas.

**Estrutura do repositório (resumo)**:
- `BackEnd/` : servidor Express, rotas e acesso ao banco.
	- `server.js` : ponto de entrada do servidor.
	- `db.js` : configuração da conexão com SQL Server.
	- `routes/` : `auth.js`, `usuarios.js`, `chamados.js` — endpoints da API.
	- `middlewares/` : `verificarSessao.js`, `verificarADM.js` — proteção de rotas.
	- `services/iaService.js` : integração com GenAI para sugestão de solução/prioridade.
- `FrontEnd/` : aplicação cliente estática.
	- `index.html` : página principal.
	- `login/` : telas de login (`login_teste.html`).
	- `js/` : lógica do SPA (`main.js`), `store.js`, APIs do frontend em `js/api/`.
	- `css/` e `assets/` : estilo e imagens.

**Como o sistema funciona (fluxo principal)**:
- O usuário acessa o frontend em `http://localhost:3000/` (servido pelo Express). Se não autenticar, é redirecionado para `/login/login_teste.html`.
- Ao fazer login, o backend (rota `POST /auth/login`) valida credenciais com `bcrypt` e cria `req.session.usuario` no servidor. O navegador recebe apenas o cookie de sessão (connect.sid).
- O frontend chama `GET /auth/me` (rota `GET /auth/me`) para saber quem está logado e obter `nivel_acesso`.
- Internamente o frontend chama `navigate()` (em `FrontEnd/js/main.js`) para decidir qual view renderizar a partir do `location.hash`. A função `navigate` também aplica uma guarda de rota (route guard) usando `store.usuario.nivel_acesso`.
- Chamados são gerenciados via rotas em `BackEnd/routes/chamados.js` (listar, criar, atualizar, fechar, reabrir, etc.). A criação de chamados passa pelo `iaService` que devolve prioridade e uma sugestão de solução.

**Níveis de Acesso**:
- **Nível 3 — Administrador (ADM)**:
	- Acesso completo ao gerenciamento de usuários (`/usuarios`) e visão administrativa dos chamados.
	- Protegido pelo middleware `verificarADM` (ver `BackEnd/middlewares/verificarADM.js`).
- **Nível 2 — Solucionador / Técnico**:
	- Acesso a filas técnicas (rota `GET /chamados/tecnico`, rota de 'todos' no frontend).
	- Pode assumir e resolver chamados.
- **Nível 1 — Cliente**:
	- Acesso a criação de chamados e visualização de seus próprios chamados (`/chamados/meus`).

No frontend, `FrontEnd/js/main.js` contém o mapa `ROTA_NIVEL_MINIMO` que define restrições por rota (ex.: `todos` exige nível técnico, `usuarios` exige admin). A função `controlarAcessoMenu(usuario)` oculta links do menu conforme o nível do usuário.

**Tecnologias utilizadas**:
- Node.js + Express
- Microsoft SQL Server (via `mssql`)
- `express-session` para sessão no servidor (cookie `connect.sid`)
- `bcrypt` para hashing de senhas
- `cors` e `dotenv`
- `@google/genai` (opcional, usado em `iaService.js`) para geração de sugestões automáticas
- Frontend: HTML5, CSS, JavaScript (Vanilla), Fetch API

**Variáveis de ambiente esperadas** (.env)
- `PORT` (opcional) — porta do servidor (default 3000)
- `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_ENCRYPT` — conexão SQL Server (veja `BackEnd/db.js`).
- `GEMINI_API_KEY` — chave para o serviço GenAI (opcional, usado por `iaService.js`).

Exemplo mínimo de `.env`:

```
PORT=3000
DB_SERVER=localhost
DB_DATABASE=Helpbox
DB_USER=sa
DB_PASSWORD=SuaSenha
DB_PORT=1433
DB_ENCRYPT=false
GEMINI_API_KEY=xxxxx
```

**Dependências (instalação)**
Nota: o projeto não contém `package.json` no repositório. Para executar, inicie um `package.json` no diretório `BackEnd/` e instale as dependências abaixo.

Abra um PowerShell na pasta `BackEnd` e execute:

```powershell
npm init -y
npm install express cors express-session mssql bcrypt dotenv @google/genai
```

Se não for usar a integração com IA, pode omitir `@google/genai`.

**Banco de Dados (esquema mínimo sugerido)**
As rotas esperam duas tabelas principais: `Usuario` e `Chamado`. Abaixo há um esqueleto SQL básico — ajuste conforme necessidade:

```sql
CREATE TABLE Usuario (
	id_User INT IDENTITY PRIMARY KEY,
	nome_User VARCHAR(255),
	sobrenome_User VARCHAR(255),
	email_User VARCHAR(255) UNIQUE,
	senha_User VARCHAR(500), -- armazena hash do bcrypt
	cargo_User VARCHAR(255),
	departamento_User VARCHAR(255),
	nivelAcesso_User INT
);

CREATE TABLE Chamado (
	id_Cham INT IDENTITY PRIMARY KEY,
	clienteId_Cham INT REFERENCES Usuario(id_User),
	titulo_Cham VARCHAR(255),
	descricao_Cham NVARCHAR(MAX),
	status_Cham VARCHAR(50),
	dataAbertura_Cham DATETIME,
	dataProblema DATETIME,
	dataFechamento_Cham DATETIME NULL,
	tecResponsavel_Cham INT NULL REFERENCES Usuario(id_User),
	prioridade_Cham CHAR(1),
	solucaoIA_Cham NVARCHAR(MAX),
	solucaoTec_Cham NVARCHAR(MAX),
	solucaoFinal_Cham NVARCHAR(MAX)
);
```

**Executando a aplicação (desenvolvimento)**
1. Configure o banco de dados e crie as tabelas.
2. Crie o arquivo `.env` em `BackEnd/` com as variáveis necessárias.
3. Instale dependências (veja seção acima).
4. Inicie o servidor:

```powershell
# dentro da pasta BackEnd
node server.js
# ou, se adicionar scripts no package.json: npm start
```

5. Abra o navegador em `http://localhost:3000/`.

Observações para ambiente de produção:
- Altere `express-session` para usar um `store` persistente (Redis, banco, etc.) e defina `cookie.secure = true` se estiver usando HTTPS.
- Proteja as chaves (`.env`) e não comite-as no controle de versão.
- Habilite `DB_ENCRYPT=true` se o servidor SQL exigir conexão encriptada.

**Testes rápidos / chamadas úteis**
- Fazer login (exemplo com `curl`):

```powershell
curl -X POST -H "Content-Type: application/json" -c cookies.txt -d '{"email":"usuario@ex.com","senha":"senha"}' http://localhost:3000/auth/login
```

- Verificar usuário logado (usa cookie salvo `cookies.txt`):

```powershell
curl -b cookies.txt http://localhost:3000/auth/me
```

**Observações importantes de segurança**
- Nunca armazene senhas em texto claro — o backend já usa `bcrypt` para hashes.
- Em produção, use HTTPS e marque cookies de sessão como `secure` e `httpOnly`.
- Evite logs de senhas em ambientes reais; os `console.log` atuais ajudam no desenvolvimento, mas devem ser removidos ou reduzidos.

**Notas finais / pontos de melhoria sugeridos**
- Adicionar `package.json` e scripts (`start`, `dev`) no repositório para facilitar execução.
- Substituir o armazenamento de sessão em memória por Redis ou outro store persistente.
- Isolar a configuração de rotas e o parsing de parâmetros de rota (melhor suporte a rotas com parâmetros em `main.js`).




