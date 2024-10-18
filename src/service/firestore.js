import { db } from "../firebase/config.js";

async function create(local, data) {
  try {
    const docRef = await db.collection(local).add(data);
    return docRef.id;
  } catch (err) {
    console.error(err);
    throw new Error(`Algo de errado em salvar na coleção ${local}.`);
  }
}

async function findById(local, id) {
  const docRef = db.collection(local).doc(id);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    const data = {
      id: docSnap.id,
      ...docSnap.data(),
    };
    return data;
  } else throw new Error(`Dados de ${local} não encontrados.`);
}

async function findAll(local) {
  const snapshot = await db.collection(local).get();
  const dataList = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return dataList;
}

async function findWithFilters(local, filters = [], order = null) {
  let query = db.collection(local);
  
  filters.forEach(({ fd, op, vl }) => {
    query = query.where(fd, op, vl);
  });
  
  if (order) {
    const { field, direction = "asc" } = order;
    query = query.orderBy(field, direction);
  }
  
  const snapshot = await query.get();
  const dataList = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return dataList;
}

async function checkAnswers(local, id, inputs) {
  let check = !!inputs;
  for (let prop in inputs) {
    const { template } = await findById(local, id);
    const input = format(inputs[prop]);
    const answer = format(template[prop]);
    check = check && input === answer;
  }
  return check;
}

function format(str) {
  return str.trim().toLowerCase();
}

export { create, findById, findAll, findWithFilters, checkAnswers };
