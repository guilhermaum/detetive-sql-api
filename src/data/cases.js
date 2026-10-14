import levels from "./levels.js";

function asText(value) {
  return Array.isArray(value) ? value.join("\n") : String(value ?? "");
}

function helpTip(hints, section) {
  return hints.find((hint) => hint.title.toLocaleLowerCase().includes(section))?.tip ?? "";
}

const caseLevels = levels.map(({ hints = [], ...level }) => ({
  ...level,
  tips: asText(level.tips),
  problems: asText(level.problems),
  helps: {
    help_table: helpTip(hints, "tabelas"),
    help_column: helpTip(hints, "colunas"),
    help_operation: helpTip(hints, "operadores"),
  },
}));

const originalCase = {
  id: 1,
  name: "Caso 1",
  description: "O caso original do Detetive SQL.",
  difficulty: "medium",
  database_name: "case-1.db",
  levels: caseLevels,
};

export default [originalCase];
