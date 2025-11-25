export function renderConfig() {
    const view = document.getElementById('view');
    
    view.innerHTML = `
    <header>
        <h2 style="margin:0; font-size: 1.5rem; color: #2d3748;"> Manual do Sistema HelpBox</h2>
        <small style="color: #718096">Guia de referência para utilização das funcionalidades do sistema.</small>
    </header>


    <div style="
    max-width:1200px;
    margin:40px auto;
    padding:0 20px;
    font-family:'Segoe UI', sans-serif;
    color:#2D3748;
    line-height:1.7;
    ">

    <!-- SEÇÃO 1 -->
    <div class="manual-section">
        <h2>Abertura de Chamados</h2>

        <p>Funcionalidade dedicada ao preenchimento do formulário do seu problema para que possa ter uma solução da Inteligência Artificial ou atendimento humanizado com o Técnico.</p>

        <h3>Tópicos a serem preenchidos</h3>
        <p>Todos os campos são obrigatórios. Caso algum não seja preenchido, o envio não será permitido.</p>

        <ul>
            <li><strong>Assunto:</strong> campo dedicado para que você descreva de forma breve e objetiva o seu problema, pense que em primeiro lugar seu texto será interpretado pela IA. Exemplo de Assunto: Sistema ERP inativo.</li>
            <li><strong>Categoria:</strong> menu suspenso que oferece como opções Software ou Hardware. Há um símbolo de informações com a descrição de cada um. Lembre-se: Hardware está relacionado a peças físicas do seu computador e o Software aos sistemas.</li>
            <li><strong>Quando começou o problema:</strong> campo de calendário para que você encontre a data inicial do problema. A estrutura segue DIA/MÊS/ANO. Você poderá fazer a seleção via o calendário ou também pode digitar o valor em cada campo.</li>
            <li><strong>Impacto da Demanda:</strong> selecione a opção que ilustre a situação que se encontrou após o início do problema, se suas demandas sofreram atrasos, foram paradas por completo ou se continuam normal.</li>
            <li><strong>Com quem ocorre:</strong> selecione a opção que ilustre a situação que se encontrou após o início do problema; considere como grupo específico qualquer conjunto de pessoas a partir de 2 pessoas</li>
            <li><strong>Frequência da ocorrência:</strong> selecione a opção que ilustre a situação que se encontrou após o início do problema; ocasionalmente caso haja intervalos entre as ocorrências, neste caso, informe na data do problema o primeiro dia em que notou a ocorrência.</li>
            <li><strong>Descrição:</strong> utilize esse espaço para colocar com o maior número de detalhes o que está acontecendo com seu software/hardware.</li>
        </ul>

        <h3> Ações Disponíveis</h3>
        <p> Há dois botões localizados na parte inferior esquerda do seu sistema. O primeiro é o “Limpar” que apagará todas as informações do formulário. E o “Enviar” que irá submeter o chamado para a inteligência artificial fazer a primeira análise. </p>
    </div>


    <!-- SEÇÃO 2 -->
    <div class="manual-section">
        <h2>Meus Chamados</h2>
        <p>A tela Meus Chamados permite que você acompanhe todas as solicitações e tarefas relacionadas aos chamados que você abriu ou que foram atribuídos a você. Ela organiza as informações de maneira clara e objetiva, facilitando o monitoramento do andamento de cada ocorrência.</p>

        <h3>Filtros de Consulta</h3>
        <ul>
            <li><strong>Todos os Vínculos</strong> permite filtrar por vínculo com o chamado (por exemplo, atribuídos, criados por você etc.).</li>
            <li><strong>Todos os Status</strong> permite filtrar os chamados por situação atual.</li>
            <li><strong>Barra de busca</strong> (ID ou descrição)</li>
            <li><strong>Botão Atualizar</strong> recarrega a lista de chamados para garantir que as informações exibidas estejam atualizadas. </li>
        </ul>

        <h3>Lista de Chamados</h3>
        <p>A principal área da tela exibe uma tabela com todos os chamados encontrados. Cada linha representa um chamado individual com as seguintes colunas: </p>
        <ul>
            <li><strong>ID: </strong> número identificador do chamado.</li>
            <li><strong>Descrição: <strong> breve resumo do problema relatado.</li>
            <li><strong>Status: </strong> estado atual do chamado (ex.: “Em andamento”).</li>
            <li><strong>Prioridade: </strong> indica o nível de urgência (ex.: Baixa, Média, Alta). </li>
            <li><strong>Categoria: </strong> informa se o chamado trata de Software ou Hardware.</li>
            <li><strong>Data: </strong>data em que o chamado foi criado.</li>
            <li><strong>Vínculo: </strong>mostra se o chamado foi criado por você ou atribuído a você.</li>
            <li><strong>Ações: </strong>botões disponíveis para interação com cada chamado.</li>
        </ul>

        <h3> Ações Disponíveis conforme os botões </h3>
        <ul>
            <li><strong>Resolver: </strong> permite iniciar ou continuar o atendimento do chamado quando ele está atribuído a você.</li>
            <li><strong>Ver Solução: </strong> aparece quando o chamado já possui uma solução disponível para consulta.</li>
        </ul>

        <h3> Tela de Resolução de Chamados (ao clicar em Resolver) </h3>
        <p>Ao clicar em resolver, será aberto uma nova tela com as informações de Status, Prioridade, Categoria, Data e o responsável pela abertura do chamado. Logo em seguida o assunto do chamado e a descrição completa do chamado. Segue-se pela sugestão que a inteligência artificial sugeriu para o usuário, lembre-se, se este chamado chegou a você, significa que a solução da IA não foi suficiente para encerrar o problema.</p>
        <p> Abaixo terá uma caixa de texto para inserir a sua solução sobre o chamado de forma detalhada. Caso precise de mais informações poderá entrar em contato via e-mail com o usuário. </p>
        <ul>
            <li><strong>Salvar rascunho: </strong>caso por algum motivo precise interromper o que está escrevendo, mas não queira perder o avanço. </li>
            <li><strong>Finalizar chamado: </strong>fornecerá uma tela de confirmação para conclusão do atendimento e você é redirecionado para a tela inicial. </li>
        </ul>
    </div>


    <!-- SEÇÃO 3 -->
    <div class="manual-section">
        <h2>Solucionar Chamados (Central de Chamados)</h2>
        <p> A tela Central de Chamados é destinada ao gerenciamento e resolução de tickets pelos técnicos ou administradores do sistema. É o local onde você pode visualizar, assumir e acompanhar chamados abertos pelos usuários, além de continuar atendimentos já iniciados. </p>
        <h3> Filtros</h3>
        <ul>
            <li><strong>Filtro por padrão “Todos os status”: </strong>Permite selecionar chamados por status, como “Aberto”, “Em andamento” e “Fechado”</li>
            <li><strong>Barra de busca: </strong>Campo onde você pode digitar um ID de chamado específico ou parte de sua descrição para localizar rapidamente um item na lista.</li>
            <li><strong>Botão “Atualizar”: </strong>Realiza a atualização imediata da lista, garantindo que você esteja visualizando os dados mais recentes.</li>
        </ul>

        <h3>Lista</h3>
        <ul>
            <li><strong>ID: </strong>número identificador do ticket.</li>
            <li><strong>Responsável: </strong>indica quem está responsável pelo atendimento. Quando aparece “Não atribuído”, significa que nenhum técnico assumiu o chamado. Quando aparece um nome, significa que o chamado já está sendo atendido.</li>
            <li><strong>Descrição: </strong>resumo do problema relatado pelo usuário.</li>
            <li><strong>Status: </strong>estado atual do chamado (ex.: “Em andamento”).</li>
            <li><strong>Prioridade: </strong>nível de urgência, como Alta, Média ou Baixa.</li>
            <li><strong>Categoria: </strong>especifica se o chamado é de Software ou Hardware.</li>
            <li><strong>Data: </strong>especifica se o chamado é de Software ou Hardware.</li>
            <li><strong>Ações: </strong>botões que permitem interação direta com o ticket.</li>
        </ul>

        <h3> Ações Disponíveis</h3>
        <ul>
            <li><strong>Continuar:</strong> exibido quando o chamado já está atribuído a você. Permite retomar o atendimento imediatamente.</li>
            <li><strong>Assumir: </strong>aparece quando o chamado está “Não atribuído” e você pode escolher soluciona-lo.</li>
            <li><strong>Visualizar: </strong>Simbolizam que o chamado em questão foi aberto por você e ainda não foi atribuído a um técnico. O sistema bloqueia desta forma para que você não assuma seu próprio chamado.</li>
        </ul>
    </div>


    <!-- SEÇÃO 4 -->
    <div class="manual-section">
        <h2>Gerenciar Usuários</h2>
        <p> Destinada ao gerenciamento dos usuários, para criação, edição e exclusão </p>
        <h3> Estrutura da Tabela</h3>
        <ul>
            <li>ID: Número identificador único de cada usuário.</li>
            <li>Nome Completo</li>
            <li>Email</li>
            <li>Departamento</li>
            <li>Cargo</li>
            <li>Nível de Permissão</li>
            <li>Ações: é possível alterar informações ou remover o usuário do sistema</li>
        </ul>

        <h3>Ações disponíveis</h3>
        <ul>
            <li>Visualizar usuários</li>
            <li>Editar dados de um usuário existente.</li>
            <li>Excluir um usuário definitivamente do sistema (mediante confirmação).</li>
            <li>Cadastrar novos usuários através do botão "Novo Usuário".</li>
        </ul>

        <h3> Novo Usuário </h3>
        <p> A tela "Novo Usuário" é um formulário utilizado para registrar um novo membro no sistema. Ela é exibida em forma de modal (janela sobreposta). </p>
        <p> O formulário contém os seguintes campos para preenchimento: </p>
        <ul>
            <li> <strong>Nome: </strong>primeiro nome do usuário. </li>
            <li> <strong>Sobrenome: </strong>sobrenome ou nome adicional. </li>
            <li> <strong>Email Corporativo: </strong>endereço de email utilizado para login e comunicações internas. </li>
            <li> <strong>Departamento: </strong>setor no qual o usuário trabalha. </li>
            <li> <strong>Senha: </strong>senha de acesso inicial do usuário. </li>
            <li> <strong>Confirmar Senha: </strong>campo obrigatório para validar a senha digitada. </li>
            <li> <strong>Cargo: </strong>função do usuário (Cliente, Técnico ou Admin). </li>
            <li> <strong>Nível de Permissão: </strong>nível de acesso do usuário, variando entre Baixo (1), Médio (2) ou Alto (3). </li>
        </ul>
        <p> Botões da tela: </p>
        <ul>
            <li> <strong>Criar usuário: </strong>Confirma o cadastro e adiciona o usuário à lista do sistema. </li>
            <li> <strong>Cancelar: </strong>Fecha o formulário sem salvar alterações. </li>
        </ul>
    </div>


    <!-- SEÇÃO 5 -->
    <div class="manual-section">
        <h2>Relatórios</h2>
        <p> Oferece visão geral dos chamados registrados no sistema e gera relatório personalizado </p>
        <h3>Dashboard Geral</h3>
        <p>Cartões exibem: Total de Chamados, Em Aberto, Resolvidos, Pendentes (Sem técnico atribuído).</p>

        <h3>Gerador de Relatório Personalizado</h3>
        <p> O gerador de relatórios permite realizar análises específicas selecionando datas, técnicos e status de chamados. </p>
        <ul>
            <li><strong>Data Inicial: </strong>Campo para selecionar a data a partir da qual os chamados serão considerados no relatório.</li>
            <li><strong>Data Final: </strong>Campo para definir a última data incluída no relatório.</li>
            <li><strong>Técnico Responsável: </strong>Permite selecionar um técnico específico ou consultar chamados de todos os técnicos.</li>
            <li><strong>Status: </strong>Define o status dos chamados que deverão aparecer no relatório.</li>
            <li><strong>Botão Gerar: </strong>inicia a criação do relatório personalizado</li>
        </ul>

        <p>O sistema exibe dados filtrados e permite exportação CSV.</p>
    </div>

    </div>
    `;
    }