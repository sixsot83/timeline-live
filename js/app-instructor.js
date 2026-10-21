let currentActivityId = null;
let allPlayers = {};
let currentEventIndex = 0;
let currentActivityData = null;

// ===== Gestor de pestañas =====
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const btn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (btn) btn.classList.add('active');
}

// ===== Renderizar tarjeta de evento =====
function createEventCardHTML(index, data = {}) {
    const year = data.year || '';
    const desc = data.description || '';
    const question = data.question || '';
    const opts = data.options || ['', '', ''];
    const correctIdx = data.correctIndex !== undefined ? data.correctIndex : 0;

    return `
        <div class="builder-card-header">
            <h4>Evento <span class="event-number">${index}</span></h4>
            <button type="button" class="btn btn-danger" onclick="removeEventCard(this)">🗑️ Eliminar</button>
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
            <label style="font-size:0.85rem;">Opciones (marca la correcta):</label>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <input type="radio" name="correct-${index}" value="0" class="ev-correct" ${correctIdx === 0 ? 'checked' : ''} style="width:auto;">
                <input type="text" placeholder="Opción A" value="${opts[0] || ''}" class="ev-o1" required>
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <input type="radio" name="correct-${index}" value="1" class="ev-correct" ${correctIdx === 1 ? 'checked' : ''} style="width:auto;">
                <input type="text" placeholder="Opción B" value="${opts[1] || ''}" class="ev-o2" required>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="radio" name="correct-${index}" value="2" class="ev-correct" ${correctIdx === 2 ? 'checked' : ''} style="width:auto;">
                <input type="text" placeholder="Opción C" value="${opts[2] || ''}" class="ev-o3" required>
            </div>
        </div>
    `;
}

function addEventCard(data = null) {
    const builder = document.getElementById('events-builder');
    const count = builder.children.length + 1;
    const card = document.createElement('div');
    card.className = 'builder-card';
    card.innerHTML = createEventCardHTML(count, data || {});
    builder.appendChild(card);
    updateEventNumbers();
}

function removeEventCard(button) {
    const card = button.closest('.builder-card');
    const builder = document.getElementById('events-builder');
    if (builder.children.length <= 1) {
        alert("Debes mantener al menos un evento.");
        return;
    }
    card.remove();
    updateEventNumbers();
}

function updateEventNumbers() {
    document.querySelectorAll('#events-builder .builder-card').forEach((card, idx) => {
        const num = card.querySelector('.event-number');
        if (num) num.innerText = idx + 1;
        card.querySelectorAll('.ev-correct').forEach(r => r.name = 'correct-' + (idx + 1));
    });
}

// ===== GUARDAR EN FIREBASE =====
document.getElementById('timeline-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('activity-title').value;
    const timer = parseInt(document.getElementById('event-timer').value);
    const cards = document.querySelectorAll('.builder-card');

    if (cards.length === 0) {
        alert("❌ Agrega al menos un evento.");
        return;
    }

    let events = [];
    cards.forEach((card) => {
        const correctRadio = card.querySelector('.ev-correct:checked');
        events.push({
            year: card.querySelector('.ev-year').value,
            description: card.querySelector('.ev-desc').value,
            question: card.querySelector('.ev-q').value,
            options: [
                card.querySelector('.ev-o1').value,
                card.querySelector('.ev-o2').value,
                card.querySelector('.ev-o3').value
            ],
            correctIndex: correctRadio ? parseInt(correctRadio.value) : 0
        });
    });

    if (!currentActivityId) {
        currentActivityId = 'act_' + Date.now();
    }

    const saveBtn = document.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "⏳ Guardando...";
    saveBtn.disabled = true;

    // Intentar guardar
    database.ref('activities/' + currentActivityId).set({
        title: title,
        timer: timer,
        events: events,
        updatedAt: new Date().toISOString()
    }).then(() => {
        // Inicializar sesión del lobby
        return database.ref('sessions/' + currentActivityId).update({
            status: 'LOBBY',
            currentEventIndex: 0
        });
    }).then(() => {
        // Generar URL del estudiante de forma segura
        // Detecta si está en GitHub Pages, localhost o abierto directo
        let baseUrl = window.location.href.split('?')[0]; 
        if(baseUrl.endsWith('index.html')) {
            baseUrl = baseUrl.replace('index.html', 'student.html');
        } else if (!baseUrl.endsWith('/')) {
            baseUrl = baseUrl + '/';
        }
        if(baseUrl.endsWith('/')) {
            baseUrl = baseUrl + 'student.html';
        }

        const studentUrl = `${baseUrl}?activityId=${currentActivityId}`;

        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: studentUrl,
            width: 180,
            height: 180
        });
        document.getElementById('share-url').innerText = studentUrl;

        window.history.pushState({}, '', `?id=${currentActivityId}`);
        switchTab('tab-lobby');
        listenToParticipants(currentActivityId);
        
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
        alert("✅ ¡Guardado en la nube con éxito!\n\nLos aprendices pueden escanear el QR.");
    }).catch((error) => {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
        console.error("Error Firebase:", error);
        alert("❌ ERROR AL GUARDAR EN FIREBASE:\n" + error.message + "\n\nRevisa las reglas de tu base de datos (deben estar en modo prueba) y tu conexión.");
    });
});

