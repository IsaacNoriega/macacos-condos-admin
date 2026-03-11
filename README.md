# Macacos Condos Admin

Plataforma **SaaS multicondominio (multi-tenant)** para la gestión administrativa de condominios.

Proyecto desarrollado para la materia **Diseño de Sistemas Escalables**.

---

# Propósito del Proyecto

Centralizar la administración de múltiples condominios dentro de una sola plataforma web, reemplazando herramientas dispersas como hojas de cálculo, sistemas manuales y aplicaciones de mensajería.

El sistema está diseñado como un **SaaS multi-tenant**, permitiendo que múltiples condominios utilicen la misma plataforma mientras mantienen sus datos completamente aislados.

El diseño del sistema prioriza:

* Escalabilidad
* Aislamiento de datos entre condominios
* Seguridad
* Modularidad
* Trazabilidad
* Arquitectura preparada para cloud

---

# Contexto Arquitectónico (IMPORTANTE PARA DESARROLLO)

## Modelo SaaS Multi-Tenant

El sistema utiliza un modelo **multi-tenant con base de datos compartida**.

Cada registro del sistema pertenece a un **tenant**, que representa un condominio.

Separación lógica mediante:

```
tenantId
```

### Reglas obligatorias

1. Todas las entidades deben incluir `tenantId`
2. Todas las consultas deben filtrar por `tenantId`
3. El backend utiliza middleware que:

* valida JWT
* identifica el usuario
* extrae `tenantId`
* inyecta `req.tenantId`
* restringe acceso a datos de otros condominios

Regla crítica:

**Ninguna consulta puede ejecutarse sin filtrar por `tenantId`.**

Esto garantiza el aislamiento de datos entre condominios.

---

# Arquitectura Técnica

## Frontend

Framework principal:

* Angular
* Arquitectura modular por features
* Consumo de API REST
* Control de acceso basado en roles

Estructura sugerida:

```
frontend/src/
│
├── app/
│   ├── core/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── services/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── residents/
│   │   ├── charges/
│   │   ├── payments/
│   │   ├── maintenance/
│   │   └── reservations/
│   │
│   ├── shared/
│   └── layouts/
│
└── environments/
```

El frontend maneja:

* autenticación
* rutas protegidas
* control de roles
* consumo de API

---

## Backend

Tecnologías principales:

* Node.js
* Express
* MongoDB Atlas
* Mongoose
* JWT (jsonwebtoken)
* bcrypt
* express-validator
* helmet
* morgan

Arquitectura **modular por dominio**.

Estructura esperada:

```
backend/src/
│
├── config/
│
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── units/
│   ├── residents/
│   ├── charges/
│   ├── payments/
│   ├── maintenance/
│   └── reservations/
│
├── middleware/
│   ├── authMiddleware.js
│   ├── tenantMiddleware.js
│   └── roleMiddleware.js
│
├── services/
├── utils/
├── logs/
│
├── app.js
└── server.js
```

---

## Infraestructura Cloud

El sistema está diseñado para desplegarse en **Microsoft Azure**.

Servicios previstos:

* Azure App Service (backend)
* Azure Blob Storage (archivos)
* MongoDB Atlas (base de datos)
* Azure Application Gateway (balanceador)

Arquitectura simplificada:

```
Usuarios
   │
   ▼
Angular SPA
   │
   ▼
API REST (Node.js / Express)
   │
   ├── Auth Service
   ├── Tenant Service
   ├── Condo Management
   ├── Payments Service
   ├── Maintenance
   └── Reservations
   │
   ▼
MongoDB Atlas
   │
   ▼
Azure Blob Storage
```

---

# Sistema de Pagos

Los pagos se gestionan mediante **Stripe**.

Se utiliza para:

* pago de cuotas
* pago de cargos
* reservas pagadas (opcional)

Flujo simplificado:

```
Residente
   │
Angular App
   │
Backend API
   │
Stripe Checkout
   │
Webhook Stripe
   │
Actualización del pago en base de datos
```

---

# Modelo de Ocupación de Departamentos

Cada unidad (departamento o casa) puede tener **hasta 5 residentes registrados**.

Estructura conceptual:

```
Condominium
   │
   ├── Unit
   │     ├── Resident
   │     ├── Resident
   │     ├── Resident
   │     ├── Resident
   │     └── Resident
```

Esto permite representar familias o copropietarios dentro de una misma unidad.

---

# Roles del Sistema

## SuperAdmin

Administrador global del sistema SaaS.

