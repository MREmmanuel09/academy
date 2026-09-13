---
id: history-1
slug: history-1
title: Historia de Internet y las redes: quien invento que
module: fundamentos
difficulty: beginner
estimatedMinutes: 10
xp: 60
---

# Historia de Internet y las redes: quien invento que

De ARPANET a TCP/IP, de Cisco a Linux. El contexto historico que explica el presente.

## Los origenes (1960-1980)

### ARPANET (1969)

La primera red de conmutacion de paquetes fue **ARPANET**, financiada por la ARPA (Advanced Research Projects Agency) del Departamento de Defensa de EE.UU. La creo **J.C.R. Licklider**, psicologo y cientifico de la computacion, con la vision de una "red intergalactica de computadoras". El primer mensaje se envio el 29 de octubre de 1969 entre UCLA y Stanford. Solo llego la letra "L" de "LOGIN" antes de que el sistema colapsara.

### TCP/IP (1974)

**Vint Cerf** y **Bob Kahn** publicaron en mayo de 1974 el paper "A Protocol for Packet Network Intercommunication" que definio TCP. La primera version estable del protocolo (TCPv4 con IP) se documento en RFC 791 (IP) y RFC 793 (TCP) en 1981.

Dato curioso: Vint Cerf y Bob Kahn ganaron el **Premio Turing** en 2004 por este trabajo, considerado el "Padre de Internet".

### OSI (1984)

El modelo **OSI** (Open Systems Interconnection) fue definido por la **ISO** (International Organization for Standardization) en 1984 como el estandar ISO/IEC 7498. Curiosamente, **nunca se implemento completamente** - TCP/IP gano en el mercado real. Pero OSI se sigue usando como modelo de referencia para entender las redes.

### UNIX y C (1970s)

**Dennis Ritchie** y **Ken Thompson** crearon el lenguaje C y el sistema operativo UNIX en Bell Labs entre 1969-1973. Casi todo en Internet corre sobre descendientes de UNIX: Linux, macOS, BSD, iOS, Android. C sigue siendo el lenguaje dominante en sistemas operativos y embebidos.

### Linux (1991)

**Linus Torvalds**, estudiante finlandes de 21 anos, anuncio el 25 de agosto de 1991 en un newsgroup: "Estoy haciendo un sistema operativo (gratis, solo un hobby, no sera grande ni profesional como GNU)". 33 anos despues, **Linux** corre en el 100% de los supercomputadores TOP500, 96%+ de los servidores cloud, y 73% de smartphones (via Android).

### World Wide Web (1989-1991)

**Tim Berners-Lee**, cientifico del CERN, invento la WWW en 1989. La primera pagina web se puso online el 6 de agosto de 1991. La primera version del navegador Mosaic (con graficos) se creo en 1993 en NCSA por Marc Andreessen (luego fundo Netscape, y mas tarde venture capital).

## La era moderna (1990-2010)

### Cisco y el networking empresarial (1984-)

**Leonard Bosack** y **Sandy Lerner**, esposos que trabajaban en Stanford, fundaron **Cisco** en 1984. El nombre viene de "San Francisco". Construyeron el primer router multiprotocolo comercial. Cisco se hizo dominante en routers enterprise, y sus certificaciones (CCNA, CCNP, CCIE) son las mas valoradas del mundo del networking.

Lerner fue despedida en 1990 (acciones cayeron cuando se supo). Bosack tambien. Vendieron sus acciones por estimatedMinutes: 70M. Cisco es hoy una empresa de $200B+.

### World Wide Web (1991-)

**Marc Andreessen** y Eric Bina crearon **Mosaic** en NCSA en 1993. Andreessen fundo **Netscape** en 1994, y lanzo el navegador Netscape Navigator. La guerra de navegadores (Netscape vs Internet Explorer) termino cuando Microsoft ato IE a Windows. Andreessen fundo a16z, uno de los VCs mas grandes de Silicon Valley.

### Amazon AWS (2006)

**Jeff Bezos** anuncio Amazon Web Services en 2006 con S3 (storage) y SQS (queue). AWS definio el cloud moderno. Bezos dijo: "No tenemos tecnologia, solo vendemos storage y compute a otros developers". Hoy AWS es $90B+年收入 y el cloud provider mas grande.

### Git (2005)

**Linus Torvalds** creo Git en abril 2005 para el desarrollo del kernel Linux, frustrado por las limitaciones de BitKeeper. En 2 semanas escribio el primer version. La diseno para ser: rapido, distribuido (no necesita servidor central), con historial integro (SHA-1 de cada archivo), y soportar miles de branches. Hoy es el VCS dominante con 95%+ de adopcion.

### El (2003-) y el open source empresarial

**Linus Torvalds** aplico la ley de Linus: "Dados suficientes ojos, todos los bugs son shallow". El modelo open source + Linux + Apache + MySQL + PHP (**LAMP**) definio el web 2.0.

