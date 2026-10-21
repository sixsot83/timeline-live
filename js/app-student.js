// CONFIGURACIÓN DE FIREBASE
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

let currentActivityId = null;
let currentStudentName = '';
let currentActivityData = null;
let timerInterval = null;
let transitionInterval = null;

const optionColors = ['opt-0', 'opt-1', 'opt-2', 'opt-0', 'opt-1', 'opt-2'];

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const actId = urlParams.get('activityId');
    const pin = urlParams.get('pin');

    if (actId) currentActivityId = actId;
    if (pin) document.getElementById('pin-input').value = pin;
};

// Unirse al juego
function joinGame() {
    const pin = document.getElementById('pin-input').value.trim();
    const name = document.getElementById('student-name').value.trim();

    if (!name) {
        alert("Por favor ingresa tu nombre y apellido");
        return;
    }

    currentStudentName = name;

    if (currentActivityId) {
        connectToSession(currentActivityId);
    } else {
        database.ref('activities').orderByChild('pin').equalTo(pin).once('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                currentActivityId = Object.keys(data)[0];
                connectToSession(currentActivityId);
            } else {
                alert("PIN no encontrado. Por favor verifica e intenta de nuevo.");
            }
        });
    }
}

// Conectar a la sesión y escuchar eventos en tiempo real del instructor
function connectToSession(actId) {
    const studentKey = currentStudentName.replace(/[\s.#$\[\]]/g, '_');
    
    // Inicializar registro del estudiante
    database.ref(`sessions/${actId}/players/${studentKey}`).update({
        name: currentStudentName,
        score: 0,
        correct: 0,
        incorrect: 0
    });

    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('waiting-lobby-screen').classList.remove('hidden');

    // Cargar estructura completa de la actividad
    database.ref('activities/' + actId).once('value', snapshot => {
        currentActivityData = snapshot.val();
    });

    // Escuchar cambios de evento o estado mandados por el instructor
    database.ref('sessions/' + actId).on('value', snapshot => {
        const sessionData = snapshot.val();
        if (!sessionData) return;

        if (sessionData.status === 'active') {
            const currentEventIdx = sessionData.currentEventIndex || 0;
            
            // Ocultar todas las pantallas intermedias
            document.getElementById('waiting-lobby-screen').classList.add('hidden');
            document.getElementById('transition-screen').classList.add('hidden');
            document.getElementById('feedback-screen').classList.add('hidden');
            document.getElementById('final-screen').classList.add('hidden');

            loadQuestion(currentEventIdx);
        } else if (sessionData.status === 'finished') {
            showFinalResults(actId, studentKey);
        }
    });
}

// Cargar la pregunta correspondiente al evento actual
function loadQuestion(eventIndex) {
    if (!currentActivityData || !currentActivityData.events) return;

    // Si pasamos del último evento, mostrar resultados finales
    if (eventIndex >= currentActivityData.events.length) {
        database.ref(`sessions/${currentActivityId}`).update({ status: 'finished' });
        return;
    }

    const event = currentActivityData.events[eventIndex];
    document.getElementById('event-badge').innerText = event.year || `Evento ${eventIndex + 1}`;
    document.getElementById('question-text').innerText = event.question;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    event.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = `opt-btn ${optionColors[idx % optionColors.length]}`;
        btn.innerText = optText;
        btn.onclick = () => selectAnswer(idx, event.correctIndex);
        container.appendChild(btn);
    });

    document.getElementById('game-screen').classList.remove('hidden');
    startTimer(currentActivityData.timer || 30, event.correctIndex);
}

// Temporizador de la pregunta activa
function startTimer(seconds, correctIndex) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('timer-display');
    timerEl.innerText = timeLeft;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            selectAnswer(-1, correctIndex); // Tiempo agotado
        }
    }, 1000);
}

// Registrar respuesta del estudiante
function selectAnswer(selectedIndex, correctIndex) {
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    const isCorrect = (selectedIndex === correctIndex);
    const points = isCorrect ? 1000 : 0;
    const studentKey = currentStudentName.replace(/[\s.#$\[\]]/g, '_');

    const playerRef = database.ref(`sessions/${currentActivityId}/players/${studentKey}`);
    playerRef.once('value').then(snapshot => {
        const currentData = snapshot.val() || {};
        const newScore = (currentData.score || 0) + points;
        const newCorrect = (currentData.correct || 0) + (isCorrect ? 1 : 0);
        const newIncorrect = (currentData.incorrect || 0) + (isCorrect ? 0 : 1);

        playerRef.update({
            score: newScore,
            correct: newCorrect,
            incorrect: newIncorrect,
            lastAnsweredAt: new Date().toISOString()
        });
    });

    if (isCorrect) {
        document.getElementById('feedback-title').innerText = "¡Correcto! 👏";
        document.getElementById('feedback-icon').innerText = "✅";
    } else {
        document.getElementById('feedback-title').innerText = "¡Incorrecto! ❌";
        document.getElementById('feedback-icon').innerText = "⚠️";
    }
}

// Mostrar pantalla con puntuación total y posición final calculada del ranking
function showFinalResults(actId, studentKey) {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.add('hidden');
    document.getElementById('waiting-lobby-screen').classList.add('hidden');
    document.getElementById('transition-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.remove('hidden');

    database.ref(`sessions/${actId}/players`).once('value', snapshot => {
        const playersObj = snapshot.val() || {};
        let playersArray = Object.keys(playersObj).map(key => playersObj[key]);

        // Ordenar de mayor a menor puntuación
        playersArray.sort((a, b) => (b.score || 0) - (a.score || 0));

        let myScore = 0;
        let myRank = 1;

        playersArray.forEach((p, index) => {
            if (p.name === currentStudentName) {
                myScore = p.score || 0;
                myRank = index + 1;
            }
        });

        document.getElementById('final-score').innerText = `${myScore} pts`;
        document.getElementById('final-position').innerText = `#${myRank} de ${playersArray.length} participantes`;
    });
}
