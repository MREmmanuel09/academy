---
id: sql-8
slug: sql-8
title: SQL para Analytics: cohort, funnel, retention, LTV
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 95
---

# SQL para Analytics: cohort, funnel, retention, LTV

Patrones SQL para análisis de producto. Cohort analysis, funnels, retención, LTV.

## SQL para product analytics

Un data analyst o data scientist pasa el 80% de su tiempo escribiendo **SQL para responder preguntas de negocio**. Las preguntas se repiten una y otra vez. Veamos los patrones más comunes.

## Cohort analysis

Un **cohort** es un grupo de usuarios que comparten una característica (ej. mes de signup). El análisis de cohortes te dice cómo se comporta cada cohorte con el tiempo.

**Pregunta típica**: "¿Cuántos usuarios que se unieron en enero 2026 siguen activos 30 días después?"

```sql
WITH user_cohorts AS (
  SELECT 
    user_id,
    DATE_TRUNC('month', created_at) AS cohort_month
  FROM users
),
user_activity AS (
  SELECT 
    uc.user_id,
    uc.cohort_month,
    DATE_TRUNC('month', a.activity_date) AS activity_month,
    EXTRACT(MONTH FROM AGE(a.activity_date, uc.cohort_month)) AS months_since_signup
  FROM user_cohorts uc
  JOIN activity a ON uc.user_id = a.user_id
)
SELECT 
  cohort_month,
  months_since_signup,
  COUNT(DISTINCT user_id) AS active_users
FROM user_activity
GROUP BY cohort_month, months_since_signup
ORDER BY cohort_month, months_since_signup;
```

> **Output típico**: una tabla cohort_matrix donde cada fila es un mes de signup, cada columna un mes de actividad, y el valor es el % de retención.

## Funnel analysis

Un **funnel** (embudo) mide cuántos usuarios pasan por cada paso de un proceso. Ejemplo: signup → verificación → primer purchase.

```sql
WITH funnel AS (
  SELECT
    COUNT(DISTINCT user_id) AS step1_signup,
    COUNT(DISTINCT CASE WHEN verified THEN user_id END) AS step2_verified,
    COUNT(DISTINCT CASE WHEN made_first_purchase THEN user_id END) AS step3_purchased
  FROM users
)
SELECT
  step1_signup,
  step2_verified,
  ROUND(100.0 * step2_verified / step1_signup, 2) AS step1_to_step2_pct,
  step3_purchased,
  ROUND(100.0 * step3_purchased / step2_verified, 2) AS step2_to_step3_pct
FROM funnel;
```

### Window functions para funnel paso a paso
```sql
WITH events AS (
  SELECT user_id, event_name, event_time
  FROM events
  WHERE event_name IN ('view_item', 'add_to_cart', 'checkout', 'purchase')
),
funnel_steps AS (
  SELECT 
    event_name,
    COUNT(DISTINCT user_id) AS users
  FROM events
  GROUP BY event_name
)
SELECT 
  event_name,
  users,
  ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY users DESC), 2) AS pct_of_top
FROM funnel_steps
ORDER BY users DESC;
```

## Retention: ¿vuelven los usuarios?

**Retention** = % de usuarios que regresan en un período posterior.

```sql
-- Retention semana a semana
WITH weekly_activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', activity_date) AS week
  FROM activity
),
first_week AS (
  SELECT user_id, MIN(week) AS signup_week
  FROM weekly_activity
  GROUP BY user_id
),
retention AS (
  SELECT 
    fw.signup_week,
    wa.week AS active_week,
    EXTRACT(WEEK FROM wa.week - fw.signup_week) AS weeks_since_signup,
    COUNT(DISTINCT wa.user_id) AS users
  FROM first_week fw
  JOIN weekly_activity wa ON fw.user_id = wa.user_id
  GROUP BY fw.signup_week, wa.week
)
SELECT 
  signup_week,
  MAX(CASE WHEN weeks_since_signup = 0 THEN users END) AS w0,
  MAX(CASE WHEN weeks_since_signup = 1 THEN users END) AS w1,
  MAX(CASE WHEN weeks_since_signup = 4 THEN users END) AS w4
FROM retention
GROUP BY signup_week
ORDER BY signup_week;
```

