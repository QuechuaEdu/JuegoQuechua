/* =====================================================================
   FERIA DEL QUECHUA · script.js
   JavaScript puro, sin dependencias. Funciona abriendo index.html.

   ÍNDICE
   1. Configuración central (puntos, monedas, dificultad…)
   2. Niveles, categorías, insignias y textos
   3. Contenido educativo: vocabulario, oraciones y generador del banco
   4. Utilidades, sonido y efectos visuales
   5. Guardado de progreso (localStorage)
   6. Selección de preguntas
   7. Motor del juego (partida, puntuación, retroalimentación)
   8. Minijuegos (uno por puesto)
   9. Pantallas, mapa, modales y resultados
   10. Eventos globales e inicio
   ===================================================================== */
"use strict";

/* =====================================================================
   1. CONFIGURACIÓN CENTRAL — cambia aquí los valores del juego
   ===================================================================== */
const CONFIG = {
  storageKey: "feriaQuechua.v1",
  questionsPerLevel: 5,          // preguntas por puesto (niveles 1 a 6)
  finalQuestions: 10,            // preguntas del desafío final
  finalTimes: [60, 90, 120, 180],// tiempos configurables del desafío final (segundos)
  finalTimeDefault: 120,
  passRatio: 0.6,                // proporción de aciertos para desbloquear el siguiente puesto
  goodRatio: 0.8,                // proporción de aciertos para la 2.ª estrella
  points: {
    byAttempt: [100, 60, 30],    // puntos si aciertas al 1.º, 2.º o 3.er intento
    streakEvery: 3,              // cada cuántos aciertos seguidos hay bonificación
    streakBonus: 50,
    finalStreakBonus: 100        // bonificación de racha en el desafío final
  },
  coins: {
    byAttempt: [10, 6, 3],       // monedas por acierto según el intento
    goldenFish: 5,               // monedas extra por pez dorado
    perStar: 5                   // monedas por cada estrella ganada al terminar un nivel
  },
  feedbackDelay: 900,            // ms entre la animación y el panel de explicación
  difficulty: {
    // attempts: oportunidades por pregunta · speed: velocidad de objetivos (px/s)
    // tolerance: margen de la zona verde (nivel 3) · dif: niveles de dificultad de las preguntas
    facil:      { label: "Fácil",      attempts: 3, speed: 40,  tolerance: 0.24, dif: [1, 1] },
    intermedio: { label: "Intermedio", attempts: 2, speed: 75,  tolerance: 0.17, dif: [1, 2] },
    avanzado:   { label: "Avanzado",   attempts: 2, speed: 115, tolerance: 0.12, dif: [2, 3] }
  }
};

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =====================================================================
   2. NIVELES, CATEGORÍAS, INSIGNIAS Y TEXTOS
   ===================================================================== */
const LEVELS = [
  { id: 1, key: "globos",  icon: "🎈", name: "Dardos y globos",       chance: "🎯", color: "#e63946", cats: ["sust", "grupo"],
    story: "Un puesto lleno de globos de colores: ¡cada uno guarda una palabra en quechua!",
    how: "Toca el globo con la respuesta correcta para lanzar un dardo. Cada dardo que falla gasta una oportunidad." },
  { id: 2, key: "tiro",    icon: "🔫", name: "Galería de tiro",        chance: "💥", color: "#7b2cbf", cats: ["verb", "completar"],
    story: "Los objetivos de madera se deslizan por los rieles. Es una pistola de aire de juguete que dispara bolitas de colores.",
    how: "Mueve el mouse para apuntar y haz clic (o toca) sobre el objetivo correcto. Si disparas al vacío no pierdes nada." },
  { id: 3, key: "pelotas", icon: "⚽", name: "Lanzamiento de pelotas", chance: "⚽", color: "#fb5607", cats: ["qes", "esq"],
    story: "Cada canasta guarda una respuesta distinta. ¡Hay que tener buena puntería y mejor vocabulario!",
    how: "Elige una canasta y pulsa «¡Lanzar!» cuando la barra pase por la zona verde. Si el tiro sale corto o largo no pierdes oportunidad: la zona verde se hace más grande." },
  { id: 4, key: "ruleta",  icon: "🎡", name: "Ruleta de palabras",     chance: "⭐", color: "#c9306b", cats: null,
    story: "La ruleta decide qué tipo de pregunta te toca: sustantivos, verbos, traducciones u oraciones.",
    how: "Pulsa «Girar ruleta», espera a que se detenga y responde la pregunta de la categoría que salió." },
  { id: 5, key: "latas",   icon: "🥫", name: "Derriba las latas",      chance: "⚾", color: "#1fa89a", cats: ["consigna", "verb"],
    story: "Una pirámide de latas con palabras te espera. Lee la consigna y derriba solo la lata correcta.",
    how: "Toca una lata para apuntar y pulsa «¡Lanzar!». Al final verás las palabras que acertaste y su significado." },
  { id: 6, key: "pesca",   icon: "🎣", name: "Pesca de palabras",      chance: "🪝", color: "#118ab2", cats: ["qes", "esq", "oracion"],
    story: "En el estanque nadan peces con palabras. ¡Los aciertos se convierten en peces dorados y monedas extra!",
    how: "Toca el pez que lleva la respuesta para lanzar la caña. Los peces no se quedan quietos: ¡sé rápido!" },
  { id: 7, key: "final",   icon: "🏆", name: "El gran premio del quechua", chance: "⭐", color: "#ffc233", cats: null, final: true,
    story: "El desafío final mezcla todos los puestos y todas las preguntas, ¡contra el reloj!",
    how: "Responde lo más rápido que puedas. Cada racha de tres aciertos da puntos extra. El tiempo se detiene mientras lees las explicaciones." }
];
// En el código, cada nivel se identifica por su clave de minijuego. "pesca" usa el módulo "peces".
const MODULE_OF = { globos: "globos", tiro: "tiro", pelotas: "pelotas", ruleta: "ruleta", latas: "latas", pesca: "peces" };
const FINAL_MODULES = ["globos", "tiro", "peces", "latas"];

const WHEEL = [
  { id: "sust",    label: "Sustantivos",           short: "Sustantivos", icon: "🏠", color: "#ff6b6b", cats: ["sust", "grupo"] },
  { id: "verb",    label: "Verbos",                short: "Verbos",      icon: "🏃", color: "#ffb703", cats: ["verb"] },
  { id: "qes",     label: "Quechua → Español",     short: "Qu → Es",     icon: "🔤", color: "#2ec4b6", cats: ["qes"] },
  { id: "esq",     label: "Español → Quechua",     short: "Es → Qu",     icon: "🗣️", color: "#4d96ff", cats: ["esq"] },
  { id: "oracion", label: "Palabras en oraciones", short: "Oraciones",   icon: "📝", color: "#9b5de5", cats: ["oracion", "completar"] }
];

const CAT_LABEL = {
  sust: "Sustantivos", grupo: "Sustantivos", verb: "Verbos", qes: "Quechua → Español", esq: "Español → Quechua",
  oracion: "Palabras en oraciones", completar: "Completa la oración", consigna: "Consigna"
};
// Verbo de acción que se usa en las consignas según el puesto ({acc} en el texto de la pregunta)
const ACTION = { globos: "Revienta el", tiro: "Dispara al", pelotas: "Encesta el", ruleta: "Elige el", latas: "Derriba el", peces: "Pesca el" };
const HINTS = {
  globos: "Toca el globo con la respuesta para lanzar un dardo.",
  tiro: "Apunta y dispara al objetivo correcto (clic o toque).",
  pelotas: "Elige una canasta y detén la barra en la zona verde.",
  ruleta: "Gira la ruleta y responde.",
  latas: "Elige una lata y pulsa «¡Lanzar!».",
  peces: "Toca el pez que lleva la respuesta para pescarlo."
};

const BADGES = [
  { id: "primer",    icon: "🎉", name: "Primer acierto",       desc: "Responde bien tu primera pregunta." },
  { id: "racha",     icon: "🔥", name: "Racha de fuego",       desc: "Consigue 3 aciertos seguidos." },
  { id: "perfecto",  icon: "💎", name: "Puesto perfecto",      desc: "Completa un puesto sin errores." },
  { id: "pescador",  icon: "🐟", name: "Pescador de oro",      desc: "Captura 5 peces dorados." },
  { id: "ruleta",    icon: "🎡", name: "Reina de la ruleta",   desc: "Completa la ruleta de palabras." },
  { id: "estrellas", icon: "🌟", name: "Coleccionista",        desc: "Reúne 10 estrellas." },
  { id: "monedas",   icon: "🪙", name: "Alforja llena",        desc: "Junta 300 monedas." },
  { id: "feria",     icon: "🏆", name: "Campeón de la feria",  desc: "Completa los siete puestos." }
];

/* =====================================================================
   3. CONTENIDO EDUCATIVO
   Quechua sureño con la escritura usada en Bolivia (alfabeto de 3 vocales).
   Para AMPLIAR el juego basta con añadir filas a NOUNS, VERBS o SENTENCES:
   el banco de preguntas se genera solo a partir de ellas.
   ===================================================================== */

// [quechua, español, grupo, nivel (1-3), nota de variante opcional]
const NOUNS = [
  ["wasi", "casa", "lugar", 1],
  ["yaku", "agua", "naturaleza", 1],
  ["inti", "sol", "naturaleza", 1],
  ["killa", "luna", "naturaleza", 1],
  ["allqu", "perro", "animal", 1, "Variante: en otras zonas se escribe «alqu» o «alqo»."],
  ["misi", "gato", "animal", 1],
  ["wawa", "bebé / niño/a", "persona", 1, "«Wawa» puede ser bebé o niño/a, según el contexto."],
  ["runa", "persona", "persona", 1],
  ["mama", "mamá", "persona", 1],
  ["tata", "papá", "persona", 1, "Variante: en otras zonas se dice «tayta»."],
  ["mayu", "río", "naturaleza", 2],
  ["urqu", "cerro", "naturaleza", 2, "Variante: «orqo» en la escritura antigua o del Cusco."],
  ["t'ika", "flor", "planta", 2],
  ["sach'a", "árbol", "planta", 2],
  ["papa", "papa (patata)", "comida", 2],
  ["sara", "maíz", "comida", 2],
  ["t'anta", "pan", "comida", 2],
  ["qhatu", "mercado", "lugar", 2, "Variante: «qatu» en otras zonas."],
  ["llaqta", "pueblo", "lugar", 2],
  ["chakra", "chacra", "lugar", 2, "La chacra es un terreno de cultivo."],
  ["rumi", "piedra", "naturaleza", 2],
  ["ch'uñu", "chuño", "comida", 3, "El chuño es papa deshidratada."],
  ["quyllur", "estrella", "naturaleza", 3],
  ["phuyu", "nube", "naturaleza", 3],
  ["wayra", "viento", "naturaleza", 3],
  ["kuntur", "cóndor", "animal", 3],
  ["p'isqu", "pájaro", "animal", 3, "Variante: «pisqu» o «pisqo» en otras zonas."],
  ["challwa", "pez", "animal", 3],
  ["quwi", "cuy", "animal", 3, "Variante: «qowi» en la escritura antigua."],
  ["llama", "llama", "animal", 3],
  ["p'acha", "ropa", "objeto", 3],
  ["yachay wasi", "escuela", "lugar", 3, "Significa «casa donde se aprende»."],
  ["ñawi", "ojo", "cuerpo", 3],
  ["maki", "mano", "cuerpo", 3],
  ["para", "lluvia", "naturaleza", 3],
  ["nina", "fuego", "naturaleza", 3],
  ["mikhuna", "comida", "comida", 3]
].map(([q, es, g, n, nota]) => ({ q, disp: q, es, g, n, nota: nota || "", tipo: "sust", key: "n:" + q }));

