---
id: pandas-transform
slug: pandas-transform
title: Pandas: merge, join, concat, melt y stack
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Pandas: merge, join, concat, melt y stack

Combina DataFrames como en SQL y reformatea entre wide/long para analisis y visualizacion.

## concat: apilar DataFrames

`concat` une DataFrames a lo largo de un eje (filas o columnas).

```python
import pandas as pd

# Apilar verticalmente (mas filas)
df_all = pd.concat([df_2023, df_2024, df_2025], ignore_index=True)

# Apilar horizontalmente (mas columnas)
df_wide = pd.concat([df_izq, df_der], axis=1)
```

### Union vs intersection

```python
pd.concat([df_a, df_b], join='outer')   # default: union de columnas
pd.concat([df_a, df_b], join='inner')   # solo columnas comunes
```

> **Tip**: si las columnas NO coinciden, `outer` rellena con NaN; `inner` las descarta. Casi siempre querras `outer`.

## merge: join estilo SQL

`merge` une DataFrames por una o mas columnas clave, igual que un JOIN de SQL.

```python
# Equivalente a: SELECT * FROM ventas JOIN clientes ON ventas.cliente_id = clientes.id
resultado = pd.merge(
    ventas,
    clientes,
    left_on='cliente_id',
    right_on='id',
    how='inner'   # 'inner', 'left', 'right', 'outer'
)
```

### Tipos de join

- **inner**: solo filas con clave en ambos (default)
- **left**: todas las filas del izquierdo, NaN si no hay match
- **right**: todas las del derecho
- **outer**: union de ambos, NaN donde no hay match

### Merge por indice

```python
pd.merge(df_a, df_b, left_index=True, right_index=True)
```

> **Cuidado con claves duplicadas**: si la clave derecha tiene duplicados, el resultado tendra multiplicacion cartesiana (1 fila izq x N filas der). Usa `validate='one_to_one'` o `'one_to_many'` para que Pandas falle ruidosamente si no se cumple.

## join: atajo para index

`join` es un wrapper de merge que une por **indice** por defecto. Es conciso cuando ambos DataFrames tienen el index adecuado.

```python
# join basico (how='left' por defecto)
df_a.join(df_b)

# Especificar columna del derecho
df_a.join(df_b, on='clave')

# Ejemplo real
usuarios = pd.DataFrame({
    'id': [1, 2, 3],
    'nombre': ['Ana', 'Luis', 'Maria']
}).set_index('id')

compras = pd.DataFrame({
    'usuario_id': [1, 1, 2, 3, 3],
    'monto': [100, 50, 75, 200, 30]
})

# Sumar compras por usuario y joinear al perfil
totales = compras.groupby('usuario_id')['monto'].sum()
perfiles = usuarios.join(totales)
```

> **Cuando usar merge vs join**: `merge` cuando unes por columna; `join` cuando unes por index. Internamente hacen lo mismo, pero `join` es mas legible para joins por index.

## melt y stack: wide a long

Muchos modelos y librerias de plotting (Seaborn, Plotly) prefieren formato **long** (tidy data): una fila por observacion, una columna por variable.

```python
# Wide
#   producto  Q1  Q2  Q3  Q4
# 0   Laptop 100 120 110 130

# Long (melt)
df_long = df.melt(
    id_vars='producto',          # columnas que NO se derriten
    var_name='trimestre',        # nombre de la nueva columna clave
    value_name='ventas'          # nombre de la nueva columna valor
)
#   producto trimestre  ventas
# 0   Laptop        Q1     100
# 1   Laptop        Q2     120
# ...
```

### stack / unstack: index jerarquico

```python
# De columnas a filas (nivel del MultiIndex)
df_stacked = df.stack()

# De filas a columnas
df_unstacked = df_stacked.unstack()
```

> **Regla de oro (Wickham)**: cada fila es una observacion, cada columna una variable, cada celda un valor. Pandas ya tiene esta forma con melt + groupby.

## Puntos clave

- concat apila; merge une por clave (estilo SQL); join une por indice.
- Tipos de join: inner (default), left, right, outer. Cuidado con claves duplicadas.
- melt convierte wide -> long, ideal para graficar con Seaborn.
- validate="one_to_one" en merge previene explosiones cartesianas accidentales.
