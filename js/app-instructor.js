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
let currentPin = null;

// Gestor de Pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const activeTabBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');
}

// Generar plantilla HTML para cada evento
function createEventCardHTML(index, data = {}) {
    const year = data.year || '';
    const desc = data.description || '';
    const question = data.question || '';
    const opts = data.options || ['', ''];
    const correctIdx = data.correctIndex !== undefined ? data.correctIndex : 0;

    let optionsHTML = '';
    opts.forEach((optText, oIdx) => {
        const isChecked = (oIdx === correctIdx) ? 'checked' : '';
        optionsHTML += `
            <div class="option-row" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                <input type="radio" name="correct-event-${index}" value="${oIdx}" ${isChecked} title="Marcar como respuesta correcta" required>
                <input type="text" class="ev-option" placeholder="Opción ${oIdx + 1}" value="${optText}" required style="flex: 1;">
                ${oIdx >= 2 ? `<button type="button" onclick="removeOption(this)" style="background:#dc3545; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">✕</button>` : ''}
            </div>
        `;
    });

    return `
        <div class="builder-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0;">Evento <span class="event-number">${index}</span></h4>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEventCard(this)" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">🗑️ Eliminar Evento</button>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Fase / Año (Ej: Fase 1 - Análisis)" value="${year}" class="ev-year" required>
        </div>
        <div class="form-group">
            <textarea placeholder="Descripción del Evento" class="ev-desc" rows="2" required>${desc}</textarea>
        </div>
        <div class="form-group">
            <input type="text" placeholder="Pregunta para el aprendiz" value="${question}" class="ev-q" required>
        </div>
        <div class="form-group">
            <label style="font-size:0.9rem; margin-bottom:6px; display:block; color:#555;">Opciones de respuesta (Selecciona el botón de radio para indicar la CORRECTA):</label>
            <div class="options-container">
                ${optionsHTML}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addOptionToCard(this)" style="margin-top:5px; font-size:0.85rem; padding:4px 10px;">+ Agregar Opción</button>
        </div>
    `;
}

// Agregar opción adicional a un evento
function addOptionToCard(btn) {
    const card = btn.closest('.builder-card');
    const optionsContainer = card.querySelector('.options-container');
    const index = card.querySelector('.event-number').innerText;
    const count = optionsContainer.querySelectorAll('.option-row').length;

    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
    row.innerHTML = `
        <input type="radio" name="correct-event-${index}" value="${count}" title="Marcar como respuesta correcta">
        <input type="text" class="ev-option" placeholder="Opción ${count + 1}" required style="flex: 1;">
        <button type="button" onclick="removeOption(this)" style="background:#dc3545; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">✕</button>
    `;
    optionsContainer.appendChild(row);
}

// Eliminar opción secundaria
function removeOption(btn) {
    const row = btn.closest('.option-row');
    const container = row.closest('.options-container');
    if (container.querySelectorAll('.option-row').length <= 2) {
        alert("Cada pregunta debe tener al menos 2 opciones.");
        return;
    }
    row.remove();
}

// Agregar nueva tarjeta de evento
function addEventCard(data = null) {
    const builder = document.getElementById('events-builder');
    const count = builder.children.length + 1;
    const card = document.createElement('div');
    card.className = 'builder-card';
    card.innerHTML = createEventCardHTML(count, data || {});
    builder.appendChild(card);
    updateEventNumbers();
}

// Eliminar tarjeta de evento
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

// Reordenar números e identificadores
function updateEventNumbers() {
    const cards = document.querySelectorAll('#events-builder .builder-card');
    cards.forEach((card, idx) => {
        const numSpan = card.querySelector('.event-number');
        const num = idx + 1;
        if (numSpan) numSpan.innerText = num;
        
        // Actualizar nombres de radios
        const radios = card.querySelectorAll('input[type="radio"]');
        radios.forEach(r => r.name = `correct-event-${num}`);
    });
}