// [raíz (sin -y), español (infinitivo), nivel, nota]. Se muestran como «raíz-y»: taki-y
const VERBS = [
  ["mikhu", "comer", 1, "Variante: en otras zonas se escribe «mikuy»."],
  ["puñu", "dormir", 1],
  ["puri", "caminar", 1],
  ["taki", "cantar", 1],
  ["tusu", "bailar", 1],
  ["llank'a", "trabajar", 1, "Variante: «llamk'ay» en otras zonas."],
  ["upya", "beber", 2, "Variante: «ukyay» en otras zonas."],
  ["rima", "hablar", 2],
  ["ñawiri", "leer", 2],
  ["qillqa", "escribir", 2],
  ["riku", "ver", 2],
  ["uyari", "escuchar", 2],
  ["asi", "reír", 2],
  ["waqa", "llorar", 2],
  ["puklla", "jugar", 2],
  ["wayk'u", "cocinar", 2],
  ["ranti", "comprar", 3],
  ["tarpu", "sembrar", 3],
  ["hamu", "venir", 3],
  ["apa", "llevar", 3],
  ["muna", "querer", 3],
  ["yacha", "saber / aprender", 3],
  ["yanapa", "ayudar", 3],
  ["chaya", "llegar", 3]
].map(([root, es, n, nota]) => ({ q: root, disp: root + "y", es, g: "accion", n, nota: nota || "", tipo: "verb", key: "v:" + root }));

/* Oraciones sencillas. parts: [palabra, tipo, significado, explicación opcional]
   alt: 3 traducciones incorrectas · vdis: 3 verbos incorrectos · blank: índice del verbo */
const SENTENCES = [
  { q: "Allqu mikhun", es: "El perro come", dif: 1, alt: ["El gato come", "El perro duerme", "El gato duerme"], vdis: ["puñun", "takin", "tusun"], blank: 1,
    parts: [["Allqu", "sust", "perro"], ["mikhun", "verb", "come", "mikhu-y + -n: acción de él/ella"]] },
  { q: "Misi puñun", es: "El gato duerme", dif: 1, alt: ["El perro duerme", "El gato come", "El perro come"], vdis: ["mikhun", "takin", "purin"], blank: 1,
    parts: [["Misi", "sust", "gato"], ["puñun", "verb", "duerme", "puñu-y + -n: acción de él/ella"]] },
  { q: "Wawa tusun", es: "El niño baila", dif: 1, alt: ["El niño canta", "El niño duerme", "El perro baila"], vdis: ["takin", "puñun", "mikhun"], blank: 1,
    parts: [["Wawa", "sust", "niño (bebé o niño/a)"], ["tusun", "verb", "baila", "tusu-y + -n: acción de él/ella"]] },
  { q: "Runa llank'an", es: "La persona trabaja", dif: 1, alt: ["La persona come", "La persona camina", "El perro trabaja"], vdis: ["mikhun", "purin", "puñun"], blank: 1,
    parts: [["Runa", "sust", "persona"], ["llank'an", "verb", "trabaja", "llank'a-y + -n: acción de él/ella"]] },
  { q: "Mama takin", es: "La mamá canta", dif: 1, alt: ["La mamá baila", "La mamá duerme", "El papá canta"], vdis: ["tusun", "puñun", "mikhun"], blank: 1,
    parts: [["Mama", "sust", "mamá"], ["takin", "verb", "canta", "taki-y + -n: acción de él/ella"]] },
  { q: "Tata purin", es: "El papá camina", dif: 1, alt: ["El papá duerme", "El papá trabaja", "La mamá camina"], vdis: ["puñun", "llank'an", "takin"], blank: 1,
    parts: [["Tata", "sust", "papá"], ["purin", "verb", "camina", "puri-y + -n: acción de él/ella"]] },
  { q: "Mama wasipi wayk'un", es: "La mamá cocina en la casa", dif: 2,
    alt: ["La mamá duerme en la casa", "El papá cocina en la casa", "La mamá cocina en el río"], vdis: ["puñun", "takin", "mikhun"], blank: 2,
    parts: [["Mama", "sust", "mamá"], ["wasipi", "sust", "en la casa", "wasi + -pi: «en»"], ["wayk'un", "verb", "cocina", "wayk'u-y + -n"]] },
  { q: "Allqu wasipi puñun", es: "El perro duerme en la casa", dif: 2,
    alt: ["El perro come en la casa", "El gato duerme en la casa", "El perro duerme en el río"], vdis: ["mikhun", "purin", "takin"], blank: 2,
    parts: [["Allqu", "sust", "perro"], ["wasipi", "sust", "en la casa", "wasi + -pi: «en»"], ["puñun", "verb", "duerme", "puñu-y + -n"]] },
  { q: "Quwi sarata mikhun", es: "El cuy come maíz", dif: 2,
    alt: ["El perro come maíz", "El cuy come pan", "El cuy bebe agua"], vdis: ["puñun", "upyan", "takin"], blank: 2,
    parts: [["Quwi", "sust", "cuy"], ["sarata", "sust", "maíz", "sara + -ta: marca lo que se come"], ["mikhun", "verb", "come", "mikhu-y + -n"]] },
  { q: "Wawakuna pukllanku", es: "Los niños juegan", dif: 2,
    alt: ["El niño juega", "Los niños duermen", "Los perros juegan"], vdis: ["puñunku", "takinku", "tusunku"], blank: 1,
    parts: [["Wawakuna", "sust", "los niños", "wawa + -kuna: plural"], ["pukllanku", "verb", "juegan", "puklla-y + -nku: acción de ellos/ellas"]] },
  { q: "Runakuna takinku", es: "Las personas cantan", dif: 2,
    alt: ["La persona canta", "Las personas bailan", "Las personas duermen"], vdis: ["tusunku", "puñunku", "mikhunku"], blank: 1,
    parts: [["Runakuna", "sust", "las personas", "runa + -kuna: plural"], ["takinku", "verb", "cantan", "taki-y + -nku: acción de ellos/ellas"]] },
  { q: "Wawa t'antata mikhun", es: "El niño come pan", dif: 2,
    alt: ["El niño bebe agua", "El perro come pan", "El niño come maíz"], vdis: ["upyan", "puñun", "takin"], blank: 2,
    parts: [["Wawa", "sust", "niño (bebé o niño/a)"], ["t'antata", "sust", "pan", "t'anta + -ta: marca lo que se come"], ["mikhun", "verb", "come", "mikhu-y + -n"]] },
  { q: "Tata chakrapi sarata tarpun", es: "Papá siembra maíz en la chacra", dif: 3,
    alt: ["Papá compra maíz en el mercado", "Mamá siembra maíz en la chacra", "Papá siembra papa en el río"], vdis: ["rantin", "llank'an", "mikhun"], blank: 3,
    parts: [["Tata", "sust", "papá"], ["chakrapi", "sust", "en la chacra", "chakra + -pi: «en»"], ["sarata", "sust", "maíz", "sara + -ta: marca lo que se siembra"], ["tarpun", "verb", "siembra", "tarpu-y + -n"]] },
  { q: "Mama qhatupi t'antata rantin", es: "Mamá compra pan en el mercado", dif: 3,
    alt: ["Mamá cocina pan en la casa", "Papá compra pan en el mercado", "Mamá compra maíz en el mercado"], vdis: ["wayk'un", "tarpun", "upyan"], blank: 3,
    parts: [["Mama", "sust", "mamá"], ["qhatupi", "sust", "en el mercado", "qhatu + -pi: «en»"], ["t'antata", "sust", "pan", "t'anta + -ta: marca lo que se compra"], ["rantin", "verb", "compra", "ranti-y + -n"]] },
  { q: "Allqu mayupi yakuta upyan", es: "El perro bebe agua en el río", dif: 3,
    alt: ["El perro bebe agua en la casa", "El gato bebe agua en el río", "El perro duerme en el río"], vdis: ["mikhun", "puñun", "purin"], blank: 3,
    parts: [["Allqu", "sust", "perro"], ["mayupi", "sust", "en el río", "mayu + -pi: «en»"], ["yakuta", "sust", "agua", "yaku + -ta: marca lo que se bebe"], ["upyan", "verb", "bebe", "upya-y + -n"]] }
];

/* ---------- Generador del banco de preguntas ---------- */
const GROUP_PHRASE = {
  persona: "nombra a una persona", animal: "nombra a un animal", lugar: "nombra un lugar",
  naturaleza: "nombra un elemento de la naturaleza", comida: "nombra un alimento", planta: "nombra una planta",
  cuerpo: "nombra una parte del cuerpo", objeto: "nombra un objeto"
};
// Grupos que pueden confundirse (no se usan como distractores unos de otros)
const GROUP_CONFUSE = { persona: [], animal: [], lugar: ["naturaleza"], naturaleza: ["lugar", "planta", "comida"], comida: ["planta", "naturaleza"], planta: ["naturaleza", "comida"], cuerpo: [], objeto: ["naturaleza"] };
const SAME_GROUP_EXCLUDE = ["persona", "comida", "cuerpo"];
const WORDS = [...NOUNS, ...VERBS];

const BANK = [];   // ← banco de preguntas (se llena con buildBank)

function infoOf(w) { return `${w.disp} = ${w.es} (${w.tipo === "verb" ? "verbo" : "sustantivo"})`; }
const optQ = w => ({ t: w.disp, info: infoOf(w) });
const optEs = w => ({ t: w.es, info: infoOf(w) });

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function distractWords(w, count, { tipo, exclGroups = [], maxN = w.n } = {}) {
  const pool = WORDS.filter(x => x !== w && x.n <= maxN && (!tipo || x.tipo === tipo) && !exclGroups.includes(x.g) && x.es !== w.es && x.disp !== w.disp);
  return shuffle(pool).slice(0, count);
}
// Tres sustantivos de grupos distintos (para «¿cuál expresa una acción?»)
function distractNounsVaried(w, count) {
  const pool = shuffle(NOUNS.filter(x => x.n <= w.n)), out = [], used = new Set();
  for (const x of pool) { if (!used.has(x.g)) { out.push(x); used.add(x.g); } if (out.length === count) break; }
  for (const x of pool) { if (out.length >= count) break; if (!out.includes(x)) out.push(x); }
  return out;
}

function pushQ(cat, key, dif, texto, ok, wrongs, expl, aprende, nota) {
  if (wrongs.length < 3) return;
  BANK.push({ id: `${cat}-${BANK.length}`, cat, dif, key, texto, opciones: [ok, ...wrongs.slice(0, 3)], correcta: 0, expl, aprende, nota: nota || "" });
}

