# ADAPT by LMJ — Workspace

## Overview
ADAPT by LMJ is a full-stack fitness coaching application designed to revolutionize athlete training. It enables athletes to submit daily check-ins (sleep, energy, stress, soreness, motivation) to generate an **ADAPT Score** (0-100). This score dynamically determines their session mode (performance, normal, adapt, recovery) and adjusts training loads in real-time. Coaches gain powerful tools to monitor athlete progress, manage training programs with four variant modes, handle alerts, and communicate with their athletes directly. The project aims to provide a highly personalized and adaptive training experience, enhancing athlete performance and preventing overtraining or injury.

## User Preferences
The user wants a communication style that is direct and clear. They prefer precise instructions and detailed explanations, especially for complex logic like the ADAPT engine. They prefer an iterative development approach, with clear task breakdowns and verification steps for each implemented feature. The user expects the agent to understand and strictly adhere to the defined design system. They also require full bilingual support (French/English) across all application artifacts, with French as the default language. The agent should prioritize robust error handling and input validation.

## System Architecture

### Design System (NON-NEGOTIABLE)
- **Background**: `#0A0A0A` (dark electric)
- **Neon Green Accent**: `#00F5A0` (performance/normal)
- **Cyan**: `#00D9FF`
- **Amber**: `#FFB800` (ADAPT mode)
- **Red**: `#FF3B5C` (RECOVERY mode)
- **Violet**: `#7B61FF` (PERFORMANCE mode overlay)
- **Fonts**: Bebas Neue (titles), DM Sans (body), Space Mono (scores/numbers)

### Technical Stack
- **Monorepo Tool**: pnpm workspaces
- **Node.js**: Version 24
- **Package Manager**: pnpm
- **TypeScript**: Version 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (`zod/v4`) with `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec) for Zod schemas and React Query client
- **Mobile Application**: Expo (React Native)
- **Coach Dashboard**: React + Vite

### System Design
- **Bilingual Support (i18n)**: Fully integrated French/English across all artifacts (landing, coach-dashboard, athlete-app, API server). Default language is French, with detection order `localStorage` → `navigator.language` → `fr` fallback.
    - Web (landing + coach-dashboard): `i18next` + `react-i18next`.
    - Mobile (athlete-app): Custom system via `useT()` hook.
    - API server: `localeMiddleware` for `Accept-Language` header and user preferences.
- **ADAPT Engine Logic**: Server-side only calculation.
    - **Score Calculation**: `sleep×0.25 + energy×0.20 + (1-stress)×0.15 + (1-soreness)×0.20 + motivation×0.20` (multiplied by 100).
    - **Session Modes**:
        - **≥80**: PERFORMANCE (violet, +2.5% loads)
        - **60-79**: NORMAL (green, baseline)
        - **40-59**: ADAPT (amber, -22.5% loads, -20% volume)
        - **<40**: RECOVERY (red, -50% loads/volume)
    - **Modifiers**: Pain forces RECOVERY + P1 alert; RPE modifier (yesterday RPE ≥9 → -5pts, <5 → +3pts); Luteal phase → -5pts.
- **Daily Check-in Window**: Closes at 14:00 UTC, returning a 422 error if missed.
- **Alert System**: Daily cron job at 09:00 UTC for inactivity, low scores, high RPE, and prolonged fatigue/soreness.
- **Data Management**: Monorepo structure with `api-server`, `athlete-app`, and `coach-dashboard` artifacts. Database schema includes users, programs, sessions, checkins, session logs, exercise logs, alerts, and performance tests.
- **API Server Structure**: Express 5 with helmet, pino logging, and rate-limiting.
- **Security**: JWT secrets are mandatory in production. UUID parameters are validated before database queries.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM**: Object-relational mapper for database interactions.
- **Orval**: OpenAPI spec code generator for API clients and Zod schemas.
- **Expo**: Framework for building the React Native mobile application.
- **React**: Frontend library for the Coach Dashboard.
- **Vite**: Build tool for the Coach Dashboard.
- **i18next**: Internationalization framework for web applications.
- **react-i18next**: React integration for i18next.
- **i18next-browser-languagedetector**: Language detection plugin for i18next.
- **sharp**: Image processing library used for avatar uploads (native addon).
- **pino**: Logger for the API server.
- **helmet**: Security middleware for Express.
- **Zod**: Schema validation library.