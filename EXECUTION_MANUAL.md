# Manual de Ejecución — Macacos Condos Admin

Guía paso a paso para instalar, configurar y ejecutar la plataforma SaaS multi-tenant de administración de condominios.

---

## Tabla de Contenidos

1. [Prerequisitos](#1-prerequisitos)
2. [Instalación de Dependencias](#2-instalación-de-dependencias)
3. [Configuración de Variables de Entorno](#3-configuración-de-variables-de-entorno)
4. [Configuración de Base de Datos](#4-configuración-de-base-de-datos)
5. [Iniciar el Backend](#5-iniciar-el-backend)
6. [Iniciar el Frontend](#6-iniciar-el-frontend)
7. [Credenciales de Prueba](#7-credenciales-de-prueba)
8. [Flujo Sugerido de Validación](#8-flujo-sugerido-de-validación)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisitos

Asegúrate de tener instalado lo siguiente antes de continuar:

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Git | 2.x | `git --version` |
| MongoDB Atlas | cuenta gratuita | [cloud.mongodb.com](https://cloud.mongodb.com) |

> **Nota:** El proyecto usa MongoDB Atlas (nube). No requiere instalación local de MongoDB, pero sí necesitas una cuenta gratuita en MongoDB Atlas con un cluster creado y la URI de conexión.

---

## 2. Instalación de Dependencias

### 2.1 Clonar el repositorio

```bash
git clone https://github.com/IsaacNoriega/macacos-condos-admin.git
cd macacos-condos-admin
```

### 2.2 Backend (Node.js / TypeScript)

```bash
cd backend
npm install
```

Dependencias principales instaladas:

- `express` — servidor HTTP
- `mongoose` — ODM para MongoDB
- `jsonwebtoken` — autenticación JWT
- `bcrypt` — hash de contraseñas
- `dotenv` — variables de entorno
- `stripe` — integración de pagos
- `helmet`, `cors`, `morgan` — seguridad y logging

### 2.3 Frontend (Angular 21)

```bash
cd ../frontend
npm install
```

Dependencias principales instaladas:

- `@angular/core`, `@angular/common`, `@angular/router` — framework Angular
- `@angular/forms` — formularios reactivos
- `rxjs` — programación reactiva
- `@angular/cli` — herramienta de desarrollo

---

## 3. Configuración de Variables de Entorno

### 3.1 Crear archivo `.env` en el backend

Desde la raíz del repositorio:

```bash
cd backend
cp .env.example .env
```

Luego abre el archivo `.env` con tu editor y llena los valores:

```env
# =============================================
# BASE DE DATOS
# =============================================
# URI de conexión a MongoDB Atlas
# Formato: mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<base_de_datos>
MONGODB_URI=mongodb+srv://devuser:devpassword@cluster0.abcde.mongodb.net/macacos_condos?retryWrites=true&w=majority

# =============================================
# AUTENTICACIÓN JWT
# =============================================
# Clave secreta para firmar los tokens JWT (mínimo 32 caracteres, usa algo aleatorio)
JWT_SECRET=mi_super_secreto_jwt_32_caracteres_minimo_aqui

# Duración del token (ejemplo: 12h, 7d, 30d)
JWT_EXPIRE=12h

# =============================================
# SERVIDOR
# =============================================
# Puerto en que corre el backend (por defecto 5000)
PORT=5000

# Entorno de ejecución: development | production
NODE_ENV=development

# =============================================
# LOGS
# =============================================
# Nivel de logs: debug | info | warn | error
LOG_LEVEL=debug

# =============================================
# STRIPE (pagos)
# =============================================
# Clave secreta de Stripe (obtenla en https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Clave pública de Stripe (para el webhook)
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# URL de redirección tras pago exitoso
STRIPE_SUCCESS_URL=http://localhost:4200/payments?status=success

# URL de redirección tras pago cancelado
STRIPE_CANCEL_URL=http://localhost:4200/payments?status=cancel
```

### 3.2 Descripción de cada variable

| Variable | Descripción | Ejemplo |
|---|---|---|
| `MONGODB_URI` | URI de conexión a MongoDB Atlas. Incluye usuario, contraseña y nombre de la base de datos. | `mongodb+srv://user:pass@cluster.mongodb.net/macacos` |
| `JWT_SECRET` | Clave secreta para firmar y verificar tokens JWT. Usa una cadena larga y aleatoria. | `s3cr3t_k3y_32chars_minimum` |
| `JWT_EXPIRE` | Tiempo de expiración del token JWT. | `12h` |
| `PORT` | Puerto donde escucha el backend. | `5000` |
| `NODE_ENV` | Entorno de ejecución. En `development` se muestran stacks de error. | `development` |
| `LOG_LEVEL` | Nivel mínimo de los logs registrados. | `debug` |
| `STRIPE_SECRET_KEY` | Clave secreta de la API de Stripe para procesar pagos. | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret para verificar webhooks de Stripe. | `whsec_...` |
| `STRIPE_SUCCESS_URL` | URL a la que Stripe redirige tras un pago exitoso. | `http://localhost:4200/payments?status=success` |
| `STRIPE_CANCEL_URL` | URL a la que Stripe redirige si el usuario cancela el pago. | `http://localhost:4200/payments?status=cancel` |

> **Para desarrollo local sin Stripe:** Puedes dejar `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` con valores de prueba de Stripe (`sk_test_...`). Los pagos via Stripe no funcionarán sin claves válidas, pero el resto del sistema sí.

---

## 4. Configuración de Base de Datos

### 4.1 Crear cuenta y cluster en MongoDB Atlas

1. Ve a [https://cloud.mongodb.com](https://cloud.mongodb.com) y crea una cuenta gratuita.
2. Crea un nuevo **Cluster** (opción gratuita M0 es suficiente).
3. En **Database Access**, crea un usuario con contraseña y permisos de lectura/escritura.
4. En **Network Access**, agrega tu IP actual (o `0.0.0.0/0` para acceso desde cualquier IP en desarrollo).
5. Copia la **Connection String** y reemplaza `<password>` con la contraseña del usuario creado. Úsala como valor de `MONGODB_URI` en tu `.env`.

### 4.2 Popular la base de datos con datos de prueba (Seeder)

El siguiente script crea todos los datos necesarios para pruebas: un tenant, usuarios con todos los roles, unidades, residentes, cargos y amenidades.

Crea el archivo `/tmp/seed.js` y ejecútalo una sola vez:

```bash
# Desde la raíz del repositorio, crear el script temporal
cat > /tmp/seed.js << 'SEED_EOF'
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './backend/.env' });

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // Limpiar colecciones
  await mongoose.connection.db.collection('tenants').deleteMany({});
  await mongoose.connection.db.collection('users').deleteMany({});
  await mongoose.connection.db.collection('units').deleteMany({});
  await mongoose.connection.db.collection('residents').deleteMany({});
  await mongoose.connection.db.collection('charges').deleteMany({});
  await mongoose.connection.db.collection('amenities').deleteMany({});
  console.log('Colecciones limpiadas');

  // 1. Crear Tenant (Condominio)
  const tenantResult = await mongoose.connection.db.collection('tenants').insertOne({
    name: 'Condominio Las Palmas',
    address: 'Av. Siempre Viva 742, Guadalajara, Jalisco',
    contactEmail: 'admin@laspalmas.com',
    createdAt: new Date(),
  });
  const tenantId = tenantResult.insertedId;
  console.log('Tenant creado:', tenantId);

  // 2. Crear Tenant secundario (para validar multi-tenant)
  const tenant2Result = await mongoose.connection.db.collection('tenants').insertOne({
    name: 'Condominio Los Pinos',
    address: 'Calle Robles 123, Monterrey, Nuevo León',
    contactEmail: 'admin@lospinos.com',
    createdAt: new Date(),
  });
  const tenant2Id = tenant2Result.insertedId;
  console.log('Tenant 2 creado:', tenant2Id);

  const pass = await bcrypt.hash('Admin1234!', 10);
  const passRes = await bcrypt.hash('Residente1!', 10);
  const passFam = await bcrypt.hash('Familiar1!', 10);

  // 3. Crear Usuarios
  const usersResult = await mongoose.connection.db.collection('users').insertMany([
    {
      tenantId,
      name: 'Super Admin',
      email: 'superadmin@macacos.com',
      password: pass,
      role: 'superadmin',
      isActive: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
    },
    {
      tenantId,
      name: 'Admin Las Palmas',
      email: 'admin@laspalmas.com',
      password: pass,
      role: 'admin',
      isActive: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
    },
    {
      tenantId,
      name: 'María García',
      email: 'maria.garcia@laspalmas.com',
      password: passRes,
      role: 'residente',
      isActive: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
    },
    {
      tenantId,
      name: 'Carlos García',
      email: 'carlos.garcia@laspalmas.com',
      password: passFam,
      role: 'familiar',
      isActive: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
    },
    {
      tenantId: tenant2Id,
      name: 'Admin Los Pinos',
      email: 'admin@lospinos.com',
      password: pass,
      role: 'admin',
      isActive: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
    },
  ]);
  const userIds = usersResult.insertedIds;
  const adminUserId = userIds[1];
  const residenteUserId = userIds[2];
  console.log('Usuarios creados:', Object.values(userIds).length);

  // 4. Crear Unidades
  const unitsResult = await mongoose.connection.db.collection('units').insertMany([
    { tenantId, code: 'A-101', type: 'departamento', description: 'Piso 1, Torre A', isActive: true, createdAt: new Date() },
    { tenantId, code: 'A-102', type: 'departamento', description: 'Piso 1, Torre A', isActive: true, createdAt: new Date() },
    { tenantId, code: 'B-201', type: 'departamento', description: 'Piso 2, Torre B', isActive: true, createdAt: new Date() },
    { tenantId, code: 'CASA-01', type: 'casa', description: 'Casa en planta baja', isActive: true, createdAt: new Date() },
  ]);
  const unitIds = unitsResult.insertedIds;
  const unit1Id = unitIds[0];
  console.log('Unidades creadas:', Object.values(unitIds).length);

  // 5. Crear Residentes
  await mongoose.connection.db.collection('residents').insertMany([
    {
      tenantId,
      unitId: unit1Id,
      name: 'María García',
      email: 'maria.garcia@laspalmas.com',
      phone: '+52 33 1234 5678',
      relationship: 'propietario',
      isActive: true,
      createdAt: new Date(),
    },
    {
      tenantId,
      unitId: unit1Id,
      name: 'Carlos García',
      email: 'carlos.garcia@laspalmas.com',
      phone: '+52 33 8765 4321',
      relationship: 'familiar',
      isActive: true,
      createdAt: new Date(),
    },
  ]);
  console.log('Residentes creados');

  // 6. Crear Cargos
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 10);

  await mongoose.connection.db.collection('charges').insertMany([
    {
      tenantId,
      unitId: unit1Id,
      userId: residenteUserId,
      description: 'Cuota de mantenimiento - Enero',
      amount: 1500,
      dueDate: futureDate,
      lateFeePerDay: 10,
      isPaid: false,
      createdAt: new Date(),
    },
    {
      tenantId,
      unitId: unit1Id,
      userId: residenteUserId,
      description: 'Cuota de mantenimiento - Diciembre (vencida)',
      amount: 1500,
      dueDate: pastDate,
      lateFeePerDay: 10,
      isPaid: false,
      createdAt: new Date(),
    },
  ]);
  console.log('Cargos creados');

  // 7. Crear Amenidades
  await mongoose.connection.db.collection('amenities').insertMany([
    { tenantId, name: 'Alberca', description: 'Horario: 7am - 9pm', isActive: true, createdAt: new Date() },
    { tenantId, name: 'Salón de eventos', description: 'Capacidad máxima 50 personas', isActive: true, createdAt: new Date() },
    { tenantId, name: 'Gimnasio', description: 'Horario: 6am - 10pm', isActive: true, createdAt: new Date() },
  ]);
  console.log('Amenidades creadas');

  await mongoose.disconnect();
  console.log('\n✅ Seed completado exitosamente');
  console.log('   Tenant principal: Condominio Las Palmas');
  console.log('   Tenant secundario: Condominio Los Pinos (para pruebas multi-tenant)');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
SEED_EOF

# Ejecutar el seeder desde la carpeta backend (usa las dependencias instaladas)
cd backend && node /tmp/seed.js
```

**Colecciones creadas:**

| Colección | Registros | Descripción |
|---|---|---|
| `tenants` | 2 | Condominio Las Palmas + Condominio Los Pinos |
| `users` | 5 | superadmin, admin x2, residente, familiar |
| `units` | 4 | A-101, A-102, B-201, CASA-01 |
| `residents` | 2 | Propietario y familiar en unidad A-101 |
| `charges` | 2 | Cargo vigente y cargo vencido |
| `amenities` | 3 | Alberca, Salón de eventos, Gimnasio |

---

## 5. Iniciar el Backend

### 5.1 Modo desarrollo (recomendado)

```bash
cd backend
npm run dev
```

El servidor iniciará en: **http://localhost:5000**

Salida esperada en consola:
```
MongoDB connected successfully
Server is running on port 5000
Environment: development
```

### 5.2 Verificar que el backend está funcionando

Abre tu navegador o usa `curl`:

```bash
curl http://localhost:5000/health
```

Respuesta esperada:
```json
{
  "status": "OK",
  "timestamp": "2026-04-23T18:00:00.000Z"
}
```

### 5.3 Endpoints principales disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/register` | Registrar usuario |
| `GET` | `/api/tenants` | Listar condominios (requiere JWT) |
| `GET` | `/api/users` | Listar usuarios del tenant (requiere JWT) |
| `GET` | `/api/units` | Listar unidades (requiere JWT) |
| `GET` | `/api/residents` | Listar residentes (requiere JWT) |
| `GET` | `/api/charges` | Listar cargos (requiere JWT) |
| `GET` | `/api/payments` | Listar pagos (requiere JWT) |
| `GET` | `/api/maintenance` | Listar mantenimientos (requiere JWT) |
| `GET` | `/api/reservations` | Listar reservaciones (requiere JWT) |
| `GET` | `/api/amenities` | Listar amenidades (requiere JWT) |

---

## 6. Iniciar el Frontend

### 6.1 Verificar la URL del backend configurada

El frontend tiene la URL de la API configurada en:

```
frontend/src/app/core/api.constants.ts
```

Por defecto apunta al backend desplegado en Azure. Para desarrollo local, modifica temporalmente:

```typescript
// frontend/src/app/core/api.constants.ts
export const API_BASE_URL = 'http://localhost:5000/api';
```

> **Importante:** Recuerda restaurar este valor antes de hacer commit.

### 6.2 Iniciar el servidor de desarrollo

```bash
cd frontend
npm start
```

La aplicación estará disponible en: **http://localhost:4200**

Salida esperada:
```
✔ Browser application bundle generation complete.
Initial chunk files | Names     |  Raw size
...
Application bundle generation complete. [X.XXX seconds]
Watch mode enabled. Watching for file changes...
  ➜  Local:   http://localhost:4200/
```

### 6.3 Verificar que el frontend está funcionando

Abre tu navegador en **http://localhost:4200**. Deberías ver la pantalla de login del sistema.

---

## 7. Credenciales de Prueba

Después de ejecutar el seeder del paso 4, usa estas credenciales:

### SuperAdmin (acceso global al sistema)

| Campo | Valor |
|---|---|
| **Email** | `superadmin@macacos.com` |
| **Contraseña** | `Admin1234!` |
| **Rol** | `superadmin` |
| **Acceso** | Todo el sistema: tenants, usuarios, unidades, cargos, pagos, mantenimiento, reservaciones |

### Admin del Condominio (administrador de Las Palmas)

| Campo | Valor |
|---|---|
| **Email** | `admin@laspalmas.com` |
| **Contraseña** | `Admin1234!` |
| **Rol** | `admin` |
| **Tenant** | Condominio Las Palmas |
| **Acceso** | Gestión completa del condominio asignado |

### Residente

| Campo | Valor |
|---|---|
| **Email** | `maria.garcia@laspalmas.com` |
| **Contraseña** | `Residente1!` |
| **Rol** | `residente` |
| **Tenant** | Condominio Las Palmas |
| **Unidad** | A-101 |
| **Acceso** | Pagos, mantenimiento, reservaciones, consulta de unidades |

### Familiar

| Campo | Valor |
|---|---|
| **Email** | `carlos.garcia@laspalmas.com` |
| **Contraseña** | `Familiar1!` |
| **Rol** | `familiar` |
| **Tenant** | Condominio Las Palmas |
| **Unidad** | A-101 |
| **Acceso** | Pagos, mantenimiento, reservaciones (sin permisos administrativos) |

### Admin del segundo tenant (para validar aislamiento multi-tenant)

| Campo | Valor |
|---|---|
| **Email** | `admin@lospinos.com` |
| **Contraseña** | `Admin1234!` |
| **Rol** | `admin` |
| **Tenant** | Condominio Los Pinos |

---

## 8. Flujo Sugerido de Validación

Sigue estos pasos en orden para validar todas las funcionalidades del sistema.

### Paso 1 — Verificar servicios activos

Confirma que ambos servicios estén corriendo:

- Backend: `curl http://localhost:5000/health` → debe responder `{ "status": "OK" }`
- Frontend: Abrir `http://localhost:4200` → debe mostrar el login

---

### Paso 2 — Login como SuperAdmin

1. Accede a `http://localhost:4200/login`
2. Ingresa email: `superadmin@macacos.com`, contraseña: `Admin1234!`
3. **Punto de validación:** Debes ser redirigido al Dashboard y ver el menú con todas las secciones, incluyendo **Tenants**

---

### Paso 3 — Gestión de Tenants (solo SuperAdmin)

1. Navega a la sección **Tenants**
2. **Punto de validación:** Debes ver los 2 condominios creados (Las Palmas y Los Pinos)
3. Crea un nuevo tenant de prueba con nombre, dirección y email
4. **Punto de validación:** El nuevo tenant aparece en la lista

---

### Paso 4 — Gestión de Usuarios (SuperAdmin / Admin)

1. Navega a la sección **Usuarios**
2. **Punto de validación:** Como SuperAdmin debes ver todos los usuarios del sistema; como Admin sólo los de tu tenant
3. Crea un nuevo usuario con rol `residente` asignado al tenant "Las Palmas"
4. **Punto de validación:** El usuario aparece en la lista con el role y tenant correcto

---

### Paso 5 — Gestión de Unidades

1. Navega a la sección **Unidades**
2. **Punto de validación:** Debes ver las 4 unidades creadas (A-101, A-102, B-201, CASA-01)
3. Crea una nueva unidad con código `C-301` y tipo `departamento`
4. **Punto de validación:** La unidad aparece en la lista

---

### Paso 6 — Gestión de Residentes

1. Navega a la sección **Residentes**
2. **Punto de validación:** Debes ver los 2 residentes de la unidad A-101
3. Registra un nuevo residente para la unidad `A-102` con relación `inquilino`
4. **Punto de validación:** El residente queda vinculado a la unidad correcta

---

### Paso 7 — Gestión de Cargos (Admin)

1. Navega a la sección **Cargos**
2. **Punto de validación:** Debes ver los 2 cargos (uno vigente, uno vencido)
3. Observa el cargo vencido: el sistema debe mostrar que tiene una fecha de vencimiento pasada
4. Crea un nuevo cargo: descripción "Cuota Febrero", monto `1500`, asignado a la unidad A-101

---

### Paso 8 — Flujo de Pagos (Residente)

1. Cierra sesión y vuelve a hacer login como residente: `maria.garcia@laspalmas.com` / `Residente1!`
2. Navega a la sección **Pagos**
3. **Punto de validación:** El residente debe ver sus cargos pendientes
4. Intenta realizar un pago manual (subir comprobante)
5. **Punto de validación (con Stripe):** El botón de "Pagar con Stripe" debe abrir el checkout de Stripe si las claves están configuradas

---

### Paso 9 — Reportar Mantenimiento

1. Estando como residente (`maria.garcia@laspalmas.com`), navega a **Mantenimiento**
2. Crea un nuevo reporte con descripción "Fuga de agua en baño"
3. **Punto de validación:** El reporte queda con status `pendiente`
4. Cierra sesión e inicia como Admin (`admin@laspalmas.com`)
5. Navega a **Mantenimiento** → busca el reporte creado
6. Cambia el status a `en progreso`
7. **Punto de validación:** El historial del reporte muestra el cambio de estado con fecha

---

### Paso 10 — Reservaciones de Amenidades

1. Estando como residente, navega a **Reservaciones**
2. Crea una reservación: amenidad "Alberca", fecha y hora de inicio y fin
3. **Punto de validación:** La reservación queda con status `activa`
4. Cancela la reservación
5. **Punto de validación:** La reservación queda con status `cancelada`

---

### Paso 11 — Validar Aislamiento Multi-Tenant

1. Cierra sesión
2. Inicia sesión como `admin@lospinos.com` / `Admin1234!`
3. **Punto de validación crítico:** El admin de Los Pinos **NO debe ver** ningún dato de Las Palmas:
   - Sin usuarios de Las Palmas
   - Sin unidades de Las Palmas
   - Sin cargos de Las Palmas
   - Sin residentes de Las Palmas
4. Intenta crear usuarios, unidades, y cargos — quedarán asociados al tenant Los Pinos
5. **Punto de validación:** Los datos creados por Los Pinos no son visibles para Las Palmas

---

### Puntos de Validación Clave — Resumen

| Funcionalidad | Qué verificar |
|---|---|
| Autenticación | Login correcto, token JWT en localStorage, redirección post-login |
| Control de roles | SuperAdmin ve Tenants, Residente no ve Cargos administrativos |
| Aislamiento multi-tenant | Admin de un tenant no ve datos de otro tenant |
| Cargos | Creación, listado, cargos vencidos vs vigentes |
| Pagos | Listado de pagos pendientes, flujo de pago manual |
| Mantenimiento | Creación de reporte, cambio de estado e historial |
| Reservaciones | Crear, listar y cancelar reservaciones |
| Amenidades | Listado de amenidades disponibles por tenant |

---

## 9. Troubleshooting

### Error: `MONGODB_URI is not defined`

**Causa:** El archivo `.env` no existe o no tiene el valor de `MONGODB_URI`.

**Solución:**
```bash
# Verificar que el archivo existe
ls backend/.env

# Verificar que tiene contenido
cat backend/.env
```

---

### Error: `MongoServerError: bad auth` o `authentication failed`

**Causa:** El usuario o contraseña de MongoDB Atlas son incorrectos en la URI.

**Solución:**
1. Ve a MongoDB Atlas → Database Access
2. Verifica el usuario y contraseña
3. Actualiza `MONGODB_URI` en el `.env`

---

### Error: `MongoServerSelectionError: connection timed out`

**Causa:** Tu IP no está en la lista de acceso de MongoDB Atlas.

**Solución:**
1. Ve a MongoDB Atlas → Network Access
2. Agrega tu IP actual o `0.0.0.0/0` para desarrollo

---

### Error: `Port 5000 is already in use`

**Causa:** Otro proceso usa el puerto 5000.

**Solución:**
```bash
# En macOS/Linux, encontrar el proceso y terminarlo
lsof -i :5000
kill -9 <PID>

# O cambiar el puerto en .env
PORT=5001
```

---

### Error: `Port 4200 is already in use`

**Causa:** Otro servidor de Angular o proceso usa el puerto 4200.

**Solución:**
```bash
# Usar un puerto diferente
cd frontend
npm start -- --port 4201
```

---

### El frontend no se conecta al backend local

**Causa:** La URL del API en el frontend apunta al backend de producción en Azure.

**Solución:**

Edita `frontend/src/app/core/api.constants.ts`:

```typescript
// Cambiar la URL al backend local
export const API_BASE_URL = 'http://localhost:5000/api';
```

> Recuerda restaurar el valor original antes de hacer commit.

---

### El seeder falla con `Cannot find module 'bcrypt'`

**Causa:** Las dependencias del backend no están instaladas donde se ejecuta el script.

**Solución:**
```bash
cd backend
npm install
node /tmp/seed.js
```

---

### Error 401 `Credenciales inválidas` al hacer login

**Causa:** El seeder no se ejecutó correctamente, o las credenciales son incorrectas.

**Solución:**
1. Verifica que el seeder se completó con el mensaje `✅ Seed completado exitosamente`
2. Usa exactamente las credenciales de la sección [7. Credenciales de Prueba](#7-credenciales-de-prueba)
3. Verifica que el backend apunta a la misma base de datos donde se ejecutó el seeder

---

### El token JWT expira muy rápido

**Causa:** `JWT_EXPIRE` está configurado con un valor muy corto.

**Solución:**
```env
# En backend/.env, cambiar a un valor mayor para desarrollo
JWT_EXPIRE=7d
```

---

### Logs del backend

Los logs del sistema se encuentran en la carpeta `backend/logs/`. Úsalos para diagnosticar errores:

```bash
# Ver los últimos logs
tail -f backend/logs/*.log
```

---

*Manual de ejecución para el proyecto **Macacos Condos Admin**.*  
*Proyecto académico — Diseño de Sistemas Escalables.*
