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
let currentGameMode = 'automatic';
let instructorTimerInterval = null;
let currentLoadedActivityData = null;

// Gestor de Pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const activeTabBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    if (tabId === 'tab-history') {
        loadActivitiesHistory();
    }
}

// 1. IMPORTAR DESDE EXCEL
function loadEventsFromExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet);

            if (jsonRows.length === 0) {
                alert("El archivo Excel está vacío.");
                return;
            }

            const builder = document.getElementById('events-builder');
            builder.innerHTML = '';

            jsonRows.forEach((row, index) => {
                const pregunta = row.Pregunta || row.pregunta || '';
                const op1 = row.Opcion_1 || row.opcion_1 || '';
                const op2 = row.Opcion_2 || row.opcion_2 || '';
                const op3 = row.Opcion_3 || row.opcion_3 || '';
                const op4 = row.Opcion_4 || row.opcion_4 || '';
                const correctaVal = parseInt(row.Correcta || row.correcta || 1);
                const correctIndex = isNaN(correctaVal) ? 0 : Math.max(0, correctaVal - 1);

                let options = [op1, op2];
                if (op3) options.push(op3);
                if (op4) options.push(op4);

                const eventData = {
                    year: `Pregunta ${index + 1}`,
                    description: pregunta,
                    question: pregunta,
                    options: options,
                    correctIndex: correctIndex > options.length - 1 ? 0 : correctIndex
                };

                addEventCard(eventData);
            });

            alert(`✅ ¡Se han cargado ${jsonRows.length} eventos exitosamente desde el Excel!`);
        } catch (error) {
            console.error(error);
            alert("Error al procesar el archivo Excel. Asegúrate de que tenga las columnas correctas[cite: 6].");
        }
    };
    reader.readAsArrayBuffer(file);
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

// Guardar Actividad
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    const timer = parseInt(document.getElementById('event-timer').value);
    const cards = document.querySelectorAll('.builder-card');
    
    let events = [];
    cards.forEach((card) => {
        if (!card.querySelector('.ev-q')) return;

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

    const activityData = {
        title: title,
        timer: timer,
        events: events,
        pin: currentPin,
        updatedAt: new Date().toISOString()
    };

    database.ref('activities/' + currentActivityId).set(activityData);
    currentLoadedActivityData = activityData;

    database.ref('sessions/' + currentActivityId).update({
        status: 'waiting',
        pin: currentPin,
        currentEventIndex: 0,
        mode: currentGameMode
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
        listenToSessionState(currentActivityId);
    });
});

// Selector de Modo de Juego
function updateGameMode(mode) {
    currentGameMode = mode;
    const btnNextManual = document.getElementById('btn-next-manual');
    
    if (mode === 'manual') {
        btnNextManual.classList.remove('hidden');
    } else {
        btnNextManual.classList.add('hidden');
    }

    if (currentActivityId) {
        database.ref('sessions/' + currentActivityId).update({ mode: mode });
    }
}

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
        alert("🚀 ¡Actividad Iniciada! Los aprendices ya pueden responder.");
    });
}

// Finalizar Actividad
function finishTimelineSession() {
    if (!currentActivityId) return;

    database.ref('sessions/' + currentActivityId).update({
        status: 'finished'
    }).then(() => {
        alert("🏁 Actividad finalizada correctamente.");
        switchTab('tab-analytics');
    });
}

// Botón manual para avanzar a la siguiente pregunta
function manualNextEvent() {
    if (!currentActivityId) return;

    database.ref('sessions/' + currentActivityId).once('value').then(snapshot => {
        const session = snapshot.val();
        if (!session) return;

        database.ref('activities/' + currentActivityId + '/events').once('value').then(evSnap => {
            const events = evSnap.val() || [];
            const nextIdx = (session.currentEventIndex || 0) + 1;

            if (nextIdx < events.length) {
                database.ref('sessions/' + currentActivityId).update({ currentEventIndex: nextIdx });
            } else {
                database.ref('sessions/' + currentActivityId).update({ status: 'finished' });
                alert("🏁 ¡Se han terminado todas las preguntas de la actividad!");
            }
        });
    });
}

// Escuchar cambios de sesión y renderizar pregunta activa al instructor / TV
function listenToSessionState(actId) {
    database.ref('sessions/' + actId).on('value', snapshot => {
        const session = snapshot.val();
        if (!session) return;

        const livePanel = document.getElementById('instructor-live-panel');

        if (session.status === 'active') {
            livePanel.classList.remove('hidden');
            const eventIdx = session.currentEventIndex || 0;

            if (currentLoadedActivityData && currentLoadedActivityData.events) {
                renderInstructorActiveQuestion(currentLoadedActivityData.events[eventIdx], eventIdx, currentLoadedActivityData.timer || 30);
            } else {
                database.ref('activities/' + actId).once('value').then(actSnap => {
                    currentLoadedActivityData = actSnap.val();
                    if (currentLoadedActivityData && currentLoadedActivityData.events) {
                        renderInstructorActiveQuestion(currentLoadedActivityData.events[eventIdx], eventIdx, currentLoadedActivityData.timer || 30);
                    }
                });
            }
        } else {
            livePanel.classList.add('hidden');
            if (instructorTimerInterval) clearInterval(instructorTimerInterval);
        }
    });
}

