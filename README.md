# 🧾 InvoiceApp

A modern, full-featured invoicing and billing system built with Next.js 14 and Express.js. Designed for freelancers, contractors, and small businesses to manage invoices, proposals, clients, and digital signatures.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Express.js](https://img.shields.io/badge/Express.js-4-green?logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## ✨ Features

### 📄 Invoice Management
- Create, edit, and manage professional invoices
- Automatic invoice numbering with customizable series (F001, F002...)
- Multiple status tracking: Draft, Issued, Paid, Overdue, Cancelled
- PDF generation and email delivery
- Multi-currency support (USD, PEN, EUR, etc.)

### 📋 Proposals/Quotes
- Create detailed project proposals
- Convert accepted proposals to invoices with one click
- Track proposal status and follow-ups

### ✍️ Digital Signature System
- Request client signatures via email
- Secure token-based signature links
- Signature capture on any device
- Automatic document signing and timestamping
- Signature status tracking (Pending, Signed, Expired)

### 👥 Client Management
- Complete client database with contact information
- Client document types (Tax ID, National ID, etc.)
- Client history and invoice tracking
- Quick client search and filtering

### 📦 Product/Service Catalog
- Product and service management
- Category organization
- Unit pricing with tax options
- Stock tracking (optional)

### 📊 Dashboard & Reports
- Real-time business metrics
- Monthly sales overview
- Invoice status distribution
- Recent activity tracking
- Revenue charts and analytics

### 🌐 Internationalization
- Multi-language support (English, Spanish)
- Locale-based formatting (dates, currency)
- RTL-ready architecture

### 🎨 Modern UI/UX
- Clean, professional design
- Dark/Light mode
- Responsive layout (mobile-friendly)
- Keyboard shortcuts
- Toast notifications

### 🔐 Security
- Supabase Authentication (Email/Password, Google OAuth)
- JWT-based API authentication
- Role-based access control
- Secure file uploads

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library
- **State Management**: React Context
- **Charts**: Recharts
- **Animations**: Framer Motion
- **i18n**: next-intl

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Email**: Resend

### Infrastructure
- **Database Hosting**: Supabase
- **Backend Hosting**: Render
- **Frontend Hosting**: Vercel

## 📁 Project Structure

```
InvoiceApp/
├── apps/
│   ├── frontend/              # Next.js 14 Application
│   │   ├── app/              # App Router pages & layouts
│   │   │   └── [locale]/     # i18n routes
│   │   ├── components/       # Reusable UI components
│   │   │   ├── common/       # Base components (Button, Card, etc.)
│   │   │   ├── global/       # Layout components
│   │   │   ├── invoice/      # Invoice-specific components
│   │   │   └── signature/    # Digital signature components
│   │   ├── contexts/         # React Context providers
│   │   ├── lib/              # Utilities, API client, hooks
│   │   └── messages/         # i18n translations (en.json, es.json)
│   │
│   └── backend/              # Express.js API
│       ├── src/
│       │   ├── routes/       # API endpoints
│       │   ├── middleware/   # Auth, validation
│       │   ├── services/     # Business logic (email, etc.)
│       │   └── utils/        # Prisma client, helpers
│       └── prisma/           # Database schema & migrations
│
├── docs/                     # Documentation
└── supabase/                 # Supabase migrations
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Supabase recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/invoiceapp.git
cd invoiceapp
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create `.env` files based on the examples:

**Backend** (`apps/backend/.env`):
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

4. **Set up the database**
```bash
cd apps/backend
npx prisma migrate deploy
npx prisma generate
```

5. **Start the development servers**
```bash
# From root directory - starts both frontend and backend
npm run dev
```

This will start:
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000

### Individual Commands

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

## 🗄️ Database

### Prisma Commands

```bash
cd apps/backend

# Check migration status
npx prisma migrate status

# Create a new migration
npx prisma migrate dev --name migration_name

# Regenerate Prisma Client
npx prisma generate

# Open Prisma Studio (Database GUI)
npx prisma studio

# Reset database (caution!)
npx prisma migrate reset

# Seed database with sample data
node prisma/seed.js
```

## 🔐 Authentication

The system uses **Supabase Auth** for user authentication.

### Supported Methods
- Email/Password authentication
- Google OAuth (optional)

### User Setup
1. Users register through the app or are created via Supabase Admin
2. Each user is linked to a company (Empresa)
3. JWT tokens are used for API authentication

## 📦 Available Scripts

### Root Directory
```bash
npm run dev              # Start frontend + backend
npm run dev:frontend     # Frontend only (Next.js)
npm run dev:backend      # Backend only (Express)
npm run build            # Build both projects
npm run start            # Start both in production mode
```

### Backend (apps/backend)
```bash
npm run dev              # Development with nodemon
npm start                # Production
```

### Frontend (apps/frontend)
```bash
npm run dev              # Development
npm run build            # Production build
npm start                # Production server
npm run lint             # ESLint
```

## 🌐 System URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js Application |
| Backend API | http://localhost:4000 | Express REST API |
| Health Check | http://localhost:4000/health | Backend status |

## 📱 Main Routes

### Frontend
- `/en/login` - Login page
- `/en/dashboard` - Main dashboard
- `/en/clientes` - Client management
- `/en/productos` - Product management
- `/en/facturas` - Invoice management
- `/en/proformas` - Proposals/Quotes
- `/en/reportes` - Reports & analytics
- `/en/configuracion` - Settings

### Backend API
- `GET /health` - Health check
- `POST /api/auth/login` - Authentication
- `GET /api/empresas/mi-empresa` - Current company
- `GET /api/clientes` - Clients
- `GET /api/productos` - Products
- `GET /api/facturas` - Invoices
- `GET /api/proformas` - Proposals
- `GET /api/dashboard/*` - Dashboard data
- `POST /api/signatures/*` - Digital signatures

## 🔧 Development

### Hot Reload
Both servers support hot reload:
- **Frontend**: Next.js automatic refresh
- **Backend**: Nodemon restarts on changes

### Logs
Logs are displayed with color prefixes:
- 🔵 **backend**: Blue
- 🟣 **frontend**: Magenta

### Restart Servers
In the terminal running `npm run dev`:
- `Ctrl + C` to stop
- `npm run dev` to restart

## 🐛 Troubleshooting

### Error: Port in use
```bash
# MacOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### Error: Prisma Client not generated
```bash
cd apps/backend
npx prisma generate
```

### Error: Cannot connect to database
Check environment variables in `apps/backend/.env`

### Error: Invalid token
Ensure Supabase environment variables are correctly set in both frontend and backend.

## 📄 API Documentation

### Authentication
All API endpoints (except `/health` and `/api/auth/*`) require authentication via Bearer token:
```
Authorization: Bearer <supabase_access_token>
```

### Response Format
```json
{
  "data": { ... },
  "error": null
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Backend (Render)
1. Create Web Service on Render
2. Set root directory to `apps/backend`
3. Build command: `npm install && npx prisma generate`
4. Start command: `npm start`
5. Set environment variables

## 📄 License

ISC

---

Made with ❤️ using Next.js, Express, and Supabase

Desarrollado con ❤️ usando Next.js 14 y Express.js
