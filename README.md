# ERDE EV Dashboard — Frontend

A web-based electric vehicle (EV) monitoring and management dashboard built with React. Provides real-time vehicle tracking, telemetry analytics, and fleet administration for the ERDE platform.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Docker](#docker)
- [CI/CD](#cicd)
- [API Integration](#api-integration)
- [Authentication](#authentication)

---

## Overview

The ERDE frontend is a role-based dashboard serving two user types:

- **Admin** — full fleet management, vehicle masters, analytics, and data export
- **Customer** — simplified view of owned vehicles with live tracking

Data is streamed in real time via Server-Sent Events (SSE) and displayed on interactive maps and live charts.

---

## Features

### Admin
- Fleet overview with search, sort, and pagination
- CRUD management for Customers, Vehicle Types, VCU/HMI configurations, and Vehicles
- Per-vehicle detail view with tabbed sections:
  - **Live View** — real-time telemetry
  - **Live Charts** — live graphing of motor/battery metrics
  - **Motor Analytics** — performance over time
  - **Battery Analytics** — state of charge, health, temperature
  - **Motor Faults** — fault codes and error logs
  - **Database Logs** — full event/telemetry log viewer
  - **Module Export** — data export per module
- PDF, Excel, and CSV export

### Customer
- Dashboard scoped to owned vehicles
- Live View tab with real-time telemetry
- Interactive map tracking with animated markers, route trail, and status indicators

### Shared
- JWT-based authentication with role-based routing
- Real-time vehicle location via Leaflet map
- QR code generation for vehicle/module identification
- Toast notifications and loading states

---

## Tech Stack

| Category | Library / Tool |
|---|---|
| UI Framework | React 19 |
| Routing | React Router DOM 7 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3, Bootstrap 5 |
| HTTP Client | Axios |
| Real-Time | Server-Sent Events (SSE), Socket.io-client |
| Maps | Leaflet 1.9, leaflet.marker.slideto |
| Charts | Recharts |
| Export | jsPDF, html2canvas, XLSX |
| Icons | Lucide React, React Icons |
| Notifications | React Toastify |
| QR Codes | QRCode |
| Utilities | Lodash |
| Containerization | Docker (Node 20, multi-arch) |
| CI/CD | GitHub Actions |

---

## Project Structure

```
ERDE_TEST-main/
├── src/
│   ├── main.jsx                        # React DOM entry point
│   ├── App.jsx                         # Root component with routing
│   ├── index.css                       # Global styles (Tailwind base)
│   ├── assets/                         # Logos and static images
│   └── components/
│       ├── AdminDashboard.jsx          # Admin fleet overview
│       ├── CustomerDashboard.jsx       # Customer vehicle list
│       ├── AdminSplash.jsx             # Admin landing screen
│       ├── CustomerSplash.jsx          # Customer landing screen
│       ├── LoginModal.jsx              # Authentication form
│       ├── Header.jsx                  # Navigation + sidebar
│       ├── FooterFixed.jsx             # Fixed footer
│       ├── VehicleDetails.jsx          # Vehicle detail page with tabs
│       ├── VehicleLiveTrack.jsx        # Real-time map tracking
│       ├── masters/
│       │   ├── CustomerMaster.jsx      # Customer CRUD
│       │   ├── VehicleTypeMaster.jsx   # Vehicle type CRUD
│       │   ├── VCUMaster.jsx           # VCU config CRUD
│       │   ├── HMIMaster.jsx           # HMI config CRUD
│       │   └── VehicleMaster.jsx       # Vehicle registry CRUD
│       └── tabs/
│           ├── LiveView.jsx            # Real-time telemetry tab
│           ├── LiveCharts.jsx          # Live metric charts tab
│           ├── MotorAnalytics.jsx      # Motor analytics tab
│           ├── BatteryAnalytics.jsx    # Battery analytics tab
│           ├── MotorFaults.jsx         # Fault codes tab
│           ├── DatabaseLogs.jsx        # Log viewer tab
│           └── DatabaseModuleExport.jsx # Export tab
├── public/                             # Static public assets
├── .github/workflows/
│   └── erde-frontend.yml              # CI/CD pipeline
├── Dockerfile                          # Multi-stage Docker build
├── vite.config.js                      # Vite config with dev proxy
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── .env                                # Local environment variables
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm 9+
- A running ERDE backend at `http://localhost:5000` (or configure `VITE_API_URL`)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ERDE_TEST-main

# Install dependencies
npm install
```

### Running in Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. API requests to `/api/*` are proxied to `VITE_API_URL` automatically.

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:5000
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the ERDE backend API | `http://localhost:5000` |

In production (Docker), pass this as a build argument or replace it at build time.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite development server on port 5173 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run start` | Serve `dist/` with `serve` (uses `$PORT` env var) |
| `npm run lint` | Run ESLint across the codebase |

---

## Docker

The project includes a multi-stage Dockerfile targeting Node 20. The final image serves the built app on port 8080.

### Build and run locally

```bash
# Build the image
docker build -t erde-frontend .

# Run the container
docker run -p 8080:8080 erde-frontend
```

### Multi-architecture builds

The CI pipeline uses `docker buildx` to produce both `linux/amd64` and `linux/arm64` images.

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t erde-frontend .
```

---

## CI/CD

GitHub Actions workflow at [.github/workflows/erde-frontend.yml](.github/workflows/erde-frontend.yml).

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch (with optional custom image tag)

**Pipeline steps:**
1. Checkout code
2. Set up Docker Buildx
3. Authenticate with Docker Hub
4. Build multi-arch image (`amd64` + `arm64`)
5. Push to Docker Hub with tags:
   - `sha-<short-git-hash>` (every run)
   - `latest` (on `main`)
   - `manual-<tag>` (manual dispatch only)

**Required secrets:**

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub account username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

---

## API Integration

The frontend communicates with the backend via:

- **REST API** — CRUD, authentication, and data queries at `VITE_API_URL/api/`
- **Server-Sent Events (SSE)** — real-time telemetry stream at `/api/vehicles/:id/stream?token=<jwt>`
- **Socket.io** — WebSocket-based real-time updates (optional/extensible)

All REST requests include an `Authorization: Bearer <token>` header set by Axios.

---

## Authentication

- Login via email and password through the `LoginModal`
- JWT token stored in `localStorage` under the key `token`
- User profile (name, email, role) stored in `localStorage.user`
- Role determines routing on login:
  - `admin` → `/admin`
  - `customer` → `/customer`
- Logout clears `localStorage` and redirects to the home splash screen
