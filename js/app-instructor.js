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
let currentActivityCache = null;
let currentPlayersCache = [];
let lastTriggeredEventIndex = -1;

// Gestor de Pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const activeTabBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    if (tabId === 'tab-saved') {
        loadSavedActivities();
        loadHistorySessions();
    }
}

// Cargar plantilla HTML para cada evento
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

// Agregar opción adicional a un evento específico
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
    card.style.cssText = 'background: white; padding: 20px; border-radius: 8px; border-left: 5px solid var(--primary); margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';
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

// Reordenar números y nombres de los radios
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

// Generar PIN aleatorio de 6 dígitos
function generatePIN() {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${num.toString().substring(0,3)}-${num.toString().substring(3,6)}`;
}

// Importar archivo Excel o CSV usando SheetJS
function importExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonRows.length <= 1) {
                alert("El archivo Excel no contiene suficientes datos.");
                return;
            }

            const builder = document.getElementById('events-builder');
            builder.innerHTML = '';

            for (let i = 1; i < jsonRows.length; i++) {
                const row = jsonRows[i];
                if (!row || row.length === 0) continue;

                const year = row[0] || `Fase ${i}`;
                const description = row[1] || '';
                const question = row[2] || '';
                
                let options = [];
                let colIndex = 3;
                while (colIndex < row.length - 1 && row[colIndex] !== undefined && row[colIndex] !== '') {
                    options.push(String(row[colIndex]));
                    colIndex++;
                }

                if (options.length < 2) {
                    options = ['Opción A', 'Opción B'];
                }

                let correctIndex = parseInt(row[row.length - 1]) - 1;
                if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
                    correctIndex = 0;
                }

                addEventCard({
                    year: year,
                    description: description,
                    question: question,
                    options: options,
                    correctIndex: correctIndex
                });
            }

            alert("✅ ¡Preguntas importadas exitosamente desde el archivo!");
            event.target.value = '';
        } catch (error) {
            console.error(error);
            alert("Error al procesar el archivo Excel. Verifica el formato.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// Consultar actividades guardadas en Firebase
function loadSavedActivities() {
    const container = document.getElementById('saved-activities-container');
    container.innerHTML = '<p style="text-align: center; color: #888;">Cargando actividades guardadas...</p>';

    database.ref('activities').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No hay actividades guardadas todavía.</p>';
            return;
        }

        container.innerHTML = '';
        Object.keys(data).forEach(actId => {
            const act = data[actId];
            const eventsCount = act.events ? act.events.length : 0;
            const updatedAt = act.updatedAt ? new Date(act.updatedAt).toLocaleString() : 'Fecha no registrada';

            const card = document.createElement('div');
            card.className = 'builder-card';
            card.style.cssText = 'background: white; padding: 20px; border-radius: 8px; border-left: 5px solid var(--primary); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';
            card.innerHTML = `
                <div>
                    <h3 style="margin: 0 0 5px 0; color: var(--primary);">${act.title || 'Sin título'}</h3>
                    <p style="margin: 0; font-size: 0.9rem; color: #666;">📅 Última actualización: ${updatedAt} | 🧩 Eventos: ${eventsCount} | ⏱️ Timer: ${act.timer || 30}s</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-primary btn-sm" onclick="reuseActivity('${actId}')">♻️ Reutilizar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteActivity('${actId}')" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">🗑️ Eliminar</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// Reutilizar actividad guardada
function reuseActivity(actId) {
    database.ref('activities/' + actId).once('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            alert("No se encontró la actividad.");
            return;
        }

        currentActivityId = actId;
        currentActivityCache = data;
        document.getElementById('activity-title').value = data.title || '';
        document.getElementById('event-timer').value = data.timer || 30;
        if (data.controlMode) {
            document.getElementById('control-mode').value = data.controlMode;
        }
        currentPin = data.pin || generatePIN();

        const builder = document.getElementById('events-builder');
        builder.innerHTML = '';

        if (data.events && data.events.length > 0) {
            data.events.forEach(evData => addEventCard(evData));
        } else {
            addEventCard();
        }

        alert("✅ ¡Actividad cargada con éxito! Puedes editarla o habilitar el QR.");
        switchTab('tab-create');
    });
}

// Eliminar actividad guardada
function deleteActivity(actId) {
    if (confirm("¿Estás seguro de que deseas eliminar esta actividad guardada?")) {
        database.ref('activities/' + actId).remove().then(() => {
            alert("🗑️ Actividad eliminada correctamente.");
            loadSavedActivities();
        });
    }
}

