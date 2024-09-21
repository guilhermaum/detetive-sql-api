import { db } from "./config.js";

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
  const dataList = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  return dataList;
}

export { create, findById, findAll };