function buildBank() {
  BANK.length = 0;
  /* --- Sustantivos --- */
  for (const w of NOUNS) {
    const sameEx = SAME_GROUP_EXCLUDE.includes(w.g) ? [w.g] : [];
    const verbs = distractWords(w, 3, { tipo: "verb" });
    pushQ("sust", w.key, w.n, "¿Cuál de estas palabras es un sustantivo en quechua?", optQ(w), verbs.map(optQ),
      `«${w.disp}» es un sustantivo: nombra algo y significa «${w.es}». Las otras palabras son verbos, o sea, expresan acciones (${verbs.map(v => v.disp + " = " + v.es).join(", ")}).`, `${w.disp} = ${w.es}`, w.nota);
    pushQ("qes", w.key, w.n, `¿Qué significa «${w.disp}»?`, optEs(w), distractWords(w, 3, { tipo: "sust", exclGroups: sameEx }).map(optEs),
      `«${w.disp}» es un sustantivo y significa «${w.es}».`, `${w.disp} = ${w.es}`, w.nota);
    pushQ("esq", w.key, w.n, `¿Cómo se dice «${w.es}» en quechua?`, optQ(w), distractWords(w, 3, { tipo: "sust", exclGroups: sameEx }).map(optQ),
      `En quechua, «${w.es}» se dice «${w.disp}». Es un sustantivo.`, `${w.disp} = ${w.es}`, w.nota);
    pushQ("consigna", w.key, w.n, `{acc} sustantivo que significa «${w.es}».`, optQ(w), distractWords(w, 3, { tipo: "sust", exclGroups: sameEx }).map(optQ),
      `«${w.disp}» es el sustantivo que significa «${w.es}».`, `${w.disp} = ${w.es}`, w.nota);
    const ex = [w.g, ...(GROUP_CONFUSE[w.g] || [])];
    pushQ("grupo", w.key, w.n, `¿Cuál de estas palabras ${GROUP_PHRASE[w.g]}?`, optQ(w), distractWords(w, 3, { tipo: "sust", exclGroups: ex }).map(optQ),
      `«${w.disp}» significa «${w.es}»: es un sustantivo que ${GROUP_PHRASE[w.g]}.`, `${w.disp} = ${w.es}`, w.nota);
  }
  /* --- Verbos --- */
  for (const w of VERBS) {
    const nouns = distractWords(w, 3, { tipo: "sust" });
    const exp = `«${w.disp}» es un verbo: expresa la acción de «${w.es}». En su forma básica, los verbos quechuas terminan en -y.`;
    pushQ("verb", w.key, w.n, "¿Cuál de estas palabras es un verbo en quechua?", optQ(w), nouns.map(optQ),
      `${exp} Las otras son sustantivos (${nouns.map(n => n.disp + " = " + n.es).join(", ")}).`, `${w.disp} = ${w.es}`, w.nota);
    const varied = distractNounsVaried(w, 3);
    pushQ("verb", w.key, w.n, "¿Cuál de estas palabras expresa una acción?", optQ(w), varied.map(optQ),
      `${exp} Las otras nombran personas, animales, lugares o cosas.`, `${w.disp} = ${w.es}`, w.nota);
    pushQ("qes", w.key, w.n, `¿Qué significa «${w.disp}»?`, optEs(w), distractWords(w, 3, { tipo: "verb" }).map(optEs),
      `«${w.disp}» es un verbo y significa «${w.es}».`, `${w.disp} = ${w.es}`, w.nota);
    pushQ("esq", w.key, w.n, `¿Cómo se dice «${w.es}» en quechua?`, optQ(w), distractWords(w, 3, { tipo: "verb" }).map(optQ),
      `En quechua, «${w.es}» se dice «${w.disp}». Es un verbo (termina en -y).`, `${w.disp} = ${w.es}`, w.nota);
    pushQ("consigna", w.key, w.n, `{acc} verbo que expresa la acción de «${w.es}».`, optQ(w), distractWords(w, 3, { tipo: "verb" }).map(optQ),
      `«${w.disp}» es el verbo que expresa la acción de «${w.es}».`, `${w.disp} = ${w.es}`, w.nota);
  }
  /* --- Oraciones --- */
  SENTENCES.forEach((S, si) => {
    const key = "s:" + si, learn = `${S.q} = ${S.es}`;
    const readParts = S.parts.map(p => `${p[0]} (${p[2]})`).join(" + ");
    const morph = S.parts.filter(p => p[3]).map(p => `${p[0]}: ${p[3]}`).join("; ");
    pushQ("oracion", key, S.dif, `¿Qué significa la oración «${S.q}»?`,
      { t: S.es, info: `«${S.es}» es la traducción correcta` }, S.alt.map(t => ({ t, info: `«${t}» significa otra cosa` })),
      `Se lee así: ${readParts}. Significa «${S.es}». ${morph}.`, learn);
    const verbPart = S.parts[S.blank];
    const blanked = S.parts.map((p, i) => (i === S.blank ? "___" : p[0])).join(" ");
    pushQ("completar", key, S.dif, `Completa la oración: «${blanked}». Significa: «${S.es}».`,
      { t: verbPart[0], info: `${verbPart[0]} = ${verbPart[2]}` }, S.vdis.map(t => ({ t, info: `«${t}» es otra acción y no encaja` })),
      `«${verbPart[0]}» es el verbo que falta: ${verbPart[3] || verbPart[2]}. La oración completa es «${S.q}».`, learn);
    if (S.parts.length === 4) {
      const opts = S.parts.map(p => ({ t: p[0], info: `${p[0]} = ${p[2]}` }));
      const verbOpt = opts[S.blank];
      pushQ("oracion", key, S.dif, `En la oración «${S.q}», ¿cuál palabra es el verbo?`, verbOpt, opts.filter(o => o !== verbOpt),
        `«${verbPart[0]}» es el verbo: expresa la acción de «${verbPart[2]}» (${verbPart[3]}). Las otras palabras son sustantivos.`, learn);
      S.parts.forEach((p, pi) => {
        if (p[1] !== "sust" || pi === 0) return;
        const o = opts[pi];
        pushQ("oracion", key, S.dif, `En la oración «${S.q}», ¿cuál palabra significa «${p[2]}»?`, o, opts.filter(x => x !== o),
          `«${p[0]}» significa «${p[2]}»${p[3] ? ` (${p[3]})` : ""}.`, learn);
      });
    }
  });
}

// Comprueba que cada pregunta tenga 4 opciones distintas y una respuesta válida
function validateBank() {
  const issues = [];
  BANK.forEach(q => {
    const ts = q.opciones.map(o => o.t);
    if (q.opciones.length !== 4) issues.push(`${q.id}: no tiene 4 opciones`);
    if (new Set(ts).size !== ts.length) issues.push(`${q.id}: opciones repetidas (${ts.join(" | ")})`);
    if (!q.opciones[q.correcta]) issues.push(`${q.id}: respuesta correcta inválida`);
    if (!q.expl || !q.aprende) issues.push(`${q.id}: falta explicación`);
  });
  return issues;
}
buildBank();

/* =====================================================================
   4. UTILIDADES, SONIDO Y EFECTOS VISUALES
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lenClass = t => (t.length > 13 ? "l" : t.length > 8 ? "m" : "s");
const LETTERS = ["A", "B", "C", "D"];
const PALETTE = ["#ff595e", "#ffa62b", "#8ac926", "#1982c4", "#6a4c93", "#ff4d8d", "#1fa89a"];

/* Sonido con la API de audio del navegador (sin archivos externos) */
const Sound = {
  ctx: null, on: true,
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(f, d, type = "sine", vol = 0.12, when = 0, slideTo = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.03);
  },
  play(name) {
    if (!this.on) return;
    this.unlock(); if (!this.ctx) return;
    switch (name) {
      case "click": this.tone(660, .06, "square", .05); break;
      case "ok": this.tone(523, .12, "triangle", .14); this.tone(659, .12, "triangle", .14, .1); this.tone(784, .22, "triangle", .16, .2); break;
      case "bad": this.tone(240, .28, "sawtooth", .09, 0, 110); break;
      case "pop": this.tone(900, .14, "square", .1, 0, 180); break;
      case "shot": this.tone(1300, .12, "square", .07, 0, 220); break;
      case "throw": this.tone(280, .25, "sine", .1, 0, 640); break;
      case "miss": this.tone(200, .15, "triangle", .08, 0, 120); break;
      case "splash": this.tone(420, .22, "sine", .12, 0, 120); this.tone(700, .1, "sine", .06, .05, 300); break;
      case "tick": this.tone(1100, .03, "square", .04); break;
      case "spin": this.tone(400, .5, "triangle", .05, 0, 900); break;
      case "star": this.tone(880, .15, "triangle", .12); this.tone(1175, .25, "triangle", .12, .12); break;
      case "win": [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, .22, "triangle", .15, i * .13)); break;
    }
  }
};

function toast(msg, kind = "") {
  const box = $("#toasts"); if (!box) return;
  const t = h("div", "toast " + kind, esc(msg));
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, 2800);
}
function burst(parent, x, y, items, n = 10) {
  for (let k = 0; k < n; k++) {
    const s = h("span", "spark", pickOne(items)), a = Math.random() * Math.PI * 2, d = rnd(40, 110);
    s.style.left = x + "px"; s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d - 20 + "px");
    s.style.setProperty("--r", rnd(-200, 200) + "deg");
    parent.appendChild(s); setTimeout(() => s.remove(), 950);
  }
}
function floatText(parent, x, y, text) {
  const t = h("span", "float-text", esc(text)); t.style.left = x + "px"; t.style.top = y + "px";
  parent.appendChild(t); setTimeout(() => t.remove(), 1250);
}
function launchConfetti(n = 90) {
  const box = $("#confetti"); if (!box) return;
  for (let i = 0; i < n; i++) {
    const c = h("i"); c.style.left = rnd(0, 100) + "vw"; c.style.setProperty("--c", pickOne(PALETTE.concat(["#fff", "#ffc233"])));
    c.style.setProperty("--x", rnd(-120, 120) + "px"); c.style.setProperty("--r", rnd(360, 1080) + "deg");
    c.style.setProperty("--t", rnd(2.4, 4.4) + "s"); c.style.setProperty("--d", rnd(0, 1.2) + "s");
    box.appendChild(c); setTimeout(() => c.remove(), 6000);
  }
}
// Pelota lanzada con trayectoria en arco (Web Animations API)
function flyBall(stage, emoji, from, to, { apex = 70, dur = 700, onEnd } = {}) {
  const layer = $(".fly-layer", stage), b = h("span", "fly-ball", emoji);
  b.style.left = from.x + "px"; b.style.top = from.y + "px"; layer.appendChild(b);
  const dx = to.x - from.x, dy = to.y - from.y, top = Math.min(0, dy) - apex;
  const anim = b.animate([
    { transform: "translate(0,0) scale(1)", easing: "ease-out" },
    { transform: `translate(${dx / 2}px,${top}px) scale(.85)`, easing: "ease-in" },
    { transform: `translate(${dx}px,${dy}px) scale(.6)` }
  ], { duration: dur, fill: "forwards" });
  anim.onfinish = () => onEnd && onEnd(b);
  return b;
}
const centerIn = (el, stage) => {
  const sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
};

/* =====================================================================
   5. GUARDADO DE PROGRESO (localStorage)
   ===================================================================== */
const defaultSave = () => ({ v: 1, difficulty: "facil", sound: true, name: "", finalTime: CONFIG.finalTimeDefault, levels: {}, badges: {}, golden: 0, seen: [] });
let SAVE = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) {
      const d = JSON.parse(raw), base = defaultSave();
      const s = Object.assign(base, d);
      s.levels = Object.assign({}, d.levels); s.badges = Object.assign({}, d.badges);
      if (!CONFIG.difficulty[s.difficulty]) s.difficulty = "facil";
      if (!Array.isArray(s.seen)) s.seen = [];
      return s;
    }
  } catch (e) { /* almacenamiento no disponible: se juega sin guardar */ }
  return defaultSave();
}
function persist() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(SAVE)); } catch (e) { /* sin almacenamiento */ } }