### Kubernetes (2014)

**Google** anuncio Kubernetes en junio de 2014, despues de 10+ anos corriendo Borg internamente (el sistema que manejaba los billones de containers de Google). Donaron K8s a la **Cloud Native Computing Foundation (CNCF)** en 2015. Basado en lecciones de Borg, pero con APIs modernas. El 88% de organizaciones usan K8s en produccion hoy.

### Docker (2013)

**Solomon Hykes** fundo dotCloud en 2008, una PaaS. Para hacerla eficiente, crearon containers. En 2013 presento **Docker** en la conferencia PyCon. La simplicidad de "build, ship, run" democratizo los containers. Docker se volvio sinonimo de containers. Hoy Solomon esta en Dagger (CI/CD declarativo).

## La era DevOps y SRE (2007-presente)

### DevOps (2009)

**Patrick Debois**, consultor belga, organizo la primera "DevOpsDays" en Gante, Belgica, en octubre 2009. El nombre "DevOps" nacio de ahi (de "Dev" + "Ops", en contraposicion a los silos de desarrollo y operaciones). 

**Patrick Debois** es considerado el "padre" del movimiento DevOps. Publico "The DevOps Handbook" con Gene Kim, Jez Humble, y John Willis.

### Continuous Delivery (2010)

**Jez Humble** y **David Farley** publicaron "Continuous Delivery" en 2010, definiendo el pipeline de deployment como practicas de ingenieria, no magia. Jez fundo DORA (DevOps Research and Assessment) en Google con Gene Kim, y descubrieron los "Four Keys Metrics" (deployment frequency, lead time, change fail rate, MTTR).

### SRE (2003)

**Ben Treynor** fundo el equipo de SRE en Google en 2003. La palabra "SRE" fue un internalismo de Google hasta que **Niall Murphy, Betsy Beyer, Chris Jones, y Jennifer Petoff** publicaron el libro "Site Reliability Engineering: How Google Runs Production Systems" en 2016. Disponible gratis en sre.google/sre-book.

### CALMS / CAMS

**CALMS** (Culture, Automation, Lean, Measurement, Sharing) y **CAMS** (Culture, Automation, Measurement, Sharing) son acronimos del movimiento DevOps, popularizados por **Damon Edwards** y **John Willis**. Lean a veces se reemplaza por Feedback. CAMS es la version corta, CALMS es la extendida.

### The Phoenix Project (2013)

**Gene Kim**, **Kevin Behr**, y **George Spafford** publicaron "The Phoenix Project" en 2013, una novela sobre DevOps que se convirtio en el libro mas leido del movimiento. El **DevOps Handbook** (2016) es la version no-ficcion.

### The Three Ways

**Gene Kim** formalizo las **Three Ways** (en The DevOps Handbook):
1. **Flow**: optimizar el flujo de trabajo de dev a ops
2. **Feedback**: feedback rapido y continuo en todas las direcciones
3. **Continuous Learning**: cultura de experimentacion y mejora continua

## Puntos clave

- Internet nacio de ARPANET (1969, Licklider) y TCP/IP (1974, Cerf+Kahn). OSI (1984) es solo modelo de referencia, no se implemento.
- Linux (1991, Torvalds) corre en 100% de supercomputadoras y 96% de servidores cloud. Git (2005, Torvalds) es el 95%+ de VCS.
- DevOps nacio en 2009 con Patrick Debois. SRE nacio en Google 2003 con Ben Treynor. The Three Ways son de Gene Kim.
- Docker (2013, Hykes) democratizo containers. Kubernetes (2014, Google) los oriento a produccion.

:::quiz
[
  {
    "question": "De donde nace Internet?",
    "options": ["De OSI en 1984", "De ARPANET (1969) y TCP/IP (1974, Cerf+Kahn)", "De Linux en 1991", "De Docker en 2013"],
    "correctIndex": 1,
    "explanation": "ARPANET + TCP/IP son la raiz. OSI (1984) quedo como modelo de referencia, no implementado."
  },
  {
    "question": "Quien creo Linux y Git?",
    "options": ["Patrick Debois", "Linus Torvalds (1991 y 2005)", "Gene Kim", "Ben Treynor"],
    "correctIndex": 1,
    "explanation": "Torvalds creo Linux (1991) y Git (2005). Debois impulso DevOps (2009), Treynor el SRE en Google."
  },
  {
    "question": "Que aporto Docker en 2013?",
    "options": ["La nube publica", "Containers usables para todos, base del DevOps moderno", "El protocolo HTTP", "Wi-Fi 6"],
    "correctIndex": 1,
    "explanation": "Docker democratizo los containers; Kubernetes (2014) los llevo a produccion."
  }
]
:::
