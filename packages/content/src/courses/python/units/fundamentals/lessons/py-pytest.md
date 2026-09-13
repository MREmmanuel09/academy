---
id: py-pytest
slug: py-pytest
title: Testing con pytest: unit + integration
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 90
---

# Testing con pytest: unit + integration

Escribir tests profesionales: fixtures, parametrize, mocking, coverage, integration tests.

## Estructura basica

```bash
pip install pytest pytest-cov
```

```python
# calculator.py
def add(a: int, b: int) -> int:
    return a + b

def divide(a: int, b: int) -> float:
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
```

```python
# test_calculator.py
import pytest
from calculator import add, divide


def test_add_positive():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, -1) == -2

def test_divide_basic():
    assert divide(10, 2) == 5.0

def test_divide_by_zero():
    with pytest.raises(ValueError, match="Cannot divide"):
        divide(10, 0)
```

```bash
pytest                    # corre todos los tests
pytest -v                 # verbose
pytest -k divide          # solo tests que matchean "divide"
pytest --cov=src tests/   # coverage
```

## Fixtures y parametrize

**Fixtures** (setup/teardown reutilizable):
```python
import pytest

@pytest.fixture
def server_config():
    return {"host": "localhost", "port": 8080}

def test_server_start(server_config):
    assert server_config["port"] == 8080

# Fixture con cleanup
@pytest.fixture
def temp_file(tmp_path):
    file = tmp_path / "test.log"
    file.write_text("line1\\nline2\\n")
    yield file
    # cleanup automatico despues del test
```

**Parametrize** (mismo test, distintos inputs):
```python
@pytest.mark.parametrize("input,expected", [
    (2, 4),
    (3, 9),
    (0, 0),
    (-2, 4),
])
def test_square(input, expected):
    assert input ** 2 == expected
```

## Mocking y tests de integracion

**Mocking** con `unittest.mock`:
```python
from unittest.mock import patch, MagicMock

def test_get_server_status(monkeypatch):
    def fake_get(url, timeout):
        response = MagicMock()
        response.json.return_value = {"status": "healthy"}
        response.status_code = 200
        return response

    monkeypatch.setattr("requests.get", fake_get)
    assert get_server_status("http://api/health") == "healthy"
```

**Integration tests** (lentos, requieren servicios reales):
```python
import pytest

@pytest.mark.integration
def test_real_api_call():
    response = requests.get("https://api.github.com", timeout=5)
    assert response.status_code == 200

@pytest.mark.slow
def test_long_running():
    ...
```

```bash
pytest -m "not slow"             # skip slow
pytest -m integration            # solo integration
pytest --cov=src --cov-report=html tests/
```

> **Convención DevOps**: unit tests en CI rapido, integration tests separados. Coverage >80% en scripts criticos.

## Puntos clave

- pytest descubra test_*.py automaticamente. assert es magico (no self.assertEqual).
- Fixtures para setup reutilizable, parametrize para el mismo test con varios inputs.
- unittest.mock para mockear requests, boto3, subprocess, etc.
- Markers (-m) separan unit/integration/slow. Coverage report con pytest-cov.
