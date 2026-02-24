# Macacos Condos Admin

Plataforma SaaS multicondominio (multi-tenant) para la gestión administrativa de condominios.

Proyecto desarrollado para la materia **Diseño de Sistemas Escalables**.

---

# Propósito del Proyecto

Centralizar la administración de múltiples condominios dentro de una sola plataforma web, reemplazando herramientas dispersas como hojas de cálculo y aplicaciones de mensajería.

El sistema está diseñado bajo un modelo SaaS con arquitectura multi-tenant y enfoque en:

* Escalabilidad
* Aislamiento de datos
* Seguridad
* Trazabilidad
* Modularidad

---

# Contexto Arquitectónico (IMPORTANTE PARA DESARROLLO)

## Modelo SaaS Multi‑Tenant

* Base de datos compartida
* Separación lógica por `tenantId`
* Todas las entidades deben incluir `tenantId`
* Middleware obligatorio que:

  * Valida JWT
  * Extrae `tenantId`
  * Inyecta `req.tenantId`
  * Restringe consultas por tenant

Regla crítica: Ninguna consulta puede ejecutarse sin filtrar por `tenantId`.

---

# Arquitectura Técnica

## Backend

* Node.js
* Express
* MongoDB Atlas
* Mongoose
* JWT (jsonwebtoken)
* bcryptjs
* express-validator
* helmet
* morgan

Arquitectura modular por feature.

Estructura esperada:

```
backend/src/
│
├── config/
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── charges/
│   ├── payments/
│   ├── maintenance/
│   ├── reservations/
│
├── middleware/
│   ├── authMiddleware.js
│   ├── tenantMiddleware.js
│   └── roleMiddleware.js
│
├── utils/
├── logs/
├── app.js
└── server.js
```

---

## Frontend

* React
* Vite
* Arquitectura por roles
* Consumo de API REST

Estructura sugerida:

```
frontend/src/
│
├── api/
├── components/
├── pages/
├── layouts/
├── routes/
├── context/
├── hooks/
└── App.jsx
```

---

# Actores del Sistema

## Superadministrador

* Gestiona tenants
* Activa / desactiva condominios
* Configura parámetros globales

## Administrador del Condominio

* Gestiona residentes
* Crea cargos
* Administra pagos
* Supervisa reportes

## Residente

* Consulta estado de cuenta
* Registra pagos
* Reporta mantenimiento
* Reserva amenidades

---

# Módulos Funcionales

## AUTH

* Registro
* Login
* Recuperación de contraseña
* Control por roles

## TEN

* Registro de condominio
* Configuración
* Activar / desactivar

## CARG

* CRUD de cargos
* Asignación a residentes

## PAG

* Registro de pago
* Asociación pago‑cargo
* Estado de cuenta

## MANT

* Crear reporte
* Cambiar estado
* Asignar responsable
* Historial

## RES

* Calendario centralizado
* Validación de conflictos
* Crear / cancelar reservación

---

# Requisitos No Funcionales

## Seguridad

* 0 accesos cruzados entre tenants
* 100% rutas protegidas
* JWT obligatorio
* Contraseñas encriptadas

## Rendimiento

* ≤ 2s promedio
* ≤ 5s máximo

## Escalabilidad

* Soporte mínimo 10 tenants
* Posibilidad futura de sharding

## Disponibilidad

* ≥ 99% mensual

## Trazabilidad

* Logs obligatorios para acciones críticas
* Cada log debe incluir:

  * usuario
  * tenantId
  * fecha
  * acción

---

# Instalación

## Backend

```
cd backend
npm install
npm run dev
```

## Frontend

```
cd frontend
npm install
npm run dev
```

---

# Estrategia de Ramas

* main → producción
* develop → integración
* feature/* → nuevas funcionalidades

Ejemplo:

```
feature/auth-module
feature/tenant-middleware
feature/reservations-module
```

No se trabaja directamente en main.

---

# Riesgos Técnicos

* Error en aislamiento de tenants
* Consultas sin índices
* Falta de validaciones
* Crecimiento sin estrategia de escalabilidad

---

# Evolución Futura

* Base de datos por tenant
* Sharding
* Integración con pasarelas de pago
* Aplicación móvil
* Sistema avanzado de auditoría

---

# Convenciones de Desarrollo

* Todas las rutas protegidas deben usar middleware de autenticación.
* Todas las consultas deben filtrar por `tenantId`.
* No se permiten accesos directos a modelos sin pasar por capa de servicio.
* Validaciones obligatorias en entrada de datos.
* Manejo centralizado de errores.

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