// ===== Cargar si hay ?id= =====
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('id');

    if (activityId) {
        currentActivityId = activityId;
        database.ref('activities/' + activityId).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                currentActivityData = data;
                document.getElementById('activity-title').value = data.title;
                document.getElementById('event-timer').value = data.timer;

                const builder = document.getElementById('events-builder');
                builder.innerHTML = '';
                if (data.events && data.events.length > 0) {
                    data.events.forEach(ev => addEventCard(ev));
                } else {
                    addEventCard();
                }
                listenToParticipants(activityId);
            }
        }).catch(err => {
            console.error("Error cargando actividad:", err);
        });
    } else {
        // Cargar ejemplos por defecto
        addEventCard({
            year: 'Fase 1 - Análisis',
            description: 'Se definen los requerimientos del software y el alcance del proyecto.',
            question: '¿Cuál es el objetivo principal de esta fase?',
            options: ['Comprender y documentar requerimientos', 'Escribir código en producción', 'Diseñar la base de datos'],
            correctIndex: 0
        });
        addEventCard({
            year: 'Fase 2 - Diseño',
            description: 'Se establece la arquitectura del sistema y los modelos de datos.',
            question: '¿Qué se define principalmente en la fase de diseño?',
            options: ['La arquitectura y los modelos de datos', 'El presupuesto del proyecto', 'El manual de usuario final'],
            correctIndex: 0
        });
    }
};

// ===== Escuchar participantes =====
function listenToParticipants(actId) {
    database.ref('sessions/' + actId + '/players').on('value', (snapshot) => {
        allPlayers = snapshot.val() || {};
        const playersList = document.getElementById('players-list');
        const countSpan = document.getElementById('player-count');

        playersList.innerHTML = '';
        const arr = [];
        Object.keys(allPlayers).forEach(key => {
            const p = allPlayers[key];
            arr.push(p);
            const chip = document.createElement('li');
            chip.innerText = p.name;
            playersList.appendChild(chip);
        });
        countSpan.innerText = arr.length;
        updateAnalyticsAndPodium(arr);
    });
}

// ===== Iniciar juego =====
function startGame() {
    if (!currentActivityId) {
        alert("Primero guarda la actividad.");
        return;
    }
    const totalPlayers = Object.keys(allPlayers).length;
    if (totalPlayers === 0) {
        alert("No hay aprendices conectados.");
        return;
    }

    currentEventIndex = 0;
    database.ref('sessions/' + currentActivityId).update({
        status: 'STARTED',
        currentEventIndex: 0
    }).then(() => {
        switchTab('tab-game');
        showGameEvent(0);
        listenToGameState();
    }).catch(err => alert("Error al iniciar: " + err.message));
}

