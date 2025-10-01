import { apiCreateChamado } from '../api/chamados.js';

/**
 * Exibe o formulário para abrir um novo chamado
 */
export function renderAbrirChamado() {
    const view = document.getElementById('view');
    view.innerHTML = `
    <form class="form" id="formChamado">
      <div>
        <label class="label">Título</label>
        <input class="input" name="titulo" required placeholder="Descreva brevemente o problema" />
      </div>
      <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap:12px;">
        <div>
          <label class="label">Categoria</label>
          <select class="select" name="categoria">
            <option>Software</option><option>Hardware</option><option>Rede</option><option>Outros</option>
          </select>
        </div>
        <div>
          <label class="label">Anexo</label>
          <input class="input" name="anexo" type="file"/>
        </div>
      </div>
      <div>
        <label class="label">Descrição</label>
        <textarea class="textarea" name="descricao" placeholder="Detalhe o que está acontecendo"></textarea>
      </div>
      <div class="actions">
        <button class="btn" type="submit">Enviar</button>
        <button class="btn ghost" type="reset">Limpar</button>
      </div>
    </form>
    <div id="alert" style="margin-top:10px;"></div>
  `;

    document.getElementById('formChamado').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);

        try {
            const novoChamado = {
                titulo: f.get('titulo'),
                categoria: f.get('categoria'),
                descricao: f.get('descricao'),
                status: 'Aberto',
                dataAbertura: new Date().toISOString()
            };

            await apiCreateChamado(novoChamado);
            document.getElementById('alert').innerHTML = `<div class="card">✅ Chamado aberto com sucesso.</div>`;
            e.target.reset();
        } catch (error) {
            document.getElementById('alert').innerHTML = `<div class="card error">❌ Erro ao abrir chamado: ${error.message}</div>`;
        }
    });
}