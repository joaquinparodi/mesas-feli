# MesaVIP - Plataforma de Reservas VIP para Eventos Nocturnos

Plataforma completa para la gestion y reserva de mesas VIP en eventos nocturnos. Mapa 3D interactivo, sistema de promotores, pagos con MercadoPago, QR de acceso y dashboard de analytics en tiempo real.

## Tech Stack

| Tecnologia | Uso |
|---|---|
| **Next.js 14** (App Router) | Framework full-stack |
| **TypeScript** | Tipado estatico |
| **Tailwind CSS** | Estilos (tema nightclub oscuro) |
| **shadcn/ui** | Componentes UI |
| **Framer Motion** | Animaciones |
| **React Three Fiber** | Mapa 3D de mesas |
| **Recharts** | Graficos y analytics |
| **MongoDB** + Mongoose | Base de datos |
| **NextAuth.js** | Autenticacion |
| **MercadoPago** | Pagos online |
| **Pusher** | Real-time notifications |
| **Cloudinary** | Almacenamiento de imagenes |
| **Resend** | Envio de emails |
| **QRCode** + JWT | Generacion/validacion de QR |
| **Zod** | Validacion de schemas |
| **Zustand** | State management |

## Prerequisitos

- **Node.js** 18+ (recomendado 20+)
- **MongoDB** (local o MongoDB Atlas)
- **npm** o **yarn** o **pnpm**
- Cuenta de **MercadoPago** (para pagos)
- Cuenta de **Pusher** (para notificaciones real-time)
- Cuenta de **Cloudinary** (para imagenes)
- Cuenta de **Resend** (para emails)

## Instalacion

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd mesavip
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar los valores:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/mesavip

# NextAuth
NEXTAUTH_SECRET=tu-clave-secreta-segura
NEXTAUTH_URL=http://localhost:3000

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=tu-access-token
MERCADOPAGO_WEBHOOK_SECRET=tu-webhook-secret

# Pusher (real-time)
PUSHER_APP_ID=tu-app-id
PUSHER_SECRET=tu-secret
NEXT_PUBLIC_PUSHER_KEY=tu-key
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Cloudinary (imagenes)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Resend (emails)
RESEND_API_KEY=tu-api-key

# JWT (QR codes)
JWT_SECRET=tu-jwt-secret
```

### 4. Seed de la base de datos

Ejecutar el script de seed para crear datos de prueba:

```bash
npx tsx scripts/seed.ts
```

Esto crea:
- **10 usuarios** (admin, organizador, 3 promotores, 5 clientes)
- **1 venue** con configuracion 3D completa
- **2 eventos** (uno activo, uno finalizado)
- **4 categorias** de mesas
- **45 mesas** distribuidas por sectores
- **3 promotores** con tokens de referido
- **15 reservas** de ejemplo con QR
- **Pagos** y **notificaciones** de ejemplo

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Credenciales de prueba

| Rol | Email | Password |
|---|---|---|
| Admin | admin@mesavip.com | admin123 |
| Organizador | organizador@mesavip.com | org123 |
| Promotor 1 | promotor1@mesavip.com | promo123 |
| Promotor 2 | promotor2@mesavip.com | promo123 |
| Promotor 3 | promotor3@mesavip.com | promo123 |
| Cliente 1-5 | cliente[1-5]@mesavip.com | client123 |

## Estructura del Proyecto

```
mesavip/
├── scripts/
│   └── seed.ts                    # Script de seed de la DB
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth endpoints
│   │   │   ├── events/             # CRUD eventos
│   │   │   ├── notifications/      # Notificaciones
│   │   │   ├── payments/           # Pagos MercadoPago
│   │   │   ├── promoters/          # CRUD promotores + stats
│   │   │   ├── qr/validate/        # Validacion de QR
│   │   │   ├── reservations/       # CRUD reservas
│   │   │   ├── tables/             # Estado de mesas
│   │   │   └── upload/             # Upload imagenes
│   │   ├── dashboard/              # Panel organizador
│   │   │   ├── analytics/          # Analytics
│   │   │   ├── events/             # Gestion eventos
│   │   │   ├── payments/           # Pagos recibidos
│   │   │   └── promoters/          # Gestion promotores
│   │   ├── events/                 # Paginas publicas de eventos
│   │   │   └── [id]/
│   │   │       ├── checkout/       # Checkout/pago
│   │   │       └── confirmation/   # Confirmacion reserva
│   │   ├── promoter/               # Panel promotor
│   │   │   ├── tables/             # Mesas asignadas
│   │   │   └── link/[token]/       # Link de referido
│   │   ├── staff/
│   │   │   └── [eventId]/scanner/  # Scanner QR
│   │   ├── login/                  # Login
│   │   ├── register/               # Registro
│   │   ├── profile/                # Perfil usuario
│   │   ├── page.tsx                # Landing page
│   │   ├── not-found.tsx           # 404
│   │   ├── error.tsx               # Error boundary
│   │   ├── loading.tsx             # Loading global
│   │   └── layout.tsx              # Root layout
│   ├── components/
│   │   ├── 3d/                     # Componentes Three.js
│   │   ├── events/                 # Componentes de eventos
│   │   ├── layout/                 # Navbar, Footer
│   │   ├── providers/              # SessionProvider, etc
│   │   └── ui/                     # shadcn/ui components
│   ├── hooks/
│   │   └── use-toast.ts            # Toast hook
│   ├── lib/
│   │   ├── auth.ts                 # Helpers de autenticacion
│   │   ├── auth-options.ts         # NextAuth config
│   │   ├── db.ts                   # Conexion MongoDB
│   │   ├── mercadopago.ts          # MercadoPago client
│   │   ├── pusher.ts               # Pusher client
│   │   ├── qr.ts                   # QR generation/validation
│   │   ├── rate-limit.ts           # Rate limiting
│   │   ├── resend.ts               # Email client
│   │   └── utils.ts                # cn() helper
│   ├── models/                     # Mongoose models
│   │   ├── User.ts
│   │   ├── Venue.ts
│   │   ├── Event.ts
│   │   ├── TableCategory.ts
│   │   ├── Table.ts
│   │   ├── Reservation.ts
│   │   ├── Promoter.ts
│   │   ├── Payment.ts
│   │   ├── Notification.ts
│   │   └── index.ts
│   ├── store/                      # Zustand stores
│   ├── types/
│   │   ├── index.ts                # TypeScript types
│   │   └── next-auth.d.ts          # NextAuth types
│   └── middleware.ts
├── .env.example
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## API Endpoints