Puede:

* crear condominios
* gestionar tenants
* activar o desactivar condominios
* supervisar el sistema completo

---

## Admin (Administrador del Condominio)

Gestiona la operación de un condominio específico.

Puede:

* administrar unidades
* registrar residentes
* generar cargos
* gestionar pagos
* administrar mantenimiento
* gestionar reservaciones

---

## Residente / Inquilino

Usuario que habita una unidad dentro del condominio.

Puede:

* consultar estado de cuenta
* pagar cuotas
* reportar mantenimiento
* reservar amenidades
* consultar anuncios

---

## Familiar / Copropietario (opcional)

Miembros adicionales de la unidad.

Permite:

* ver información del departamento
* realizar reservas
* consultar cargos

Sin permisos administrativos.

---

# Módulos Funcionales

## AUTH

* Registro
* Login
* Recuperación de contraseña
* Control de roles

---

## TENANTS

* Registro de condominios
* Configuración
* Activación / desactivación

---

## USERS

* gestión de usuarios
* asignación de roles
* control de acceso

---

## UNITS

* registro de departamentos o casas
* asignación de residentes

---

## CHARGES

* creación de cargos
* asignación a unidades
* historial de cargos

---

## PAYMENTS

* integración con Stripe
* registro de pagos
* estado de cuenta

---

## MAINTENANCE

* reportes de mantenimiento
* seguimiento de estado
* asignación de responsables

---

## RESERVATIONS

* reservación de amenidades
* calendario
* validación de conflictos

---

# Requisitos No Funcionales

## Seguridad

* aislamiento completo entre tenants
* JWT obligatorio
* contraseñas encriptadas
* validaciones en backend

---

## Rendimiento

* ≤ 2 segundos promedio de respuesta
* ≤ 5 segundos máximo

---

## Escalabilidad

Arquitectura preparada para:

* múltiples condominios
* crecimiento de usuarios
* expansión SaaS

---

## Disponibilidad

Objetivo mínimo:

```
99% disponibilidad mensual
```

---

## Trazabilidad

El sistema registra logs para acciones críticas.

Cada log debe incluir:

* usuario
* tenantId
* fecha
* acción realizada

---

# Instalación

## Backend

```
cd backend
npm install
npm run dev
```

---

## Frontend

```
cd frontend
npm install
npm start
```

---

# Estrategia de Ramas

Modelo basado en Git Flow simplificado.

```
main → producción
develop → integración
feature/* → nuevas funcionalidades
```

Ejemplos:

```
feature/auth-module
feature/tenant-middleware
feature/payments-stripe
feature/reservations-module
```

No se trabaja directamente sobre `main`.

---

# Riesgos Técnicos

* errores en aislamiento multi-tenant
* consultas sin índices
* integración incorrecta con Stripe
* crecimiento sin estrategia de escalado

---

# Evolución Futura

Posibles mejoras:

* base de datos por tenant
* sharding
* aplicación móvil
* notificaciones push
* sistema avanzado de auditoría
* microservicios para pagos y notificaciones

---

# Convenciones de Desarrollo

Reglas obligatorias para el proyecto:

* todas las rutas protegidas deben usar middleware de autenticación
* todas las consultas deben filtrar por `tenantId`
* no se permiten accesos directos a modelos sin capa de servicio
* validaciones obligatorias en entrada de datos
* manejo centralizado de errores

---

## Estándar de Validación y Logs (implementado)

Para mantener consistencia en backend y facilitar auditoría:

* toda ruta que use `express-validator` debe ejecutar el middleware `validateRequest` antes del controlador
* los errores de validación deben responder con estructura uniforme (`success`, `message`, `errors`)
* toda acción crítica (auth, create, update, delete y webhooks de pago) debe registrar log

Formato de evento de log:

```
dominio.accion
```

Ejemplos:

* `auth.login`
* `users.create`
* `payments.checkoutSession.create`
* `payments.webhook.completed`

Campos mínimos por log:

* usuario (o `system`/`stripe-webhook` cuando aplique)
* tenantId (o `global` cuando no exista contexto de tenant)
* fecha (timestamp ISO)
* acción realizada

---

# Equipo

* Luis Arturo Gutierrez Garcia
* Isaac Adbiel Noriega Villalobos
* Luis Roberto Navarro Quin
* Oscar Clemente Lopez Labrador
* Regina Plascencia Gómez

Profesor:

David Emmanuel Ramirez T.

---

Proyecto académico con fines educativos.
