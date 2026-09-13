---
id: pandas-eda
slug: pandas-eda
title: Pandas EDA: describe, value_counts, groupby y pivot
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Pandas EDA: describe, value_counts, groupby y pivot

Analisis exploratorio de datos. Las funciones que usas el 80% del tiempo en un EDA real.

## El flujo de un EDA

**EDA** (Exploratory Data Analysis) es la fase donde entiendes un dataset antes de modelar. El flujo clasico:

1. **Cargar** y validar formas y tipos
2. **Describir** estadisticas globales
3. **Visualizar** distribuciones
4. **Agrupar** y agregar por categorias
5. **Pivotar** para ver relaciones entre dos variables
6. **Hipotetizar** y verificar

> **Regla de oro**: si no puedes dibujar el dataset en 30 segundos, no lo entiendes todavia.

## value_counts y tablas de frecuencia

### value_counts

La forma mas rapida de entender una columna categorica:

```python
df['pais'].value_counts()              # frecuencias absolutas
df['pais'].value_counts(normalize=True) # frecuencias relativas (%)
df['pais'].value_counts().head(10)     # top 10
df['pais'].value_counts().plot(kind='bar')
```

### Tablas cruzadas

```python
pd.crosstab(df['pais'], df['genero'])
# Genero     F     M
# Pais
# CO      120   145
# MX      340   380
# PE       89    95

pd.crosstab(df['pais'], df['genero'], normalize='index')  # % por fila
pd.crosstab(df['pais'], df['genero'], margins=True)        # totales
```

> **Tip**: `crosstab` con `normalize='index'` te da la composicion porcentual de cada grupo. Utilisimo para comparar proporciones entre categorias.

## groupby: split-apply-combine

El patron mas importante de Pandas. Tres pasos:

1. **Split**: dividir el DataFrame por una clave
2. **Apply**: aplicar una funcion a cada grupo
3. **Combine**: juntar los resultados

```python
# Promedio de salario por departamento
df.groupby('departamento')['salario'].mean()

# Multiples agregaciones
df.groupby('departamento')['salario'].agg(['mean', 'median', 'count'])

# Multiples columnas
df.groupby('departamento').agg({
    'salario': 'mean',
    'edad':    'median',
    'id':      'count'
})

# Multiples claves
df.groupby(['departamento', 'genero'])['salario'].mean()
```

### Custom aggregations

```python
df.groupby('departamento')['salario'].agg(
    promedio='mean',
    maximo='max',
    rango=lambda x: x.max() - x.min()
)
```

> **Detalle**: el resultado de `groupby()['col'].agg()` es una Series con el group key como index. Si quieres un DataFrame plano, usa `reset_index()` o `as_index=False`.

## Pivot tables

Una **pivot table** reorganiza datos: una columna se vuelve filas (index), otra se vuelve columnas, y otra se agrega.

```python
# Ventas por mes y por region
df.pivot_table(
    values='ventas',          # valores a agregar
    index='mes',              # filas
    columns='region',         # columnas
    aggfunc='sum'             # funcion de agregacion
)
```

### Parametros clave

- `values`: columna a agregar
- `index`: clave para filas
- `columns`: clave para columnas
- `aggfunc`: 'mean', 'sum', 'count', 'median', o lista
- `fill_value`: valor para celdas faltantes
- `margins=True`: agrega fila/columna TOTAL

### Melt: el inverso de pivot

```python
# De wide a long
df_long = df.melt(
    id_vars=['producto'],
    value_vars=['Q1', 'Q2', 'Q3', 'Q4'],
    var_name='trimestre',
    value_name='ventas'
)
```

> **Cuando usar uno u otro**: usa pivot cuando quieres una **tabla resumen** legible; usa melt cuando necesitas los datos en formato **long** para graficar o modelar.

## Puntos clave

- EDA: describe, value_counts, groupby, pivot. Ese es el 80% del trabajo.
- groupby aplica split-apply-combine: split por clave, apply funcion, combine resultados.
- pivot_table reorganiza datos: index=filas, columns=columnas, aggfunc=agregacion.
- crosstab y value_counts son los atajos para tablas de frecuencia.
