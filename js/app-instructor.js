// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
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

// Gestor de Pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const activeTabBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');
}

// Renderizar / Crear tarjeta de evento
function createEventCardHTML(index, data = {}) {
    const year = data.year || '';
    const desc = data.description || '';
    const question = data.question || '';
    const opts = data.options || ['', '', ''];

    return `
        <div class="builder-card-header" style="display:flex; justify-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0;">Evento <span class="event-number">${index}</span></h4>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEventCard(this)" style="background:#dc3545; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">🗑️ Eliminar</button>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Fase / Año (Ej: Fase 1 - Análisis)" value="${year}" class="ev-year" required>
        </div>
        <div class="form-group">
            <textarea placeholder="Descripción del Evento" class="ev-desc" required>${desc}</textarea>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Pregunta para el aprendiz" value="${question}" class="ev-q" required>
        </div>
        <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <input type="text" placeholder="Opción A (Correcta)" value="${opts[0] || ''}" class="ev-o1" required>
            <input type="text" placeholder="Opción B" value="${opts[1] || ''}" class="ev-o2" required>
            <input type="text" placeholder="Opción C" value="${opts[2] || ''}" class="ev-o3" required>
        </div>
    `;
}

// Agregar un nuevo evento
function addEventCard(data = null) {
    const builder = document.getElementById('events-builder');
    const count = builder.children.length + 1;
    const card = document.createElement('div');
    card.className = 'builder-card';
    card.innerHTML = createEventCardHTML(count, data || {});
    builder.appendChild(card);
    updateEventNumbers();
}

// Eliminar un evento
function removeEventCard(button) {
    const card = button.closest('.builder-card');
    const builder = document.getElementById('events-builder');
    
    if (builder.children.length <= 1) {
        alert("Debes mantener al menos un evento en la línea de tiempo.");
        return;
    }

    card.remove();
    updateEventNumbers();
}

// Reorganizar numeración
function updateEventNumbers() {
    const cards = document.querySelectorAll('#events-builder .builder-card');
    cards.forEach((card, idx) => {
        const numSpan = card.querySelector('.event-number');
        if (numSpan) numSpan.innerText = idx + 1;
    });
}

// Guardar / Actualizar Actividad en Firebase
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

    if (!currentActivityId) {
        currentActivityId = 'act_' + Date.now();
    }

    // Guardar / Actualizar en la base de datos
    database.ref('activities/' + currentActivityId).set({
        title: title,
        timer: timer,
        events: events,
        updatedAt: new Date().toISOString()
    }).then(() => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentActivityId}`;
        alert(`¡Actividad guardada/actualizada con éxito!\n\nEnlace para compartir:\n${shareUrl}`);
        
        // Actualizar URL y Código QR para estudiantes
        const studentUrl = `${window.location.origin}/student.html?activityId=${currentActivityId}`;
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: studentUrl,
            width: 160,
            height: 160
        });

        // Actualizar la URL en la barra del navegador sin recargar
        window.history.pushState({}, '', `?id=${currentActivityId}`);

        switchTab('tab-lobby');
        listenToParticipants(currentActivityId);
    });
});

// Cargar Actividad si existe parámetro ?id=xxx
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
                
                // Reconstruir formulario de eventos
                const builder = document.getElementById('events-builder');
                builder.innerHTML = '';
                
                if (data.events && data.events.length > 0) {
                    data.events.forEach((evData) => {
                        addEventCard(evData);
                    });
                } else {
                    addEventCard();
                }

                listenToParticipants(activityId);
            }
        });
    }
};

// Escuchar participaciones en vivo
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
        tbody.appendChild(row);
    });
}
