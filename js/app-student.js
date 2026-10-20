let currentScore = 0;
let timerInterval;

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

function startTimer(seconds) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('timer-display');
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            selectAnswer(-1); // Tiempo agotado
        }
    }, 1000);
}

function selectAnswer(index) {
    clearInterval(timerInterval);
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    if(index === 0) {
        document.getElementById('feedback-title').innerText = "¡Correcto! 👏";
        document.getElementById('feedback-icon').innerText = "✅";
    } else {
        document.getElementById('feedback-title').innerText = "¡Incorrecto! ❌";
        document.getElementById('feedback-icon').innerText = "⚠️";
    }
}

function selectAnswer(index) {
    clearInterval(timerInterval);
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('activityId') || 'default_session';
    const studentName = document.getElementById('student-name').value;

    const isCorrect = (index === 0);
    const points = isCorrect ? 1000 : 0;

    // Enviar a Firebase en tiempo real
    database.ref(`sessions/${activityId}/players/${studentName.replace(/\s+/g, '_')}`).set({
        name: studentName,
        score: points,
        correct: isCorrect ? 1 : 0,
        incorrect: isCorrect ? 0 : 1
    });

    if (isCorrect) {
        document.getElementById('feedback-title').innerText = "¡Correcto! 👏";
        document.getElementById('feedback-icon').innerText = "✅";
    } else {
        document.getElementById('feedback-title').innerText = "¡Incorrecto! ❌";
        document.getElementById('feedback-icon').innerText = "⚠️";
    }
}