// Consultar historial de sesiones guardadas
function loadHistorySessions() {
    const container = document.getElementById('history-container');
    container.innerHTML = '<p style="text-align: center; color: #888;">Cargando historial de ejecuciones...</p>';

    database.ref('history').once('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No hay historial de ejecuciones registrado aún.</p>';
            return;
        }

        container.innerHTML = '';
        Object.keys(data).reverse().forEach(histId => {
            const sess = data[histId];
            const dateStr = sess.completedAt ? new Date(sess.completedAt).toLocaleString() : 'Fecha no especificada';
            const totalPlayers = sess.players ? Object.keys(sess.players).length : 0;

            const card = document.createElement('div');
            card.className = 'builder-card';
            card.style.cssText = 'background: white; padding: 18px; border-radius: 8px; border-left: 5px solid var(--success); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';
            card.innerHTML = `
                <div>
                    <h3 style="margin: 0 0 5px 0; color: var(--success);">${sess.activityTitle || 'Sesión de Formación'}</h3>
                    <p style="margin: 0; font-size: 0.9rem; color: #555;">📌 PIN: <strong>${sess.pin || '---'}</strong> | 📅 Ejecución: ${dateStr} | 👥 Aprendices: ${totalPlayers}</p>
                </div>
                <div>
                    <button class="btn btn-success btn-sm" onclick="exportHistoryRecordToExcel('${histId}')">📥 Exportar Excel</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// Exportar historial específico a archivo Excel (.xlsx)
function exportHistoryRecordToExcel(histId) {
    database.ref('history/' + histId).once('value', snapshot => {
        const sess = snapshot.val();
        if (!sess || !sess.players) {
            alert("No hay datos de jugadores para exportar en esta sesión.");
            return;
        }

        generateExcelWorkbook(sess.activityTitle || 'Reporte_Timeline', sess.players);
    });
}

// Exportar la sesión actual activa a Excel
function exportCurrentSessionToExcel() {
    if (!currentPlayersCache || currentPlayersCache.length === 0) {
        alert("No hay datos de participantes en la sesión actual.");
        return;
    }

    const title = currentActivityCache ? currentActivityCache.title : 'Reporte_Timeline';
    generateExcelWorkbook(title, currentPlayersCache);
}

// Función auxiliar con SheetJS para armar el archivo Excel
function generateExcelWorkbook(title, playersData) {
    let playersList = Array.isArray(playersData) ? playersData : Object.values(playersData);

    playersList.sort((a, b) => (b.score || 0) - (a.score || 0));

    const excelRows = playersList.map((p, idx) => ({
        "Posición": `#${idx + 1}`,
        "Nombre Completo": p.name || 'Aprendiz',
        "Respuestas Correctas": p.correct || 0,
        "Respuestas Incorrectas": p.incorrect || 0,
        "No Respondidas": p.unanswered || 0,
        "Puntuación Total": p.score || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    
    // Ajustar anchos de columnas
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");

    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanTitle}_Resultados.xlsx`;

    XLSX.writeFile(workbook, fileName);
}

// Guardar/Actualizar Actividad
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    const timer = parseInt(document.getElementById('event-timer').value);
    const controlMode = document.getElementById('control-mode').value;
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

    if (!currentActivityId) {
        currentActivityId = 'act_' + Date.now();
    }
    if (!currentPin) {
        currentPin = generatePIN();
    }

    const activityData = {
        title: title,
        timer: timer,
        controlMode: controlMode,
        events: events,
        pin: currentPin,
        updatedAt: new Date().toISOString()
    };

    database.ref('activities/' + currentActivityId).set(activityData);
    currentActivityCache = activityData;

    database.ref('sessions/' + currentActivityId).update({
        status: 'waiting',
        pin: currentPin,
        controlMode: controlMode,
        currentEventIndex: 0
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
        document.getElementById('start-session-btn').classList.add('hidden');
        document.getElementById('instructor-live-panel').classList.remove('hidden');
        
        if (currentActivityCache && currentActivityCache.controlMode === 'manual') {
            document.getElementById('instructor-manual-controls').classList.remove('hidden');
        }
        
        startInstructorLiveMonitor();
        alert("🚀 ¡Actividad Iniciada!");
    });
}

// Control Manual: Siguiente Pregunta
function nextManualEvent() {
    if (!currentActivityCache || !currentActivityCache.events) return;
    
    database.ref('sessions/' + currentActivityId).once('value').then(snapshot => {
        const data = snapshot.val() || {};
        const currentIndex = data.currentEventIndex !== undefined ? data.currentEventIndex : 0;
        const nextIndex = currentIndex + 1;

        if (nextIndex < currentActivityCache.events.length) {
            database.ref(`sessions/${currentActivityId}`).update({
                currentEventIndex: nextIndex
            });
        } else {
            // Finalizar actividad y guardar automáticamente en el historial
            finishAndArchiveSession();
        }
    });
}

// Finalizar la sesión activa y guardarla permanentemente en el historial
function finishAndArchiveSession() {
    database.ref(`sessions/${currentActivityId}`).update({ status: 'finished' });

    database.ref(`sessions/${currentActivityId}/players`).once('value', snapshot => {
        const playersData = snapshot.val() || {};
        const historyId = 'hist_' + Date.now();

        database.ref('history/' + historyId).set({
            activityId: currentActivityId,
            activityTitle: currentActivityCache ? currentActivityCache.title : 'Actividad Realizada',
            pin: currentPin,
            players: playersData,
            completedAt: new Date().toISOString()
        }).then(() => {
            alert("🏁 La actividad ha finalizado y sus resultados fueron guardados en el historial.");
        });
    });
}

// Celebración con confeti
function triggerCelebration() {
    confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6, x: 0.2 },
        colors: ['#46178f', '#eb1343', '#26890c', '#e2a000', '#1368ce']
    });
    confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6, x: 0.8 },
        colors: ['#46178f', '#eb1343', '#26890c', '#e2a000', '#1368ce']
    });
}

// Monitoreo en vivo para el instructor
function startInstructorLiveMonitor() {
    database.ref('sessions/' + currentActivityId).on('value', snapshot => {
        const sessionData = snapshot.val();
        if (!sessionData || !currentActivityCache) return;

        if (sessionData.status === 'active') {
            const eventIndex = sessionData.currentEventIndex || 0;
            const events = currentActivityCache.events;

            if (events && events[eventIndex]) {
                const ev = events[eventIndex];
                document.getElementById('live-event-badge').innerText = ev.year || `Evento ${eventIndex + 1}`;
                document.getElementById('live-question-text').innerText = ev.question;

                const optContainer = document.getElementById('live-options-container');
                optContainer.innerHTML = '';
                ev.options.forEach((optText, idx) => {
                    const btn = document.createElement('div');
                    const isCorrect = idx === ev.correctIndex;
                    btn.style.cssText = `padding: 12px; border-radius: 8px; font-weight: bold; background: ${isCorrect ? '#26890c' : '#e9ecef'}; color: ${isCorrect ? 'white' : '#333'}; font-size: 1.1rem; box-shadow: ${isCorrect ? '0 4px 12px rgba(38, 137, 12, 0.4)' : 'none'};`;
                    btn.innerText = `${String.fromCharCode(65 + idx)}. ${optText} ${isCorrect ? '✔ (Correcta)' : ''}`;
                    optContainer.appendChild(btn);
                });

                if (eventIndex !== lastTriggeredEventIndex) {
                    lastTriggeredEventIndex = eventIndex;
                    triggerCelebration();
                }
            }
        }
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
        currentPlayersCache = playerArray;
        updateAnalyticsAndPodium(playerArray);
    });
}

// Actualizar Estadísticas, Podio y Tabla
function updateAnalyticsAndPodium(players) {
    if (players.length === 0) return;

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnanswered = 0;
    const totalEventsCount = currentActivityCache && currentActivityCache.events ? currentActivityCache.events.length : 1;

    players.forEach(p => {
        totalCorrect += (p.correct || 0);
        totalIncorrect += (p.incorrect || 0);
        const answered = (p.correct || 0) + (p.incorrect || 0);
        p.unanswered = Math.max(0, totalEventsCount - answered);
        totalUnanswered += p.unanswered;
    });

    const totalAnswers = totalCorrect + totalIncorrect + totalUnanswered;
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
            <td><span style="color: #6c757d;">⏳ ${p.unanswered || 0}</span></td>
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
                currentActivityCache = data;
                document.getElementById('activity-title').value = data.title || '';
                document.getElementById('event-timer').value = data.timer || 30;
                if (data.controlMode) {
                    document.getElementById('control-mode').value = data.controlMode;
                }
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