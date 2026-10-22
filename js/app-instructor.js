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
let currentPin = null;
let liveTimerInterval = null;
let currentEventsData = [];
let currentEventIndex = 0;
let eventDuration = 30;
let advancementMode = 'auto';

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
                <input type="text" class="ev-option" placeholder="Opción ${oIdx + 1}" value="${optText}" required style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                ${oIdx >= 2 ? `<button type="button" onclick="removeOption(this)" style="background:#dc3545; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">✕</button>` : ''}
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
            <label style="font-size:0.9rem; margin-bottom:6px; display:block; color:#555;">Opciones de respuesta (Selecciona el radio button de la CORRECTA):</label>
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

// ==========================================
// PROCESAMIENTO Y PLANTILLA DE EXCEL (REQUERIMIENTO 1)
// ==========================================
function downloadExcelTemplate() {
    const templateData = [
        ["Año/Fase", "Descripción", "Pregunta", "Opción 1", "Opción 2", "Opción 3", "Opción 4", "Opción Correcta (1-4)"],
        ["Fase 1", "Surgimiento del Lenguaje C", "¿En qué año se creó el lenguaje C?", "1972", "1985", "1995", "2000", 1],
        ["Fase 2", "Aparición de Java", "¿Qué empresa creó Java en 1995?", "Microsoft", "Sun Microsystems", "Google", "IBM", 2]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Timeline");
    XLSX.writeFile(wb, "Plantilla_Actividad_TimelineLive.xlsx");
}

function processExcelUpload() {
    const fileInput = document.getElementById('excel-file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert("Por favor selecciona un archivo de Excel antes de continuar.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length <= 1) {
            alert("El archivo Excel no contiene suficientes filas de datos.");
            return;
        }

        const builder = document.getElementById('events-builder');
        builder.innerHTML = '';

        for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length === 0) continue;

            const year = row[0] || `Fase ${i}`;
            const description = row[1] || '';
            const question = row[2] || 'Sin pregunta';
            const options = [];
            
            if (row[3]) options.push(String(row[3]));
            if (row[4]) options.push(String(row[4]));
            if (row[5]) options.push(String(row[5]));
            if (row[6]) options.push(String(row[6]));

            let correctIndex = (parseInt(row[7]) || 1) - 1;
            if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;

            addEventCard({
                year: year,
                description: description,
                question: question,
                options: options.length >= 2 ? options : ['Opción A', 'Opción B'],
                correctIndex: correctIndex
            });
        }
        alert("✅ Actividad cargada exitosamente desde el archivo Excel.");
    };
    reader.readAsArrayBuffer(file);
}

// Guardar/Actualizar Actividad
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    eventDuration = parseInt(document.getElementById('event-timer').value);
    advancementMode = document.getElementById('advancement-mode').value;
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

    currentEventsData = events;

    if (!currentActivityId) {
        currentActivityId = 'act_' + Date.now();
    }
    if (!currentPin) {
        currentPin = generatePIN();
    }

    database.ref('activities/' + currentActivityId).set({
        title: title,
        timer: eventDuration,
        mode: advancementMode,
        events: events,
        pin: currentPin,
        updatedAt: new Date().toISOString()
    });

    database.ref('sessions/' + currentActivityId).update({
        status: 'waiting',
        pin: currentPin,
        currentEventIndex: 0,
        mode: advancementMode
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
        loadActivityHistory();
    });
});

// ==========================================
// SALA EN VIVO Y PROYECCIÓN (REQUERIMIENTO 2)
// ==========================================
function startTimelineSession() {
    if (!currentActivityId) {
        alert("Primero debes configurar y guardar una actividad.");
        return;
    }

    currentEventIndex = 0;
    database.ref('sessions/' + currentActivityId).update({
        status: 'active',
        currentEventIndex: 0,
        mode: advancementMode,
        startedAt: new Date().toISOString()
    }).then(() => {
        document.getElementById('live-projection-card').style.display = 'block';
        showProjectedEvent(0);
        alert("🚀 ¡Actividad Iniciada! Proyectando en pantalla.");
    });
}

