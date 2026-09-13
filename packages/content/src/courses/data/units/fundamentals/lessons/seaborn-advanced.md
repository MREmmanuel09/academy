---
id: seaborn-advanced
slug: seaborn-advanced
title: Seaborn: plots estadisticos (heatmap, pairplot, violin, box, count)
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Seaborn: plots estadisticos (heatmap, pairplot, violin, box, count)

Visualizaciones estadisticas de alto nivel sobre Matplotlib. Heatmaps, distribuciones y relaciones.

## Por que Seaborn

**Seaborn** es una libreria de visualizacion estadistica construida sobre Matplotlib. Ventajas:

- **API de alto nivel**: una linea para heatmaps, violin plots, pair plots.
- **Integracion con DataFrames**: pasas el df entero y mapeas con nombres de columna.
- **Paletas bonitas** por defecto: viridis, magma, coolwarm.
- **Agregaciones automaticas**: promedios, intervalos de confianza, KDEs.

```python
import seaborn as sns
import matplotlib.pyplot as plt

# Estilo por defecto
sns.set_theme(style='darkgrid', palette='viridis')

# Dataset de ejemplo
df = sns.load_dataset('iris')
```

> **Tip**: Seaborn y Matplotlib conviven. Puedes usar `sns.scatterplot` para el plot y `plt.title/plt.xlabel` para el resto.

## Distribuciones: hist, kde, box, violin

### histplot y kdeplot

```python
# Histograma con KDE
sns.histplot(df['sepal_length'], bins=20, kde=True)

# KDE sola (densidad)
sns.kdeplot(data=df, x='sepal_length', hue='species', fill=True)
```

### boxplot y violinplot

```python
# Boxplot por categoria
sns.boxplot(data=df, x='species', y='sepal_length')

# Violin: boxplot + KDE (mejor para ver forma de la distribucion)
sns.violinplot(data=df, x='species', y='sepal_length', hue='species')
sns.violinplot(data=df, x='species', y='sepal_length', split=True, hue='sex')
```

### countplot (bar de frecuencias)

```python
sns.countplot(data=df, x='species', order=df['species'].value_counts().index)
```

> **Cuando usar cada uno**: histogram para distribuciones de una variable; boxplot para comparar entre grupos; violin cuando quieres ver la forma; countplot para frecuencias.

## Relaciones: scatter, line, regplot, pairplot

### scatterplot

```python
sns.scatterplot(
    data=df,
    x='sepal_length', y='sepal_width',
    hue='species',         # color por categoria
    size='petal_length',   # tamano por variable
    style='species',       # marcador por categoria
    alpha=0.7
)
```

### regplot / lmplot: scatter + regresion

```python
sns.regplot(data=df, x='sepal_length', y='sepal_width')

# lmplot: scatter + regresion agrupado por categoria
sns.lmplot(data=df, x='sepal_length', y='sepal_width',
           hue='species', col='species')
```

### pairplot: scatter matrix de todas las variables

```python
# La "killer feature" de Seaborn para EDA inicial
sns.pairplot(df, hue='species', diag_kind='kde')
# Genera NxN plots: diagonal = distribuciones, off-diagonal = relaciones
```

> **Cuidado**: pairplot con muchas columnas se vuelve lento y poco legible. Para datasets con >10 variables, mejor un `sns.heatmap(df.corr())` para empezar.

## Heatmaps: correlaciones y tablas

Heatmaps son la forma mas compacta de ver **relaciones entre muchas variables numericas**.

```python
# Correlacion entre columnas numericas
import numpy as np

df_numeric = df.select_dtypes(include='number')
corr = df_numeric.corr()

sns.heatmap(
    corr,
    annot=True,           # mostrar valores
    fmt='.2f',            # formato
    cmap='coolwarm',      # paleta divergente (azul-blanco-rojo)
    center=0,             # centro de la divergencia
    vmin=-1, vmax=1,      # rango fijo
    square=True,          # celdas cuadradas
    cbar_kws={'label': 'correlacion'}
)
plt.title('Matriz de correlacion')
plt.show()
```

### Heatmap de tabla pivoteada

```python
# Pivot: ventas por mes y region
pivot = df.pivot_table(values='ventas', index='mes', columns='region', aggfunc='sum')

sns.heatmap(pivot, annot=True, fmt='.0f', cmap='YlGnBu', linewidths=0.5)
```

### clustermap: heatmap + dendograma

```python
# Agrupa filas/columnas similares
sns.clustermap(corr, annot=True, cmap='coolwarm', center=0)
```

> **Paleta divergente** (`coolwarm`, `RdBu`, `vlag`) es obligatoria para correlaciones: el centro debe significar "sin relacion". Para secuencias, usa `viridis`, `magma` o `YlGnBu`.

## Puntos clave

- Seaborn agrega API de alto nivel sobre Matplotlib con integracion a DataFrames.
- boxplot y violin comparan distribuciones entre grupos; pairplot es la killer feature para EDA.
- Heatmap con cmap divergente (coolwarm) es ideal para matrices de correlacion.
- Usa `hue=` para agregar una dimension categorica de color sin complicar el codigo.
