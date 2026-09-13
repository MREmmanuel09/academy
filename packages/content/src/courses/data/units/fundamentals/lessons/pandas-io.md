---
id: pandas-io
slug: pandas-io
title: Pandas I/O: CSV, Excel, Parquet, JSON y SQL
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# Pandas I/O: CSV, Excel, Parquet, JSON y SQL

Lee y escribe datos en los formatos mas usados. Trucos para performance, encoding y tipos.

## CSV: el pan de cada dia

CSV (Comma Separated Values) es el formato mas usado para datos tabulares. Pandas tiene `read_csv` y `to_csv`.

```python
import pandas as pd

# Leer
df = pd.read_csv('datos.csv')

# Opciones clave
df = pd.read_csv(
    'datos.csv',
    sep=';',                       # separador (; o | o tab)
    encoding='utf-8',              # latin-1, utf-8-sig (BOM), cp1252
    header=0,                      # fila de cabecera (None si no hay)
    index_col='id',                # columna indice
    parse_dates=['fecha'],         # parsear a datetime
    na_values=['N/A', '?', '-'],   # valores que cuentan como NaN
    nrows=1000,                    # solo primeras N filas
    usecols=['id', 'nombre'],      # solo estas columnas
    dtype={'id': 'int32'}          # forzar tipos
)

# Escribir
df.to_csv('salida.csv', index=False)
```

> **Truco**: si el CSV es gigante, lee por chunks: `for chunk in pd.read_csv('big.csv', chunksize=10000): process(chunk)`.

## Excel: .xls y .xlsx

Requiere `openpyxl` (xlsx) o `xlrd` (xls antiguos).

```python
# Una sola hoja
df = pd.read_excel('reporte.xlsx', sheet_name='Ventas')

# Todas las hojas -> dict de DataFrames
dfs = pd.read_excel('reporte.xlsx', sheet_name=None)

# Escribir
df.to_excel('salida.xlsx', sheet_name='Reporte', index=False)
```

> **Cuidado**: Excel no distingue tipos tan bien como CSV. Fechas, numeros con coma decimal y celdas vacias son fuentes de dolor. Mejor Parquet si controlas el pipeline.

## Parquet: el formato columnar

**Parquet** es un formato binario **columnar**: almacena cada columna junta, no por filas. Ventajas:

- **Compression**: tipicamente 5-10x menor que CSV.
- **Lectura selectiva**: si solo quieres 2 columnas de 50, no carga las otras 48.
- **Preserva tipos**: ints siguen siendo ints, no "123" como en CSV.
- **Predicate pushdown**: filtros se aplican en la lectura.

```python
# Leer
df = pd.read_parquet('datos.parquet')

# Filtrar al leer (predicate pushdown)
df = pd.read_parquet('datos.parquet', columns=['id', 'monto'],
                     filters=[('year', '=', 2024)])

# Escribir
df.to_parquet('salida.parquet', index=False, engine='pyarrow')
```

> **Standard de facto en data engineering**: Parquet es el formato por defecto en Spark, Snowflake, BigQuery, Databricks y DuckDB. Si tu pipeline pasa de 1GB, dejalo en Parquet.

## JSON y SQL

### JSON

```python
# JSON a DataFrame
df = pd.read_json('datos.json')

# Variantes comunes
df = pd.read_json('datos.jsonl', lines=True)        # JSON Lines
df = pd.read_json('datos.json', orient='records')   # lista de dicts

# DataFrame a JSON
df.to_json('salida.json', orient='records', indent=2)
```

### SQL

```python
import sqlalchemy as sa

engine = sa.create_engine('postgresql://user:pass@host/db')

# Query completa
df = pd.read_sql('SELECT * FROM ventas WHERE year = 2024', engine)

# Tabla completa
df = pd.read_sql_table('ventas', engine)

# Escribir
df.to_sql('ventas_backup', engine, if_exists='replace', index=False)
```

> **Tip**: para SQLite (sin servidor), usa `sqlite3` builtin: `engine = sa.create_engine('sqlite:///mi.db')`.

## Puntos clave

- `read_csv` y `to_csv` son la base; cuida `sep`, `encoding`, `parse_dates`.
- Parquet es columnar, comprimido y preserva tipos: ideal para big data.
- Para Excel necesitas `openpyxl`; usa `sheet_name` para hojas especificas.
- `read_sql` y `to_sql` integran con cualquier BD via SQLAlchemy.
