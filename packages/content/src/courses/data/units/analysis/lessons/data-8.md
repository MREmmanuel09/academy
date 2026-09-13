---
id: data-8
slug: data-8
title: Data Governance: GDPR, lineage, catalog, PII
module: devops
difficulty: advanced
estimatedMinutes: 10
xp: 80
---

# Data Governance: GDPR, lineage, catalog, PII

Gobernanza de datos. Compliance, lineage, catalog, manejo de PII. Lo que necesitas saber para no meterte en problemas.

## ¿Qué es Data Governance?

**Data Governance** es el conjunto de políticas, procesos, roles y herramientas que garantizan que los datos de una organización sean:
- **Confiables** (calidad)
- **Seguros** (privacidad, compliance)
- **Accesibles** (para quien los necesita)
- **Trazables** (sabes de dónde vienen, dónde están, quién los usa)

> Sin governance, tu data lake se convierte en un **data swamp** (pantano): un caos donde nadie sabe qué hay, de dónde viene o si es correcto.

## GDPR y compliance

**GDPR** (General Data Protection Regulation) es la ley europea de privacidad de datos (2018). Aplica a cualquier empresa que maneje datos de ciudadanos europeos.

### Derechos del usuario
- **Acceso**: el usuario puede pedir todos los datos que tienes de él
- **Rectificación**: puede pedir que corrijas datos incorrectos
- **Borrado** ("derecho al olvido"): puedes ser obligado a borrar sus datos
- **Portabilidad**: puede pedir sus datos en formato portable
- **Oposición**: puede oponerse a que uses sus datos para marketing

### Multas
Hasta **4% de la facturación anual global** o **20 millones de euros**, lo que sea mayor. Para una empresa grande, son **miles de millones**.

> **Otras regulaciones similares**: CCPA (California), LGPD (Brasil), Ley 1581 (Colombia). La tendencia global es más regulación, no menos.

## PII: la información sensible

**PII** (Personally Identifiable Information) es cualquier dato que pueda identificar a una persona.

### Categorías de PII
- **Directa**: nombre, email, teléfono, DNI, pasaporte
- **Indirecta**: dirección IP, device ID, cookies
- **Sensible** (categoría especial): salud, religión, orientación sexual, datos biométricos, financieros

### Cómo manejar PII

1. **Minimización**: solo recolecta lo que necesitas. ¿Realmente necesitas el DNI?
2. **Anonimización**: elimina el link al individuo. `"user_42"` en vez de `"Ana García"`
3. **Pseudonimización**: reemplaza con un identificador reversible solo para quien tiene la llave
4. **Cifrado**: en tránsito (TLS) y en reposo (AES-256)
5. **Access control**: solo personas autorizadas ven PII
6. **Auditoría**: log de quién accedió a qué dato y cuándo

```python
# Ejemplo: anonimización
import hashlib
def anonymize(email: str) -> str:
    return hashlib.sha256(email.encode() + SALT).hexdigest()[:16]
```

## Data Lineage: trazabilidad del dato

**Data Lineage** es el mapa de viaje del dato: de dónde viene, qué transformaciones sufre, y dónde termina.

```
[Stripe API] → [raw.payments] → [staging.payments] → [marts.fct_revenue] → [Dashboard]
   fuente         Bronze            Silver                 Gold                  consumidor
```

### Por qué importa
- **Debugging**: cuando un reporte da números raros, sigues el lineage hasta el origen
- **Auditoría**: demuestras al regulador de dónde sale cada número
- **Impacto**: si cambias una tabla, ves qué se ve afectado
- **Confianza**: los analistas confían en datos que pueden trazar

### Herramientas
- **dbt**: genera lineage automático de tus modelos
- **OpenLineage / Marquez**: estándar open source
- **DataHub (LinkedIn)**, **Amundsen (Lyft)**, **Atlan**: catálogos con lineage integrado
- **Glue Catalog (AWS)**: lineage en el ecosistema AWS

## Data Catalog: el inventario de tus datos

Un **Data Catalog** es como una "biblioteca" donde los usuarios descubren qué datos hay disponibles y cómo usarlos.

### Funciones clave
- **Descubrimiento**: buscar tablas/columnas por nombre, tag, descripción
- **Documentación**: cada tabla tiene descripción, owner, ejemplos
- **Línea de negocio**: `fct_orders` → equipo "Ventas", actualizado diariamente
- **Tags / glosario**: `revenue`, `active_user`, definiciones comunes a toda la empresa
- **Data quality**: tests, freshness, completitud
- **Permisos**: quién puede ver qué

### Herramientas populares
- **Open source**: DataHub, Amundsen, OpenMetadata
- **Comerciales**: Alation, Collibra, Atlan, Data.world
- **Cloud-native**: Glue Catalog (AWS), BigQuery Information Schema, Snowflake Information Schema

> **Sin catálogo, los analistas pierden horas buscando qué datos existen**. Es la pieza más subestimada de una buena plataforma de datos.

## Roles en un equipo de datos

### Data Engineer
- Construye los pipelines
- Modelo dimensional
- Performance de queries
- Stack: SQL + Python + Spark + dbt + Airflow

### Data Analyst
- Responde preguntas de negocio con SQL
- Construye dashboards
- Análisis ad-hoc
- Stack: SQL + BI tool + un poco de Python

### Data Scientist
- Modelos de ML
- Experimentación
- Investigación
- Stack: Python + pandas + scikit-learn + PyTorch

### Analytics Engineer (rol moderno, ~2018+)
- Vive entre el engineer y el analyst
- Modela datos con dbt
- Tests, documentación, lineage
- Es el "librero" del data warehouse

### Data Governance / Data Steward
- Define políticas de calidad, privacidad, seguridad
- Maneja compliance
- Dueño de los catálogos y glosarios
- Responde ante regulación

> **Los equipos modernos de datos** tienen los 5 roles. Una startup puede tenerlos combinados en 1-2 personas.

## Puntos clave

- Data Governance = políticas + procesos + roles + herramientas para datos confiables y seguros.
- GDPR y similares son ley: el mal manejo de PII cuesta multas enormes.
- PII se maneja con minimización, anonimización, cifrado y control de acceso.
- Lineage traza el viaje del dato; catalog documenta qué hay disponible. Ambos son críticos.
