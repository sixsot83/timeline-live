# ⏳ TimelineLive

Plataforma tipo Kahoot para construir líneas de tiempo interactivas con preguntas cronológicas.

## 🚀 Características

- Panel del instructor para crear, editar y eliminar eventos con preguntas.
- Generación automática de código QR para que los aprendices se conecten.
- Temporizador por pregunta y puntuación por velocidad (fórmula Kahoot).
- Podio con 🏆 trofeo, 🥈 plata y 🥉 bronce.
- Tabla general con aciertos, errores, promedio y tiempo promedio.
- Exportación de resultados a Excel.

## 🔧 Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Realtime Database** en modo de prueba.
3. Copia tu configuración en `js/firebase-config.js`.
4. Reglas recomendadas para desarrollo:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}