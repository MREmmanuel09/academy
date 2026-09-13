---
id: bigdata-distributed
slug: bigdata-distributed
title: Computacion distribuida: CAP, particiones y consenso
module: devops
difficulty: intermediate
estimatedMinutes: 7
xp: 75
---

# Computacion distribuida: CAP, particiones y consenso

Por que disenar sistemas distribuidos es dificil. Teorema CAP, particiones de red, consenso distribuido.

## Sistemas distribuidos: la base de Big Data

Big Data **es** computacion distribuida. En vez de tener una mega-maquina, tenemos decenas, cientos o miles de maquinas baratas cooperando. Eso trae problemas nuevos que no existen en sistemas mono-servidor.

## Teorema CAP (Eric Brewer, 2000)

En un sistema distribuido, ante una **particion de red** (los nodos no se ven), solo puedes garantizar **2 de 3**:

- **C**onsistency: todos los nodos ven el mismo dato al mismo tiempo
- **A**vailability: cada request recibe respuesta (no error)
- **P**artition tolerance: el sistema sigue funcionando aunque haya caida de red

**Ejemplos reales**:
- **CP** (consistency + partition): HBase, MongoDB (replica set), etcd
- **AP** (availability + partition): Cassandra, DynamoDB, CouchDB
- **CA** (consistency + availability): solo si NO hay particiones, raro en la practica. RDBMS tradicional.

**Kafka** sacrifica availability estricta para dar ordering + durability (dentro de una particion).

## Particiones de red y split-brain

**Particion de red**: dos grupos de nodos no se comunican. Si ambos aceptan escrituras, tendras **split-brain**: dos versiones del mismo dato que no se pueden reconciliar.

**Soluciones tipicas**:
- **Quorum** (mayoria): solo acepta escritura si la mayoria de nodos (N/2+1) confirma. Ej: Raft, Paxos.
- **Leader election**: solo el lider escribe; los demas son followers. Si el lider cae, nueva eleccion.
- **Conflict-free replicated data types** (CRDTs): estruturas de datos que convergen sin coordinacion.

## Consenso distribuido: Paxos y Raft

Como se ponen de acuerdo N nodios sobre un valor?

- **Paxos** (Lamport, 1989): correcto pero legendariamente complejo. Multiples rondas de mensajes.
- **Raft** (Ongaro, 2014): version "entendible" de Paxos. Usado por etcd, Consul, Kafka (controller quorum).

**Regla basica**: si necesitas eleccion de lider y replicacion consistente, usa Raft. Si tu sistema es eventualmente consistente (Cassandra), no necesitas consenso fuerte.

## Tolerancia a fallos

En un cluster de 1000 nodos, **fallos son la norma**, no la excepcion. Expectativa: ~1 nodo falla por dia.

**Patrones**:
- **Replicacion**: cada dato guardado en N nodos (tipicamente 3).
- **Heartbeats**: los nodos se mandan "estoy vivo" cada pocos segundos. Si no responden, se marcan como caidos.
- **Supervisores**: un proceso "master" vigila a los "workers" y los reinicia si mueren (YARN, Kubernetes).
- **Re-computacion**: si un nodo cae mid-job, otro nodo retoma desde el ultimo checkpoint.

## Puntos clave

- CAP: en particion de red, solo puedes garantizar 2 de 3 (C, A, P).
- Paxos y Raft son algoritmos de consenso para eleccion de lider y replicacion.
- En Big Data los fallos son normales: disena para N-1 siempre funcionando.
