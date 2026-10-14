# API do Detetive SQL

API local para administrar casos e níveis, iniciar partidas, executar consultas SQL de investigação e acompanhar o progresso. A integração com o jogo não é necessária para testar estes endpoints.

## Iniciar

```bash
npm install
npm run dev
```

O servidor fica em `http://localhost:3000`. A base de controle SQLite é criada em `.data/control.db` e persiste casos, níveis, sessões, progresso, dicas utilizadas e execuções SQL. Para usar outro caminho local, defina `SQL_DETECTIVE_CONTROL_DB` antes de iniciar o servidor.

## Casos

- `GET /cases` lista os casos. Use `GET /cases?difficulty=medium` para filtrar pela dificuldade.
- `GET /cases/:caseId` obtém um caso.
- `POST /cases` cria um caso. Exemplo: `{"name":"Caso novo","description":"Descrição","difficulty":"medium"}`.
- `PUT /cases/:caseId` atualiza os campos enviados (`name`, `description`, `difficulty` e `database_name`).
- `DELETE /cases/:caseId` remove o caso e os dados relacionados.

As respostas usam `id`, `name`, `description`, `difficulty`, `database_name` e `created_at`. O Caso 1, com seus oito níveis, é carregado como dado inicial quando a base local é criada. Esse seed só é aplicado quando ainda não há casos persistidos.

## Níveis

- `GET /cases/:caseId/levels` lista os níveis de um caso.
- `GET /levels/:levelId` obtém um nível.
- `POST /cases/:caseId/levels` cria um nível com `number`, `tips` (texto), `problems` (texto), `template` (JSON) e `helps` (`help_table`, `help_column`, `help_operation`).
- `PUT /levels/:levelId` atualiza os campos do nível.
- `DELETE /levels/:levelId` remove o nível.

Casos, níveis, sessões e consultas têm IDs internos numéricos. `external_session_id` identifica a sessão recebida do cliente. Cada nível retorna `id`, `case_id`, `number`, `tips`, `problems`, `template`, `created_at` e `helps`.

## Sessões

- `POST /game-sessions` inicia uma sessão. Envie `{"case_id":1,"external_session_id":"sessao-fctool","player_id":"jogador-1"}`. Os identificadores externos podem ser omitidos durante testes.
- `GET /game-sessions/:sessionId` consulta a sessão pelo `external_session_id`; a resposta usa `id`, `external_session_id`, `player_id`, `case_id`, `status`, `current_level_id`, `score`, `started_at` e `finished_at`.
- `GET /game-sessions/:sessionId/progress` retorna a sessão e os registros de progresso com `session_id` numérico, `level_id`, `status`, `score`, `started_at` e `completed_at`.
- `GET /game-sessions/:sessionId/sql-queries` lista as consultas enviadas na sessão.
- `POST /game-sessions/:sessionId/levels/:levelId/query` recebe `{"query":"SELECT ..."}`, executa a consulta e retorna o registro `sql_query` com `id`, `session_id`, `level_id`, `query`, `success`, `result`, `error` e `executed_at`.
- `POST /game-sessions/:sessionId/levels/:levelId/hints/:hintId/use` registra e retorna a dica solicitada.
- `POST /game-sessions/:sessionId/complete` finaliza uma sessão depois que todos os níveis forem concluídos.

Uma consulta avança a sessão quando retorna exatamente as linhas definidas em `template` (a ordem das linhas não importa; colunas adicionais são permitidas). Cada nível concluído soma 100 pontos por padrão; configure `SQL_DETECTIVE_POINTS_PER_LEVEL` para alterar esse valor. Consultas incorretas ficam registradas e deixam o nível atual aberto. O executor aceita uma única instrução `SELECT` ou `WITH` em modo somente leitura.

## Bancos de investigação

`src/sql/database.db` é o banco de investigação inicial. Na primeira consulta de cada caso, a API copia essa base para `.data/cases/<database_name>` se o arquivo do caso ainda não existir; cada caso então usa seu próprio arquivo e cada consulta abre uma instância somente leitura. Defina `SQL_DETECTIVE_CASE_DB_DIR` para escolher outro diretório.

Em Vercel, a API usa `/tmp` para conseguir iniciar, mas esse armazenamento é temporário e pode ser diferente entre instâncias. Persistência de sessões entre reinícios ou instâncias ainda exige conectar um banco gerenciado.
