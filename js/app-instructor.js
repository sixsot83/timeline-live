// Gestión de Pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// Generación de Código QR para el ingreso de Aprendices
window.onload = function() {
    const studentUrl = window.location.href.replace('index.html', 'student.html');
    new QRCode(document.getElementById("qrcode"), {
        text: studentUrl,
        width: 160,
        height: 160
    });

    // Cargar datos simulados en la tabla general
    loadLeaderboardData();
};

// Agregar dinámicamente campos de eventos
function addEventCard() {
    const builder = document.getElementById('events-builder');
    const count = builder.children.length + 1;
    const card = document.createElement('div');
    card.className = 'builder-card';
    card.innerHTML = `
        <h4>Evento ${count}</h4>
        <input type="text" placeholder="Fase / Año" class="ev-year">
        <textarea placeholder="Descripción del Evento" class="ev-desc"></textarea>
        <input type="text" placeholder="Pregunta para el aprendiz" class="ev-q">
        <input type="text" placeholder="Opción A (Correcta)" class="ev-o1">
        <input type="text" placeholder="Opción B" class="ev-o2">
        <input type="text" placeholder="Opción C" class="ev-o3">
    `;
    builder.appendChild(card);
}

// Datos de prueba para el Resumen y la Tabla General
const mockStudents = [
    { name: "Carlos Rodríguez", correct: 4, incorrect: 0, score: 3400 },
    { name: "María Gómez", correct: 3, incorrect: 1, score: 2850 },
    { name: "Julián Sotomayor", correct: 3, incorrect: 1, score: 2400 },
    { name: "Andrea Pérez", correct: 2, incorrect: 2, score: 1800 },
    { name: "Luis Hernández", correct: 1, incorrect: 3, score: 950 }
];

function loadLeaderboardData() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    mockStudents.forEach((student, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td>${student.name}</td>
            <td><span style="color: green;">✔ ${student.correct}</span></td>
            <td><span style="color: red;">✖ ${student.incorrect}</span></td>
            <td><strong>${student.score} pts</strong></td>
        `;
        tbody.appendChild(row);
    });
}

// Tus credenciales oficiales de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJwA-Uaqh8DI23ejLlqF3aKTJEj5jpI7Y",
    authDomain: "timelive-live.firebaseapp.com",
    databaseURL: "https://timelive-live-default-rtdb.firebaseio.com", // Asegúrate de incluir tu URL de Realtime Database
    projectId: "timelive-live",
    storageBucket: "timelive-live.firebasestorage.app",
    messagingSenderId: "873551485156",
    appId: "1:873551485156:web:a6029d22ccf7083729f4f1",
    measurementId: "G-83TGB00S6J"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentActivityId = null;

// Guardar actividad configurada en la nube
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    const timer = document.getElementById('event-timer').value;
    const cards = document.querySelectorAll('.builder-card');
    
    let events = [];
    cards.forEach((card) => {
        events.push({
            year: card.querySelector('.ev-year').value,
            description: card.querySelector('.ev-desc').value,
            question: card.querySelector('.ev-q').value,
            options: [
                card.querySelector('.ev-o1').value,
                card.querySelector('.ev-o2').value,
                card.querySelector('.ev-o3').value
            ],
            correctIndex: 0
        });
    });

    currentActivityId = 'act_' + Date.now();

    database.ref('activities/' + currentActivityId).set({
        title: title,
        timer: timer,
        events: events,
        createdAt: new Date().toISOString()
    }).then(() => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentActivityId}`;
        alert(`¡Actividad guardada en la nube con éxito!\n\nEnlace para compartir con otros profesores:\n${shareUrl}`);
        
        const studentUrl = `${window.location.origin}/student.html?activityId=${currentActivityId}`;
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: studentUrl,
            width: 160,
            height: 160
        });

        switchTab('tab-lobby');
        listenToParticipants(currentActivityId);
    });
});

// Cargar actividad si se abre con enlace compartido ?id=xxx
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('id');

    if (activityId) {
        currentActivityId = activityId;
        database.ref('activities/' + activityId).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                document.getElementById('activity-title').value = data.title;
                document.getElementById('event-timer').value = data.timer;
                alert(`Actividad "${data.title}" cargada desde la nube.`);
                listenToParticipants(activityId);
            }
        });
    }
};

// Escuchar participaciones en tiempo real
function listenToParticipants(actId) {
    database.ref('sessions/' + actId + '/players').on('value', (snapshot) => {
        const players = snapshot.val() || {};
        const playersList = document.getElementById('players-list');
        const countSpan = document.getElementById('player-count');
        
        playersList.innerHTML = '';
        let playerArray = [];

        Object.keys(players).forEach(key => {
            const p = players[key];
            playerArray.push(p);

            const chip = document.createElement('li');
            chip.innerText = p.name;
            playersList.appendChild(chip);
        });

        countSpan.innerText = playerArray.length;
        updateAnalyticsAndPodium(playerArray);
    });
}

// Actualizar Podio y Tabla
function updateAnalyticsAndPodium(players) {
    if (players.length === 0) return;
    players.sort((a, b) => b.score - a.score);

    if (players[0]) {
        document.getElementById('p1-name').innerText = players[0].name;
        document.getElementById('p1-score').innerText = `${players[0].score} pts`;
    }
    if (players[1]) {
        document.getElementById('p2-name').innerText = players[1].name;
        document.getElementById('p2-score').innerText = `${players[1].score} pts`;
    }
    if (players[2]) {
        document.getElementById('p3-name').innerText = players[2].name;
        document.getElementById('p3-score').innerText = `${players[2].score} pts`;
    }

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    players.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td>${p.name}</td>
            <td><span style="color: green;">✔ ${p.correct || 0}</span></td>
            <td><span style="color: red;">✖ ${p.incorrect || 0}</span></td>
            <td><strong>${p.score || 0} pts</strong></td>
        `;
        tbody.iterrows ? tbody.iterrows(row) : tbody.appendChild(row);
    });
}