const isCompleted = id => !!(SAVE.levels[id] && SAVE.levels[id].completed);
const isUnlocked = id => id === 1 || isCompleted(id - 1);
function totals() {
  let score = 0, coins = 0, stars = 0, done = 0;
  for (const L of LEVELS) {
    const r = SAVE.levels[L.id];
    if (r) { score += r.score || 0; coins += r.coins || 0; stars += r.stars || 0; if (r.completed) done++; }
  }
  return { score, coins, stars, done };
}

/* =====================================================================
   6. SELECCIÓN DE PREGUNTAS
   ===================================================================== */
// Devuelve una copia de la pregunta con las opciones mezcladas
function prepare(q) {
  const idx = shuffle(q.opciones.map((_, i) => i));
  return Object.assign({}, q, { opciones: idx.map(i => q.opciones[i]), correcta: idx.indexOf(q.correcta) });
}
/* Elige `count` preguntas de las categorías `cats` según la dificultad.
   Evita repetir ids/palabras dentro de la partida y prefiere las no vistas en partidas anteriores. */
function pickQuestions(cats, count, diffKey, avoid) {
  const [lo, hi] = CONFIG.difficulty[diffKey].dif;
  let pool = BANK.filter(q => (!cats || cats.includes(q.cat)) && q.dif >= lo && q.dif <= hi);
  if (pool.length < count) pool = BANK.filter(q => !cats || cats.includes(q.cat));
  const seen = new Set(SAVE.seen);
  const scored = pool.map(q => ({ q, s: (seen.has(q.id) ? 100 : 0) + (hi - q.dif) * 1.5 + Math.random() * 3 + (avoid.ids.has(q.id) ? 1000 : 0) })).sort((a, b) => a.s - b.s);
  const out = [], keys = new Set(avoid.keys);
  for (const { q } of scored) { if (out.length >= count) break; if (keys.has(q.key) || avoid.ids.has(q.id)) continue; out.push(q); keys.add(q.key); }
  for (const { q } of scored) { if (out.length >= count) break; if (out.includes(q) || avoid.ids.has(q.id)) continue; out.push(q); }
  out.forEach(q => { avoid.ids.add(q.id); avoid.keys.add(q.key); SAVE.seen.push(q.id); });
  if (SAVE.seen.length > 220) SAVE.seen = SAVE.seen.slice(-220);
  return out.map(prepare);
}
function buildLevelQuestions(L, diffKey, avoid) {
  if (L.key === "ruleta") return [];
  if (L.final) {
    const order = shuffle(["sust", "verb", "qes", "esq", "oracion", "grupo", "completar", "consigna"]);
    const out = [];
    for (let i = 0; i < CONFIG.finalQuestions; i++) {
      let q = pickQuestions([order[i % order.length]], 1, diffKey, avoid)[0];
      if (!q) q = pickQuestions(null, 1, diffKey, avoid)[0];
      if (q) out.push(q);
    }
    return out;
  }
  return pickQuestions(L.cats, CONFIG.questionsPerLevel, diffKey, avoid);
}

/* =====================================================================
   7. MOTOR DEL JUEGO
   ===================================================================== */
let G = null;            // partida en curso
let currentScreen = "welcome";
const stageEl = () => $("#stage");

function newGame(L) {
  const D = CONFIG.difficulty[SAVE.difficulty];
  return {
    level: L, diff: D, run: 0, idx: 0, total: L.final ? CONFIG.finalQuestions : CONFIG.questionsPerLevel,
    qs: [], q: null, done: true, attemptsMax: D.attempts, attemptsLeft: D.attempts, triedWrong: new Set(),
    score: 0, coins: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0, golden: 0, learned: [],
    lastOk: false, lastPoints: 0, paused: false, fbOpen: false, finished: false, timers: [], timerId: null,
    time: 0, api: null, ac: null, mod: null, lastFinalMod: null, avoid: { ids: new Set(), keys: new Set() }
  };
}
function later(fn, ms) {
  const run = G.run;
  const id = setTimeout(() => { if (G && G.run === run && !G.finished) fn(); }, ms);
  G.timers.push(id); return id;
}
function clearTimers() { if (G) { G.timers.forEach(clearTimeout); G.timers = []; } }

function startLevel(id) {
  closeModal();
  if (G) { stopTimer(); destroyStage(); clearTimers(); G.finished = true; }
  const L = LEVELS[id - 1];
  G = newGame(L);
  G.qs = buildLevelQuestions(L, SAVE.difficulty, G.avoid);
  if (!L.final && L.key !== "ruleta") G.total = G.qs.length;
  persist();
  $("#hud-icon").textContent = L.icon;
  $("#hud-level").textContent = `${L.id}. ${L.name}`;
  $("#hud-timer").classList.toggle("hidden", !L.final);
  $("#screen-game").classList.remove("paused");
  showScreen("game");
  if (L.final) startTimer();
  nextQuestion();
}

function finalModule() {
  let m; do { m = pickOne(FINAL_MODULES); } while (m === G.lastFinalMod && FINAL_MODULES.length > 1);
  G.lastFinalMod = m; return m;
}

function nextQuestion() {
  destroyStage(); hideFeedback();
  if (G.idx >= G.total || (G.level.key !== "ruleta" && !G.qs[G.idx])) { finishLevel(false); return; }
  G.run++;
  G.done = false; G.triedWrong = new Set(); G.attemptsLeft = G.attemptsMax; G.lastOk = false;
  G.ac = new AbortController();
  const L = G.level;
  G.mod = L.final ? finalModule() : MODULE_OF[L.key];
  const st = stageEl();
  st.className = "stage stage-" + G.mod + (L.final ? " is-final" : "");
  st.innerHTML = "";
  setQuestion(G.mod === "ruleta" ? null : G.qs[G.idx]);
  G.api = MODULES[G.mod].mount(st, makeCtx());
  updateHud();
}
function destroyStage() {
  if (G && G.api && G.api.destroy) { try { G.api.destroy(); } catch (e) { /* nada */ } }
  if (G && G.ac) G.ac.abort();
  if (G) G.api = null;
  const st = stageEl(); if (st) st.innerHTML = "";
}

function setQuestion(q) {
  G.q = q;
  const hint = HINTS[G.mod] || "";
  if (!q) {
    $("#q-cat").textContent = "Ruleta de palabras";
    $("#q-text").textContent = "🎡 ¡Gira la ruleta para descubrir tu pregunta!";
  } else {
    $("#q-cat").textContent = CAT_LABEL[q.cat] || "Pregunta";
    $("#q-text").textContent = q.texto.replace("{acc}", ACTION[G.mod] || "Elige el");
  }
  $("#q-hint").textContent = hint;
  const box = $("#q-text").closest(".question-panel");
  box.style.animation = "none"; void box.offsetWidth; box.style.animation = "";
  renderA11y();
}
function renderA11y() {
  const box = $("#a11y-options"), q = G && G.q;
  if (!q) { box.innerHTML = '<p>Primero gira la ruleta (botón «Girar ruleta»).</p>'; return; }
  box.innerHTML = q.opciones.map((o, i) => `<button class="btn btn-blue" data-i="${i}">${i + 1}. ${esc(o.t)}</button>`).join("");
  refreshA11y();
}
function refreshA11y() {
  if (!G || !G.q) return;
  $$("#a11y-options button").forEach(b => { b.disabled = G.done || G.triedWrong.has(+b.dataset.i); });
}

function updateHud() {
  $("#hud-score").textContent = G.score;
  $("#hud-coins").textContent = G.coins;
  $("#hud-streak-n").textContent = G.streak;
  $("#hud-streak").classList.toggle("hot", G.streak >= 2);
  const spent = G.attemptsMax - G.attemptsLeft;
  $("#hud-chances").innerHTML = Array.from({ length: G.attemptsMax }, (_, k) => `<span class="chance ${k < spent ? "spent" : ""}">${G.level.chance}</span>`).join("");
  $("#hud-chances").setAttribute("aria-label", `Oportunidades: ${G.attemptsLeft} de ${G.attemptsMax}`);
  const pct = Math.round((G.idx / G.total) * 100);
  $("#level-progress-fill").style.width = pct + "%";
  $("#level-progress").setAttribute("aria-valuenow", pct);
  $("#progress-text").textContent = `Pregunta ${Math.min(G.idx + 1, G.total)} de ${G.total}`;
}

function makeCtx() {
  const run = G.run;
  return {
    run, signal: G.ac.signal,
    q: () => G.q,
    done: () => G.done || G.finished,
    speed: G.diff.speed * (REDUCED ? 0.5 : 1),
    tolerance: G.diff.tolerance,
    reduced: REDUCED,
    chances: () => ({ max: G.attemptsMax, left: G.attemptsLeft }),
    paused: () => G.paused,
    attempt: i => (G && G.run === run ? attempt(i) : { ignored: true }),
    later: (fn, ms) => later(fn, ms),
    sfx: n => Sound.play(n),
    burst, floatText,
    golden: () => { G.golden++; G.coins += CONFIG.coins.goldenFish; updateHud(); },
    pickQuestion: cats => {
      const q = pickQuestions(cats, 1, SAVE.difficulty, G.avoid)[0] || pickQuestions(null, 1, SAVE.difficulty, G.avoid)[0];
      setQuestion(q); return q;
    }
  };
}

/* Registra un intento de respuesta. Un solo acierto por pregunta: no se puede sumar dos veces. */
function attempt(i) {
  const q = G && G.q;
  if (!q || G.done || G.finished || G.triedWrong.has(i)) return { ignored: true };
  const used = G.attemptsMax - G.attemptsLeft;
  if (i === q.correcta) {
    G.done = true;
    const pts = CONFIG.points.byAttempt[Math.min(used, CONFIG.points.byAttempt.length - 1)];
    const coins = CONFIG.coins.byAttempt[Math.min(used, CONFIG.coins.byAttempt.length - 1)];
    G.score += pts; G.coins += coins; G.correct++; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
    let bonus = 0;
    if (G.streak % CONFIG.points.streakEvery === 0) {
      bonus = G.level.final ? CONFIG.points.finalStreakBonus : CONFIG.points.streakBonus;
      G.score += bonus; toast(`🔥 ¡Racha de ${G.streak}! +${bonus} puntos`, "ok");
    }
    G.lastOk = true; G.lastPoints = pts + bonus;
    if (!G.learned.includes(q.aprende)) G.learned.push(q.aprende);
    Sound.play("ok");
    updateHud(); refreshA11y(); later(showFeedback, CONFIG.feedbackDelay);
    return { ok: true, over: true, points: pts, bonus };
  }
  G.triedWrong.add(i); G.attemptsLeft--; G.wrong++; G.streak = 0;
  if (G.attemptsLeft <= 0) {
    G.done = true; G.lastOk = false; G.lastPoints = 0;
    later(showFeedback, CONFIG.feedbackDelay);
  } else {
    toast(`❌ ${q.opciones[i].info}. ¡Inténtalo otra vez! (${G.attemptsLeft} ${G.attemptsLeft === 1 ? "oportunidad" : "oportunidades"})`, "bad");
  }
  updateHud(); refreshA11y();
  return { ok: false, over: G.done };
}

