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
let lastProcessedEventIndex = -1;
let hasAnsweredCurrent = false;

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

// Conectar a la sesión y escuchar en tiempo real
function connectToSession(actId) {
    const studentKey = currentStudentName.replace(/[\s.#$\[\]]/g, '_');
    
    database.ref(`sessions/${actId}/players/${studentKey}`).update({
        name: currentStudentName,
        score: 0,
        correct: 0,
        incorrect: 0
    });

    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('waiting-lobby-screen').classList.remove('hidden');

    database.ref('activities/' + actId).once('value', snapshot => {
        currentActivityData = snapshot.val();
    });

    database.ref('sessions/' + actId).on('value', snapshot => {
        const sessionData = snapshot.val();
        if (!sessionData) return;

        if (sessionData.status === 'active') {
            const currentEventIdx = sessionData.currentEventIndex !== undefined ? sessionData.currentEventIndex : 0;
            
            if (currentEventIdx !== lastProcessedEventIndex) {
                lastProcessedEventIndex = currentEventIdx;
                hasAnsweredCurrent = false;
                loadQuestion(currentEventIdx);
            }
        } else if (sessionData.status === 'finished') {
            showFinalResults(actId);
        }
    });
}

// Cargar la pregunta del evento actual
function loadQuestion(eventIndex) {
    if (!currentActivityData || !currentActivityData.events) return;

    if (eventIndex >= currentActivityData.events.length) {
        database.ref(`sessions/${currentActivityId}`).update({ status: 'finished' });
        return;
    }

    const event = currentActivityData.events[eventIndex];
    
    document.getElementById('waiting-lobby-screen').classList.add('hidden');
    document.getElementById('transition-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    document.getElementById('event-badge').innerText = event.year || `Evento ${eventIndex + 1}`;
    document.getElementById('question-text').innerText = event.question;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    event.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = `opt-btn ${optionColors[idx % optionColors.length]}`;
        btn.innerText = optText;
        btn.onclick = () => selectAnswer(idx, event.correctIndex, eventIndex);
        container.appendChild(btn);
    });

    startTimer(currentActivityData.timer || 30, event.correctIndex, eventIndex);
}

// Temporizador de cuenta regresiva
function startTimer(seconds, correctIndex, eventIndex) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('timer-display');
    timerEl.innerText = timeLeft;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (!hasAnsweredCurrent) {
                selectAnswer(-1, correctIndex, eventIndex, true);
            } else {
                showFeedbackAfterTimer(correctIndex, eventIndex);
            }
        }
    }, 1000);
}

// Registrar respuesta y esperar el tiempo restante
function selectAnswer(selectedIndex, correctIndex, eventIndex, isTimeout = false) {
    if (hasAnsweredCurrent && !isTimeout) return;
    hasAnsweredCurrent = true;

    const isCorrect = (!isTimeout && selectedIndex === correctIndex);
    const points = isCorrect ? 1000 : 0;
    const studentKey = currentStudentName.replace(/[\s.#$\[\]]/g, '_');

    const playerRef = database.ref(`sessions/${currentActivityId}/players/${studentKey}`);
    playerRef.once('value').then(snapshot => {
        const currentData = snapshot.val() || {};
        const newScore = (currentData.score || 0) + points;
        const newCorrect = (currentData.correct || 0) + (isCorrect ? 1 : 0);
        const newIncorrect = (currentData.incorrect || 0) + (!isCorrect && !isTimeout ? 1 : 0);

        playerRef.update({
            score: newScore,
            correct: newCorrect,
            incorrect: newIncorrect,
            lastAnsweredAt: new Date().toISOString()
        });
    });

    // Ocultar opciones y mostrar pantalla de espera hasta que el timer acabe
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    if (isTimeout) {
        document.getElementById('feedback-title').innerText = "¡Tiempo Agotado! ⏰";
        document.getElementById('feedback-icon').innerText = "⌛";
    } else {
        document.getElementById('feedback-title').innerText = "¡Respuesta Registrada! 📝";
        document.getElementById('feedback-icon').innerText = "⏳";
        document.getElementById('feedback-title').innerText = isCorrect ? "¡Correcto! 👏 (+1000 pts)" : "¡Respuesta Guardada!";
    }

    // Si está en modo manual, o si el timer ya acabó, avanzar según corresponda
}

function showFeedbackAfterTimer(correctIndex, eventIndex) {
    // Mostrar feedback final de la pregunta y programar avance automático (si es modo auto)
    setTimeout(() => {
        const controlMode = currentActivityData.controlMode || 'auto';
        if (controlMode === 'auto') {
            const nextEventIndex = eventIndex + 1;
            database.ref(`sessions/${currentActivityId}`).update({
                currentEventIndex: nextEventIndex
            });
        }
    }, 2000);
}

// Mostrar resultados finales
function showFinalResults(actId) {
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.add('hidden');
    document.getElementById('waiting-lobby-screen').classList.add('hidden');
    document.getElementById('transition-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.remove('hidden');

    database.ref(`sessions/${actId}/players`).once('value', snapshot => {
        const playersObj = snapshot.val() || {};
        let playersArray = Object.keys(playersObj).map(key => playersObj[key]);

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


// Animacion lluvia o explosion
function showFeedbackAfterTimer(correctIndex, eventIndex) {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });
    }

    setTimeout(() => {
        const controlMode = currentActivityData.controlMode || 'auto';
        if (controlMode === 'auto') {
            const nextEventIndex = eventIndex + 1;
            database.ref(`sessions/${currentActivityId}`).update({
                currentEventIndex: nextEventIndex
            });
        }
    }, 2000);
}