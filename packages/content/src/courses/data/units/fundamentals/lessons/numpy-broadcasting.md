---
id: numpy-broadcasting
slug: numpy-broadcasting
title: NumPy: broadcasting, operaciones vectorizadas y ufuncs
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# NumPy: broadcasting, operaciones vectorizadas y ufuncs

Aplica operaciones entre arrays de distintas formas sin escribir loops. ufuncs y reglas de broadcasting.

## Operaciones vectorizadas: cero loops

En Python puro, multiplicar dos vectores requiere un loop:

```python
a = [1, 2, 3]
b = [4, 5, 6]
# Python: [a[i] * b[i] for i in range(3)]
```

En NumPy, la operacion se hace **elemento a elemento automaticamente**, en C:

```python
import numpy as np
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])
print(a * b)         # [4, 10, 18]
print(a + 10)        # [11, 12, 13]   <- escalar se "expande"
print(np.sin(a))     # [0.84, 0.91, 0.14]
```

**Regla**: cualquier operacion aritmetica entre ndarrays del mismo shape se aplica **elemento a elemento** sin necesidad de loops. Esto se llama **vectorizacion**.

> **Por que es rapido**: NumPy delega el trabajo a codigo C optimizado con instrucciones SIMD. Un loop en Python hace ~5 millones de ops/s; un loop NumPy hace ~500 millones. Diferencia de **100x**.

## Reglas de broadcasting

Broadcasting es la habilidad de NumPy de operar entre arrays de **distintas formas** alineandolos implicitamente. Tres reglas:

1. Si dos arrays difieren en numero de dimensiones, al de menor rango se le anade un **1** a la izquierda de su shape.
2. Si en alguna dimension los tamanos no coinciden, pero uno es **1**, se "estira" al tamano del otro.
3. Si en alguna dimension los tamanos no coinciden y ninguno es 1, **error**.

```python
import numpy as np

# Vector (3,) + escalar
a = np.array([1, 2, 3])
print(a + 10)              # [11, 12, 13]

# Matriz (2, 3) + vector (3,) -> el vector se "estira" a (2, 3)
m = np.ones((2, 3))
v = np.array([10, 20, 30])
print(m + v)
# [[11, 21, 31]
#  [11, 21, 31]]

# Columna (3, 1) + fila (1, 4) -> (3, 4)
col = np.array([[1], [2], [3]])
row = np.array([[10, 20, 30, 40]])
print(col + row)
# [[11, 21, 31, 41]
#  [12, 22, 32, 42]
#  [13, 23, 33, 43]]
```

> **Truco mental**: imagina que el array mas chico se "clona" hasta alcanzar el tamano del grande. NumPy no copia memoria, solo ajusta punteros.

## ufuncs: funciones universales

Una **ufunc** (universal function) es una funcion que opera **elemento a elemento** sobre ndarrays. NumPy provee decenas.

### Aritmeticas
```python
np.add(a, b)        # a + b
np.subtract(a, b)   # a - b
np.multiply(a, b)   # a * b
np.divide(a, b)     # a / b
np.power(a, 2)      # a ** 2
np.mod(a, 3)        # a % 3
```

### Trigonometricas
```python
np.sin(a); np.cos(a); np.tan(a)
np.arcsin(a); np.arccos(a)
np.deg2rad(a)       # grados a radianes
np.rad2deg(a)
```

### Logaritmicas y exponenciales
```python
np.log(a)           # logaritmo natural
np.log10(a)         # base 10
np.log2(a)
np.exp(a)           # e^x
```

### Reducciones (colapsan ejes)
```python
a = np.arange(12).reshape(3, 4)
print(a.sum())          # 66
print(a.sum(axis=0))    # suma por columna
print(a.sum(axis=1))    # suma por fila
print(a.mean())         # promedio global
print(a.std())          # desviacion estandar
print(a.min(), a.max())
print(a.argmax())       # indice del maximo aplanado
```

> **Patron avanzado**: para evitar loops en algoritmos, primero piensa como ufunc + reduccion. Ej: calcular distancia euclideana entre dos vectores: `np.sqrt(np.sum((a - b) ** 2))`.

## Errores comunes

### 1. Modificar un slice afecta el original

```python
a = np.arange(10)
b = a[2:5]               # esto es una VISTA, no copia
b[0] = 999
print(a)                 # [0, 1, 999, 3, 4, 5, 6, 7, 8, 9]
```

Usa `b = a[2:5].copy()` si quieres un array independiente.

### 2. Broadcasting incompatible

```python
a = np.ones((3, 4))
b = np.ones((3,))        # shape (3,) no es compatible con (3, 4)
a + b                    # ValueError
```

Solucion: `b = b.reshape(1, 3)` o `b[:, np.newaxis]` para hacer columna.

### 3. Comparar arrays con `==`

```python
np.array([1, 2, 3]) == np.array([1, 2, 3])   # array([True, True, True])
```

Esto da un **array de booleanos**, no un unico True/False. Para eso usa `np.array_equal` o `(a == b).all()`.

## Puntos clave

- Las operaciones entre ndarrays son vectorizadas: cero loops explicitos.
- Broadcasting permite operar arrays de formas compatibles alineandolos implicitamente.
- Las ufuncs aplican funciones elemento a elemento; las reducciones colapsan ejes.
- Cuidado: los slices son vistas, no copias. Usa `.copy()` si necesitas independencia.