function showProjectedEvent(index) {
    if (!currentEventsData || index >= currentEventsData.length) {
        database.ref('sessions/' + currentActivityId).update({ status: 'finished' });
        document.getElementById('proj-question').innerText = "🏁 ¡Actividad Finalizada! Revisa el podio en la Pestaña 3.";
        document.getElementById('proj-options').innerHTML = '';
        if (liveTimerInterval) clearInterval(liveTimerInterval);
        return;
    }

    const ev = currentEventsData[index];
    document.getElementById('proj-event-badge').innerText = `${ev.year || 'Evento ' + (index + 1)} (${index + 1}/${currentEventsData.length})`;
    document.getElementById('proj-question').innerText = ev.question;

    const projOpts = document.getElementById('proj-options');
    projOpts.innerHTML = '';
    ev.options.forEach((opt, oIdx) => {
        const isCorrect = (oIdx === ev.correctIndex);
        const optDiv = document.createElement('div');
        optDiv.style.cssText = `padding: 12px; border-radius: 6px; background: #e9ecef; font-weight: bold; ${isCorrect ? 'border-left: 5px solid var(--success);' : ''}`;
        optDiv.innerText = `${oIdx + 1}. ${opt}`;
        projOpts.appendChild(optDiv);
    });

    const nextBtn = document.getElementById('btn-next-event');
    if (advancementMode === 'manual') {
        nextBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'none';
    }

    startLiveTimer();
}

function startLiveTimer() {
    let timeLeft = eventDuration;
    const timerDisplay = document.getElementById('proj-timer');
    timerDisplay.innerText = `⏱️ ${timeLeft}s`;

    if (liveTimerInterval) clearInterval(liveTimerInterval);

    liveTimerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = `⏱️ ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(liveTimerInterval);
            if (advancementMode === 'auto') {
                currentEventIndex++;
                database.ref('sessions/' + currentActivityId).update({
                    currentEventIndex: currentEventIndex
                });
                showProjectedEvent(currentEventIndex);
            } else {
                timerDisplay.innerText = "⌛ Tiempo Agotado - Esperando Instructor";
            }
        }
    }, 1000);
}

function manualNextEvent() {
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    currentEventIndex++;
    database.ref('sessions/' + currentActivityId).update({
        currentEventIndex: currentEventIndex
    });
    showProjectedEvent(currentEventIndex);
}

// Cargar Historial de Actividades (REQUERIMIENTO 2)
function loadActivityHistory() {
    database.ref('activities').once('value').then((snapshot) => {
        const activities = snapshot.val() || {};
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';

        const keys = Object.keys(activities);
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay actividades registradas en el historial.</td></tr>';
            return;
        }

        keys.reverse().forEach(actId => {
            const act = activities[actId];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${act.title || 'Sin Título'}</strong></td>
                <td><span class="pin-badge" style="padding: 3px 8px; font-size: 0.85rem;">${act.pin || '------'}</span></td>
                <td>${act.mode === 'manual' ? 'Manual' : 'Automático'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editActivityFromHistory('${actId}')" style="padding: 4px 8px; font-size: 0.8rem;">✏️ Editar</button>
                    <button class="btn btn-primary btn-sm" onclick="relaunchActivityFromHistory('${actId}')" style="padding: 4px 8px; font-size: 0.8rem;">🚀 Lanzar</button>
                    <button class="btn btn-success btn-sm" onclick="downloadSessionExcel('${actId}', '${act.title}')" style="padding: 4px 8px; font-size: 0.8rem;">📥 Excel</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function editActivityFromHistory(actId) {
    database.ref('activities/' + actId).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        currentActivityId = actId;
        currentPin = data.pin || generatePIN();
        document.getElementById('activity-title').value = data.title || '';
        document.getElementById('event-timer').value = data.timer || 30;
        document.getElementById('advancement-mode').value = data.mode || 'auto';

        const builder = document.getElementById('events-builder');
        builder.innerHTML = '';

        if (data.events && data.events.length > 0) {
            data.events.forEach((evData) => addEventCard(evData));
        } else {
            addEventCard();
        }
        switchTab('tab-create');
    });
}

function relaunchActivityFromHistory(actId) {
    editActivityFromHistory(actId);
    setTimeout(() => {
        document.getElementById('timeline-form').dispatchEvent(new Event('submit'));
    }, 300);
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

// ==========================================
// RESUMEN, PODIO Y TABLA DETALLADA (REQUERIMIENTO 3)
// ==========================================
function updateAnalyticsAndPodium(players) {
    const totalEvents = (currentEventsData && currentEventsData.length) ? currentEventsData.length : 1;

    if (players.length === 0) {
        document.getElementById('stat-participation').innerText = `0 Aprendices`;
        document.getElementById('stat-correct').innerText = `0%`;
        document.getElementById('stat-incorrect').innerText = `0%`;
        document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="6" style="text-align:center;">Esperando respuestas de los aprendices...</td></tr>';
        return;
    }

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

    // Ordenar aprendices por Puntuación descendente
    players.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Podio
    document.getElementById('p1-name').innerText = players[0] ? players[0].name : '--';
    document.getElementById('p1-score').innerText = players[0] ? `${players[0].score || 0} pts` : '0 pts';

    document.getElementById('p2-name').innerText = players[1] ? players[1].name : '--';
    document.getElementById('p2-score').innerText = players[1] ? `${players[1].score || 0} pts` : '0 pts';

    document.getElementById('p3-name').innerText = players[2] ? players[2].name : '--';
    document.getElementById('p3-score').innerText = players[2] ? `${players[2].score || 0} pts` : '0 pts';

    // Tabla General con 6 Campos Requeridos
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    players.forEach((p, idx) => {
        const correct = p.correct || 0;
        const incorrect = p.incorrect || 0;
        const unanswered = Math.max(0, totalEvents - (correct + incorrect));
        const score = p.score || 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td>${p.name}</td>
            <td><span style="color: green; font-weight: bold;">✔ ${correct}</span></td>
            <td><span style="color: red; font-weight: bold;">✖ ${incorrect}</span></td>
            <td><span style="color: #6c757d; font-weight: bold;">⌛ ${unanswered}</span></td>
            <td><strong>${score} pts</strong></td>
        `;
        tbody.appendChild(row);
    });
}

