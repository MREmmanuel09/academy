---
id: data-3
slug: data-3
title: Calidad del dato
module: devops
difficulty: intermediate
estimatedMinutes: 7
xp: 70
---

# Calidad del dato

Validación, nulls, outliers, data drift. Por qué los datos malos son el enemigo #1.

## ¿Por qué importa la calidad?

**"Garbage in, garbage out"**. Si tus datos están sucios, todos los modelos, reportes y decisiones que generes a partir de ellos estarán mal.

Un estudio de IBM estima que los datos de baja calidad le cuestan a la economía **~3.1 billones de dólares al año**.

### Síntomas típicos de datos sucios

- Reportes que nadie se cree
- KPIs que se contradicen entre sí
- Modelos de ML que funcionan en test pero fallan en producción
- Decisiones que se toman "con la mano en la cintura" porque "los datos no sirven"

> **Lección de oro**: invertir 1 hora en validar datos al inicio ahorra 10 horas de debugging después.

## Las 6 dimensiones de la calidad

### 1. Completitud
¿Tenemos todos los datos que deberíamos?
- `NULL` donde no debería haber null
- Filas faltantes (ej. una orden sin customer_id)

### 2. Exactitud (Accuracy)
¿Los valores son correctos?
- Edad `250`, email `no-email`
- Coordenadas en medio del océano

### 3. Consistencia
¿El mismo dato se ve igual en todos los sistemas?
- Mismo cliente con dos direcciones de email distintas
- Total de orden que no cuadra con suma de items

### 4. Validez (Validity)
¿Los datos cumplen las reglas del esquema?
- ZIP code con letras cuando solo acepta números
- Edad negativa
- `country` que no está en la lista de países válidos

### 5. Unicidad
¿No hay duplicados no deseados?
- Misma orden registrada dos veces
- Mismo usuario con dos IDs distintos

### 6. Actualidad (Timeliness)
¿Los datos están al día?
- Reportes de "hoy" generados con datos de ayer
- Cache desactualizado

## Nulls: el clásico enemigo

Los **valores nulos** son el problema #1 de calidad. Pero ojo: un null no siempre significa lo mismo.

### Tipos de null (semántica)

| Tipo | Significado | Ejemplo |
|------|-------------|---------|
| **Null propio** | "No hay valor" | Teléfono de un cliente que no tiene teléfono |
| **Null desconocido** | "Existe pero no lo sé" | Email de un usuario que aún no lo proporcionó |
| **Null no aplicable** | "No aplica en este contexto" | `fecha_fin` de una suscripción que sigue activa |

### Estrategias para manejar nulls

```sql
-- Filtrar
SELECT * FROM users WHERE email IS NOT NULL;

-- Reemplazar con un valor por defecto
SELECT COALESCE(phone, 'NO TIENE') FROM users;

-- Imputar con la media (cuidado, introduce sesgo)
SELECT AVG(age) FROM users; -- para imputar

-- Marcar explícitamente
SELECT 
  age,
  CASE WHEN age IS NULL THEN 'missing' ELSE 'present' END as age_status
FROM users;
```

> **Nunca borres nulls a ciegas**. Primero entiende por qué existen.

## Outliers y data drift

### Outliers (valores atípicos)

Un dato que se aleja significativamente del resto. Pueden ser:
- **Errores** (sensor descalibrado, typo) → corregir o borrar
- **Reales pero raros** (CEO gana 1000x la media) → dejar pero analizar aparte

**Detección**:
```sql
-- IQR method
WITH stats AS (
  SELECT 
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY amount) AS q1,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY amount) AS q3
  FROM orders
)
SELECT *
FROM orders, stats
WHERE amount < q1 - 1.5 * (q3 - q1)
   OR amount > q3 + 1.5 * (q3 - q1);
```

### Data drift

La distribución de los datos cambia con el tiempo. Tu modelo (o dashboard) deja de funcionar.

**Ejemplo**: un modelo de fraude entrenado en 2020 no detecta los patrones de fraude de 2026.

**Detección**:
- Comparar distribución del último mes vs los 6 meses anteriores
- Tests estadísticos (KS test, chi-cuadrado)
- Monitoreo continuo de features en producción

> **El drift es la razón #1 por la que los modelos de ML se degradan en producción**.

## Validación con herramientas

### Great Expectations / Pandera / dbt tests

En lugar de validar "a mano", herramientas dedicadas:

```python
# Pandera
import pandera as pa

schema = pa.DataFrameSchema({
    "user_id": pa.Column(int, pa.Check.greater_than(0)),
    "email": pa.Column(str, pa.Check.str_matches(r"^[^@]+@[^@]+\\.[^@]+$")),
    "age": pa.Column(int, pa.Check.in_range(0, 120)),
})
```

```sql
-- dbt tests
SELECT * FROM users WHERE age < 0 OR age > 120  -- debe devolver 0 filas
SELECT user_id, COUNT(*) FROM users GROUP BY user_id HAVING COUNT(*) > 1  -- debe devolver 0
```

> **Regla**: cualquier transformación debe tener tests asociados. Un cambio sin test es un bug esperando a pasar.

## Puntos clave

- La calidad se mide en 6 dimensiones: completitud, exactitud, consistencia, validez, unicidad, actualidad.
- Los nulls tienen semántica: propio, desconocido, no aplicable. Nunca los borres a ciegas.
- Los outliers pueden ser errores o eventos raros reales: analiza antes de decidir.
- El data drift degrada modelos con el tiempo. Monitorea distribución continuamente.
