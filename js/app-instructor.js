// ==========================================
// CONFIGURACIÓN DE FIREBASE (INSTRUCTOR)
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
let currentPin = null;
let activityDataGlobal = null;
let instructorInterval = null;

// Gestor de Pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const activeTabBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');
}

// Plantilla para los eventos en el formulario
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
                <input type="text" class="ev-option" placeholder="Opción ${oIdx + 1}" value="${optText}" required style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                ${oIdx >= 2 ? `<button type="button" onclick="removeOption(this)" style="background:#dc3545; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">✕</button>` : ''}
            </div>
        `;
    });

    return `
        <div class="builder-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0;">Evento <span class="event-number">${index}</span></h4>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEventCard(this)" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">🗑️ Eliminar</button>
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
            <label style="font-size:0.9rem; margin-bottom:6px; display:block; color:#555;">Opciones (Selecciona la correcta):</label>
            <div class="options-container">
                ${optionsHTML}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addOptionToCard(this)" style="margin-top:5px; font-size:0.85rem; padding:6px 12px;">+ Agregar Opción</button>
        </div>
    `;
}

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
        <input type="text" class="ev-option" placeholder="Opción ${count + 1}" required style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <button type="button" onclick="removeOption(this)" style="background:#dc3545; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">✕</button>
    `;
    optionsContainer.appendChild(row);
}

function removeOption(btn) {
    const row = btn.closest('.option-row');
    const container = row.closest('.options-container');
    if (container.querySelectorAll('.option-row').length <= 2) {
        alert("Cada pregunta debe tener al menos 2 opciones.");
        return;
    }
    row.remove();
}

function addEventCard(data = null) {
    const builder = document.getElementById('events-builder');
    const count = builder.children.length + 1;
    const card = document.createElement('div');
    card.className = 'builder-card';
    card.style.cssText = 'background: white; padding: 20px; border-radius: 8px; border-left: 5px solid var(--primary); margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';
    card.innerHTML = createEventCardHTML(count, data || {});
    builder.appendChild(card);
    updateEventNumbers();
}

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

function updateEventNumbers() {
    const cards = document.querySelectorAll('#events-builder .builder-card');
    cards.forEach((card, idx) => {
        const numSpan = card.querySelector('.event-number');
        const num = idx + 1;
        if (numSpan) numSpan.innerText = num;
        
        const radios = card.querySelectorAll('input[type="radio"]');
        radios.forEach(r => r.name = `correct-event-${num}`);
    });
}