// Descarga en Excel de la sesión actual o de historial
function downloadCurrentSessionExcel() {
    if (!currentActivityId) {
        alert("No hay una sesión activa para exportar.");
        return;
    }
    const title = document.getElementById('activity-title').value || "Actividad";
    downloadSessionExcel(currentActivityId, title);
}

function downloadSessionExcel(actId, title) {
    database.ref(`sessions/${actId}`).once('value').then(snapshot => {
        const sessionData = snapshot.val();
        if (!sessionData || !sessionData.players) {
            alert("No hay datos de participación registrados para esta actividad.");
            return;
        }

        database.ref(`activities/${actId}`).once('value').then(actSnapshot => {
            const actData = actSnapshot.val() || {};
            const totalEvents = (actData.events && actData.events.length) ? actData.events.length : 1;

            const playersObj = sessionData.players;
            let playersArray = Object.keys(playersObj).map(k => playersObj[k]);
            playersArray.sort((a, b) => (b.score || 0) - (a.score || 0));

            const excelRows = [
                ["REPORTE DE RESULTADOS - TIMELINE LIVE"],
                ["Actividad:", title],
                ["PIN de Sesión:", sessionData.pin || "N/A"],
                ["Fecha de Exportación:", new Date().toLocaleString()],
                [],
                ["Posición", "Nombre Completo", "Respuestas Correctas", "Respuestas Incorrectas", "Sin Contestar", "Puntuación Total"]
            ];

            playersArray.forEach((p, idx) => {
                const correct = p.correct || 0;
                const incorrect = p.incorrect || 0;
                const unanswered = Math.max(0, totalEvents - (correct + incorrect));
                excelRows.push([
                    idx + 1,
                    p.name,
                    correct,
                    incorrect,
                    unanswered,
                    p.score || 0
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Resultados");
            XLSX.writeFile(wb, `Resultados_${title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
        });
    });
}

// Cargar estado inicial al abrir la página
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('id');

    loadActivityHistory();

    if (activityId) {
        currentActivityId = activityId;
        database.ref('activities/' + activityId).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                document.getElementById('activity-title').value = data.title || '';
                document.getElementById('event-timer').value = data.timer || 30;
                document.getElementById('advancement-mode').value = data.mode || 'auto';
                currentEventsData = data.events || [];
                eventDuration = data.timer || 30;
                advancementMode = data.mode || 'auto';
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
        addEventCard();
    }
};