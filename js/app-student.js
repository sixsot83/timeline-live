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
let currentSessionMode = 'automatic';
let timerInterval = null;
let lastProcessedEventIndex = -1;
let currentSecondsLeft = 0;
let maxEventSeconds = 30;

const optionColors = ['opt-0', 'opt-1', 'opt-2', 'opt-0', 'opt-1', 'opt-2'];

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const actId = urlParams.get('activityId');
    const pin = urlParams.get('pin');

    if (actId) currentActivityId = actId;
    if (pin) document.getElementById('pin-input').value = pin;
};

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

function connectToSession(actId) {
    const studentKey = currentStudentName.replace(/[\s.#$\[\]]/g, '_');
    
    database.ref(`sessions/${actId}/players/${studentKey}`).update({
        name: currentStudentName,
        score: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        totalTime: 0
    });

    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('waiting-lobby-screen').classList.remove('hidden');

    database.ref('activities/' + actId).once('value', snapshot => {
        currentActivityData = snapshot.val();
    });

    database.ref('sessions/' + actId).on('value', snapshot => {
        const sessionData = snapshot.val();
        if (!sessionData) return;

        currentSessionMode = sessionData.mode || 'automatic';

        if (sessionData.status === 'active') {
            const currentEventIdx = sessionData.currentEventIndex !== undefined ? sessionData.currentEventIndex : 0;
            
            if (currentEventIdx !== lastProcessedEventIndex) {
                lastProcessedEventIndex = currentEventIdx;
                loadQuestion(currentEventIdx);
            }
        } else if (sessionData.status === 'finished') {
            showFinalResults(actId, studentKey);
        }
    });
}

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

    maxEventSeconds = currentActivityData.timer || 30;
    startTimer(maxEventSeconds, event.correctIndex, eventIndex);
}

function startTimer(seconds, correctIndex, eventIndex) {
    currentSecondsLeft = seconds;
    const timerEl = document.getElementById('timer-display');
    timerEl.innerText = currentSecondsLeft;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        currentSecondsLeft--;
        timerEl.innerText = currentSecondsLeft;
        if (currentSecondsLeft <= 0) {
            clearInterval(timerInterval);
            selectAnswer(-1, correctIndex, eventIndex, true);
        }
    }, 1000);
}

// Ponderación de puntuación según velocidad
function selectAnswer(selectedIndex, correctIndex, eventIndex, isTimeout = false) {
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    const isCorrect = (!isTimeout && selectedIndex === correctIndex);
    const timeTaken = Math.max(1, maxEventSeconds - currentSecondsLeft);

    // Puntuación ponderada por tiempo (entre 500 y 1000 pts)
    let points = 0;
    if (isCorrect) {
        const timeRatio = currentSecondsLeft / maxEventSeconds;
        points = Math.round(500 + (timeRatio * 500));
    }

    const studentKey = currentStudentName.replace(/[\s.#$\[\]]/g, '_');
    const playerRef = database.ref(`sessions/${currentActivityId}/players/${studentKey}`);

    playerRef.once('value').then(snapshot => {
        const currentData = snapshot.val() || {};
        const newScore = (currentData.score || 0) + points;
        const newCorrect = (currentData.correct || 0) + (isCorrect ? 1 : 0);
        const newIncorrect = (currentData.incorrect || 0) + (!isCorrect && !isTimeout ? 1 : 0);
        const newUnanswered = (currentData.unanswered || 0) + (isTimeout ? 1 : 0);
        const newTotalTime = (currentData.totalTime || 0) + (isTimeout ? maxEventSeconds : timeTaken);

        playerRef.update({
            score: newScore,
            correct: newCorrect,
            incorrect: newIncorrect,
            unanswered: newUnanswered,
            totalTime: newTotalTime,
            lastAnsweredAt: new Date().toISOString()
        });
    });

    if (isTimeout) {
        document.getElementById('feedback-title').innerText = "¡Tiempo Agotado! ⏰";
        document.getElementById('feedback-icon').innerText = "⌛";
    } else if (isCorrect) {
        document.getElementById('feedback-title').innerText = `¡Correcto! 👏 (+${points} pts)`;
        document.getElementById('feedback-icon').innerText = "✅";
    } else {
        document.getElementById('feedback-title').innerText = "¡Incorrecto! ❌";
        document.getElementById('feedback-icon').innerText = "⚠️";
    }

    if (currentSessionMode === 'automatic') {
        document.getElementById('feedback-msg').innerText = "Esperando la siguiente pregunta automáticamente...";
        setTimeout(() => {
            const nextEventIndex = eventIndex + 1;
            if (currentActivityData && currentActivityData.events && nextEventIndex < currentActivityData.events.length) {
                database.ref(`sessions/${currentActivityId}`).update({ currentEventIndex: nextEventIndex });
            } else {
                database.ref(`sessions/${currentActivityId}`).update({ status: 'finished' });
            }
        }, 3000);
    } else {
        document.getElementById('feedback-msg').innerText = "Respuesta registrada. Esperando a que el instructor avance...";
    }
}

function showFinalResults(actId, studentKey) {
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.add('hidden');
    document.getElementById('waiting-lobby-screen').classList.add('hidden');
    document.getElementById('transition-screen').classList.add('hidden');
    document.getElementById('final-screen').classList.remove('hidden');

    database.ref(`sessions/${actId}/players`).once('value', snapshot => {
        const playersObj = snapshot.val() || {};
        let playersArray = Object.keys(playersObj).map(key => playersObj[key]);

        playersArray.sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
            }
            return (a.totalTime || 0) - (b.totalTime || 0);
        });

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