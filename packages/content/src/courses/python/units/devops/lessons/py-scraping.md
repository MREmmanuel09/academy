---
id: py-scraping
slug: py-scraping
title: Web scraping con BeautifulSoup y httpx
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 90
---

# Web scraping con BeautifulSoup y httpx

Extraer datos de paginas web: HTML parsing, selectores CSS, paginacion, etica y rate limits.

## Stack de scraping

**Stack recomendado**:
- `httpx`: cliente HTTP moderno (sync + async)
- `beautifulsoup4`: parser HTML/XML
- `lxml`: parser rapido (backend de BS4)
- `selectolax`: alternativa a BS4, mas rapida
- `playwright` / `selenium`: para paginas con JavaScript

```bash
pip install httpx beautifulsoup4 lxml
```

> **Regla de etica**: respeta `robots.txt`, rate limits, y terminos de servicio. Para datos publicos OK, para privados NUNCA.

## Ejemplo completo

```python
import httpx
from bs4 import BeautifulSoup

url = "https://news.ycombinator.com/"
response = httpx.get(url, timeout=10, headers={"User-Agent": "DevOpsBot/1.0"})
response.raise_for_status()

soup = BeautifulSoup(response.text, "lxml")

# Selectores CSS
titles = soup.select("span.titleline > a")
for i, title in enumerate(titles[:10], 1):
    print(f"{i}. {title.get_text()} -> {title['href']}")
```

**Selectores utiles**:
- `soup.select("div.article")` — todos los divs con clase article
- `soup.select_one("#main-content")` — primer elemento con id
- `soup.find("a", class_="link")` — buscar por tag y clase
- `soup.find_all("p", limit=5)` — limitar resultados

## Paginacion, headers, rate limiting

**Paginacion con sesion**:
```python
with httpx.Client(headers={"User-Agent": "DevOpsBot/1.0"}) as client:
    for page in range(1, 6):
        r = client.get(f"https://api.example.com/items?page={page}", timeout=10)
        r.raise_for_status()
        for item in r.json()["items"]:
            process(item)
```

**Rate limiting** (con `asyncio.sleep` para async):
```python
import asyncio

async def fetch(client, url):
    response = await client.get(url)
    await asyncio.sleep(0.5)   # 2 requests por segundo
    return response.json()

async with httpx.AsyncClient() as client:
    tasks = [fetch(client, url) for url in urls]
    results = await asyncio.gather(*tasks)
```

**Headers y cookies**:
```python
r = httpx.post(
    "https://example.com/api",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    cookies={"session": session_id},
    json={"key": "value"},
)
```

> **Caso real DevOps**: scraper de status pages de proveedores (AWS, GitHub, Datadog) para alertas cuando reportan incidentes.

## Puntos clave

- Stack clasico: httpx + beautifulsoup4 + lxml. Selenium/Playwright para JS.
- soup.select() con selectores CSS, soup.find/find_all para busqueda directa.
- User-Agent obligatorio, respeta robots.txt y rate limits.
- httpx.Client() reutiliza conexiones. asyncio.gather() para paralelismo.