function showFeedback() {
  if (!G || G.finished) return;
  const q = G.q, fb = $("#feedback"), ok = G.lastOk;
  const right = q.opciones[q.correcta].t;
  fb.classList.toggle("bad", !ok);
  $("#fb-icon").textContent = ok ? pickOne(["🎉", "🌟", "👏", "🥳"]) : "🤔";
  $("#fb-title").textContent = ok ? `¡Correcto! +${G.lastPoints} puntos` : `Casi… la respuesta era «${right}»`;
  $("#fb-text").textContent = q.expl + (q.nota ? " " + q.nota : "");
  $("#fb-learn").textContent = "📚 Palabra para recordar: " + q.aprende;
  const last = G.idx + 1 >= G.total;
  $("#btn-next").textContent = last ? "Ver resultado 🏁" : "Continuar ➡️";
  fb.classList.remove("hidden"); G.fbOpen = true;
  $("#btn-next").focus({ preventScroll: true });
}
function hideFeedback() { $("#feedback").classList.add("hidden"); if (G) G.fbOpen = false; }
function continueGame() { if (!G || !G.fbOpen) return; hideFeedback(); G.idx++; Sound.play("click"); nextQuestion(); }

/* Temporizador del desafío final */
function startTimer() {
  G.time = SAVE.finalTime; renderTime();
  G.timerId = setInterval(() => {
    if (!G || G.paused || G.fbOpen || G.finished) return;
    G.time -= 0.25;
    if (G.time <= 0) { G.time = 0; renderTime(); toast("⏰ ¡Se acabó el tiempo!", "bad"); finishLevel(true); } else renderTime();
  }, 250);
}
function stopTimer() { if (G && G.timerId) { clearInterval(G.timerId); G.timerId = null; } }
function renderTime() {
  const s = Math.ceil(G.time), m = Math.floor(s / 60);
  $("#hud-time").textContent = `${m}:${String(s % 60).padStart(2, "0")}`;
  $("#hud-timer").classList.toggle("warn", s <= 10);
}

function pauseGame() {
  if (!G || G.finished || G.paused || currentScreen !== "game") return;
  G.paused = true; $("#screen-game").classList.add("paused");
  openModal(`<div class="modal-icon">⏸️</div><h2 id="modal-title">Juego en pausa</h2>
    <div class="modal-body center"><p>Respira un momento. Tu progreso en este puesto se conserva.</p></div>
    <div class="btn-row">
      <button class="btn btn-green btn-big" data-act="resume">▶️ Continuar</button>
      <button class="btn btn-blue" data-act="restart">🔄 Reiniciar puesto</button>
      <button class="btn btn-ghost" data-act="sound">${Sound.on ? "🔊 Silenciar" : "🔇 Activar sonido"}</button>
      <button class="btn btn-ghost" data-act="quit">🎪 Salir al mapa</button>
    </div>`, { onCancel: resumeGame });
}
function resumeGame() { closeModal(); if (G) { G.paused = false; $("#screen-game").classList.remove("paused"); } }
function leaveGame() {
  if (G) { stopTimer(); destroyStage(); clearTimers(); G.finished = true; hideFeedback(); }
  $("#screen-game").classList.remove("paused");
  closeModal(); persist(); showScreen("map");
}

/* ---------- Fin de un puesto ---------- */
function finishLevel(timeUp) {
  if (!G || G.finished) return;
  const L = G.level;
  stopTimer(); destroyStage(); hideFeedback(); clearTimers(); G.finished = true;
  const ratio = G.correct / G.total, passed = ratio >= CONFIG.passRatio;
  let stars = 0;
  if (passed) { stars = 1; if (ratio >= CONFIG.goodRatio) stars = 2; if (G.wrong === 0 && G.correct === G.total) stars = 3; }
  const levelCoins = G.coins + stars * CONFIG.coins.perStar;
  const prev = SAVE.levels[L.id] || { score: 0, coins: 0, stars: 0, completed: false, plays: 0 };
  const newRecord = G.score > (prev.score || 0);
  SAVE.levels[L.id] = {
    score: Math.max(prev.score || 0, G.score), coins: Math.max(prev.coins || 0, levelCoins), stars: Math.max(prev.stars || 0, stars),
    completed: !!prev.completed || passed, plays: (prev.plays || 0) + 1
  };
  SAVE.golden += G.golden;
  const newBadges = evaluateBadges({ correct: G.correct, bestStreak: G.bestStreak, stars });
  persist();
  Sound.play(passed ? "win" : "miss");
  const need = Math.ceil(CONFIG.passRatio * G.total);
  const learned = G.learned.length ? `<p><b>📚 Palabras que acertaste:</b></p><div class="learned">${G.learned.map(w => `<span>${esc(w)}</span>`).join("")}</div>` : "";
  const badgeHtml = newBadges.length ? `<p class="center"><b>🏅 ¡Nueva insignia!</b> ${newBadges.map(b => `${b.icon} ${esc(b.name)}`).join(" · ")}</p>` : "";
  const starsHtml = `<div class="stars" role="img" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map(k => `<span class="star ${k <= stars ? "on" : ""}" style="--k:${k}">⭐</span>`).join("")}</div>`;
  const grid = `<div class="result-grid"><div><b>${G.score}</b><small>puntos</small></div><div><b>${levelCoins}</b><small>monedas</small></div><div><b>${G.correct}/${G.total}</b><small>aciertos</small></div></div>`;
  const recordHtml = newRecord && prev.plays ? `<p class="center">🎊 ¡Nuevo récord en este puesto!</p>` : "";
  const next = LEVELS[L.id];

  if (passed && L.final) {
    launchConfetti(140);
    openModal(`<div class="trophy" aria-hidden="true">🏆</div><h2 id="modal-title">¡El gran premio es tuyo!</h2>
      <div class="modal-body center"><p>¡Felicitaciones! Completaste el desafío final de la Feria del Quechua.</p>${starsHtml}${grid}${recordHtml}${badgeHtml}</div>
      <div class="modal-body">${learned}</div>
      <div class="btn-row"><button class="btn btn-yellow btn-big" data-act="results">🏅 Ver mis resultados</button><button class="btn btn-ghost" data-act="map">🎪 Mapa</button></div>`,
      { cls: "celebrate", onCancel: () => { closeModal(); showScreen("map"); } });
    return;
  }
  const title = passed ? "¡Puesto completado!" : timeUp ? "¡Se acabó el tiempo!" : "¡Casi lo logras!";
  const msg = passed ? (next ? `Desbloqueaste el puesto «${next.name}».` : "")
    : `Necesitas ${need} aciertos de ${G.total} para seguir. ¡Practica un poco más y vuelve a intentarlo!`;
  if (passed) launchConfetti(50);
  openModal(`<div class="modal-icon">${passed ? "🎉" : "💪"}</div><h2 id="modal-title">${title}</h2>
    <div class="modal-body center"><p>${msg}</p>${starsHtml}${grid}${recordHtml}${badgeHtml}</div>
    <div class="modal-body">${learned}</div>
    <div class="btn-row">
      ${passed && next ? `<button class="btn btn-green btn-big" data-act="play" data-level="${next.id}">Siguiente puesto ➡️</button>` : ""}
      <button class="btn btn-blue" data-act="play" data-level="${L.id}">🔄 Jugar otra vez</button>
      <button class="btn btn-ghost" data-act="map">🎪 Mapa</button>
    </div>`, { onCancel: () => { closeModal(); showScreen("map"); } });
}

function evaluateBadges(r) {
  const t = totals(), newly = [];
  const earn = (id, cond) => { if (cond && !SAVE.badges[id]) { SAVE.badges[id] = true; newly.push(BADGES.find(b => b.id === id)); } };
  earn("primer", r.correct >= 1);
  earn("racha", r.bestStreak >= 3);
  earn("perfecto", r.stars === 3);
  earn("pescador", SAVE.golden >= 5);
  earn("ruleta", isCompleted(4));
  earn("estrellas", t.stars >= 10);
  earn("monedas", t.coins >= 300);
  earn("feria", t.done >= LEVELS.length);
  return newly;
}

/* =====================================================================
   8. MINIJUEGOS — cada módulo expone mount(stage, ctx) → { pick(i), destroy() }
      ctx.attempt(i) valida la respuesta; pick(i) permite responder desde el teclado.
   ===================================================================== */
const MODULES = {};

