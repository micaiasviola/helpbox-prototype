/**
 * @file constants.js
 * @description Central de Configurações e Constantes.
 * * Criei este arquivo para ser a "Fonte da Verdade" do sistema.
 * * Em vez de espalhar strings como 'http://localhost:3000' ou regras de cores por vários arquivos,
 * centralizo tudo aqui. Se amanhã eu precisar mudar a URL da API ou o nome de um status,
 * altero apenas uma linha neste arquivo e o sistema todo se atualiza.
 * @author [Micaías Viola - Full Stack Developer]
 */

// --- DETECÇÃO DE AMBIENTE ---

/**
 * @constant {boolean} isLocalhost
 * @description Verifica se estamos rodando em ambiente de desenvolvimento.
 * * Eu uso essa verificação para automatizar a troca de URLs da API. 
 * Assim, não preciso ficar comentando/descomentando código antes de subir para produção.
 */
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * @constant {string} API_BASE
 * @description URL base para as requisições HTTP.
 * * Se estou no meu PC, aponto para o backend local.
 * * Se estou em produção (hospedado), uso uma string vazia para que as requisições usem o domínio relativo atual (ex: /api/...).
 */
export const API_BASE = isLocalhost ? 'http://localhost:3000' : '';

/**
 * @constant {number} YEAR
 * @description Ano atual para Copyright dinâmico.
 * * Pequeno utilitário para evitar ter que atualizar o rodapé do site todo dia 1º de Janeiro manualmente.
 */
export const YEAR = new Date().getFullYear();

// --- MAPEAMENTOS DE UI (Tradução de Dados para Visual) ---

/**
 * @constant {Object.<string, string>} PRIORIDADE_MAP
 * @description Tradutor de códigos de banco para texto legível.
 * * O banco armazena apenas uma letra ('A', 'M', 'B') para economizar espaço.
 * Aqui eu defino como essa letra deve ser mostrada para o usuário final.
 */
export const PRIORIDADE_MAP = {
    'A': 'Alta',
    'M': 'Média',
    'B': 'Baixa'
};

/**
 * @constant {Object.<string, string>} STATUS_MAP
 * @description Mapeia Status -> Classe CSS.
 * * Esta é a ponte entre a lógica de negócio e o design.
 * As chaves são os status do banco de dados, e os valores são sufixos de classes CSS 
 * (ex: .badge-open, .badge-progress) que definem a cor do badge na interface.
 */
export const STATUS_MAP = {
    'aberto': 'open',       // Verde (geralmente)
    'em andamento': 'progress', // Azul
    'fechado': 'done'       // Vermelho ou Cinza
};

/**
 * @constant {Object.<string, string>} NIVEL_ACESSO_MAP
 * @description Tradutor de Níveis de Permissão.
 * * Transforma os números de controle de acesso (1, 2, 3) em rótulos compreensíveis
 * para exibir nas tabelas de usuários e perfis.
 */
export const NIVEL_ACESSO_MAP = {
    '1': 'Baixo',
    '2': 'Médio',
    '3': 'Alto'
};