// Renderizar la pregunta e identificar la CORRECTA para proyecciones
function renderInstructorActiveQuestion(event, eventIndex, timerSeconds) {
    if (!event) return;

    document.getElementById('instructor-event-badge').innerText = event.year || `Evento ${eventIndex + 1}`;
    document.getElementById('instructor-question-text').innerText = event.question;

    const optionsContainer = document.getElementById('instructor-options-container');
    optionsContainer.innerHTML = '';

    const optionColors = ['var(--secondary)', 'var(--blue)', 'var(--warning)', 'var(--success)'];

    event.options.forEach((optText, idx) => {
        const div = document.createElement('div');
        const isCorrect = (idx === event.correctIndex);
        
        div.style.cssText = `
            padding: 16px; 
            border-radius: 10px; 
            color: white; 
            font-weight: bold; 
            font-size: 1.2rem;
            background: ${optionColors[idx % optionColors.length]}; 
            border: ${isCorrect ? '4px solid #28a745' : '1px solid transparent'};
            box-shadow: ${isCorrect ? '0 0 12px rgba(40, 167, 69, 0.8)' : 'none'};
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        div.innerHTML = `
            <span>${optText}</span>
            ${isCorrect ? '<span style="background: #28a745; color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.9rem;">✔ Respuesta Correcta</span>' : ''}
        `;
        optionsContainer.appendChild(div);
    });

    startInstructorTimer(timerSeconds);
}

function startInstructorTimer(seconds) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('instructor-timer-display');
    timerEl.innerText = timeLeft;

    if (instructorTimerInterval) clearInterval(instructorTimerInterval);

    instructorTimerInterval = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(instructorTimerInterval);
        }
    }, 1000);
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

    // Criterio de desempate: Puntuación descendente -> Tiempo de respuesta ascendente
    players.sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) {
            return (b.score || 0) - (a.score || 0);
        }
        return (a.totalTime || 0) - (b.totalTime || 0);
    });

    if (players[0]) {
        document.getElementById('p1-name').innerText = players[0].name;
        document.getElementById('p1-score').innerText = `${players[0].score || 0} pts`;
    }
    if (players[1]) {
        document.getElementById('p2-name').innerText = players[1].name;
        document.getElementById('p2-score').innerText =`${players[1].score || 0} pts`;
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
            <td><span style="color: green; font-weight: bold;">✔ ${p.correct || 0}</span></td>
            <td><span style="color: red; font-weight: bold;">✖ ${p.incorrect || 0}</span></td>
            <td><span style="color: #6c757d; font-weight: bold;">⌛ ${p.unanswered || 0}</span></td>
            <td><strong>${p.score || 0} pts</strong></td>
            <td>${p.totalTime || 0} s</td>
        `;
        tbody.appendChild(row);
    });
}

// 3. HISTORIAL Y ELIMINACIÓN DE ACTIVIDADES
function loadActivitiesHistory() {
    const historyContainer = document.getElementById('history-container');
    historyContainer.innerHTML = '<p>Cargando historial...</p>';

    database.ref('activities').once('value').then(snapshot => {
        const activities = snapshot.val() || {};
        historyContainer.innerHTML = '';

        const keys = Object.keys(activities);
        if (keys.length === 0) {
            historyContainer.innerHTML = '<p>No hay actividades guardadas aún.</p>';
            return;
        }

        keys.forEach(actId => {
            const act = activities[actId];
            const card = document.createElement('div');
            card.className = 'builder-card';
            card.style.cssText = 'background: white; padding: 20px; border-radius: 8px; border-left: 5px solid var(--primary); margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin: 0; color: var(--primary);">${act.title || 'Sin Título'}</h3>
                        <p style="margin: 5px 0 0; color: #666; font-size: 0.9rem;">PIN: <strong>${act.pin || 'N/A'}</strong> | Eventos: ${act.events ? act.events.length : 0}</p>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="loadActivityToBuilder('${actId}')">✏️ Editar / Usar</button>
                        <button class="btn btn-success" onclick="downloadActivityResults('${actId}', '${act.title || 'Actividad'}')">📥 Descargar Resultados (Excel)</button>
                        <button class="btn btn-danger" style="background: #dc3545;" onclick="deleteActivityFromHistory('${actId}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
            historyContainer.appendChild(card);
        });
    });
}

// Eliminar actividad del historial
function deleteActivityFromHistory(actId) {
    if (confirm("⚠️ ¿Estás seguro de que deseas eliminar esta actividad y todos sus registros de la base de datos?")) {
        database.ref('activities/' + actId).remove();
        database.ref('sessions/' + actId).remove().then(() => {
            alert("🗑️ Actividad eliminada correctamente.");
            loadActivitiesHistory();
        });
    }
}

function loadActivityToBuilder(actId) {
    window.location.href = `?id=${actId}`;
}

// Descargar reporte Excel con la estructura requerida
function downloadActivityResults(actId, activityTitle) {
    database.ref(`sessions/${actId}/players`).once('value').then(snapshot => {
        const playersObj = snapshot.val() || {};
        const playersArray = Object.keys(playersObj).map(key => playersObj[key]);

        if (playersArray.length === 0) {
            alert("No hay registros de participantes o resultados para esta actividad.");
            return;
        }

        playersArray.sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
            }
            return (a.totalTime || 0) - (b.totalTime || 0);
        });

        // Formato con el orden exacto solicitado
        const excelData = playersArray.map((p, index) => ({
            "Posición": index + 1,
            "Nombre completo": p.name || 'Anónimo',
            "Respuestas acertadas": p.correct || 0,
            "Respuestas incorrectas": p.incorrect || 0,
            "No Respondidas": p.unanswered || 0,
            "Puntuación": p.score || 0,
            "Tiempo (s)": p.totalTime || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");

        const safeTitle = activityTitle.replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(workbook, `Resultados_${safeTitle}.xlsx`);
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
                currentLoadedActivityData = data;
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
                listenToSessionState(activityId);
            }
        });
    } else {
        addEventCard();
    }
};