/* ---------- NIVEL 1 · Dardos y globos ---------- */
MODULES.globos = {
  mount(stage, ctx) {
    const q = ctx.q(), cols = shuffle(PALETTE).slice(0, 4);
    stage.innerHTML = `<div class="clouds"></div>
      <div class="balloon-field">${q.opciones.map((o, i) => `<button class="balloon" style="--c:${cols[i]};--i:${i}" data-i="${i}" aria-label="Globo ${LETTERS[i]}: ${esc(o.t)}">
        <span class="b-letter">${LETTERS[i]}</span><span class="b-word" data-len="${lenClass(o.t)}">${esc(o.t)}</span><i class="b-string"></i></button>`).join("")}</div>
      <div class="dart-layer"></div>
      <div class="counter"><span class="counter-sign">🎯 ¡Revienta el globo correcto!</span><span class="dart-rack"></span></div>`;
    const btns = $$(".balloon", stage), layer = $(".dart-layer", stage), rack = $(".dart-rack", stage);
    let busy = false;
    const drawRack = () => {
      const c = ctx.chances();
      rack.innerHTML = Array.from({ length: c.max }, (_, k) => `<span class="${k < c.max - c.left ? "spent" : ""}">🎯</span>`).join("");
    };
    const lockAll = () => btns.forEach(b => { b.disabled = true; });
    function throwAt(i) {
      const btn = btns[i];
      if (busy || !btn || btn.disabled || ctx.done()) return;
      busy = true; ctx.sfx("throw");
      const sr = stage.getBoundingClientRect(), br = btn.getBoundingClientRect();
      const sx = sr.width / 2, sy = sr.height - 26, tx = br.left - sr.left + br.width / 2, ty = br.top - sr.top + br.height * 0.4;
      const ang = Math.atan2(tx - sx, sy - ty) * 180 / Math.PI;
      const d = h("div", "dart", "<i></i>"); d.style.left = sx + "px"; d.style.top = sy + "px"; layer.appendChild(d);
      const anim = d.animate([
        { transform: `translate(-50%,-50%) rotate(${ang}deg)` },
        { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) rotate(${ang}deg)` }
      ], { duration: 380, easing: "ease-in", fill: "forwards" });
      anim.onfinish = () => {
        const r = ctx.attempt(i);
        if (r.ignored) { d.remove(); busy = false; return; }
        if (r.ok) {
          btn.classList.add("pop"); d.remove(); ctx.sfx("pop");
          ctx.burst(stage, tx, ty, ["🎉", "✨", "⭐", "🎈"], 12); ctx.floatText(stage, tx, ty - 30, "+" + r.points);
          lockAll();
        } else {
          btn.classList.add("deflate"); btn.disabled = true; ctx.sfx("bad");
          if (r.over) { btns[q.correcta].classList.add("reveal"); lockAll(); }
        }
        drawRack(); busy = false;
      };
    }
    btns.forEach((b, i) => b.addEventListener("click", () => throwAt(i), { signal: ctx.signal }));
    drawRack();
    return { pick: throwAt, destroy() { } };
  }
};

/* ---------- NIVEL 2 · Galería de tiro (pistola de aire de juguete) ---------- */
MODULES.tiro = {
  mount(stage, ctx) {
    const q = ctx.q(), EMOJI = shuffle(["🦆", "🐻", "⭐", "🎪", "🐰", "🚀"]);
    const targetHtml = i => `<button class="target" data-i="${i}" aria-label="Objetivo ${LETTERS[i]}: ${esc(q.opciones[i].t)}"><span class="t-body"><span class="t-emoji">${EMOJI[i]}</span><span class="t-word" data-len="${lenClass(q.opciones[i].t)}">${esc(q.opciones[i].t)}</span></span></button>`;
    stage.innerHTML = `<div class="curtain l"></div><div class="curtain r"></div><div class="gallery-sign">⭐ GALERÍA DE TIRO ⭐</div>
      <div class="lane l0"><div class="rail"></div>${targetHtml(0)}${targetHtml(2)}</div>
      <div class="lane l1"><div class="rail"></div>${targetHtml(1)}${targetHtml(3)}</div>
      <div class="shot-layer"></div><div class="gun-wrap"><div class="gun"><i class="barrel"></i><i class="grip"></i></div></div>`;
    const els = $$(".target", stage), gun = $(".gun", stage), layer = $(".shot-layer", stage);
    const W0 = stage.clientWidth || 600;
    const T = els.map((el, i) => ({ el, i, x: 0, v: 0, w: 120, dead: false }));
    // Dos objetivos por carril; los carriles van en sentidos opuestos y cruzan la pantalla de un extremo al otro.
    // Al salir por un borde reaparecen por el contrario, y los dos objetivos de un carril mantienen siempre
    // media vuelta de distancia, así nunca se superponen (ni al empezar).
    const lanes = [[T[0], T[2]], [T[1], T[3]]];
    lanes.forEach((lane, li) => {
      const dir = li === 0 ? 1 : -1, sp = ctx.speed * rnd(0.9, 1.15);
      const W = stage.clientWidth || W0;
      lane.forEach(t => { t.w = t.el.offsetWidth || 120; t.v = dir * sp; });
      const wMax = Math.max(lane[0].w, lane[1].w), gap = Math.max(0, (W + wMax) / 2);
      if (dir > 0) { lane[0].x = 0; lane[1].x = Math.min(gap, W - wMax); }
      else { lane[0].x = W - lane[0].w; lane[1].x = Math.max(0, W - lane[1].w - gap); }
    });
    let stopped = false, raf = 0, last = performance.now();
    function step(dt) {
      const W = stage.clientWidth;
      lanes.forEach(lane => {
        lane.forEach(t => {
          t.w = t.el.offsetWidth || 120;
          if (t.dead) return;
          t.x += t.v * dt;
          const span = W + t.w;                                  // recorrido completo: de borde a borde
          if (t.v > 0 && t.x > W) t.x -= span;                   // sale por la derecha → entra por la izquierda
          else if (t.v < 0 && t.x + t.w < 0) t.x += span;        // sale por la izquierda → entra por la derecha
        });
        lane.forEach(t => { t.el.style.transform = `translateX(${t.x}px)`; });
      });
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!ctx.paused() && !stopped) step(dt);
    }
    step(0); raf = requestAnimationFrame(loop);

    function aim(e) {
      const sr = stage.getBoundingClientRect(), gx = sr.width / 2, gy = sr.height - 20;
      gun.style.transform = `rotate(${clamp(Math.atan2(e.clientX - sr.left - gx, gy - (e.clientY - sr.top)) * 180 / Math.PI, -70, 70)}deg)`;
    }
    function fire(x, y, t) {
      const sr = stage.getBoundingClientRect(), gx = sr.width / 2, gy = sr.height - 100;
      gun.style.transform = `rotate(${clamp(Math.atan2(x - gx, sr.height - 20 - y) * 180 / Math.PI, -70, 70)}deg)`;
      gun.classList.remove("recoil"); void gun.offsetWidth; gun.classList.add("recoil");
      ctx.sfx("shot");
      const m = h("span", "muzzle", "💥"); m.style.left = gx + "px"; m.style.top = gy + "px"; layer.appendChild(m); setTimeout(() => m.remove(), 280);
      const p = h("span", "pellet"); p.style.left = gx + "px"; p.style.top = gy + "px"; layer.appendChild(p);
      const a = p.animate([{ transform: "translate(0,0)" }, { transform: `translate(${x - gx}px,${y - gy}px)` }], { duration: 190, easing: "linear", fill: "forwards" });
      a.onfinish = () => {
        p.remove();
        if (!t || t.dead || ctx.done()) { if (!t) { ctx.sfx("miss"); ctx.floatText(stage, x, y, "💨"); } return; }
        const r = ctx.attempt(t.i);
        if (r.ignored) return;
        t.dead = true;
        if (r.ok) {
          t.el.classList.add("hit"); ctx.sfx("pop"); stopped = true;
          ctx.burst(stage, x, y, ["⭐", "✨", "🎉"], 12); ctx.floatText(stage, x, y - 30, "+" + r.points);
          els.forEach(e => { e.disabled = true; });
        } else {
          t.el.classList.add("wrong"); t.el.disabled = true; ctx.sfx("bad");
          if (r.over) { stopped = true; els[q.correcta].classList.add("reveal"); els.forEach(e => { e.disabled = true; }); }
        }
      };
    }
    function onClick(e) {
      if (ctx.done()) return;
      const sr = stage.getBoundingClientRect(), el = e.target.closest(".target");
      const t = el ? T.find(o => o.el === el) : null;
      let x = e.clientX - sr.left, y = e.clientY - sr.top;
      if (t && (e.detail === 0 || (!e.clientX && !e.clientY))) { const c = centerIn(t.el, stage); x = c.x; y = c.y; }
      fire(x, y, t);
    }
    stage.addEventListener("pointermove", aim, { signal: ctx.signal });
    stage.addEventListener("click", onClick, { signal: ctx.signal });
    return {
      pick(i) { const t = T[i]; if (!t || t.dead || ctx.done()) return; const c = centerIn(t.el, stage); fire(c.x, c.y, t); },
      destroy() { cancelAnimationFrame(raf); }
    };
  }
};

/* ---------- NIVEL 3 · Lanzamiento de pelotas ---------- */
MODULES.pelotas = {
  mount(stage, ctx) {
    const q = ctx.q();
    stage.innerHTML = `<div class="hoops">${q.opciones.map((o, i) => `<button class="basket" data-i="${i}" aria-label="Canasta ${LETTERS[i]}: ${esc(o.t)}">
        <span class="basket-word">${esc(o.t)}</span><span class="rim"></span><span class="net"></span></button>`).join("")}</div>
      <div class="aim"><div class="meter" role="img" aria-label="Medidor de fuerza"><div class="zone"></div><div class="marker"></div></div>
        <p class="aim-msg" role="status">Elige una canasta 👆</p></div>
      <div class="thrower"><span class="ball" aria-hidden="true">⚽</span><button class="btn btn-red throw-btn" disabled>¡Lanzar!</button></div>
      <div class="fly-layer"></div>`;
    const baskets = $$(".basket", stage), zone = $(".zone", stage), marker = $(".marker", stage), msg = $(".aim-msg", stage);
    const throwBtn = $(".throw-btn", stage), ball = $(".ball", stage);
    let sel = null, busy = false, m = 0.5, phase = rnd(0, 6), tol = ctx.tolerance, raf = 0, last = performance.now;
    last = performance.now();
    const center = rnd(0.32, 0.68), omega = 1.4 + ctx.speed / 40;
    const drawZone = () => { zone.style.left = (center - tol) * 100 + "%"; zone.style.width = tol * 200 + "%"; };
    drawZone();
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (ctx.paused() || busy || ctx.done()) return;
      phase += omega * dt; m = 0.5 + 0.5 * Math.sin(phase); marker.style.left = m * 100 + "%";
    }
    raf = requestAnimationFrame(loop);
    const lock = () => { baskets.forEach(b => { b.disabled = true; }); throwBtn.disabled = true; };
    function select(i) {
      if (busy || ctx.done() || baskets[i].disabled) return;
      sel = i; ctx.sfx("click");
      baskets.forEach((b, k) => b.classList.toggle("sel", k === i));
      throwBtn.disabled = false;
      msg.textContent = `Canasta «${q.opciones[i].t}»: detén la barra en el verde.`;
    }
    function doThrow(assisted) {
      if (busy || sel === null || ctx.done()) return;
      busy = true; throwBtn.disabled = true; ctx.sfx("throw");
      const i = sel, hit = assisted || Math.abs(m - center) <= tol, short = m < center;
      const from = centerIn(ball, stage), br = centerIn(baskets[i], stage);
      const rim = { x: br.x, y: br.y + 4 };
      let to = rim, apex = 80;
      if (!hit) to = short ? { x: from.x + (rim.x - from.x) * 0.55, y: from.y + (rim.y - from.y) * 0.5 + 70 } : { x: rim.x + (Math.random() < .5 ? -1 : 1) * 70, y: -70 };
      if (!hit && !short) apex = 0;
      flyBall(stage, "⚽", from, to, {
        apex, dur: hit ? 850 : 750,
        onEnd: fb => {
          if (!hit) {
            fb.remove(); ctx.sfx("miss"); tol = Math.min(0.45, tol + 0.04); drawZone();
            msg.textContent = short ? "¡Muy corto! Prueba con un poco más de fuerza 💪" : "¡Muy fuerte! Un poco menos 😅";
            busy = false; throwBtn.disabled = false; return;
          }
          const r = ctx.attempt(i);
          fb.style.transition = "opacity .5s"; setTimeout(() => { fb.style.opacity = 0; }, 350); setTimeout(() => fb.remove(), 900);
          if (r.ignored) { busy = false; return; }
          const bk = baskets[i];
          if (r.ok) {
            bk.classList.add("swish"); ctx.sfx("pop"); ctx.burst(stage, br.x, br.y, ["⭐", "✨", "🎉"], 12); ctx.floatText(stage, br.x, br.y + 30, "+" + r.points);
            msg.textContent = "¡Canasta! 🎉"; lock();
          } else {
            bk.classList.remove("sel"); bk.classList.add("wrong"); bk.disabled = true; ctx.sfx("bad"); sel = null;
            msg.textContent = "Esa no era… elige otra canasta.";
            if (r.over) { baskets[q.correcta].classList.add("reveal"); lock(); }
          }
          busy = false;
        }
      });
    }
    baskets.forEach((b, i) => b.addEventListener("click", () => select(i), { signal: ctx.signal }));
    throwBtn.addEventListener("click", () => doThrow(false), { signal: ctx.signal });
    return { pick(i) { if (busy || ctx.done()) return; select(i); doThrow(true); }, destroy() { cancelAnimationFrame(raf); } };
  }
};

/* ---------- NIVEL 4 · Ruleta de palabras ---------- */
MODULES.ruleta = {
  rot: 0,   // la ruleta recuerda su ángulo entre preguntas
  mount(stage, ctx) {
    const self = this, n = WHEEL.length, stepDeg = 360 / n, R = 100;
    let svg = `<svg class="wheel" viewBox="-104 -104 208 208" role="img" aria-label="Ruleta con cinco categorías">`;
    WHEEL.forEach((c, i) => {
      const a1 = (i * stepDeg - stepDeg / 2) * Math.PI / 180, a2 = (i * stepDeg + stepDeg / 2) * Math.PI / 180;
      const p = v => v.toFixed(2);
      svg += `<path d="M0 0 L${p(R * Math.sin(a1))} ${p(-R * Math.cos(a1))} A${R} ${R} 0 0 1 ${p(R * Math.sin(a2))} ${p(-R * Math.cos(a2))} Z" fill="${c.color}" stroke="#fff" stroke-width="2.5"/>`;
      svg += `<g transform="rotate(${i * stepDeg})"><text x="0" y="-64" text-anchor="middle" font-size="22">${c.icon}</text><text x="0" y="-46" text-anchor="middle" font-size="9" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".4">${c.short}</text></g>`;
    });
    svg += `</svg>`;
    stage.innerHTML = `<div class="wheel-area"><div class="wheel-wrap"><div class="wheel-pointer"></div>${svg}<div class="wheel-hub" aria-hidden="true">⭐</div></div>
        <button class="btn btn-red btn-big spin-btn">🎡 Girar ruleta</button></div>
      <div class="wheel-side"><div class="wheel-cat" role="status">¡Pulsa «Girar ruleta»!</div><div class="opt-list"></div></div>`;
    const wheel = $(".wheel", stage), btn = $(".spin-btn", stage), cat = $(".wheel-cat", stage), list = $(".opt-list", stage);
    wheel.style.transform = `rotate(${self.rot}deg)`;
    let spinning = false, q = null;

    function spin() {
      if (spinning || q || ctx.done()) return;
      spinning = true; btn.disabled = true; ctx.sfx("spin");
      const s = Math.floor(Math.random() * n), jitter = rnd(-stepDeg * 0.3, stepDeg * 0.3);
      const target = -(s * stepDeg) + jitter, cur = ((self.rot % 360) + 360) % 360;
      const delta = (((target - cur) % 360) + 360) % 360, dur = ctx.reduced ? 0.8 : 3.8;
      self.rot += 360 * (ctx.reduced ? 1 : 5) + delta;
      wheel.style.transition = `transform ${dur}s cubic-bezier(.12,.7,.1,1)`;
      wheel.style.transform = `rotate(${self.rot}deg)`;
      if (!ctx.reduced) for (let k = 0; k < 16; k++) ctx.later(() => ctx.sfx("tick"), 150 * k + k * k * 9);
      ctx.later(() => landed(s), dur * 1000 + 150);
    }
    function landed(s) {
      const c = WHEEL[s];
      cat.textContent = `${c.icon} ${c.label}`; cat.classList.add("on"); ctx.sfx("star");
      q = ctx.pickQuestion(c.cats);
      list.innerHTML = q.opciones.map((o, i) => `<button class="opt-card" style="--i:${i}" data-i="${i}"><span class="letter">${LETTERS[i]}</span><span>${esc(o.t)}</span></button>`).join("");
      $$(".opt-card", list).forEach(b => b.addEventListener("click", () => answer(+b.dataset.i), { signal: ctx.signal }));
      stage.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function answer(i) {
      if (!q || ctx.done()) return;
      const r = ctx.attempt(i); if (r.ignored) return;
      const cards = $$(".opt-card", list), el = cards[i], c = centerIn(el, stage);
      if (r.ok) {
        el.classList.add("right"); ctx.sfx("pop"); ctx.burst(stage, c.x, c.y, ["⭐", "✨", "🎉"], 12); ctx.floatText(stage, c.x, c.y - 20, "+" + r.points);
        cards.forEach(b => { b.disabled = true; });
      } else {
        el.classList.add("wrong"); el.disabled = true; ctx.sfx("bad");
        if (r.over) { cards[q.correcta].classList.add("reveal"); cards.forEach(b => { b.disabled = true; }); }
      }
    }
    btn.addEventListener("click", spin, { signal: ctx.signal });
    return { pick(i) { answer(i); }, destroy() { } };
  }
};

/* ---------- NIVEL 5 · Derriba las latas ---------- */
MODULES.latas = {
  mount(stage, ctx) {
    const q = ctx.q();
    const can = i => `<button class="can" data-i="${i}" aria-label="Lata ${LETTERS[i]}: ${esc(q.opciones[i].t)}"><span class="can-arrow">▼</span>
      <span class="can-body"><span class="can-label"><span class="can-word" data-len="${lenClass(q.opciones[i].t)}">${esc(q.opciones[i].t)}</span></span></span></button>`;
    stage.innerHTML = `<div class="fence"></div>
      <div class="pyramid"><div class="row">${can(3)}</div><div class="row">${can(0)}${can(1)}${can(2)}</div></div>
      <div class="table"></div>
      <div class="thrower"><span class="ball" aria-hidden="true">⚾</span><button class="btn btn-red throw-btn" disabled>¡Lanzar!</button></div>
      <div class="fly-layer"></div>`;
    const cans = [0, 1, 2, 3].map(i => $(`.can[data-i="${i}"]`, stage)), throwBtn = $(".throw-btn", stage), ball = $(".ball", stage);
    let sel = null, busy = false;
    const lock = () => { cans.forEach(c => { c.disabled = true; }); throwBtn.disabled = true; };
    function select(i) {
      if (busy || ctx.done() || cans[i].disabled) return;
      sel = i; ctx.sfx("click"); cans.forEach((c, k) => c.classList.toggle("sel", k === i)); throwBtn.disabled = false;
    }
    function doThrow() {
      if (busy || sel === null || ctx.done()) return;
      busy = true; throwBtn.disabled = true; ctx.sfx("throw");
      const i = sel, from = centerIn(ball, stage), to = centerIn(cans[i], stage);
      flyBall(stage, "⚾", from, to, {
        apex: 40, dur: 650,
        onEnd: fb => {
          fb.remove();
          const r = ctx.attempt(i);
          if (r.ignored) { busy = false; return; }
          if (r.ok) {
            // ¡Todas las latas caen!
            cans.forEach((c, k) => { c.style.setProperty("--dx", rnd(-40, 40) + "px"); c.style.setProperty("--rot", rnd(-260, 260) + "deg"); c.style.setProperty("--k", k); c.classList.remove("sel"); c.classList.add("fall"); });
            ctx.sfx("pop"); ctx.burst(stage, to.x, to.y, ["⭐", "💥", "✨"], 14); ctx.floatText(stage, to.x, to.y - 30, "+" + r.points);
            lock();
          } else {
            cans[i].classList.remove("sel"); cans[i].classList.add("wrong"); cans[i].disabled = true; ctx.sfx("bad"); sel = null;
            if (r.over) { cans[q.correcta].classList.add("reveal"); lock(); }
          }
          busy = false;
        }
      });
    }
    cans.forEach((c, i) => c.addEventListener("click", () => select(i), { signal: ctx.signal }));
    throwBtn.addEventListener("click", doThrow, { signal: ctx.signal });
    return { pick(i) { if (busy || ctx.done()) return; select(i); doThrow(); }, destroy() { } };
  }
};

/* ---------- NIVEL 6 · Pesca de palabras ---------- */
MODULES.peces = {
  mount(stage, ctx) {
    const q = ctx.q(), cols = shuffle(["#ff7f50", "#ff4d8d", "#8e6cff", "#2ec4b6", "#ff9f1c", "#4d96ff"]).slice(0, 4);
    stage.innerHTML = `<div class="water"></div><div class="lily l1"></div><div class="lily l2"></div><div class="reeds"></div>
      ${q.opciones.map((o, i) => `<button class="fish" style="--c:${cols[i]}" data-i="${i}" aria-label="Pez ${LETTERS[i]}: ${esc(o.t)}">
        <span class="fish-shape"><i class="tail"></i><i class="body"></i><i class="eye"></i></span><span class="fish-word" data-len="${lenClass(o.t)}">${esc(o.t)}</span></button>`).join("")}
      <div class="line-layer"></div>
      <div class="dock"><span class="fisher" aria-hidden="true">🧑‍🌾</span><span class="rod"></span></div>`;
    const els = $$(".fish", stage), layer = $(".line-layer", stage), rod = $(".rod", stage);
    const W0 = stage.clientWidth || 600, H0 = stage.clientHeight || 400;
    const gap = Math.max(40, (H0 - 8 - 120 - 62) / 3);
    const F = els.map((el, i) => ({
      el, i, shape: $(".fish-shape", el), x: rnd(0, Math.max(10, W0 - 150)), y0: 8 + i * gap, v: (i % 2 ? -1 : 1) * ctx.speed * rnd(0.9, 1.3),
      ph: rnd(0, 6), w: 130, h: 62, frozen: false, dead: false, t: 0
    }));
    let stopped = false, busy = false, raf = 0, last = performance.now();
    function place(f) { f.el.style.transform = `translate(${f.x}px,${f.y0 + Math.sin(f.t * 1.6 + f.ph) * 7}px)`; f.shape.classList.toggle("left", f.v < 0); }
    function step(dt) {
      const W = stage.clientWidth;
      F.forEach(f => {
        f.w = f.el.offsetWidth || 130; f.h = f.el.offsetHeight || 62;
        if (f.frozen || f.dead) return;
        f.t += dt; f.x += f.v * dt;
        if (f.x < 0) { f.x = 0; f.v = Math.abs(f.v); }
        if (f.x + f.w > W) { f.x = W - f.w; f.v = -Math.abs(f.v); }
        place(f);
      });
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!ctx.paused() && !stopped) step(dt);
    }
    step(0); F.forEach(place); raf = requestAnimationFrame(loop);

    function tipPos() {
      const sr = stage.getBoundingClientRect(), rr = rod.getBoundingClientRect();
      return { x: rr.right - sr.left - 2, y: rr.top - sr.top + 2 };
    }
    function cast(i) {
      const f = F[i];
      if (busy || ctx.done() || f.dead) return;
      busy = true; f.frozen = true; ctx.sfx("throw");
      const tip = tipPos(), fc = centerIn(f.el, stage);
      const dx = fc.x - tip.x, dy = fc.y - tip.y, dist = Math.hypot(dx, dy), ang = Math.atan2(-dx, dy) * 180 / Math.PI;
      const line = h("div", "fish-line"); line.style.left = tip.x + "px"; line.style.top = tip.y + "px";
      line.style.height = "0px"; line.style.transform = `rotate(${ang}deg)`; layer.appendChild(line);
      requestAnimationFrame(() => requestAnimationFrame(() => { line.style.height = dist + "px"; }));
      ctx.later(() => {
        const r = ctx.attempt(i);
        if (r.ignored) { line.remove(); f.frozen = false; busy = false; return; }
        line.style.transition = "height .8s ease-in"; line.style.height = "0px";
        if (r.ok) {
          f.dead = true; f.el.classList.add("gold"); ctx.sfx("splash"); ctx.golden();
          f.el.style.transition = "transform .8s ease-in"; f.el.style.transform = `translate(${tip.x - f.w / 2}px,${tip.y - f.h / 2}px)`;
          ctx.burst(stage, fc.x, fc.y, ["✨", "🪙", "⭐"], 12); ctx.floatText(stage, fc.x, fc.y - 30, `+${r.points} · 🪙+${CONFIG.coins.goldenFish}`);
          stopped = true; els.forEach(e => { e.disabled = true; });
        } else {
          f.dead = true; f.el.classList.add("escape"); f.el.disabled = true; ctx.sfx("bad");
          if (r.over) { stopped = true; els[q.correcta].classList.add("reveal"); els.forEach(e => { e.disabled = true; }); }
        }
        setTimeout(() => line.remove(), 900);
        busy = false;
      }, 340);
    }
    els.forEach((el, i) => el.addEventListener("click", () => cast(i), { signal: ctx.signal }));
    return { pick: cast, destroy() { cancelAnimationFrame(raf); } };
  }
};

/* =====================================================================
   9. PANTALLAS, MAPA, MODALES Y RESULTADOS
   ===================================================================== */
function showScreen(name) {
  currentScreen = name;
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
  window.scrollTo(0, 0);
  if (name === "map") renderMap();
  if (name === "results") renderResults();
  if (name === "diploma") renderDiploma();
  renderStats();
  const head = $(`#screen-${name} h1, #screen-${name} h2`);
  if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
}

function renderStats() {
  const t = totals(), pct = Math.round((t.done / LEVELS.length) * 100);
  $$("[data-stat='score']").forEach(e => { e.textContent = t.score; });
  $$("[data-stat='coins']").forEach(e => { e.textContent = t.coins; });
  $$("[data-stat='stars']").forEach(e => { e.textContent = t.stars; });
  $$("[data-stat='done']").forEach(e => { e.textContent = t.done; });
  $$("[data-progress]").forEach(e => e.setAttribute("aria-valuenow", pct));
  $$("[data-progress-fill]").forEach(e => { e.style.width = pct + "%"; });
  $$("[name='difficulty']").forEach(r => { r.checked = r.value === SAVE.difficulty; });
  const sel = $("#map-difficulty"); if (sel) sel.value = SAVE.difficulty;
  renderSoundButtons();
}
function renderSoundButtons() {
  $$("[data-action='toggle-sound']").forEach(b => {
    b.setAttribute("aria-pressed", String(Sound.on));
    if (b.classList.contains("btn-icon") || b.textContent.trim().length <= 3) b.textContent = Sound.on ? "🔊" : "🔇";
    else b.textContent = Sound.on ? "🔊 Sonido" : "🔇 Sin sonido";
  });
}
function toggleSound() { Sound.on = !Sound.on; SAVE.sound = Sound.on; persist(); renderSoundButtons(); if (Sound.on) Sound.play("click"); }

function renderMap() {
  $("#map-grid").innerHTML = LEVELS.map(L => {
    const rec = SAVE.levels[L.id] || {}, unlocked = isUnlocked(L.id), st = rec.stars || 0;
    const stars = [1, 2, 3].map(k => `<span class="${k <= st ? "" : "off"}">⭐</span>`).join("");
    const state = !unlocked ? "🔒 Bloqueado" : rec.completed ? "✅ Completado" : "🎟️ ¡Disponible!";
    return `<button class="booth ${L.final ? "final" : ""} ${unlocked ? "" : "locked"}" style="--c:${L.color}" data-level="${L.id}" ${unlocked ? "" : "disabled"}
      aria-label="Puesto ${L.id}: ${esc(L.name)}. ${st} de 3 estrellas. ${state.replace(/[^\p{L}\s]/gu, "")}">
      <span class="b-num">Puesto ${L.id}</span><span class="b-icon" aria-hidden="true">${unlocked ? L.icon : "🔒"}</span>
      <span class="b-name">${esc(L.name)}</span><span class="b-stars" aria-hidden="true">${stars}</span>
      <span class="b-best">${rec.score ? "Mejor: " + rec.score + " pts" : "Sin jugar aún"}</span><span class="b-state">${state}</span></button>`;
  }).join("");
}

function openIntro(id) {
  const L = LEVELS[id - 1], D = CONFIG.difficulty[SAVE.difficulty], rec = SAVE.levels[id] || {};
  const total = L.final ? CONFIG.finalQuestions : CONFIG.questionsPerLevel;
  const timePick = L.final ? `<div class="time-pick"><label for="final-time">⏱️ Tiempo límite:</label><select id="final-time">${CONFIG.finalTimes.map(s => `<option value="${s}" ${s === SAVE.finalTime ? "selected" : ""}>${s >= 60 ? s / 60 + " min" : s + " s"}</option>`.replace(">" + (s / 60) + " min", ">" + (s % 60 === 0 ? s / 60 + " min" : s + " s"))).join("")}</select></div>` : "";
  openModal(`<div class="modal-icon">${L.icon}</div><h2 id="modal-title">Puesto ${L.id}: ${esc(L.name)}</h2>
    <div class="modal-body"><p>${L.story}</p><p><b>Cómo se juega:</b> ${L.how}</p>
      <p><span class="diff-pill">${D.label}</span> ${total} preguntas · ${D.attempts} oportunidades por pregunta</p>${timePick}
      ${rec.score ? `<p>🏅 Tu mejor puntaje: <b>${rec.score}</b> · ${"⭐".repeat(rec.stars || 0) || "sin estrellas"}</p>` : ""}</div>
    <div class="btn-row"><button class="btn btn-green btn-big" data-act="play" data-level="${id}">¡Jugar!</button><button class="btn btn-ghost" data-act="close">Volver</button></div>`);
}

function renderResults() {
  const t = totals();
  $("#results-body").innerHTML = LEVELS.map(L => {
    const r = SAVE.levels[L.id] || {};
    return `<tr><td>${L.icon} ${esc(L.name)}</td><td>${[1, 2, 3].map(k => (k <= (r.stars || 0) ? "⭐" : "☆")).join("")}</td><td>${r.score || 0}</td><td>${r.coins || 0}</td></tr>`;
  }).join("");
  $("#badges").innerHTML = BADGES.map(b => `<div class="badge ${SAVE.badges[b.id] ? "" : "off"}"><span class="b-ico" aria-hidden="true">${b.icon}</span><div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div></div>`).join("");
  const all = t.done >= LEVELS.length;
  $("#btn-diploma").disabled = !all;
  $("#diploma-note").textContent = all ? "¡Completaste toda la feria! Tu diploma está listo." : `Completa los ${LEVELS.length} puestos para desbloquear tu diploma (llevas ${t.done}).`;
}
function renderDiploma() {
  $("#student-name").value = SAVE.name || "";
  $("#dip-name").textContent = SAVE.name.trim() || "Estudiante de quechua";
  $("#dip-date").textContent = new Date().toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });
}

/* ---------- Ventana modal ---------- */
let modalCancel = null;
function openModal(html, opts = {}) {
  const m = $("#modal");
  m.innerHTML = `<div class="modal-card ${opts.cls || ""}">${html}</div>`;
  modalCancel = opts.onCancel || null;
  if (!m.open) m.showModal();
}
function closeModal() { const m = $("#modal"); if (m.open) m.close(); modalCancel = null; }

function confirmReset() {
  openModal(`<div class="modal-icon">🗑️</div><h2 id="modal-title">¿Reiniciar todos los datos?</h2>
    <div class="modal-body center"><p>Se borrarán tus puntos, monedas, estrellas e insignias de este navegador. Esta acción no se puede deshacer.</p></div>
    <div class="btn-row"><button class="btn btn-red" data-act="do-reset">Sí, borrar todo</button><button class="btn btn-ghost btn-big" data-act="close">Cancelar</button></div>`);
}
function resetData() {
  if (G) { stopTimer(); destroyStage(); clearTimers(); G.finished = true; }
  SAVE = defaultSave(); Sound.on = true; persist(); closeModal(); showScreen("welcome"); toast("Datos reiniciados", "ok");
}

const MODAL_ACTIONS = {
  close: () => closeModal(),
  play: b => startLevel(+b.dataset.level),
  map: () => { closeModal(); showScreen("map"); },
  results: () => { closeModal(); showScreen("results"); },
  resume: () => resumeGame(),
  restart: () => { const id = G.level.id; resumeGame(); startLevel(id); },
  quit: () => leaveGame(),
  sound: () => { toggleSound(); closeModal(); G.paused = false; pauseGame(); },
  "do-reset": () => resetData()
};

/* =====================================================================
   10. EVENTOS GLOBALES E INICIO
   ===================================================================== */
function buildLights() {
  const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#ff4d8d"];
  $$("[data-lights]").forEach(box => {
    box.innerHTML = Array.from({ length: 34 }, (_, i) => `<i style="--c:${colors[i % 5]};--d:${(i % 7) * -0.25}s"></i>`).join("");
  });
}

function init() {
  Sound.on = SAVE.sound !== false;
  const issues = validateBank();
  if (issues.length) console.warn("Banco de preguntas con problemas:", issues);
  buildLights(); renderStats();

  // Navegación con data-go y acciones con data-action
  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) { Sound.play("click"); showScreen(go.dataset.go); return; }
    const act = e.target.closest("[data-action]");
    if (act) {
      Sound.play("click");
      if (act.dataset.action === "toggle-sound") toggleSound();
      if (act.dataset.action === "reset-data") confirmReset();
    }
  });
  $("#btn-start").addEventListener("click", () => { Sound.play("click"); showScreen("map"); });
  $("#btn-howto").addEventListener("click", () => { Sound.play("click"); showScreen("howto"); });
  $("#btn-results").addEventListener("click", () => showScreen("results"));
  $("#btn-diploma").addEventListener("click", () => showScreen("diploma"));
  $("#btn-print").addEventListener("click", () => window.print());
  $("#student-name").addEventListener("input", e => { SAVE.name = e.target.value; $("#dip-name").textContent = SAVE.name.trim() || "Estudiante de quechua"; persist(); });

  $$("[name='difficulty']").forEach(r => r.addEventListener("change", () => { SAVE.difficulty = r.value; persist(); renderStats(); }));
  $("#map-difficulty").addEventListener("change", e => { SAVE.difficulty = e.target.value; persist(); renderStats(); });
  $("#map-grid").addEventListener("click", e => {
    const b = e.target.closest(".booth"); if (!b || b.disabled) return;
    Sound.play("click"); openIntro(+b.dataset.level);
  });

  // Juego
  $("#btn-pause").addEventListener("click", pauseGame);
  $("#btn-next").addEventListener("click", continueGame);
  $("#a11y-options").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]"); if (!b || !G || G.paused || G.fbOpen) return;
    if (G.api && G.api.pick) G.api.pick(+b.dataset.i);
  });

  // Modal
  const modal = $("#modal");
  modal.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && MODAL_ACTIONS[b.dataset.act]) { Sound.play("click"); MODAL_ACTIONS[b.dataset.act](b); } });
  modal.addEventListener("change", e => { if (e.target.id === "final-time") { SAVE.finalTime = +e.target.value; persist(); } });
  modal.addEventListener("cancel", e => { e.preventDefault(); if (modalCancel) modalCancel(); else closeModal(); });

  // Teclado: Esc/P pausa · M sonido · 1-4 responden (modo accesible)
  document.addEventListener("keydown", e => {
    if (e.target.matches && e.target.matches("input, select, textarea")) return;
    if (e.ctrlKey || e.metaKey || e.altKey || $("#modal").open) return;
    const k = e.key.toLowerCase();
    if (k === "m") { toggleSound(); return; }
    if (!G || currentScreen !== "game" || G.finished) return;
    if (k === "escape" || k === "p") { pauseGame(); return; }
    if (["1", "2", "3", "4"].includes(k) && !G.paused && !G.fbOpen && G.api && G.api.pick) G.api.pick(+k - 1);
  });
  // Pausa automática si se cambia de pestaña
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}
