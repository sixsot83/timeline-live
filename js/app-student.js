// Configuración de Firebase para el Aprendiz
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

let activityId = null;
let studentName = "";

// Unirse al Juego
function joinGame() {
    const nameInput = document.getElementById('student-name').value;
    if (!nameInput.trim()) {
        alert("Ingresa tu nombre para continuar.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    activityId = urlParams.get('activityId') || 'default_session';
    studentName = nameInput.trim();

    document.getElementById('display-student-name').innerText = studentName;
    document.getElementById('join-screen').classList.add('hidden');
    document.getElementById('wait-screen').classList.remove('hidden');

    // Registrar en la base de datos
    database.ref(`sessions/${activityId}/players/${studentName.replace(/\s+/g, '_')}`).set({
        name: studentName,
        score: 0,
        correct: 0,
        incorrect: 0
    });

    // Escuchar el inicio del juego
    database.ref(`sessions/${activityId}/status`).on('value', (snapshot) => {
        if (snapshot.val() === 'STARTED') {
            loadGameScreen();
        }
    });
}

// Cargar Pantalla de Juego
function loadGameScreen() {
    document.getElementById('wait-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    database.ref(`activities/${activityId}`).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data && data.events) {
            const ev = data.events[0];
            document.getElementById('student-q-title').innerText = ev.question;

            const optsDiv = document.getElementById('options-container');
            optsDiv.innerHTML = '';

            ev.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'btn primary-btn';
                btn.style.marginBottom = '8px';
                btn.innerText = opt;
                btn.onclick = () => selectAnswer(idx);
                optsDiv.appendChild(btn);
            });
        }
    });
}

// Guardar Respuesta en la Nube
function selectAnswer(index) {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('feedback-screen').classList.remove('hidden');

    const isCorrect = (index === 0);
    const points = isCorrect ? 1000 : 0;

    database.ref(`sessions/${activityId}/players/${studentName.replace(/\s+/g, '_')}`).update({
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