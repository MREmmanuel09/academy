---
id: pandas-time
slug: pandas-time
title: Pandas time series: resample, rolling, shift y date_range
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Pandas time series: resample, rolling, shift y date_range

Series de tiempo son la mitad del trabajo real (finanzas, IoT, metricas). Domina las funciones clave.

## Indices de tiempo y DatetimeIndex

Pandas tiene soporte de primera clase para series de tiempo. La clave: usar **DatetimeIndex**.

```python
import pandas as pd

# Crear indice de fechas
idx = pd.date_range('2024-01-01', periods=365, freq='D')
# Frecuencias: 'D' dia, 'H' hora, 'T' o 'min' minuto, 'S' segundo
#              'W' semana, 'M' mes fin, 'MS' mes inicio
#              'Q' trimestre, 'Y' o 'A' anio, 'B' dia habil

df = pd.DataFrame({'valor': range(365)}, index=idx)
```

### Convertir columna a datetime

```python
df['fecha'] = pd.to_datetime(df['fecha'])
df = df.set_index('fecha')
df.index                   # DatetimeIndex
```

### Accesos rapidos

```python
df.loc['2024']                # todo el anio
df.loc['2024-03']             # todo marzo
df.loc['2024-03-15':'2024-04-10']  # rango
df.loc[df.index.hour < 12]    # antes del mediodia
df.loc[df.index.dayofweek < 5]  # dias habiles (lun-vie)
```

> **Tip**: `df.index.hour`, `.dayofweek`, `.month`, `.quarter` son accesos vectorizados utiles para features de ML.

## resample: cambiar la frecuencia

`resample` es a time series lo que `groupby` a datos categoricos. Agrupa por periodo de tiempo y aplica una agregacion.

```python
# Ventas diarias -> ventas mensuales (suma)
mensual = df.resample('M')['ventas'].sum()

# Promedio semanal
semanal = df.resample('W')['valor'].mean()

# Multiples agregaciones
df.resample('Q').agg({'ventas': 'sum', 'usuarios': 'mean'})

# Frecuencias comunes
# 'D'  diario       'H'  por hora
# 'W'  semanal      'M'  fin de mes
# 'MS' inicio mes   'Q'  fin trimestre
# 'YS' inicio anio  '5min' cada 5 minutos
```

### Upsampling (subir frecuencia)

```python
# Diario -> por hora (con NaN en las horas nuevas)
por_hora = df.resample('H').asfreq()

# Rellenar los huecos
por_hora = df.resample('H').ffill()   # forward fill
por_hora = df.resample('H').interpolate()  # interpolacion lineal
```

> **Downsampling** (mas datos -> menos) siempre requiere agregacion. **Upsampling** (menos -> mas) requiere rellenar o interpolar.

## rolling: ventanas moviles

Las **ventanas moviles** calculan estadisticas sobre los ultimos N puntos. Clave para suavizar series y detectar tendencias.

```python
# Media movil de 7 dias
df['media_7d'] = df['valor'].rolling(window=7).mean()

# Suma movil (util para rate limiting)
df['suma_24h'] = df['eventos'].rolling('24h').sum()

# Desviacion estandar movil (volatilidad)
df['volatilidad'] = df['precio'].rolling(30).std()

# Min y max en ventana
df['max_7d'] = df['valor'].rolling(7).max()
df['min_7d'] = df['valor'].rolling(7).min()

# Requiere minimo de observaciones (no genera NaN hasta tener N)
df['media_3d_min2'] = df['valor'].rolling(3, min_periods=1).mean()
```

### Expanding: acumulativo desde el inicio

```python
df['cumsum'] = df['valor'].cumsum()                  # suma acumulada
df['cummax'] = df['valor'].cummax()                  # maximo historico
df['media_expand'] = df['valor'].expanding().mean()  # media desde inicio
```

> **Truco financiero**: `rolling(20).std()` sobre retornos diarios da una medida de volatilidad similar a la usada en opciones.

## shift, diff y pct_change

Para calcular **cambios** entre observaciones:

```python
# Lag: valor de hace N periodos
df['valor_lag1']  = df['valor'].shift(1)     # periodo anterior
df['valor_lag7']  = df['valor'].shift(7)     # hace 7 dias

# Lead: valor futuro (negativo en shift)
df['valor_lead1'] = df['valor'].shift(-1)    # siguiente periodo

# Diferencia absoluta
df['delta'] = df['valor'].diff()              # valor - valor_anterior
df['delta_7d'] = df['valor'].diff(7)

# Cambio porcentual
df['pct'] = df['valor'].pct_change()         # (valor - anterior) / anterior
df['pct_7d'] = df['valor'].pct_change(7)

# YoY (year over year)
df['yoy'] = df['valor'].pct_change(365)      # requiere serie diaria
```

> **Caso de uso clasico**: predecir el valor de manana. Features tipicas: `lag_1`, `lag_7`, `rolling_mean_7`, `rolling_std_7`, `pct_change_1`. Con eso ya tienes un baseline solido para series temporales.

## Puntos clave

- DatetimeIndex permite slicing tipo string: df.loc["2024-03"].
- resample cambia la frecuencia: downsample agrega, upsample rellena o interpola.
- rolling(window) calcula estadisticas sobre los ultimos N puntos.
- shift genera lags, diff y pct_change calculan cambios entre observaciones.
