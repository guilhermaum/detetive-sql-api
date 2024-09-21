import admin from "firebase-admin";
import { readFileSync } from "fs";

const jsonFile = readFileSync('serviceAccountKey.json');
const serviceAccount = JSON.parse(jsonFile);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

export { db };