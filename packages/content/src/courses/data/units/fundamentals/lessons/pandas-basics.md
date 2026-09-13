---
id: pandas-basics
slug: pandas-basics
title: Pandas: Series, DataFrames, index y columns
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 70
---

# Pandas: Series, DataFrames, index y columns

La libreria estandar para analisis tabular en Python. Aprende las dos estructuras clave y como manipularlas.

## Por que Pandas

**Pandas** es la libreria de referencia para manipulacion y analisis de datos tabulares en Python. Construida sobre NumPy, agrega:

- Etiquetas en filas (**index**) y columnas (**columns**).
- Manejo nativo de **datos faltantes** (NaN).
- Lectura/escritura de CSV, Excel, Parquet, SQL, JSON.
- Operaciones tipo SQL: join, group by, pivot, melt.
- Series de tiempo con resampling y rolling.

> **Dato**: el nombre viene de "Panel Data", termino econometrico para datasets multidimensionales. Wes McKinney lo creo en 2008 mientras trabajaba en AQR Capital.

## Series: vector etiquetado

Una **Series** es un vector 1D con etiquetas (index). Piensa en ella como una columna de Excel con nombre.

```python
import pandas as pd

s = pd.Series([10, 20, 30, 40], index=['a', 'b', 'c', 'd'])
print(s)
# a    10
# b    20
# c    30
# d    40
# dtype: int64

print(s['b'])          # 20
print(s.values)        # ndarray subyacente: [10 20 30 40]
print(s.index)         # Index(['a','b','c','d'], dtype='object')
```

### Operaciones vectorizadas

```python
print(s * 2)           # [20, 40, 60, 80]
print(s > 15)          # mascara booleana
print(s[s > 15])       # filtrado: [20, 30, 40]
```

> **Detalle clave**: los valores de una Series son un ndarray de NumPy. Puedes pasar cualquier ufunc y funciona igual.

## DataFrame: tabla 2D etiquetada

Un **DataFrame** es la estructura principal de Pandas: una tabla 2D con index en filas y nombres en columnas. Piensa en una hoja de calculo o una tabla SQL.

```python
data = {
    'nombre':   ['Ana', 'Luis', 'Maria', 'Pedro'],
    'edad':     [28, 35, 22, 41],
    'ciudad':   ['CDMX', 'Bogota', 'Lima', 'Madrid'],
    'salario':  [50000, 60000, 35000, 72000]
}
df = pd.DataFrame(data)

print(df)
#   nombre  edad ciudad  salario
# 0    Ana    28   CDMX    50000
# 1   Luis    35 Bogota   60000
# 2  Maria    22   Lima    35000
# 3  Pedro    41 Madrid   72000
```

### Atributos clave

```python
df.shape         # (4, 4)   filas x columnas
df.columns       # Index(['nombre','edad','ciudad','salario'])
df.index         # RangeIndex(start=0, stop=4, step=1)
df.dtypes        # dtype de cada columna
df.values        # ndarray 2D subyacente
```

### Construir con indice explicito

```python
df = pd.DataFrame(data, index=['emp1', 'emp2', 'emp3', 'emp4'])
df.loc['emp2']                      # fila por etiqueta
df.iloc[0]                          # fila por posicion
```

## Seleccionar y filtrar

### Seleccionar columnas

```python
df['nombre']             # Series
df[['nombre', 'edad']]   # DataFrame con 2 columnas
```

### Filtrar filas (mascaras booleanas)

```python
df[df['edad'] > 30]
df[(df['edad'] > 25) & (df['salario'] < 60000)]
df.query('edad > 25 and salario < 60000')   # sintaxis tipo SQL
```

### .loc y .iloc

- **.loc[row, col]**: por **etiquetas**
- **.iloc[row, col]**: por **posicion** (entera)

```python
df.loc['emp1', 'edad']           # 28
df.iloc[0, 1]                    # 28 (mismo)
df.loc[:, ['nombre', 'edad']]    # 2 columnas
df.iloc[1:3, :]                  # filas 1 y 2, todas las columnas
```

> **Regla**: usa `.loc` cuando sabes los nombres, `.iloc` cuando sabes las posiciones. Mezclarlos es causa comun de bugs.

## Puntos clave

- Pandas extiende NumPy con etiquetas: index en filas, columns en columnas.
- Series = vector 1D etiquetado. DataFrame = tabla 2D con index + columns.
- Filtra con mascaras booleanas: `df[df["col"] > x]` o `df.query(...)`.
- Usa `.loc` para etiquetas y `.iloc` para posiciones enteras.

:::quiz
[
  {
    "question": "What is a Series in Pandas?",
    "options": ["A 2D table with rows and columns", "A 1D labeled array", "A SQL database table", "A NumPy matrix"],
    "correctIndex": 1,
    "explanation": "A Series is a one-dimensional labeled array. Think of it as a single column of data with an index."
  },
  {
    "question": "What is a DataFrame in Pandas?",
    "options": ["A 1D labeled array", "A 2D table with an index and named columns", "A Python dictionary", "A SQL query result"],
    "correctIndex": 1,
    "explanation": "A DataFrame is a two-dimensional labeled data structure with rows (index) and columns — like a spreadsheet or SQL table."
  },
  {
    "question": "How do you read a CSV file into a DataFrame?",
    "options": ["pd.load_csv('file.csv')", "pd.read_csv('file.csv')", "pd.import_csv('file.csv')", "pd.open_csv('file.csv')"],
    "correctIndex": 1,
    "explanation": "Use `pd.read_csv('file.csv')` to read a CSV file into a Pandas DataFrame."
  }
]
:::

:::code python
# Pandas basics
import pandas as pd

df = pd.read_csv("users.csv")
print(f"Rows: {len(df)}")
print(df.head())
print(df.describe())
:::
