---
id: matplotlib-basics
slug: matplotlib-basics
title: Matplotlib: plots basicos, customizacion y subplots
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 70
---

# Matplotlib: plots basicos, customizacion y subplots

La libreria base de visualizacion en Python. Aprende a hacer line, bar, scatter e hist con estilo.

## Dos APIs: pyplot y OO

Matplotlib ofrece dos estilos. El **pyplot** (estilo MATLAB) es conciso para exploracion rapida. La **API orientada a objetos** es obligatoria para figuras complejas.

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

# Estilo pyplot (rapido)
plt.figure(figsize=(8, 4))
plt.plot(x, y, label='sin(x)')
plt.plot(x, np.cos(x), label='cos(x)')
plt.xlabel('x')
plt.ylabel('y')
plt.title('Funciones trigonometricas')
plt.legend()
plt.grid(True)
plt.show()
```

```python
# Estilo OO (recomendado para figuras complejas)
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(x, y, label='sin(x)', color='cyan', linewidth=2)
ax.plot(x, np.cos(x), label='cos(x)', color='magenta', linestyle='--')
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_title('Funciones trigonometricas')
ax.legend()
ax.grid(True, alpha=0.3)
plt.show()
```

> **Regla**: usa pyplot para prototipos y notebooks exploratorios. Usa OO para dashboards, reportes y figuras con multiples subplots.

## Tipos de plot principales

### Line plot

```python
plt.plot(x, y, color='blue', linewidth=2, linestyle='-', marker='o', label='serie A')
```

### Bar plot

```python
categorias = ['A', 'B', 'C', 'D']
valores = [23, 45, 56, 78]
plt.bar(categorias, valores, color='steelblue', edgecolor='black')
plt.bar(categorias, valores, color=['red', 'blue', 'green', 'orange'])  # por barra
```

### Scatter plot

```python
plt.scatter(x, y, s=50, c=color, alpha=0.7, cmap='viridis', edgecolors='black')
plt.colorbar(label='magnitud')
```

### Histograma

```python
data = np.random.randn(1000)
plt.hist(data, bins=30, color='skyblue', edgecolor='black', alpha=0.8)
plt.hist(data, bins=30, density=True, histtype='step', linewidth=2)  # solo linea
```

> **Regla de Sturges**: `bins = int(np.ceil(np.log2(n))) + 1`. Buen default para distribuciones normales.

## Subplots: multiples plots en una figura

```python
fig, axes = plt.subplots(2, 2, figsize=(12, 8))   # grilla 2x2

axes[0, 0].plot(x, np.sin(x))
axes[0, 0].set_title('sin(x)')

axes[0, 1].scatter(np.random.rand(50), np.random.rand(50))
axes[0, 1].set_title('scatter')

axes[1, 0].bar(['A', 'B', 'C'], [10, 20, 15])
axes[1, 0].set_title('bar')

axes[1, 1].hist(np.random.randn(1000), bins=30)
axes[1, 1].set_title('hist')

# Ajuste final
plt.tight_layout()    # evita overlap de labels
plt.savefig('figura.png', dpi=150, bbox_inches='tight')
plt.show()
```

### Subplots desiguales

```python
fig = plt.figure(figsize=(10, 6))
ax1 = fig.add_subplot(2, 2, 1)   # 2 filas, 2 cols, posicion 1
ax2 = fig.add_subplot(2, 2, 2)   # posicion 2
ax3 = fig.add_subplot(2, 1, 2)   # segunda fila completa

# O con gridspec
import matplotlib.gridspec as gs
gs_ = gs.GridSpec(2, 2)
ax1 = fig.add_subplot(gs_[0, 0])
ax2 = fig.add_subplot(gs_[0, 1])
ax3 = fig.add_subplot(gs_[1, :])  # segunda fila entera
```

> **Tip**: `figsize=(ancho, alto)` esta en pulgadas. Para una figura de 12cm, usa ~4.7. `dpi=150` da buena calidad para pantalla y PDFs.

## Estilo y exportacion

### Estilos predefinidos

```python
plt.style.use('ggplot')        # estilo R/ggplot
plt.style.use('seaborn-v0_8') # alias del estilo seaborn
plt.style.use('dark_background')
plt.style.use('fivethirtyeight')  # estilo periodistico

# Ver disponibles
print(plt.style.available)
```

### Customizacion inline

```python
plt.rcParams.update({
    'figure.figsize': (10, 6),
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'legend.fontsize': 11,
    'lines.linewidth': 2
})
```

### Exportar

```python
plt.savefig('figura.png', dpi=200, bbox_inches='tight')
plt.savefig('figura.pdf', bbox_inches='tight')   # vectorial
plt.savefig('figura.svg', bbox_inches='tight')   # web/edicion
```

> **Vectorial vs raster**: usa PDF/SVG para publicacion (escalable, sin pixelado). PNG/DPI=200+ para web. JPEG solo si la figura es foto-like; para plots suele verse mal por el algoritmo de compresion.

## Puntos clave

- Matplotlib tiene dos APIs: pyplot (rapido) y OO (robusto, recomendado para figuras complejas).
- Tipos principales: plot (line), bar, scatter, hist. Cada uno tiene parametros clave.
- subplots crea grillas; tight_layout() evita solapamiento de labels.
- Exporta con savefig: PDF/SVG para publicacion, PNG para web con dpi >= 150.
