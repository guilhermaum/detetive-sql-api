# API do Detetive SQL

API local para administrar casos e níveis, iniciar partidas, executar consultas SQL de investigação e acompanhar o progresso. A integração com o jogo não é necessária para testar estes endpoints.

## Iniciar

```bash
npm install
npm run dev
```

O servidor fica em `http://localhost:3000`. A base de controle SQLite é criada em `.data/control.db` e persiste casos, níveis, sessões, progresso, dicas utilizadas e execuções SQL. Para usar outro caminho local, defina `SQL_DETECTIVE_CONTROL_DB` antes de iniciar o servidor.

## Casos

- `POST /cases` aceita o campo de arquivo opcional `database_image` junto com o arquivo SQL obrigatório `database_file`. Imagens PNG, JPEG, GIF e WEBP são aceitas.
- `PUT /cases/:caseId` aceita JSON para atualizar os campos de texto ou `multipart/form-data` para atualizar `database_file`, `database_image` e os campos de texto enviados.
- Exemplo para substituir os dois arquivos: `curl -X PUT http://localhost:3000/cases/1 -F "database_file=@./caso.sql" -F "database_image=@./diagrama.png"`.
- `GET /cases/:caseId/database-image` retorna a imagem enviada. As respostas dos casos incluem `database_image_path` e `database_image_url` quando existe uma imagem.

- `GET /cases` lista os casos. Use `GET /cases?difficulty=medium` para filtrar pela dificuldade.
- `POST /cards/:cardId/cases/select` recebe `player_id`, `difficulty` e `case_distribution` (`aleatorio` ou `mesmo`). No modo aleatorio, escolhe um caso ainda nao jogado por esse jogador no card e dificuldade. No modo `mesmo`, usa o caso compartilhado persistido para o card.
- `GET /cases/:caseId` obtém um caso.
- `POST /cases` cria um caso usando `multipart/form-data`. Envie `name`, `description`, `difficulty` e o arquivo `.sql` no campo `database_file`. Exemplo: `curl -X POST http://localhost:3000/cases -F "name=Caso novo" -F "description=Descricao" -F "difficulty=medium" -F "database_file=@./caso.sql;type=text/sql"`.
- O caminho `database_file_path` e gerado pela API e retornado com o caso; ele aponta para o arquivo SQL salvo pelo servidor. Nao envie `database_name`.
- `PUT /cases/:caseId` atualiza os campos enviados (`name`, `description` e `difficulty`).
- `DELETE /cases/:caseId` remove o caso e os dados relacionados.

As respostas usam `id`, `name`, `description`, `difficulty`, `database_file_path`, `created_at` e `level_count`. O Caso 1, com seus oito níveis, é carregado como dado inicial quando a base local é criada. Esse seed só é aplicado quando ainda não há casos persistidos.

## Níveis

- `GET /cases/:caseId/levels` lista os níveis de um caso.
- `GET /levels/:levelId` obtém um nível.
- `POST /cases/:caseId/levels` cria um nível com `number`, `tips` (texto), `problems` (texto), `template` (JSON) e `helps` (`help_table`, `help_column`, `help_operation`).
- `PUT /levels/:levelId` atualiza os campos do nível.
- `DELETE /levels/:levelId` remove o nível.

Casos, níveis, sessões e consultas têm IDs internos numéricos. `card_id` identifica a atividade e agrupa os participantes no ranking. Cada nível retorna `id`, `case_id`, `number`, `tips`, `problems`, `template`, `created_at` e `helps`.

## Sessões

- `POST /game-sessions` inicia uma sessão. Envie `{"case_id":1,"card_id":"card-fctool","player_id":"jogador-1","player_name":"Ana"}`. A resposta inclui o `id` interno numérico da sessão.
- `GET /game-sessions` lista todas as sessões.
- `GET /game-sessions/:gameSessionId` consulta a sessão pelo `id` interno.
- `GET /game-sessions/:gameSessionId/progress` retorna a sessão e o progresso vinculado por `game_session_id` numérico, além de `level_id`, `status`, `score`, `started_at` e `completed_at`.
- `GET /game-sessions/:gameSessionId/sql-queries` lista as consultas enviadas na sessão.
- `POST /game-sessions/:gameSessionId/levels/:levelId/query` recebe `{"query":"SELECT ..."}`, executa a consulta e retorna o registro `sql_query` com `id`, `game_session_id`, `level_id`, `query`, `result`, `error` e `executed_at`.
- `POST /game-sessions/:gameSessionId/levels/:levelId/check` valida as respostas do nível.
- `POST /game-sessions/:gameSessionId/levels/:levelId/hints/:hintId/use` registra e retorna a dica solicitada.
- `POST /game-sessions/:gameSessionId/complete` finaliza uma sessão depois que todos os níveis forem concluídos.

Uma consulta avança a sessão quando retorna exatamente as linhas definidas em `template` (a ordem das linhas não importa; colunas adicionais são permitidas). A pontuação começa em 100, acumula as perdas entre níveis e nunca ultrapassa 100. A sessão recebe a pontuação do último nível concluído, sem somar novamente os valores acumulados de cada nível. Consultas incorretas ficam registradas e deixam o nível atual aberto. O executor aceita uma única instrução `SELECT` ou `WITH` em modo somente leitura.

## Bancos de investigação

Os arquivos `.sql` enviados são salvos em `.data/cases/` com um nome gerado e persistidos na coluna `database_file_path` como uma referencia relativa, por exemplo `cases/<uuid>.sql`. Cada consulta carrega o script em uma instancia somente leitura. O Caso 1 continua usando `src/sql/database.db` como base inicial. Defina `SQL_DETECTIVE_CASE_DB_DIR` para escolher outro diretorio de armazenamento.

Em Vercel, a API usa `/tmp` para conseguir iniciar, mas esse armazenamento é temporário e pode ser diferente entre instâncias. Persistência de sessões entre reinícios ou instâncias ainda exige conectar um banco gerenciado.

## Ranking e pontuacao

- POST `/game-sessions` recebe `card_id`, `player_id` e `player_name`. O ranking agrupa partidas pelo `card_id` e identifica cada aluno pelo `player_id`.
- POST `/game-sessions/:gameSessionId/levels/:levelId/check` aceita `score` junto com `answers` e grava a pontuacao do nivel em `player_progress`.
- GET `/game-sessions/card/:cardId/ranking?case_id=...` retorna os alunos que concluiram o caso, ordenados pela pontuacao, com `player_id` e `player_name`. Cada aluno aparece uma vez, usando sua melhor pontuacao concluida no caso.
- `game_sessions.score` permanece em zero ate que todos os niveis sejam concluidos; a conclusao usa a pontuacao acumulada do ultimo nivel.
- A pontuacao comeca em 100, acumula perdas entre niveis, e nunca ultrapassa 100.
- `GET /game-sessions/resume?card_id=...&player_id=...` busca a sessao mais recente do jogador naquele card. Retorna o progresso apenas se essa sessao ainda estiver em andamento; caso contrario, retorna `null`. A resposta restaura o nivel atual, a pontuacao e as dicas usadas.
- `POST /game-sessions/:gameSessionId/levels/:levelId/score` salva a pontuacao acumulada do nivel atual para permitir a retomada.