function generatePIN() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${num.toString().substring(0,3)}-${num.toString().substring(3,6)}`;
}

// Guardar Actividad
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    const timer = parseInt(document.getElementById('event-timer').value);
    const cards = document.querySelectorAll('.builder-card');
    
    let events = [];
    cards.forEach((card) => {
        const optionRows = card.querySelectorAll('.option-row');
        let options = [];
        let correctIndex = 0;

        optionRows.forEach((row, oIdx) => {
            const text = row.querySelector('.ev-option').value;
            const radio = row.querySelector('input[type="radio"]');
            options.push(text);
            if (radio.checked) correctIndex = oIdx;
        });

        events.push({
            year: card.querySelector('.ev-year').value,
            description: card.querySelector('.ev-desc').value,
            question: card.querySelector('.ev-q').value,
            options: options,
            correctIndex: correctIndex
        });
    });

    if (!currentActivityId) currentActivityId = 'act_' + Date.now();
    if (!currentPin) currentPin = generatePIN();

    activityDataGlobal = { title, timer, events, pin: currentPin };

    database.ref('activities/' + currentActivityId).set({
        ...activityDataGlobal,
        updatedAt: new Date().toISOString()
    });

    database.ref('sessions/' + currentActivityId).update({
        status: 'waiting',
        pin: currentPin,
        currentEventIndex: 0,
        mode: 'auto'
    }).then(() => {
        document.getElementById('session-pin').innerText = currentPin;

        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        const studentUrl = `${baseUrl}/student.html?activityId=${currentActivityId}&pin=${currentPin}`;

        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: studentUrl,
            width: 180,
            height: 180
        });

        window.history.pushState({}, '', `?id=${currentActivityId}`);
        switchTab('tab-lobby');
        listenToParticipants(currentActivityId);
    });
});

// Iniciar Sesión (Modo Automático o Manual)
function startTimelineSession(mode) {
    if (!currentActivityId) {
        alert("Primero debes configurar y guardar una actividad.");
        return;
    }

    database.ref('sessions/' + currentActivityId).update({
        status: 'active',
        currentEventIndex: 0,
        mode: mode, // 'auto' o 'manual'
        startedAt: new Date().toISOString()
    }).then(() => {
        alert(`🚀 Actividad iniciada en modo: ${mode.toUpperCase()}`);
        openInstructorControlPanel(mode);
    });
}

// Abrir Panel de Monitoreo del Instructor (Ventana flotante / modal o sección)
function openInstructorControlPanel(mode) {
    let controlModal = document.getElementById('instructor-control-modal');
    if (!controlModal) {
        controlModal = document.createElement('div');
        controlModal.id = 'instructor-control-modal';
        controlModal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center;';
        document.body.appendChild(controlModal);
    }

    controlModal.innerHTML = `
        <div style="background:white; padding:30px; border-radius:12px; width:90%; max-width:600px; text-align:left; box-shadow:0 10px 25px rgba(0,0,0,0.3);">
            <h2>🎮 Panel de Control del Instructor</h2>
            <p><strong>Modo:</strong> <span style="color:var(--primary); text-transform:uppercase;">${mode}</span></p>
            <hr style="margin: 15px 0;">
            <div id="instructor-live-content">Cargando evento actual...</div>
            <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                <span id="instructor-timer-display" style="font-size:1.5rem; font-weight:bold; color:var(--warning);">⏱️ --s</span>
                ${mode === 'manual' ? `<button class="btn btn-primary" onclick="nextManualEvent()">Siguiente Pregunta ➡️</button>` : ''}
                <button class="btn btn-secondary" onclick="closeInstructorPanel()">Cerrar Panel</button>
            </div>
        </div>
    `;

    monitorInstructorLive(mode);
}

let activeInstructorTimer = null;

function monitorInstructorLive(mode) {
    const timerSeconds = activityDataGlobal ? activityDataGlobal.timer : 30;

    database.ref('sessions/' + currentActivityId).on('value', snapshot => {
        const session = snapshot.val();
        if (!session || session.status !== 'active') return;

        const idx = session.currentEventIndex || 0;
        const ev = activityDataGlobal.events[idx];

        if (!ev) {
            document.getElementById('instructor-live-content').innerHTML = `<h3>¡Actividad Concluida!</h3>`;
            if (activeInstructorTimer) clearInterval(activeInstructorTimer);
            return;
        }

        let optionsHtml = '';
        ev.options.forEach((opt, oIdx) => {
            const isCorrect = (oIdx === ev.correctIndex);
            const style = isCorrect ? 'background:#d4edda; border:2px solid #28a745; font-weight:bold;' : 'background:#f8f9fa;';
            optionsHtml += `<div style="padding:8px; margin:5px 0; border-radius:6px; ${style}">${String.fromCharCode(65 + oIdx)}. ${opt} ${isCorrect ? '✅ (Correcta)' : ''}</div>`;
        });

        document.getElementById('instructor-live-content').innerHTML = `
            <span class="badge" style="background:var(--primary); color:white; padding:4px 10px; border-radius:8px;">Evento ${idx + 1} de ${activityDataGlobal.events.length}</span>
            <h3 style="margin:10px 0;">${ev.question}</h3>
            <div style="margin: 15px 0;">${optionsHtml}</div>
        `;

        // Si es automático, gestionar cronómetro local en el panel
        if (mode === 'auto') {
            let timeLeft = timerSeconds;
            document.getElementById('instructor-timer-display').innerText = `⏱️ ${timeLeft}s`;

            if (activeInstructorTimer) clearInterval(activeInstructorTimer);
            activeInstructorTimer = setInterval(() => {
                timeLeft--;
                const timerEl = document.getElementById('instructor-timer-display');
                if (timerEl) timerEl.innerText = `⏱️ ${timeLeft}s`;

                if (timeLeft <= 0) {
                    clearInterval(activeInstructorTimer);
                    if (idx + 1 < activityDataGlobal.events.length) {
                        database.ref('sessions/' + currentActivityId).update({ currentEventIndex: idx + 1 });
                    } else {
                        database.ref('sessions/' + currentActivityId).update({ status: 'finished' });
                    }
                }
            }, 1000);
        }
    });
}

function nextManualEvent() {
    database.ref('sessions/' + currentActivityId).once('value', snapshot => {
        const session = snapshot.val();
        const idx = session.currentEventIndex || 0;
        if (idx + 1 < activityDataGlobal.events.length) {
            database.ref('sessions/' + currentActivityId).update({ currentEventIndex: idx + 1 });
        } else {
            database.ref('sessions/' + currentActivityId).update({ status: 'finished' });
            alert("Actividad finalizada.");
        }
    });
}

function closeInstructorPanel() {
    if (activeInstructorTimer) clearInterval(activeInstructorTimer);
    const modal = document.getElementById('instructor-control-modal');
    if (modal) modal.remove();
}

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
                activityDataGlobal = data;
                
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
        addEventCard();
    }
};
