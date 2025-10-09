import { apiCreateChamado } from '../api/chamados.js';

/**
 * Exibe o formulário para abrir um novo chamado
 */
export function renderAbrirChamado() {
  const view = document.getElementById('view');
  view.innerHTML = `
    <form class="form" id="formChamado">
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
          <label class = label> Quando começou o problema? <span style="color:red" >* </span> </label>
          <input type ="date" id="data" name="data">
        </div>
        <div>
          <label class="label">Anexo</label>
          <input class="input" name="anexo" type="file"/>
        </div>
      </div>
      <div id="demanda">
        <label class="label"> Qual o impacto na demanda? <span style="color:red" >* </span> </label>
        <label class="demanda"> <input type="radio" name="impacto" value="alto" required> Impede a execução do trabalho </label>
        <label class="demanda"> <input type="radio" name="impacto" value="medio"> Causa atraso mas o trabalho continua </label>
        <label class="demanda"> <input type="radio" name="impacto" value="baixo"> Impacto mínimo e sem prejuízos operacionais </label>
      </div>
      <div id = "usuario">
       <label class = "label"> Ocorre com todos os usuários ou apenas com você? <span style="color:red" >* </span> </label>
       <label class= "usuario" > <input type="radio" name="usuarios" value="todos" required> Todos os usuários </label>
       <label class= "usuario"> <input type= "radio" name="usuarios" value= "cinq"> Atinge apenas um grupo específico </label>
       <label class= "usuario"> <input type="radio" name="usuarios" value="eu"> Apenas comigo </label>
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
    <div id="alert" style="margin-top:10px;"></div>
  `;

  let ultimoClicado = null;

  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('click', function () {
      if (ultimoClicado === this) {
        this.checked = false; // desfaz a seleção
        ultimoClicado = null; // limpa a memória
      } else {
        ultimoClicado = this; // guarda o botão atual
      }
    });
  });


  document.getElementById('formChamado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);

    try {
      const novoChamado = {
        titulo: f.get('titulo'),
        categoria: f.get('categoria'),
        descricao: f.get('descricao'),
        status: 'Aberto',
        dataAbertura: new Date().toISOString(),
        dataProblema: f.get('data'),
        impacto: f.get('impacto'),
        usuarios: f.get('usuarios'),
        frequencia: f.get('frequencia')
      };

      await apiCreateChamado(novoChamado);
      document.getElementById('alert').innerHTML = `<div class="card">✅ Chamado aberto com sucesso.</div>`;
      e.target.reset();
    } catch (error) {
      document.getElementById('alert').innerHTML = `<div class="card error">❌ Erro ao abrir chamado: ${error.message}</div>`;
    }
  });
}