### Autenticacion
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/[...nextauth]` | Login/logout (NextAuth) |

### Eventos
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/events` | Listar eventos (filtros: status, search, tags) |
| POST | `/api/events` | Crear evento (organizer) |
| GET | `/api/events/[id]` | Detalle de evento |
| PUT | `/api/events/[id]` | Actualizar evento |
| GET | `/api/events/[id]/tables` | Mesas del evento |
| GET | `/api/events/[id]/categories` | Categorias del evento |
| GET/PUT | `/api/events/[id]/layout` | Layout 3D del evento |

### Reservas
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/reservations` | Listar reservas |
| POST | `/api/reservations` | Crear reserva |
| GET | `/api/reservations/[id]` | Detalle de reserva |
| PUT | `/api/reservations/[id]` | Actualizar reserva |

### Mesas
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/tables/[id]` | Detalle de mesa |
| PUT | `/api/tables/[id]/status` | Cambiar estado de mesa |

### Pagos
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/payments/create` | Crear preferencia MercadoPago |
| POST | `/api/payments/webhook` | Webhook de MercadoPago |

### Promotores
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/promoters` | Listar promotores |
| POST | `/api/promoters` | Crear promotor |
| GET | `/api/promoters/[id]` | Detalle de promotor |
| GET | `/api/promoters/[id]/stats` | Stats del promotor |

### QR
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/qr/validate` | Validar QR en puerta |

### Otros
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/notifications` | Notificaciones del usuario |
| POST | `/api/upload` | Upload de imagenes a Cloudinary |
| GET | `/api/analytics/[eventId]` | Analytics del evento |

## Roles y Permisos

| Rol | Permisos |
|---|---|
| **admin** | Acceso total a todo el sistema |
| **organizer** | Dashboard, crear/editar eventos, gestionar promotores, ver analytics, scanner QR |
| **promoter** | Panel promotor, ver mesas asignadas, compartir link de referido, ver comisiones |
| **client** | Ver eventos, reservar mesas, ver perfil/reservas, QR de entrada |

## Screenshots

> Proximamente

## Desarrollo

```bash
# Servidor de desarrollo
npm run dev

# Build de produccion
npm run build

# Iniciar produccion
npm start

# Lint
npm run lint

# Seed de datos
npx tsx scripts/seed.ts
```

## Contribuir

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## Licencia

MIT License. Ver [LICENSE](LICENSE) para mas detalles.
