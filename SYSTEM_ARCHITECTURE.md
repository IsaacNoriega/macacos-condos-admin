# 🦍 Macacos Condos Admin - Especificación Técnica y Arquitectónica Completa

Este documento proporciona un desglose exhaustivo de la ingeniería, seguridad y lógica operativa del ecosistema Macacos Condos Admin.

---

## 🏛️ 1. Arquitectura del Frontend (Angular 17+)

El frontend está diseñado siguiendo patrones de alta eficiencia y reactividad moderna.

### 🧩 Componentes y Estado
- **Standalone Components**: Eliminamos la sobrecarga de módulos para un renderizado más rápido y una mejor sacudida de código (tree-shaking).
- **Signals**: Utilizamos el nuevo sistema de reactividad de Angular para una gestión de estado granular, evitando ciclos de detección de cambios innecesarios y optimizando el rendimiento en el navegador.
- **Tailwind CSS & Material UI**: Interfaz premium con diseño responsivo y micro-animaciones fluidas.

### 🛡️ Seguridad en el Cliente
- **Auth Interceptor**: Adjunta automáticamente el token JWT en el header `Authorization`.
- **Tenant Interceptor**: Inyecta dinámicamente el header `x-tenant-id` en cada petición, asegurando la integridad del multi-tenancy.
- **Route Guards**: Protegen las rutas según el rol (SuperAdmin vs Admin), redirigiendo al login si la sesión expira.
- **Sanitización de Forms**: Implementación de `Reactive Forms` con validadores personalizados para prevenir la entrada de datos corruptos antes de que lleguen a la red.

---

## ⚙️ 2. Arquitectura del Backend (Node.js & Express)

El backend sigue un patrón modular basado en servicios, garantizando que cada pieza sea independiente y testeable.

### 🔌 API REST Modular
- **Ruteo**: Estructura de `/api/v1` con separación por módulos (Auth, Users, Charges, Payments, Maintenance, etc.).
- **Middleware Chain**: Cada petición pasa por una serie de filtros:
  1. `azureIpMiddleware`: Bloqueo de IPs externas al Gateway.
  2. `helmet`: Inyección de cabeceras de seguridad HTTP.
  3. `authMiddleware`: Validación de JWT y rol de usuario.
  4. `tenantMiddleware`: Validación de pertenencia al condominio.
  5. `validateRequest`: Sanitización estricta del payload usando **Zod**.

### 🏗️ Persistencia y Datos
- **Mongoose & MongoDB Atlas**: Modelado de datos con esquemas estrictos e índices optimizados para búsquedas rápidas por `tenantId`.
- **Aggregation Pipelines**: Consultas complejas para el dashboard que calculan ingresos y morosidad en tiempo real mediante tuberías de procesamiento (`$lookup`, `$group`, `$project`).

---

## 🛡️ 3. Seguridad Zero Trust e Infraestructura

### ⛩️ Red y Perímetro
- **Azure Application Gateway**: Actúa como un firewall de aplicaciones web (WAF), filtrando ataques de inyección y denegación de servicio (DDoS).
- **Zero Trust Guard**: El servidor Railway valida que el tráfico provenga exclusivamente del Gateway mediante el análisis de la última IP en el header `x-forwarded-for`.
- **HTTPS Nativo**: Soporte completo para SSL/TLS con validación PKI (Comodo/Digicert).

### ☁️ Servicios Cloud Integrados
- **Azure Blob Storage**: Almacenamiento seguro de comprobantes de pago y recibos generados, con redundancia geográfica.
- **Azure Communication Services**: Infraestructura de correo empresarial con SPF, DKIM y DMARC configurados para evitar el spam.

---

## 🚀 4. Performance y Escalabilidad

### 💎 Estrategia de Caché Avanzada
- **Azure Managed Redis Cluster**: Implementamos el patrón **Cache-Aside**. Los datos financieros se cachean con claves estructuradas (`tenant:{id}:stats`).
- **Invalidación Atómica**: Al detectar una mutación (nuevo pago), el sistema invalida el caché del tenant específico en milisegundos, manteniendo la consistencia total.

### 🧵 Procesamiento Asíncrono (BullMQ)
- **Producer/Consumer**: Las tareas pesadas se envían a Redis y son procesadas por Workers independientes.
- **Lógica de Workers**:
  - **PDF Worker**: Genera recibos usando plantillas dinámicas (Handlebars) y Puppeteer.
  - **Email Worker**: Maneja colas de envío masivo para cargos mensuales.
- **Escalabilidad**: Podemos escalar los Workers de forma independiente a la API para manejar picos de tráfico (ej. el día 1 de cada mes).

---

## 📈 5. Lógica de Negocio Financiera

### 💰 Ciclo de Cobro Automatizado
1. **Bulk Charge Generation**: Un SuperAdmin selecciona un Tenant. El sistema busca a todos los residentes activos, vincula sus `unitId` y genera cargos masivos con una sola operación de base de datos.
2. **Notificación en Cascada**: BullMQ dispara notificaciones individuales para cada residente.
3. **Validación de Pago**: Al subir un comprobante, el sistema registra la transacción, marca la deuda como pagada y genera el recibo oficial de forma asíncrona.

---

> **Estatus de Ingeniería**: Grado Producción / Alta Disponibilidad
> **Diseñado por**: Antigravity AI & Senior Developers
