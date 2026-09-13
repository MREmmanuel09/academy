---
id: sre-1
slug: sre-1
title: SRE: Site Reliability Engineering
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 90
---

# SRE: Site Reliability Engineering

Google SRE, SLOs, error budgets, toil, on-call. Ingeniería para confiabilidad.

## ¿Qué es SRE?

**SRE** (Site Reliability Engineering) es la disciplina creada por Google que aplica ingeniería de software a problemas de operaciones. Su objetivo: construir sistemas **ultra confiables** sin sacrificar la velocidad.

### Pilares

1. **SLOs/SLIs/SLAs**: definir y medir confiabilidad
2. **Error budgets**: cuánto downtime es aceptable
3. **Toil**: trabajo manual repetitivo que debe automatizarse
4. **Runbooks**: procedimientos documentados
5. **Blameless postmortems**: aprender sin culpar
6. **On-call rotations**: respuesta a incidentes estructurada
7. **Chaos engineering**: probar que fallas

> **Filosofía clave**: 100% de uptime NO es el objetivo. El objetivo es el **SLO correcto** para tu servicio. Aspirar a 100% te hace lento.

## SLIs, SLOs, SLAs

**SLI** (Service Level Indicator): la métrica. Ej: latencia p99, error rate, throughput.

**SLO** (Service Level Objective): el objetivo. Ej: "99.9% de requests con latencia < 200ms en 30 días".

**SLA** (Service Level Agreement): el contrato legal con el cliente. Incluye compensación si no se cumple. Siempre SLO >= SLA (tienes un margen).

### Ejemplo real

- **SLI**: latencia p99 medida en el balanceador
- **SLO**: 99% de requests < 100ms en 30 días
- **Error budget**: 0.1% = ~43 minutos de downtime/mes

**Availability tiers**:
- 99% = 3.65 días/año
- 99.9% (3 nueves) = 8.77 horas/año
- 99.99% (4 nueves) = 52.6 minutos/año
- 99.999% (5 nueves) = 5.26 minutos/año

Cada nueve cuesta 10x más. Pregúntate: ¿realmente necesitas 5 nueves?

## Error budgets

Si tu SLO es 99.9%, tienes un **error budget de 0.1%**. Si lo quemas:

1. **Dentro del budget** (verde): el equipo puede hacer deploys riesgosos, feature launches
2. **Cerca del límite** (amarillo): frenar deploys, focus en estabilidad
3. **Quemado** (rojo): feature freeze, todo el equipo trabaja en reliability

> **Cambio cultural radical**: el error budget **enfrenta a devs con ops**. Antes: devs querían features, ops quería estabilidad. Ahora: si se quema el budget, devs sienten el dolor (no deploys nuevos).

### Toil

**Toil** = trabajo manual, repetitivo, automatizable, sin valor a largo plazo.

Ejemplos:
- Reiniciar servers manualmente cada lunes
- Responder tickets que un script podría resolver
- Logs en grep manual

**Regla 50%**: un SRE debe gastar <50% de su tiempo en toil. El resto: proyectos de ingeniería.

## On-call y postmortems

**On-call rotation**: el equipo rota ser el "respondedor primario" durante una semana. Recibe páginas (alertas).

**Buenas prácticas**:
- Pager rotation: secundario también
- Rotación: max 1 semana, después rotar
- Compensación: tiempo libre después de guardia
- Runbooks: cada alerta tiene un procedimiento
- Alert quality: solo páginas que requieren acción humana

### Blameless postmortem

Cuando hay un incidente:

1. **Timeline**: qué pasó, cuándo, en qué orden
2. **Root cause**: por qué falló, no quién
3. **Contributing factors**: qué contribuyó (configuración, falta de tests, etc)
4. **Action items**: prevenir que vuelva a pasar, con dueños y fechas
5. **Lessons learned**: qué hacer diferente

> **Blameless** significa que el objetivo es aprender del sistema, no castigar a personas. Errores humanos son síntomas de problemas sistémicos.

## Puntos clave

- SRE aplica ingeniería a operaciones: SLOs, error budgets, automatización de toil.
- SLI = métrica, SLO = objetivo, SLA = contrato legal (SLO > SLA).
- Error budget enfrentan devs con ops: si se quema, feature freeze.
- Blameless postmortems aprenden del sistema, no castigan personas.

:::quiz
[
  {
    "question": "SLI, SLO y SLA en una frase?",
    "options": ["Sinonimos", "SLI metrica, SLO objetivo interno, SLA contrato con consecuencias", "Todo marketing", "Solo Google los usa"],
    "correctIndex": 1,
    "explanation": "Mides (SLI), te comprometes dentro (SLO mas estricto) y firmas fuera (SLA)."
  },
  {
    "question": "Se quema el error budget. Que pasa?",
    "options": ["Nada", "Feature freeze: fiabilidad antes que features", "Mas deploys", "Se borran SLOs"],
    "correctIndex": 1,
    "explanation": "El budget alinea incentivos: sin margen de error, toca estabilizar."
  },
  {
    "question": "Que hace blameless un postmortem?",
    "options": ["No hacerlo", "Buscar fallos del sistema y acciones, no culpables", "Culpar al junior", "Ocultarlo"],
    "correctIndex": 1,
    "explanation": "Sin culpa hay honestidad y aprendizaje real; con culpa hay encubrimiento."
  }
]
:::
