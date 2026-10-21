
// 1. CONFIGURACIÓN DE FIREBASE estos datos estan general--appsweb--conf
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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentActivityId = null;

// ============================================================
// Gestión de Pestañas (tu función original, sin cambios)
// ============================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// ============================================================
// Agregar dinámicamente campos de eventos (original)
// ============================================================
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
        <input type="text" placeholder="Opción D" class="ev-o4">
    `;
    builder.appendChild(card);
}

// ============================================================
// 2. GUARDAR ACTIVIDAD EN LA NUBE (reemplaza tu window.onload antiguo)
// ============================================================
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
                card.querySelector('.ev-o3').value,
                card.querySelector('.ev-o4').value
            ],
            correctIndex: 0
        });
    });

    // Generar un ID único para la actividad
    currentActivityId = 'act_' + Date.now();

    // Guardar en Firebase Realtime Database
    database.ref('activities/' + currentActivityId).set({
        title: title,
        timer: timer,
        events: events,
        createdAt: new Date().toISOString()
    }).then(() => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentActivityId}`;
        alert(`¡Actividad guardada en la nube!\n\nEnlace para compartir:\n${shareUrl}`);
        
        // Actualizar QR con el enlace del estudiante
        const studentUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}student.html?activityId=${currentActivityId}`;
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: studentUrl,
            width: 160,
            height: 160
        });

        switchTab('tab-lobby');
        listenToParticipants(currentActivityId);
    }).catch((error) => {
        console.error("Error al guardar:", error);
        alert("Error al guardar en Firebase: " + error.message);
    });
});

// ============================================================
// 3. CARGA INICIAL (QR + carga de actividad si viene por URL)
// ============================================================
window.onload = function() {
    // QR por defecto (antes de guardar la actividad)
    const studentUrl = window.location.href.replace('index.html', 'student.html');
    new QRCode(document.getElementById("qrcode"), {
        text: studentUrl,
        width: 160,
        height: 160
    });

    // Si se abre con ?id=xxx, cargar actividad existente
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

// ============================================================
// 4. ESCUCHAR JUGADORES EN TIEMPO REAL
// ============================================================
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

// ============================================================
// 5. ACTUALIZAR PODIO Y TABLA
// ============================================================
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
        tbody.appendChild(row);
    });
}