// ===== Mostrar evento actual =====
function showGameEvent(index) {
    database.ref('activities/' + currentActivityId).once('value').then(snap => {
        const data = snap.val();
        currentActivityData = data;
        if (data && data.events && data.events[index]) {
            const ev = data.events[index];
            document.getElementById('event-badge-game').innerText = ev.year || `Evento ${index + 1}`;
            document.getElementById('current-event-title').innerText = ev.year || `Evento ${index + 1}`;
            document.getElementById('current-event-question').innerText = ev.question;
            startInstructorTimer(data.timer || 30);
        }
    });
}

// ===== Timer del instructor =====
let instructorTimerInterval = null;
function startInstructorTimer(seconds) {
    if (instructorTimerInterval) clearInterval(instructorTimerInterval);
    let remaining = seconds;
    document.getElementById('instructor-timer').innerText = remaining;
    instructorTimerInterval = setInterval(() => {
        remaining--;
        document.getElementById('instructor-timer').innerText = Math.max(remaining, 0);
        if (remaining <= 0) clearInterval(instructorTimerInterval);
    }, 1000);
}

// ===== Escuchar estado =====
let gameStateAttached = false;
function listenToGameState() {
    if (gameStateAttached) return;
    gameStateAttached = true;
    database.ref('sessions/' + currentActivityId + '/currentEventIndex').on('value', (snap) => {
        const idx = snap.val();
        if (idx !== null && idx !== undefined && idx !== currentEventIndex) {
            currentEventIndex = idx;
            showGameEvent(idx);
        }
    });
}

// ===== Siguiente evento =====
function nextEvent() {
    if (!currentActivityData || !currentActivityData.events) return;
    const nextIdx = currentEventIndex + 1;
    if (nextIdx >= currentActivityData.events.length) {
        finishGame();
        return;
    }
    currentEventIndex = nextIdx;
    database.ref('sessions/' + currentActivityId).update({ currentEventIndex: nextIdx });
    showGameEvent(nextIdx);
}

// ===== Finalizar =====
function finishGame() {
    if (!currentActivityId) return;
    database.ref('sessions/' + currentActivityId).update({ status: 'FINISHED' }).then(() => {
        if (instructorTimerInterval) clearInterval(instructorTimerInterval);
        switchTab('tab-analytics');
        alert("🏁 Actividad finalizada. Revisa el podio y descarga el Excel.");
    });
}

// ===== Podio =====
function updateAnalyticsAndPodium(players) {
    if (!players || players.length === 0) return;

    players.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const avgA = a.totalTime && a.answered ? a.totalTime / a.answered : 999;
        const avgB = b.totalTime && b.answered ? b.totalTime / b.answered : 999;
        return avgA - avgB;
    });

    const setP = (pos, nameEl, scoreEl) => {
        const p = players[pos - 1];
        document.getElementById(nameEl).innerText = p ? p.name : '-';
        document.getElementById(scoreEl).innerText = p ? `${p.score || 0} pts` : '0 pts';
    };
    setP(1, 'p1-name', 'p1-score');
    setP(2, 'p2-name', 'p2-score');
    setP(3, 'p3-name', 'p3-score');

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    players.forEach((p, idx) => {
        const answered = p.answered || 0;
        const correct = p.correct || 0;
        const incorrect = p.incorrect || 0;
        const total = correct + incorrect;
        const promedio = total > 0 ? ((correct / total) * 100).toFixed(1) + '%' : '0%';
        const avgTime = answered > 0 ? (p.totalTime / answered).toFixed(2) : '-';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td>${p.name}</td>
            <td><span style="color: green;">✔ ${correct}</span></td>
            <td><span style="color: red;">✖ ${incorrect}</span></td>
            <td>${promedio}</td>
            <td>${avgTime}s</td>
            <td><strong>${p.score || 0} pts</strong></td>
        `;
        tbody.appendChild(row);
    });
}

// ===== Exportar Excel =====
function exportToExcel() {
    const table = document.querySelector('.leaderboard-table');
    const wb = XLSX.utils.table_to_book(table, { sheet: "Resultados" });
    XLSX.writeFile(wb, `TimelineLive_Resultados_${currentActivityId || 'actividad'}.xlsx`);
}
