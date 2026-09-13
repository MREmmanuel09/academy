---
id: numpy-intro
slug: numpy-intro
title: NumPy: arrays, dtype, shape y creacion basica
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# NumPy: arrays, dtype, shape y creacion basica

La libreria base de computacion numerica en Python. Aprende ndarray, tipos, formas y como construir arrays.

## Que es NumPy y por que importa

**NumPy** (Numerical Python) es la libreria fundamental para computacion cientifica en Python. Su estructura central es el **ndarray** (N-dimensional array): un bloque de memoria contiguo, homogeneo y muy eficiente.

### Por que no usar listas de Python?

- Las listas almacenan **punteros** a objetos分散 en memoria. Cada acceso requiere un salto.
- Un ndarray almacena valores crudos en un buffer contiguo. CPU vectorizado (SIMD) opera en bloque.
- Operaciones aritmeticas: en una lista necesitas un loop; en un ndarray es un solo C call.

Resultado: NumPy es tipicamente **10-100x mas rapido** para operaciones numericas, y usa **menos memoria**.

> **En data analysis casi todo pasa por NumPy por debajo**: Pandas, Scikit-learn, TensorFlow y PyTorch usan arrays de NumPy (o compatibles) como formato de intercambio.

## Creacion basica de arrays

### Desde una lista

```python
import numpy as np

a = np.array([1, 2, 3])            # vector 1D
m = np.array([[1, 2, 3],
              [4, 5, 6]])            # matriz 2D
```

### Funciones de fabricacion

```python
np.zeros(5)                 # [0, 0, 0, 0, 0]
np.ones((2, 3))             # matriz 2x3 de unos
np.full((2, 2), 7)          # matriz 2x2 llena de sietes
np.arange(0, 10, 2)         # [0, 2, 4, 6, 8]  como range()
np.linspace(0, 1, 5)        # 5 puntos equiespaciados en [0,1]
np.eye(3)                   # matriz identidad 3x3
np.random.rand(2, 3)        # uniforme [0,1) con shape (2,3)
np.random.randn(1000)       # normal estandar, 1000 muestras
np.random.randint(1, 100, 5)# enteros aleatorios
```

> **Tip**: para reproducibilidad usa `np.random.seed(42)` al inicio del script.

## dtype y shape

Cada ndarray tiene dos atributos clave que debes aprender a leer:

- **dtype**: tipo de dato de los elementos. `int64`, `float64`, `bool_`, `complex128`, etc. NumPy *infiere* el dtype de los datos o puedes forzarlo con `dtype=np.float32`.
- **shape**: tupla con el tamano de cada dimension. `(3,)` = vector de 3, `(2, 3)` = matriz de 2 filas x 3 columnas.

```python
a = np.array([1, 2, 3])
print(a.dtype)    # int64
print(a.shape)    # (3,)
print(a.ndim)     # 1
print(a.size)     # 3

m = np.array([[1.0, 2.0], [3.0, 4.0]])
print(m.dtype)    # float64
print(m.shape)    # (2, 2)
print(m.ndim)     # 2
```

### Por que importa el dtype

- **float32** ocupa la mitad de memoria que **float64** y es suficiente para redes neuronales.
- Enteros con signo pueden **overflow**ear: `np.int8` solo soporta -128 a 127.
- Mezclar dtypes en operaciones produce *upcasting* automatico (entero + float = float).

```python
a = np.array([1, 2, 3], dtype=np.int8)
print(a.itemsize)   # 1 byte por elemento

b = np.array([1, 2, 3], dtype=np.float64)
print(b.itemsize)   # 8 bytes por elemento
```

## Indexing y slicing

El indexing de NumPy sigue la logica de listas de Python pero se extiende a multiples dimensiones.

```python
a = np.arange(10)        # [0, 1, 2, ..., 9]
print(a[0])              # 0
print(a[-1])             # 9
print(a[2:5])            # [2, 3, 4]
print(a[::-1])           # invertido

m = np.arange(12).reshape(3, 4)
# [[ 0  1  2  3]
#  [ 4  5  6  7]
#  [ 8  9 10 11]]

print(m[1, 2])           # 6 (fila 1, columna 2)
print(m[0, :])           # primera fila completa
print(m[:, 1])           # segunda columna completa
print(m[1:, 1:3])        # submatriz 2x2
```

### Fancy indexing

```python
a = np.array([10, 20, 30, 40, 50])
idx = [0, 2, 4]
print(a[idx])            # [10, 30, 50]

# Mascara booleana (filter vectorizado)
mask = a > 25
print(a[mask])           # [30, 40, 50]
print(a[a > 25])         # igual, en una linea
```

> **Truco muy usado**: `a[a > umbral]` es la forma idiomatica de filtrar. Combinado con `np.where` cubre el 90% de los casos.

## Puntos clave

- NumPy provee ndarray: bloque contiguo, homogeneo y vectorizado.
- Usa `np.array`, `np.zeros`, `np.arange`, `np.linspace` para crear arrays.
- `dtype` define el tipo y tamano en memoria. `shape` define las dimensiones.
- Indexing soporta slicing, indices negativos, fancy indexing y mascaras booleanas.

:::code python
# Pandas basics
import pandas as pd

df = pd.read_csv("users.csv")
print(f"Rows: {len(df)}")
print(df.head())
print(df.describe())
:::
