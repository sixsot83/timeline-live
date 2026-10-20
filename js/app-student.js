let activityId = null;
let studentName = "";
let studentKey = "";
let currentEventIndex = 0;
let questionStartTime = 0;
let timerInterval = null;
let questionTimer = 30;
let correctIndex = 0;
let answeredCurrent = false;
let totalEvents = 0;

// ===== Unirse =====
function joinGame() {
    const nameInput = document.getElementById('student-name').value;
    if (!nameInput.trim()) {
        alert("Ingresa tu nombre para continuar.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    activityId = urlParams.get('activityId');
    if (!activityId) {
        alert("❌ Enlace inválido. Falta el parámetro activityId.");
        return;
    }

    studentName = nameInput.trim();
    studentKey = studentName.replace(/\s+/g, '_').replace(/[.#$\[\]\/]/g, '');

    document.getElementById('display-student-name').innerText = studentName;
    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('wait-screen').classList.remove('hidden');

    // Registrar jugador
    database.ref(`sessions/${activityId}/players/${studentKey}`).update({
        name: studentName,
        score: 0,
        correct: 0,
        incorrect: 0,
        answered: 0,
        totalTime: 0
    });

    // Escuchar estado de la sesión
    database.ref(`sessions/${activityId}/status`).on('value', (snap) => {
        const status = snap.val();
        if (status === 'STARTED') {
            listenToEventIndex();
        } else if (status === 'FINISHED') {
            showFinalScreen();
        }
    });
}

// ===== Escuchar índice de evento =====
let indexListenerAttached = false;
function listenToEventIndex() {
    if (indexListenerAttached) return;
    indexListenerAttached = true;

    database.ref(`sessions/${activityId}/currentEventIndex`).on('value', (snap) => {
        const idx = snap.val();
        if (idx === null || idx === undefined) return;
        currentEventIndex = idx;
        loadCurrentQuestion();
    });
}

// ===== Cargar pregunta actual =====
function loadCurrentQuestion() {
    database.ref(`activities/${activityId}`).once('value').then(snapshot => {
        const data = snapshot.val();
        if (!data || !data.events) return;

        totalEvents = data.events.length;
        questionTimer = data.timer || 30;

        if (currentEventIndex >= totalEvents) {
            showFinalScreen();
            return;
        }

        const ev = data.events[currentEventIndex];
        correctIndex = ev.correctIndex !== undefined ? ev.correctIndex : 0;
        answeredCurrent = false;

        document.getElementById('wait-screen').classList.add('hidden');
        document.getElementById('feedback-screen').classList.add('hidden');
        document.getElementById('final-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        document.getElementById('event-badge').innerText = ev.year || `Evento ${currentEventIndex + 1}`;
        document.getElementById('student-q-title').innerText = ev.question;

        const optsDiv = document.getElementById('options-container');
        optsDiv.innerHTML = '';
        ev.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerText = opt;
            btn.onclick = () => selectAnswer(i);
            optsDiv.appendChild(btn);
        });

        // Iniciar temporizador
        questionStartTime = Date.now();
        let remaining = questionTimer;
        const timerEl = document.getElementById('timer-display');
        timerEl.innerText = remaining;

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            remaining--;
            timerEl.innerText = Math.max(remaining, 0);
            if (remaining <= 0) {
                clearInterval(timerInterval);
                if (!answeredCurrent) selectAnswer(-1);
            }
        }, 1000);
    });
}

// ===== Seleccionar respuesta =====
function selectAnswer(index) {
    if (answeredCurrent) return;
    answeredCurrent = true;
    if (timerInterval) clearInterval(timerInterval);

    const responseTime = (Date.now() - questionStartTime) / 1000;
    const isCorrect = (index === correctIndex);
    let points = 0;

    if (isCorrect) {
        const ratio = Math.min(responseTime / questionTimer, 1);
        points = Math.round((1 - (ratio / 2)) * 1000);
    }

    const playerRef = database.ref(`sessions/${activityId}/players/${studentKey}`);
    playerRef.once('value').then(snap => {
        const p = snap.val() || {};
        playerRef.update({
            score: (p.score || 0) + points,
            correct: (p.correct || 0) + (isCorrect ? 1 : 0),
            incorrect: (p.incorrect || 0) + (isCorrect ? 0 : 1),
            answered: (p.answered || 0) + 1,
            totalTime: (p.totalTime || 0) + responseTime
        });
    });

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');
    document.getElementById('feedback-title').innerText = isCorrect ? "¡Correcto! 👏" : "¡Incorrecto! ❌";
    document.getElementById('feedback-icon').innerText = isCorrect ? "✅" : "⚠️";
    document.getElementById('feedback-msg').innerText = isCorrect
        ? `+${points} puntos`
        : "Esperando el siguiente evento...";
}

// ===== Pantalla final =====
function showFinalScreen() {
    if (timerInterval) clearInterval(timerInterval);
    document.querySelectorAll('.student-card').forEach(el => el.classList.add('hidden'));
    document.getElementById('final-screen').classList.remove('hidden');

    database.ref(`sessions/${activityId}/players/${studentKey}`).once('value').then(snap => {
        const p = snap.val() || {};
        document.getElementById('final-score').innerText = p.score || 0;
    });
}