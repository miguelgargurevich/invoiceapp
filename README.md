# 🧾 InvoiceApp - Professional Invoice & Proposal Management System

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4-green?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **A comprehensive, production-ready invoicing and billing system for contractors, freelancers, and small businesses.** Create professional invoices, manage proposals, track payments, collect digital signatures, and streamline your entire billing workflow.

🌐 **Live Demo**: [https://invoiceapp.vercel.app](https://invoiceapp.vercel.app)  
📚 **Documentation**: [View Full Features](./FEATURES.md)  
🤖 **AI-Friendly**: Optimized for ChatGPT, Claude, and other AI assistants

---

## 🎯 Why Choose InvoiceApp?

InvoiceApp is built specifically for contractors and service providers who need more than basic invoicing:

- ✅ **No more spreadsheets** - Professional invoicing without Excel headaches
- ✅ **Get paid faster** - Digital signatures and email delivery reduce payment delays
- ✅ **Stay organized** - All clients, products, and invoices in one centralized system
- ✅ **Look professional** - Beautiful PDF invoices that impress clients
- ✅ **Work anywhere** - Fully responsive, optimized for desktop, tablet, and iPad
- ✅ **Multi-language** - Full English and Spanish support
- ✅ **Track everything** - Job photos, work logs, receipts, and payment history
- ✅ **Scale with you** - From solo contractor to growing business

## 🚀 Key Capabilities

### 📊 Invoice Management
Create, manage, and track professional invoices with ease
- Intuitive invoice builder with live preview
- Auto-fill client and product information
- Automatic tax calculations (configurable tax rates)
- Multiple order types (Day Work, Contract, Extra)
- Multi-currency support (USD, PEN, EUR, and more)
- Sequential numbering with multiple series
- Payment tracking and history
- Overdue invoice notifications

### 📋 Proposal System
Win more business with professional proposals
- Create detailed proposals with work descriptions
- Include job information and payment terms
- Convert approved proposals to invoices instantly
- Digital signature collection
- Proposal validity tracking
- Custom branding and templates

### 👥 Client Management
Keep all client information organized
- Comprehensive client database
- Contact and document management
- Billing history per client
- Outstanding balance tracking
- Client-specific reports

### 🔨 Job Tracking
Document work and track progress
- Work log entries with hours and workers
- Job site photo documentation organized by date
- Receipt and expense tracking
- Job profitability analysis
- Progress monitoring

### ✍️ Digital Signatures
Collect client signatures electronically
- Email signature requests
- Secure signature collection
- Signature status tracking
- Timestamped and legally compliant
- Company signature support

### 📱 Mobile-First Design
Work from any device
- Responsive design for all screen sizes
- iPad-optimized PDF generation
- Touch-friendly interface
- Offline capabilities
- Mobile photo uploads

## 🛠️ Technology Stack

**Frontend**
- [Next.js 14](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [next-intl](https://next-intl-docs.vercel.app/) - Internationalization

**Backend**
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express.js](https://expressjs.com/) - Web framework
- [Prisma](https://www.prisma.io/) - Modern database ORM
- [PostgreSQL](https://www.postgresql.org/) - Relational database

**Services**
- [Supabase](https://supabase.com/) - Authentication & file storage
- [Resend](https://resend.com/) - Email delivery
- [Vercel](https://vercel.com/) - Hosting & deployment

**Key Libraries**
- html2canvas + jsPDF - PDF generation
- Zod - Schema validation
- JWT - Authentication tokens
- Framer Motion - Animations

## ✨ Features

### 📄 Invoice Management

**Create Professional Invoices in Minutes**
- Intuitive invoice builder with live preview
- Auto-fill client and product information
- Automatic tax calculations (configurable per company)
- Customizable invoice series (F001, F002, B001...)
- Support for multiple currencies (USD, PEN, EUR, and more)

**Smart Invoice Numbering**
- Automatic sequential numbering per series
- Multiple series support for different invoice types
- Never worry about duplicate invoice numbers

**Status Tracking & Workflow**
- **Draft** - Work in progress, not yet sent
- **Issued** - Sent to client, awaiting payment
- **Paid** - Payment received
- **Overdue** - Past due date, needs follow-up
- **Cancelled** - Voided invoices

**PDF Generation & Delivery**
- One-click professional PDF generation
- Direct email delivery to clients
- Download and print options
- Company logo and branding included

**Line Item Management**
- Add unlimited products/services per invoice
- Automatic line total calculations
- Quantity and unit price editing
- Discount support per item or invoice total
- Notes and observations field

### 📋 Proposals & Quotes

**Win More Projects with Professional Proposals**
- Create detailed project proposals
- Include scope, timeline, and pricing
- Professional presentation impresses clients

**Streamlined Workflow**
- Convert accepted proposals to invoices with one click
- No need to re-enter information
- Track proposal conversion rate

**Status Management**
- **Pending** - Awaiting client response
- **Approved** - Client accepted
- **Rejected** - Client declined
- **Converted** - Turned into invoice

### ✍️ Digital Signature System

**Legally Binding Digital Signatures**
- Request signatures via email
- Clients sign from any device (phone, tablet, computer)
- No app installation required for clients

**Secure & Traceable**
- Unique token-based signature links
- IP address and timestamp recording
- Expiration dates for security
- Tamper-evident signature storage

**Signature Workflow**
1. Create invoice/proposal
2. Request signature via email
3. Client receives secure link
4. Client signs on their device
5. Document automatically marked as signed
6. Both parties notified

**Status Tracking**
- **Pending** - Awaiting signature
- **Signed** - Successfully signed
- **Expired** - Link expired (configurable duration)
- **Cancelled** - Request cancelled

### 👥 Client Management (CRM Lite)

**Complete Client Database**
- Store all client information in one place
- Company name, contact person, address
- Multiple contact methods (email, phone)
- Tax ID / National ID storage

**Document Types Support**
- **RUC** - Tax identification (Peru)
- **DNI** - National ID (Peru)
- **EIN** - Employer ID (USA)
- **VAT** - Value Added Tax ID (EU)
- Custom document types

**Client Insights**
- View complete invoice history per client
- Outstanding balance tracking
- Payment history
- Total revenue per client

**Quick Actions**
- Create invoice for client with one click
- Send email directly from client profile
- View all related documents

### 📦 Product & Service Catalog

**Centralized Product Management**
- Create reusable products and services
- Set default prices and descriptions
- Organize with categories

**Pricing Options**
- Unit price with or without tax
- Multiple units of measure (Hours, Units, Services, etc.)
- Quick price updates across all products

**Categories & Organization**
- Create custom categories
- Filter products by category
- Search by name or code

**Stock Tracking (Optional)**
- Track inventory levels
- Low stock alerts
- Stock movement history

### 📊 Dashboard & Analytics

**Real-Time Business Metrics**
- Monthly sales with trend comparison
- Total invoices issued
- Active client count
- Pending invoices requiring attention

**Visual Analytics**
- Revenue charts (last 6/12 months)
- Invoice status distribution (pie chart)
- Payment trends over time

**Recent Activity**
- Latest invoices at a glance
- Quick status indicators
- One-click navigation to details

**Quick Actions from Dashboard**
- Create new invoice
- Create new proposal
- Access all main features

### 🏢 Company Settings

**Complete Company Profile**
- Company name and legal name
- Tax ID / Registration number
- Address and contact information
- Website and email

**Professional Branding**
- Upload company logo
- Logo appears on all invoices and PDFs
- Professional appearance

**Invoice Configuration**
- Default tax rate (customizable)
- Invoice series prefixes
- Proposal series prefixes
- Default currency

**Professional Title Support**
- Add professional credentials (e.g., "Master Electrician", "CPA", "Licensed Contractor")
- License number display
- Appears on official documents

### 🌐 Internationalization (i18n)

**Multi-Language Interface**
- English (default)
- Spanish (Español)
- Easy to add more languages

**Locale-Aware Formatting**
- Date formats adjust to locale
- Currency symbols and formatting
- Number formatting (decimals, thousands)

**URL-Based Language**
- `/en/dashboard` - English
- `/es/dashboard` - Spanish
- SEO-friendly URLs

### 🎨 Modern User Interface

**Clean, Professional Design**
- Minimalist interface
- Focus on productivity
- No clutter or distractions

**Dark & Light Mode**
- Automatic system preference detection
- Manual toggle available
- Consistent experience in both modes

**Responsive Design**
- Desktop-optimized for productivity
- Tablet-friendly for on-the-go
- Mobile-ready for quick access

**Accessibility**
- Keyboard navigation support
- Screen reader compatible
- High contrast options

**User Experience**
- Toast notifications for feedback
- Loading states and skeletons
- Smooth animations (Framer Motion)
- Collapsible sidebar for more space

### 🔐 Security & Authentication

**Supabase Authentication**
- Secure email/password login
- Google OAuth integration (optional)
- Password recovery via email

**API Security**
- JWT-based authentication
- Token expiration and refresh
- Secure HTTPS communication

**Data Protection**
- Row-level security in database
- User data isolation (multi-tenant)
- Secure file uploads to Supabase Storage

**Session Management**
- Automatic session refresh
- Secure logout
- Device session tracking

### 📧 Email Integration

**Transactional Emails via Resend**
- Invoice delivery to clients
- Signature request notifications
- Payment confirmations

**Professional Templates**
- Branded email templates
- Clear call-to-action buttons
- Mobile-responsive design

### 📱 Mobile Experience

**Fully Responsive**
- All features available on mobile
- Touch-optimized interfaces
- Swipe gestures support

**Progressive Web App Ready**
- Add to home screen
- Offline capability (planned)
- Native app feel

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

Made with ❤️ by **Gargurevich Dev**  
**Software Architect**  
Tel: 966918363  
Email: contacto@gargurevich.com

Built with Next.js, Express, Prisma, and Supabase
