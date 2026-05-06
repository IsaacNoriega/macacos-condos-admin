# 🦍 Macacos Condos Admin - Arquitectura de Sistemas y Lógica de Negocio

Este documento detalla la arquitectura técnica, las medidas de seguridad y la lógica de escalabilidad implementadas en el ecosistema de Macacos Condos Admin.

## 🚀 1. Visión General
Macacos Condos Admin es una plataforma **SaaS (Software as a Service)** diseñada para la gestión integral de condominios. Utiliza una arquitectura moderna basada en micro-servicios lógicos, enfocada en la alta disponibilidad y la integridad financiera.

---

## 🛠 2. Stack Tecnológico (Core)
- **Backend**: Node.js con Express (Arquitectura modular).
- **Base de Datos**: MongoDB Atlas (Persistencia distribuida).
- **Caché**: Azure Managed Redis (Modo Cluster).
- **Mensajería/Colas**: BullMQ (Procesamiento asíncrono).
- **Infraestructura**: Railway (API) + Azure (Application Gateway, Blob Storage, Email Services).

---

## 🧠 3. Lógica de Negocio Avanzada

### 💎 Estrategia de Performance (Cache-Aside)
Implementamos una capa de caché inteligente para el Dashboard Administrativo:
- **Flujo**: Al solicitar estadísticas, el sistema consulta primero a Redis. Si no existen, realiza agregaciones complejas en MongoDB, las guarda en Redis con un TTL (Time to Live) de 30 minutos y las sirve.
- **Invalidación Proactiva**: Cada vez que se registra un pago o se crea un cargo, el sistema limpia automáticamente el caché de ese "Tenant" y el caché global de SuperAdmin.

### 📊 Gestión Financiera Masiva (Bulk Billing)
El sistema permite a un SuperAdmin facturar a cientos de usuarios en segundos:
- **Procesamiento**: El backend identifica a todos los residentes de un condominio, genera cargos individuales vinculados a sus unidades y los inserta de forma atómica usando `insertMany`.
- **Notificación Paralela**: Por cada cargo creado, se dispara una tarea a la cola de BullMQ para notificar vía email al residente.

### 📧 Automatización de Notificaciones
- **Recibos de Pago**: Tras validar un pago, un Worker genera un PDF profesional, lo sube a Azure Blob Storage y dispara un email con el enlace de descarga automáticamente.
- **Integración con Azure**: Utilizamos Azure Communication Services para garantizar una alta tasa de entrega de correos.

---

## 🛡 4. Seguridad (Zero Trust Architecture)

### ⛩ Filtro de IP (Azure Application Gateway)
- **Concepto**: El servidor de Railway está blindado. Solo acepta peticiones que hayan pasado por el Azure Application Gateway (IP: `172.214.17.219`).
- **Lógica de Validación**: El middleware analiza la cadena de proxies (`x-forwarded-for`) y verifica que el último salto coincida con la infraestructura autorizada de Azure.

### 🔑 Control de Acceso (RBAC)
- **Multi-tenancy**: Cada petición está aislada por un `tenantId` inyectado vía JWT. Un administrador de un condominio jamás podrá ver datos de otro condominio.
- **Roles**: Sistema de jerarquía (SuperAdmin, Admin, Residente) que restringe rutas y acciones específicas.

### 🔒 Cifrado y Validación
- **SSL/TLS**: Implementación de rutas `.well-known` para validación PKI y soporte de HTTPS nativo.
- **Sanitización**: Validación de payloads con esquemas estrictos antes de que lleguen a los controladores.

---

## 📈 5. Escalabilidad y RNF (Requerimientos No Funcionales)

### 🔄 Procesamiento Asíncrono (Producer-Consumer)
Las tareas pesadas (envío de emails, generación de PDFs, cargos masivos) no bloquean la API. Se delegan a Workers independientes que consumen tareas de Redis. Esto permite que la API responda en milisegundos incluso bajo carga pesada.

### 🌐 Cloud Hybrid Model
Combinamos la agilidad de Railway con la potencia de Azure para servicios críticos (Storage y Networking), logrando una infraestructura híbrida redundante y escalable.

### 🧹 Limpieza y Mantenimiento
- **Fail-Safe**: Los Workers tienen lógica de reintentos exponenciales para fallos temporales de red.
- **Logging**: Sistema de trazas centralizado (`logger.ts`) para auditoría de errores en tiempo real.

---

> **Estatus del Proyecto**: Producción / Enterprise Ready
> **Senior Architect**: Antigravity AI
