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
        <input type="text" placeholder="Opción D" class="ev-o4">
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
