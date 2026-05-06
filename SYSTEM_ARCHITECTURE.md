# 🦍 Macacos Condos Admin - Manual Maestro de Arquitectura y Funcionalidad

Este documento es una inmersión profunda en el ecosistema de Macacos Condos Admin, detallando sus módulos, lógica de negocio, capas de seguridad y estrategias de optimización.

---

## 🚀 1. Módulos Funcionales (¿Qué hace la App?)

La aplicación está dividida en módulos lógicos que garantizan una separación de responsabilidades:

- **🔐 Módulo de Autenticación (Auth)**:
  - Gestiona el acceso seguro mediante JWT.
  - Implementa recuperación de contraseñas y control de sesiones.
  - **Diferenciador**: Inyecta el `tenantId` en el token para asegurar que un usuario nunca pueda saltarse su frontera de datos.

- **🏢 Módulo de Condominios (Tenants)**:
  - Exclusivo para SuperAdmins. Permite crear, editar y supervisar múltiples condominios desde un solo lugar.
  - Gestiona la configuración global de cada tenant (nombre, dirección, configuración financiera).

- **💰 Módulo de Finanzas (Charges & Payments)**:
  - **Cargos Individuales y Masivos**: Permite generar cobros por mantenimiento, multas o servicios.
  - **Lógica de Carga Masiva**: Un SuperAdmin puede facturar a todo un condominio con un solo click, automatizando la creación de cientos de registros.
  - **Gestión de Pagos**: Registro de transferencias, validación de estados (pendiente, pagado, atrasado) y cálculo automático de recargos por mora.

- **🏘️ Gestión de Activos (Units & Residents)**:
  - Control total de unidades (departamentos/casas) y su ocupación.
  - Registro detallado de residentes vinculado a sus unidades para una trazabilidad financiera perfecta.

- **📊 Módulo de Analítica (Dashboard)**:
  - Visualización en tiempo real de la salud financiera del condominio (ingresos, adeudos, ocupación).
  - **Diferenciador**: Utiliza agregaciones de MongoDB optimizadas y caché de Redis.

---

## 🛡️ 2. Seguridad de Grado Empresarial

### 🏗️ Arquitectura Zero Trust (Azure Gateway)
El servidor no confía en nadie. Solo acepta peticiones que provengan de la IP autorizada del **Azure Application Gateway**. Si alguien intenta atacar la URL de Railway directamente, el `azureIpMiddleware` lo bloquea de inmediato.

### 🛂 RBAC (Role Based Access Control)
Implementamos tres niveles de acceso estrictos:
1.  **SuperAdmin**: Control total sobre todos los tenants y finanzas globales.
2.  **Admin**: Control total sobre su propio condominio (tenant).
3.  **Residente**: Acceso limitado a sus propios estados de cuenta y pagos.

### 🧼 Sanitización y Validación de Datos
- **Backend**: Cada petición que llega al servidor es filtrada por un middleware de validación que utiliza esquemas estrictos. Si un dato no tiene el formato correcto o intenta inyectar código malicioso, se rechaza antes de tocar la base de datos.
- **Frontend**: Uso de formularios reactivos de Angular que sanitizan la entrada del usuario en tiempo real y evitan el envío de datos corruptos.

---

## ⚡ 3. Optimización y Performance

### 💎 Estrategia de Caché (Redis Cluster)
- **Cache-Aside Pattern**: Para no saturar a MongoDB con cálculos de estadísticas, el sistema guarda los resultados en un cluster de Redis en Azure.
- **Velocidad**: Las consultas al dashboard pasaron de segundos a milisegundos.

### 🧵 Procesamiento en Segundo Plano (Workers)
Las tareas pesadas no detienen la aplicación:
- **BullMQ**: Generar un PDF, subirlo a la nube y enviar un email se hace fuera del ciclo de la petición. El usuario recibe una respuesta instantánea mientras los Workers trabajan en segundo plano.

---

## 📈 4. Escalabilidad y Futuro

### 🚀 Escalabilidad Horizontal
El backend está diseñado para ser **Stateless** (sin estado). Esto significa que podemos levantar 10, 100 o 1000 servidores en Railway y todos funcionarán perfectamente sincronizados gracias a Redis y MongoDB Atlas.

### ☁️ Cloud Hybrid Model
- **Railway**: Para la agilidad del código.
- **Azure Cloud**: Para la potencia de la red (Gateway), almacenamiento masivo (Blob Storage) y comunicaciones de confianza (Email Services).

---

> **Conclusión**: Macacos Condos Admin no es solo un CRUD; es una infraestructura diseñada para crecer, proteger los datos financieros y ofrecer una experiencia de usuario ultra-rápida.