// Generar PIN aleatorio de 6 dígitos
function generatePIN() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${num.toString().substring(0,3)}-${num.toString().substring(3,6)}`;
}

// Guardar/Actualizar Actividad y generar QR
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    const timer = parseInt(document.getElementById('event-timer').value);
    const cards = document.querySelectorAll('.builder-card');
    
    let events = [];
    cards.forEach((card, idx) => {
        const optionRows = card.querySelectorAll('.option-row');
        let options = [];
        let correctIndex = 0;

        optionRows.forEach((row, oIdx) => {
            const text = row.querySelector('.ev-option').value;
            const radio = row.querySelector('input[type="radio"]');
            options.push(text);
            if (radio.checked) {
                correctIndex = oIdx;
            }
        });

        events.push({
            year: card.querySelector('.ev-year').value,
            description: card.querySelector('.ev-desc').value,
            question: card.querySelector('.ev-q').value,
            options: options,
            correctIndex: correctIndex
        });
    });

    if (!currentActivityId) {
        currentActivityId = 'act_' + Date.now();
    }
    if (!currentPin) {
        currentPin = generatePIN();
    }

    // Guardar actividad en Firebase
    database.ref('activities/' + currentActivityId).set({
        title: title,
        timer: timer,
        events: events,
        pin: currentPin,
        updatedAt: new Date().toISOString()
    });

    // Inicializar estado de sesión en Firebase
    database.ref('sessions/' + currentActivityId).update({
        status: 'waiting', // Estado inicial
        pin: currentPin,
        currentEventIndex: 0
    }).then(() => {
        document.getElementById('session-pin').innerText = currentPin;

        // Generar enlace dinámico para el estudiante
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        const studentUrl = `${baseUrl}/student.html?activityId=${currentActivityId}&pin=${currentPin}`;

        // Renderizar QR
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: studentUrl,
            width: 180,
            height: 180
        });

        // Actualizar URL en navegador
        window.history.pushState({}, '', `?id=${currentActivityId}`);

        switchTab('tab-lobby');
        listenToParticipants(currentActivityId);
    });
});

// Iniciar Sesión en Vivo
function startTimelineSession() {
    if (!currentActivityId) {
        alert("Primero debes configurar y guardar una actividad.");
        return;
    }

    database.ref('sessions/' + currentActivityId).update({
        status: 'active',
        currentEventIndex: 0,
        startedAt: new Date().toISOString()
    }).then(() => {
        alert("🚀 ¡Actividad Iniciada! Todos los estudiantes conectados ahora pueden responder.");
    });
}

// Escuchar estudiantes conectados
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

// Actualizar Estadísticas, Podio y Tabla
function updateAnalyticsAndPodium(players) {
    if (players.length === 0) return;

    let totalCorrect = 0;
    let totalIncorrect = 0;

    players.forEach(p => {
        totalCorrect += (p.correct || 0);
        totalIncorrect += (p.incorrect || 0);
    });

    const totalAnswers = totalCorrect + totalIncorrect;
    if (totalAnswers > 0) {
        const correctPct = Math.round((totalCorrect / totalAnswers) * 100);
        const incorrectPct = Math.round((totalIncorrect / totalAnswers) * 100);

        document.getElementById('stat-participation').innerText = `${players.length} Aprendices`;
        document.getElementById('stat-correct').innerText = `${correctPct}%`;
        document.getElementById('stat-incorrect').innerText = `${incorrectPct}%`;
    }

    // Ordenar para el podio
    players.sort((a, b) => (b.score || 0) - (a.score || 0));

    if (players[0]) {
        document.getElementById('p1-name').innerText = players[0].name;
        document.getElementById('p1-score').innerText = `${players[0].score || 0} pts`;
    }
    if (players[1]) {
        document.getElementById('p2-name').innerText = players[1].name;
        document.getElementById('p2-score').innerText = `${players[1].score || 0} pts`;
    }
    if (players[2]) {
        document.getElementById('p3-name').innerText = players[2].name;
        document.getElementById('p3-score').innerText = `${players[2].score || 0} pts`;
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

// Cargar estado inicial
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('id');

    if (activityId) {
        currentActivityId = activityId;
        database.ref('activities/' + activityId).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                document.getElementById('activity-title').value = data.title || '';
                document.getElementById('event-timer').value = data.timer || 30;
                currentPin = data.pin || generatePIN();
                
                const builder = document.getElementById('events-builder');
                builder.innerHTML = '';
                
                if (data.events && data.events.length > 0) {
                    data.events.forEach((evData) => addEventCard(evData));
                } else {
                    addEventCard();
                }
                listenToParticipants(activityId);
            }
        });
    } else {
        // Cargar 1 evento con marcas de agua por defecto
        addEventCard();
    }
};