---
id: iac-2
slug: iac-2
title: Ansible: configuration management
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Ansible: configuration management

Automatizar configuración de servidores. Idempotente, agentless.

## ¿Qué es Ansible?

**Ansible** automatiza la **configuración** de servidores: instalar paquetes, modificar archivos, gestionar servicios.

**Vs Terraform**:
- **Terraform**: provisiona infra (crea VM, red, DB)
- **Ansible**: configura esa infra (instala nginx, copia configs, reinicia servicio)

**Características**:
- **Agentless**: solo necesita SSH, no instala nada en targets
- **Idempotente**: ejecutar 10 veces = mismo resultado que 1
- **YAML**: sintaxis simple
- **Push-based**: controller empuja a los nodos
- **Baterías incluidas**: 5000+ módulos

## Conceptos

### Inventario

Lista de hosts a gestionar. Por defecto `/etc/ansible/hosts`.

```ini
# inventory.ini
[web]
web1.example.com
web2.example.com
192.168.1.10

[db]
db1.example.com
db2.example.com

[production:children]
web
db
```

### Ad-hoc commands

```bash
ansible all -i inventory.ini -m ping
ansible web -i inventory.ini -m shell -a "uptime"
ansible web -i inventory.ini -m apt -a "name=nginx state=present" --become
ansible all -i inventory.ini -m copy -a "src=/local/file dest=/remote/file"
```

### Playbook

```yaml
# deploy.yml
---
- name: Deploy web app
  hosts: web
  become: yes
  
  vars:
    app_version: "1.2.3"
    app_port: 8080
  
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: yes
    
    - name: Copy config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: restart nginx
    
    - name: Copy app
      copy:
        src: ../app/
        dest: /opt/myapp/
        owner: app
        group: app
    
    - name: Start service
      service:
        name: nginx
        state: started
        enabled: yes
  
  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

```bash
ansible-playbook -i inventory.ini deploy.yml
ansible-playbook -i inventory.ini deploy.yml --check    # dry-run
ansible-playbook -i inventory.ini deploy.yml --diff    # mostrar cambios
ansible-playbook -i inventory.ini deploy.yml --tags "config"  # solo tareas con tag
```

## Roles y variables

### Estructura de un role

```
roles/
  nginx/
    tasks/
      main.yml
    handlers/
      main.yml
    templates/
      nginx.conf.j2
    files/
      index.html
    vars/
      main.yml
    defaults/
      main.yml
    meta/
      main.yml
```

```bash
ansible-galaxy init nginx
```

### Usar el role

```yaml
- hosts: web
  roles:
    - nginx
    - common
```

### Variables con Jinja2

```jinja
# templates/nginx.conf.j2
server {
    listen {{ app_port }};
    server_name {{ ansible_hostname }};
    
    location / {
        proxy_pass http://{{ upstream }};
    }
    
    {% for backend in backends %}
    upstream {{ backend.name }} {
        server {{ backend.host }}:{{ backend.port }};
    }
    {% endfor %}
}
```

### Vault: secrets cifrados

```bash
ansible-vault create secrets.yml
ansible-vault edit secrets.yml
ansible-vault encrypt file.yml
ansible-vault decrypt file.yml
ansible-vault rekey file.yml

ansible-playbook deploy.yml --ask-vault-pass
ansible-playbook deploy.yml --vault-password-file ~/.vault_pass
```

```yaml
# secrets.yml (cifrado)
db_password: "supersecret"
api_key: "abc123"
```

### AWX / Ansible Tower

UI web para Ansible:
- Inventarios visuales
- Schedules
- RBAC
- Logs centralizados
- API REST

Alternativa open source: **AWX**. SaaS: **Ansible Automation Platform**.

## Puntos clave

- Ansible automatiza config: agentless, idempotente, YAML, push-based.
- Playbooks = lista de tasks. Tasks usan módulos (apt, copy, service).
- Roles organizan código en estructura estándar. ansible-galaxy init crea el esqueleto.
- ansible-vault cifra secretos. AWX/Tower añade UI, RBAC, schedules.

:::quiz
[
  {
    "question": "Que es un playbook?",
    "options": ["Un manual PDF", "Lista de tasks que usan modulos (apt, copy, service)", "Un inventario", "Un vault"],
    "correctIndex": 1,
    "explanation": "Playbook = desired state declarativo ejecutado por modulos idempotentes."
  },
  {
    "question": "Donde van los secretos en Ansible?",
    "options": ["En claro en el playbook", "Cifrados con ansible-vault", "En comentarios", "Por email"],
    "correctIndex": 1,
    "explanation": "Vault cifra variables/ficheiros; solo quien tiene la clave los usa en ejecucion."
  },
  {
    "question": "Que aporta AWX/Tower sobre CLI?",
    "options": ["Mas velocidad", "UI, RBAC, schedules e inventario central", "Otro lenguaje", "Nada"],
    "correctIndex": 1,
    "explanation": "Operativiza Ansible en equipo: permisos, programacion y auditoria."
  }
]
:::
