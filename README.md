# 🗳️ UCSM FRWC 2026 Voting System

A full-stack voting system for UCSM FRWC 2026 event, featuring a Voter Web App and Admin Dashboard.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker Deployment](#docker-deployment)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)

---

## 🎯 Overview

The UCSM FRWC 2026 Voting System consists of two main applications:

### Voter Web App
1. Enter voting website
2. Scan QR Code
3. Log in automatically using ticket UUID
4. View available categories
5. Vote for candidates (one per category)
6. Submit vote

### Admin Dashboard
- Login & Authentication
- Create/Edit/Delete Categories
- Create/Edit/Delete Candidates (per category)
- Upload candidate photos
- Generate voter tickets (auto-generate UUID + QR)
- View voting statistics

---

## ✨ Features

- **QR Code Authentication** - Voters scan QR codes to authenticate
- **Category-based Voting** - Vote for one candidate per category
- **Admin Dashboard** - Full CRUD operations for categories and candidates
- **Ticket Generation** - Auto-generate unique voter tickets with QR codes
- **Real-time Statistics** - View voting results and statistics
- **Secure Authentication** - JWT-based admin authentication
- **Rate Limiting** - Protection against abuse
- **Responsive Design** - Works on all devices

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Flowbite | UI Components |
| TanStack Query | Data Fetching |
| TanStack Router | Routing |
| React Hook Form | Form Handling |
| Zod | Schema Validation |
| Zustand | State Management |
| Axios | HTTP Client |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express 5 | Web Framework |
| TypeScript | Type Safety |
| Prisma | ORM |
| PostgreSQL | Database |
| JWT | Authentication |
| Helmet | Security Headers |
| Zod | Validation |
| Vercel Blob | Image Storage |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container Orchestration |
| Nginx | Frontend Server |

---

## 📁 Project Structure

```
ucsm-frwc-2026/
├── frontend/                    # React Frontend Application
│   ├── src/
│   │   ├── api/                 # API service functions
│   │   ├── components/          # Reusable UI components
│   │   │   └── layouts/         # Layout components
│   │   ├── lib/                 # Utilities (axios, query-client)
│   │   ├── routes/              # TanStack Router pages
│   │   │   └── dashboard/       # Admin dashboard pages
│   │   ├── stores/              # Zustand state stores
│   │   ├── types/               # TypeScript type definitions
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   └── router.ts            # Router configuration
│   ├── public/                  # Static assets
│   ├── Dockerfile               # Frontend Docker config
│   ├── nginx.conf               # Nginx configuration
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Express Backend API
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   │   ├── database.ts      # Database connection
│   │   │   └── env.ts           # Environment variables
│   │   ├── middleware/          # Express middlewares
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── modules/             # Feature modules
│   │   │   ├── auth/            # Authentication
│   │   │   ├── categories/      # Category management
│   │   │   ├── candidates/      # Candidate management
│   │   │   ├── tickets/         # Ticket generation
│   │   │   └── votes/           # Voting logic
│   │   ├── utils/               # Utility functions
│   │   │   ├── jwt.ts           # JWT helpers
│   │   │   └── response.ts      # API response helpers
│   │   └── server.ts            # Express server entry
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── seed.ts              # Database seeding
│   ├── Dockerfile               # Backend Docker config
│   └── package.json
│
├── docker-compose.yml           # Docker orchestration
└── project-plan.md              # Project planning document
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 16 (or Docker)
- **Docker & Docker Compose** (for containerized deployment)

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/Pyae2003/ucsm-frwc-2026.git
cd ucsm-frwc-2026
```

#### 2. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Or create .env manually with the following variables:
```

Create a `.env` file in the `backend` directory:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ucsm_frwc?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

```bash
# Generate Prisma client
npm run db:generate

# Push database schema (creates tables)
npm run db:push

# Seed the database (creates admin user)
npm run db:seed

# Start development server
npm run dev
```

Backend will run at `http://localhost:8000`

#### 3. Setup Frontend

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000/api
```

```bash
# Start development server
npm run dev
```

Frontend will run at `http://localhost:5173`

#### 4. Default Admin Credentials

After seeding the database, use these credentials to log in:

```
Username: admin
Password: admin123
```

---

### Docker Deployment

#### Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/Pyae2003/ucsm-frwc-2026.git
cd ucsm-frwc-2026

# Create environment file (optional - uses defaults)
cp .env.example .env

# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

#### Environment Variables for Docker

Create `backend/.env` (for example with `cp backend/.env.example backend/.env`). PostgreSQL is **not** run by Docker: set `DATABASE_URL` to a database you run separately (e.g. Postgres on the host: use `host.docker.internal:5432` in the URL from inside containers). The compose file also sets `APP_URL`, `FRONTEND_URL`, and `MINIO_*` overrides as needed for local routing.

#### Service URLs (full stack on port 80)

| Service | URL |
|---------|-----|
| App (UI + API via proxy) | http://localhost:8026 |
| MinIO console | http://localhost:9001 |
| Database | External — whatever you set in `DATABASE_URL` |

#### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f [service-name]

# Run database migrations (Prisma; requires DATABASE_URL in backend/.env to be reachable)
docker exec -it ucsm-frwc-backend npx prisma migrate deploy
```

---

## 📚 API Documentation

### Base URL
```
# Local dev (Vite) or direct backend: http://localhost:8000/api
# Full Docker stack: http://localhost:8026/api
```

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | Get all categories |
| POST | `/categories` | Create category (Admin) |
| PATCH | `/categories/:id` | Update category (Admin) |
| DELETE | `/categories/:id` | Delete category (Admin) |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/candidates` | Get candidates (filter by categoryId) |
| POST | `/candidates` | Create candidate (Admin) |
| PATCH | `/candidates/:id` | Update candidate (Admin) |
| DELETE | `/candidates/:id` | Delete candidate (Admin) |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tickets/generate` | Generate voter tickets (Admin) |
| GET | `/tickets/:uuid` | Get ticket by UUID |

### Voting
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/votes` | Submit vote |
| GET | `/votes/statistics` | Get voting statistics (Admin) |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health status |

---

## 🗄 Database Schema

### Tables

#### `admins`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| username | String | Unique username |
| password | String | Hashed password |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Update timestamp |

#### `categories`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Category name |
| order | Int | Display order |
| is_active | Boolean | Active status |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Update timestamp |

#### `candidates` (To be implemented)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Candidate name |
| photo_url | String | Photo URL |
| category_id | UUID | Foreign key to categories |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Update timestamp |

#### `tickets` (To be implemented)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| uuid | String | Unique ticket identifier |
| is_used | Boolean | Usage status |
| created_at | DateTime | Creation timestamp |

#### `votes` (To be implemented)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | Foreign key to tickets |
| candidate_id | UUID | Foreign key to candidates |
| category_id | UUID | Foreign key to categories |
| created_at | DateTime | Vote timestamp |

---

## 🤝 Contributing

### Git Workflow

1. **Main branch**: Protected, production-ready code
2. **Dev branch**: General development
3. **Feature branches**: `feat/feature-name` or `fix/bug-name`

### Commit Message Convention

```bash
feat: add candidate list API
fix: incorrect vote validation
refactor: reorganize components folder
docs: update README
style: format code
test: add unit tests
```

### Pull Request Process

1. Create a feature branch from `dev`
2. Make your changes
3. Submit a PR to `dev`
4. Wait for code review
5. Merge after approval

---

## 📄 License

This project is licensed under the ISC License.

---

## 👥 Contact

For questions or support, please open an issue on GitHub.

---

<p align="center">Made with ❤️ for UCSM FRWC 2026</p>

