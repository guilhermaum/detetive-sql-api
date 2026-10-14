import cases from "../data/cases.js";

export function getCases() {
  return cases.map((item) => ({
    id: item.legacyId ?? `case-${item.id}`,
    name: item.name,
    description: item.description,
    levelCount: item.levels.length,
  }));
}

export function getGame(id) {
  const game = cases.find((item) => (item.legacyId ?? `case-${item.id}`) === id);
  if (!game) return null;

  const legacyId = game.legacyId ?? `case-${game.id}`;
  return {
    id: legacyId,
    name: game.name,
    description: game.description,
    levels: game.levels.map((_, index) => `${legacyId}-level-${index + 1}`),
    last: game.levels.length,
  };
}

export function getLevel(id) {
  const match = /^(case-\d+)-level-(\d+)$/.exec(id);
  if (!match) return null;

  const [, caseId, levelId] = match;
  const game = cases.find((item) => (item.legacyId ?? `case-${item.id}`) === caseId);
  const number = Number(levelId);
  if (!game || !Number.isInteger(number) || number < 1 || number > game.levels.length) {
    return null;
  }

  const { helps, ...level } = game.levels[number - 1];
  return {
    ...level,
    tips: String(level.tips).split("\n"),
    problems: String(level.problems).split("\n"),
    helps: [
      { title: "Quais tabelas devo usar na consulta?", tip: helps.help_table },
      { title: "Quais colunas devo usar na consulta?", tip: helps.help_column },
      { title: "Quais operadores devo usar na consulta?", tip: helps.help_operation },
    ],
    id,
    caseId,
  };
}

export function checkAnswers(level, inputs) {
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    return false;
  }

  const expected = Object.entries(level.template);
  return expected.every(([key, answer]) => {
    const input = inputs[key];
    return (
      typeof input === "string" &&
      input.trim().toLocaleLowerCase() === String(answer).trim().toLocaleLowerCase()
    );
  });
}
