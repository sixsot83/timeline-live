
// 1. CONFIGURACIÓN DE FIREBASE (¡DEBE SER LA MISMA QUE EN INSTRUCTOR!)
// ============================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJwA-Uaqh8DI23ejLlqF3aKTJEj5jpI7Y",
  authDomain: "timelive-live.firebaseapp.com",
  databaseURL: "https://timelive-live-default-rtdb.firebaseio.com",
  projectId: "timelive-live",
  storageBucket: "timelive-live.firebasestorage.app",
  messagingSenderId: "873551485156",
  appId: "1:873551485156:web:a6029d22ccf7083729f4f1",
  measurementId: "G-83TGB00S6J"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variables globales
let currentScore = 0;
let timerInterval;

// ============================================================
// Unirse al juego
// ============================================================
function joinGame() {
    const name = document.getElementById('student-name').value;
    if(!name) {
        alert("Por favor ingresa tu nombre");
        return;
    }

    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    loadQuestion();
}

// ============================================================
// Cargar pregunta (por ahora estática, luego puedes hacerla dinámica)
// ============================================================
function loadQuestion() {
    document.getElementById('event-badge').innerText = "Fase 1 - Análisis";
    document.getElementById('question-text').innerText = "¿Cuál es el objetivo principal de la Fase de Análisis?";

    const options = [
        "Comprender y documentar requerimientos",
        "Escribir código de programación en Java",
        "Desplegar en producción"
    ];

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = `opt-btn opt-${idx}`;
        btn.innerText = opt;
        btn.onclick = () => selectAnswer(idx);
        container.appendChild(btn);
    });

    startTimer(30);
}

// ============================================================
// Temporizador
// ============================================================
function startTimer(seconds) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('timer-display');
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            selectAnswer(-1);
        }
    }, 1000);
}

// ============================================================
// 2. GUARDAR RESPUESTA EN FIREBASE (función modificada)
// ============================================================
function selectAnswer(index) {
    clearInterval(timerInterval);
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    // Obtener activityId de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('activityId') || 'default_session';
    const studentName = document.getElementById('student-name').value;

    const isCorrect = (index === 0);
    const points = isCorrect ? 1000 : 0;

    // Clave única por estudiante (sin espacios)
    const studentKey = studentName.replace(/\s+/g, '_');

    // Guardar/actualizar en Firebase
    database.ref(`sessions/${activityId}/players/${studentKey}`).set({
        name: studentName,
        score: points,
        correct: isCorrect ? 1 : 0,
        incorrect: isCorrect ? 0 : 1,
        answeredAt: new Date().toISOString()
    }).then(() => {
        console.log("Respuesta guardada en Firebase");
    }).catch((error) => {
        console.error("Error al guardar respuesta:", error);
    });

    // Mostrar feedback al estudiante
    if (isCorrect) {
        document.getElementById('feedback-title').innerText = "¡Correcto! 👏";
        document.getElementById('feedback-icon').innerText = "✅";
    } else {
        document.getElementById('feedback-title').innerText = "¡Incorrecto! ❌";
        document.getElementById('feedback-icon').innerText = "⚠️";
    }
}