> **Benchmarks**: una retention >40% en w1 es excelente para apps móviles. <20% necesita mejorar el onboarding.

## LTV: Lifetime Value

**LTV** = cuánto dinero genera un usuario en toda su vida como cliente. Crítico para CAC (Customer Acquisition Cost).

```sql
-- LTV simple: revenue total promedio por usuario
SELECT 
  AVG(user_ltv) AS avg_ltv,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY user_ltv) AS median_ltv
FROM (
  SELECT 
    user_id,
    SUM(total) AS user_ltv
  FROM orders
  GROUP BY user_id
) t;

-- LTV por cohorte (más útil)
WITH cohort_revenue AS (
  SELECT 
    DATE_TRUNC('month', u.created_at) AS cohort,
    u.user_id,
    COALESCE(SUM(o.total), 0) AS revenue
  FROM users u
  LEFT JOIN orders o ON u.user_id = o.customer_id
  GROUP BY DATE_TRUNC('month', u.created_at), u.user_id
)
SELECT 
  cohort,
  COUNT(DISTINCT user_id) AS users,
  AVG(revenue) AS avg_ltv,
  SUM(revenue) AS total_revenue
FROM cohort_revenue
GROUP BY cohort
ORDER BY cohort;
```

> **Regla de oro SaaS**: LTV debe ser al menos **3x CAC** para tener un negocio saludable. Si LTV/CAC < 1, estás perdiendo dinero en cada cliente.

## Otras métricas comunes

### DAU/MAU (Daily/Monthly Active Users)
```sql
SELECT 
  COUNT(DISTINCT user_id) AS dau
FROM activity
WHERE activity_date = CURRENT_DATE;

SELECT 
  COUNT(DISTINCT user_id) AS mau
FROM activity
WHERE activity_date >= DATE_TRUNC('month', CURRENT_DATE);

-- Stickiness: qué tan "adictos" son tus usuarios
SELECT 
  COUNT(DISTINCT user_id) FILTER (WHERE activity_date = CURRENT_DATE)::float
  / NULLIF(COUNT(DISTINCT user_id) FILTER (WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days'), 0)
  AS stickiness
FROM activity;
```

### A/B Test analysis
```sql
WITH variants AS (
  SELECT 
    user_id,
    variant,
    converted
  FROM experiments e
  JOIN users u ON u.id = e.user_id
)
SELECT 
  variant,
  COUNT(*) AS users,
  SUM(converted) AS conversions,
  AVG(converted::float) AS conversion_rate,
  -- Statistical significance con z-test, pero esto da la base
  STDDEV(converted::float) AS stddev
FROM variants
GROUP BY variant
ORDER BY variant;
```

### Power user analysis
```sql
-- Top 1% de usuarios por revenue (regla 80/20)
WITH user_revenue AS (
  SELECT 
    customer_id,
    SUM(total) AS revenue,
    NTILE(100) OVER (ORDER BY SUM(total) DESC) AS percentile
  FROM orders
  GROUP BY customer_id
)
SELECT 
  CASE 
    WHEN percentile <= 1 THEN 'Top 1%'
    WHEN percentile <= 5 THEN 'Top 5%'
    WHEN percentile <= 20 THEN 'Top 20%'
    ELSE 'Bottom 80%'
  END AS segment,
  COUNT(*) AS users,
  SUM(revenue) AS segment_revenue
FROM user_revenue
GROUP BY segment
ORDER BY segment_revenue DESC;
```

## Puntos clave

- Cohort analysis agrupa usuarios por fecha de signup; mide comportamiento a lo largo del tiempo.
- Funnel mide conversión entre pasos. Identifica dónde los usuarios abandonan.
- Retention = % que regresa. >40% en w1 es excelente para apps.
- LTV debe ser al menos 3x CAC para un negocio SaaS saludable.
