import { createCaseDatabase, databaseReady } from "../sql/config.js";

function assertReadOnlySelect(query) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Informe uma consulta SQL.");
  }

  const withoutComments = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim();
  const statement = withoutComments.replace(/;\s*$/, "").trim();
  if (!/^(SELECT|WITH)\b/i.test(statement) || statement.includes(";")) {
    throw new Error("A API aceita somente uma consulta SELECT.");
  }
}

function rowsFromResult(database, query) {
  assertReadOnlySelect(query);
  const resultSets = database.exec(query);
  if (resultSets.length === 0) return [];

  const { columns, values } = resultSets[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]])),
  );
}

async function queryTable(query) {
  return rowsFromResult(await databaseReady, query);
}

async function queryCaseDatabase(databaseName, query) {
  const database = await createCaseDatabase(databaseName);
  try {
    return rowsFromResult(database, query);
  } finally {
    database.close();
  }
}

export { queryCaseDatabase, queryTable };
