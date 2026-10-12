
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

async function probarFirebase() {
  console.log("Firebase se ha inicializado correctamente.");

  try {
    const cursosQuery = query(
      collection(db, "courses"),
      where("published", "==", true)
    );

    const resultado = await getDocs(cursosQuery);

    console.log("¡Conexión con Firestore correcta!");
    console.log("Cursos publicados encontrados:", resultado.size);
  } catch (error) {
    console.error("No se pudo consultar Firestore:", error.code, error.message);
  }
}

probarFirebase();
