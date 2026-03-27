# 🎮 BattleXGround

**India's Premier Competitive Gaming Platform** — Compete in daily tournaments, win real cash prizes, and climb the leaderboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

---

## 📋 Overview

BattleXGround is a full-stack esports platform where gamers can register for tournaments in games like **PUBG Mobile**, **Free Fire**, **Call of Duty**, and **Valorant**. Players compete for real cash prizes with integrated wallet top-ups via **Razorpay** and secure withdrawals via **UPI**.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏆 **Tournament System** | Create, manage, and join tournaments with real-time status tracking |
| 💰 **Wallet System** | Razorpay-powered deposits, balance management, and UPI withdrawals |
| 🔐 **Authentication** | Email/password + Google OAuth with OTP email verification |
| 👤 **User Dashboard** | Match history, wallet balance, tournament participation overview |
| 🛡️ **Admin Panel** | Full tournament CRUD, user management, withdrawal processing, settlement, analytics |
| 📊 **Leaderboard** | Global and game-specific rankings |
| 🎮 **Room Credentials** | Secure room ID/password delivery to registered participants |
| 📧 **Email Notifications** | Welcome emails, OTP verification, tournament alerts, withdrawal updates |
| 📱 **Responsive Design** | Mobile-first UI with TailwindCSS |

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 7** (build tool)
- **TailwindCSS 3** (styling)
- **React Router 7** (routing)
- **Axios** (HTTP client)
- **React Hot Toast** (notifications)
- **Google OAuth** (`@react-oauth/google`)

### Backend
- **Express 5** (Node.js framework)
- **MongoDB** with Mongoose 9 (database)
- **JWT** (authentication)
- **Razorpay SDK** (payments)
- **Nodemailer** (email)
- **Winston** (logging with daily rotation)
- **Helmet, CORS, Rate Limiting** (security)

---

## 📁 Project Structure

```
BattleXGround/
├── frontend/                 # React + Vite frontend
│   ├── public/               # Static assets (images, favicon)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── admin/        # Admin panel components
│   │   │   ├── auth/         # Protected route wrapper
│   │   │   ├── layout/       # Header, Footer, Hero, etc.
│   │   │   └── tournaments/  # Tournament cards, modals
│   │   ├── contexts/         # React Context (AuthContext)
│   │   ├── data/             # TypeScript interfaces
│   │   ├── hooks/            # Custom hooks
│   │   ├── pages/            # Route-level page components
│   │   ├── services/         # API service layer
│   │   ├── types/            # Shared TypeScript types
│   │   └── utils/            # Utility functions
│   ├── .env.example          # Frontend env template
│   ├── vercel.json           # Vercel deployment config
│   └── package.json
│
├── backend/                  # Express.js backend
│   ├── src/
│   │   ├── config/           # DB connection, logger, email
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express route definitions
│   │   ├── services/         # Business logic layer
│   │   ├── utils/            # ApiError, sanitizer, etc.
│   │   └── server.js         # App entry point
│   ├── .env.example          # Backend env template
│   ├── render.yaml           # Render deployment blueprint
│   └── package.json
│
├── .gitignore                # Root gitignore
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** account (or local MongoDB)
- **Razorpay** test account
- **Google Cloud Console** project (for OAuth)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/BattleXGround.git
cd BattleXGround
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your actual credentials
```

### 4. Run Locally

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

> **Note:** The Vite dev server proxies `/api` requests to `localhost:5001` automatically.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `development` or `production` | ✅ |
| `PORT` | Server port (default: 5001) | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ |
| `JWT_EXPIRE` | Token expiry (e.g., `7d`) | ✅ |
| `EMAIL_USER` | Gmail address for sending emails | ✅ |
| `EMAIL_PASS` | Gmail App Password | ✅ |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | ✅ |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | ✅ |
| `FRONTEND_URL` | Frontend URL (for email links) | ✅ |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | ❌ |

### Frontend (`frontend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL (empty for local dev) | ✅ |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `VITE_RAZORPAY_KEY_ID` | Razorpay key for checkout | ❌ |

---

## 🚢 Deployment

### Frontend → Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Set **Build Command**: `npm run build`
5. Set **Output Directory**: `dist`
6. Add environment variables:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID` = your Google Client ID

### Backend → Render

1. Import the repository in [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add all environment variables from `backend/.env.example`
6. Set `ALLOWED_ORIGINS` = `https://your-app.vercel.app`
7. Set `FRONTEND_URL` = `https://your-app.vercel.app`

---

## 📜 Available Scripts

### Backend
| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start with nodemon (hot reload) |
| `start` | `npm start` | Start production server |

### Frontend
| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server |
| `build` | `npm run build` | TypeScript check + production build |
| `preview` | `npm run preview` | Preview production build |
| `lint` | `npm run lint` | Run ESLint |

---

## 🔒 Security

- JWT-based authentication with token expiry
- Bcrypt password hashing
- Razorpay HMAC signature verification (constant-time)
- Rate limiting (auth-specific + general)
- Input validation via express-validator
- XSS protection headers
- MongoDB query sanitization
- Sensitive data redaction in logs
- CORS restricted to allowed origins

---

## 📄 License

ISC License — see [LICENSE](LICENSE) for details.

---

## 👥 Team

Built with ❤️ by the **BattleXGround** team.

- **Deepanshu** — Full-Stack Developer & Tech Lead
- **Harsh** — Growth & Partnerships

---

> **BattleXGround** — *Compete. Win. Earn.* 🏆
