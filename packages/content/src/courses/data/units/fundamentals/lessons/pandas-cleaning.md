---
id: pandas-cleaning
slug: pandas-cleaning
title: Pandas: limpieza de datos (nulls, duplicados, tipos, outliers)
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Pandas: limpieza de datos (nulls, duplicados, tipos, outliers)

El 80% del tiempo de un data scientist se va en limpiar datos. Aprende las tecnicas clave.

## Diagnosticar antes de limpiar

Antes de tocar nada, entiende que tiene tu dataset:

```python
import pandas as pd

df = pd.read_csv('ventas.csv')

df.head()                # primeras 5 filas
df.tail()                # ultimas 5
df.shape                 # (n_filas, n_columnas)
df.info()                # tipos + nulos + memoria
df.describe()            # estadisticas de columnas numericas
df.describe(include='all')  # incluye categoricas y object
df.dtypes                # dtype por columna
df.isna().sum()          # cuenta nulos por columna
df.duplicated().sum()    # cuenta filas duplicadas
df.nunique()             # valores unicos por columna
```

> **Workflow**: 1) cargar, 2) info, 3) describe, 4) contar nulos y duplicados, 5) sample visual, 6) planificar limpieza. Saltarse esto causa horas de debugging despues.

## Manejo de valores nulos (NaN)

Pandas representa nulos como `NaN` (Not a Number) o `None`. Para tratarlos:

```python
# Detectar
df.isna()                # mascara booleana
df.isna().sum()          # por columna
df.isna().any(axis=1)    # filas con al menos un nulo

# Eliminar
df.dropna()                       # cualquier fila con NaN
df.dropna(subset=['email'])       # solo si email es NaN
df.dropna(thresh=8)               # filas con al menos 8 no-NaN
df.dropna(axis=1)                 # eliminar columnas con NaN

# Rellenar
df.fillna(0)                      # todo a 0
df['edad'].fillna(df['edad'].mean())      # con promedio
df['edad'].fillna(df['edad'].median())    # con mediana (mas robusto)
df['ciudad'].fillna('Desconocida')        # con literal
df.fillna(method='ffill')                 # forward fill: propaga anterior
df.fillna(method='bfill')                 # backward fill: propaga siguiente
```

> **Regla**: nunca elimines filas sin entender por que tienen nulos. A veces el nulo ES la senal (ej: "cliente sin email" != "email desconocido").

## Tipos de dato y conversion

Tener el tipo correcto es critico: usar object donde deberia haber datetime cuesta 10x en memoria y rompe operaciones.

```python
# Diagnostico
df.dtypes

# Conversion
df['fecha'] = pd.to_datetime(df['fecha'])
df['monto'] = pd.to_numeric(df['monto'], errors='coerce')
df['activo'] = df['activo'].astype('bool')
df['categoria'] = df['categoria'].astype('category')

# Categorical: ahorra memoria y acelera groupby
df['pais'] = df['pais'].astype('category')
df['pais'].cat.codes              # codigos enteros 0, 1, 2...

# Strings
df['email'] = df['email'].str.strip().str.lower()
df['email'] = df['email'].str.replace('@old.com', '@new.com')
df[df['email'].str.contains('@gmail')]
```

### Reduccion de memoria

```python
# float64 -> float32 (mitad de memoria)
df['precio'] = df['precio'].astype('float32')

# int64 -> int8 si los valores caben
df['edad'] = df['edad'].astype('int8')
```

> **Tip**: para inspeccionar el uso de memoria: `df.memory_usage(deep=True).sum() / 1e6` da MB.

## Duplicados y outliers

### Duplicados

```python
df.duplicated()                  # mascara de duplicados
df.drop_duplicates()             # elimina filas identicas
df.drop_duplicates(subset=['id']) # solo considera 'id'
df.drop_duplicates(keep='last')  # conserva la ultima ocurrencia
```

### Outliers con IQR (rango intercuartilico)

```python
Q1 = df['precio'].quantile(0.25)
Q3 = df['precio'].quantile(0.75)
IQR = Q3 - Q1

lower = Q1 - 1.5 * IQR
upper = Q3 + 1.5 * IQR

outliers = df[(df['precio'] < lower) | (df['precio'] > upper)]
df_clean = df[(df['precio'] >= lower) & (df['precio'] <= upper)]
```

### Winsorizing: capping en vez de eliminar

```python
df['precio'] = df['precio'].clip(lower, upper)
```

> **Cuidado con outliers**: a veces son errores (typos, unidades mezcladas) y a veces son senales legitimas (transacciones fraudulentas). Nunca los borres sin investigar.

## Puntos clave

- Antes de limpiar: info(), describe(), isna().sum(), duplicated().sum().
- Para nulos: dropna() o fillna() con estrategia clara (media, mediana, ffill).
- astype(category) ahorra memoria y acelera groupby en strings repetidos.
- Outliers: detecta con IQR o z-score, pero investiga antes de eliminar.
