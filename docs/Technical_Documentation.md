# Technical Documentation

Overview
- Short reference for integrations, data flows, packages and quick extension notes.

Data sources
- Mautic: fetched via API; cached under `modules/.temp_pages`. Contains campaigns, segments (with contact totals), contacts, emails and per-email reports.
- DropCowboy (RVM): retrieved via SFTP, parsed and stored as JSON in `backend/data/campaigns` for per-record reporting.
- Vicidial: agent and call-center stats collected by the Vicidialer service (login, pause, active state, calls, totals).

Packages (key ones)
- Backend: `@prisma/client`, `axios`, `ssh2-sftp-client`, `nodemailer`, `bcryptjs`, `jsonwebtoken`, `express`, `winston`, `zod`, `node-cron`.
- Frontend: `react`, `vite`, `tailwindcss`, `axios`, `zustand`, `react-router-dom`, `recharts`, `react-toastify`.

Modules & responsibilities
- DropCowboy: SFTP ingestion → parse → save JSON → expose campaign endpoints and metrics.
- Mautic: scheduled/on-demand `axios` calls → ingest campaigns, segments, contacts, email delivery/open/click reports.
- Vicidialer: collect and aggregate per-agent and global telephony statistics for dashboards.

Roles, pages & permissions
- Pages and settings can be assigned to dynamic roles at runtime. Roles control access to SMTP, SFTP, Vicidial credentials and AI assistant features.

AI assistant
- In-app assistant provides guided actions (e.g., show email stats, active campaigns, compare clients). It uses existing data endpoints to answer user queries.

SMTP & templates
- System can send emails via SMTP using stored templates for notifications and campaigns.

Security & operations
- Keep SFTP/API credentials in environment variables and encrypt when possible.
- Use Prisma migrations (`backend/prisma`) and `prisma generate` after schema changes.

Short-term enhancements
- Add SMS via Mautic (send + receive stats).  
- Improve RVM indexing and search.  
- Add audit logs for dynamic role changes.

Data locations (quick)
- Mautic cache: `modules/.temp_pages`  
- RVM JSON: `backend/data/campaigns`  
- Prisma schemas: `backend/prisma`

---
This is a concise, corrected technical document. Update as features evolve.

# Technical Documentation

---

## 1. Introduction

This document provides a technical overview of the reporting dashboard application, detailing its architecture, modules, and third-party dependencies. The application is a full-stack solution with a Node.js backend and a React frontend.

---

## 2. Backend Architecture

The backend is built with **Node.js** and **Express.js**, serving a RESTful API to the frontend. It handles business logic, data processing, and communication with external services. It uses **Prisma** as its ORM for database interactions, supporting both PostgreSQL and MySQL.

### 2.1. Core Modules

#### **2.1.1. DropCowboy (Ringless Voicemail)**

*   **Purpose**: This module handles data for DropCowboy, a ringless voicemail service.
*   **Functionality**: It connects to a client-provided **SFTP server** to download campaign report files (in JSON format). The backend processes these files, parses the data, and stores the relevant campaign statistics in the database.
*   **Implementation**: The `SftpService` manages the SFTP connection, file downloading, and parsing. It ensures that files are not re-imported, preventing data duplication.

#### **2.1.2. Mautic (Marketing Automation)**

*   **Purpose**: This module integrates with Mautic, an open-source marketing automation platform.
*   **Functionality**: It fetches comprehensive data from the Mautic API, including:
    *   Campaigns
    *   Segments (contact lists) and their contact counts
    *   Emails and their performance statistics (sends, opens, clicks, bounces)
    *   Detailed email reports
*   **Implementation**: The `mauticAPI.js` service uses **Axios** to communicate with the Mautic API. It features robust error handling, including retry-with-backoff logic, and is optimized for performance with incremental data synchronization.

#### **2.1.3. Vicidial (Call Center)**

*   **Purpose**: This module integrates with Vicidial, a popular open-source contact center suite.
*   **Functionality**: It retrieves real-time and historical statistics about call center operations, such as:
    *   Agent status (active, paused, etc.)
    *   Agent login/logout times and session duration
    *   Call counts and lead statistics
*   **Implementation**: The `vicidial.service.js` provides a wrapper for the Vicidial API. It dynamically fetches credentials from the database and constructs API requests to query agent and campaign data.

### 2.2. Core Services

#### **2.2.1. Dynamic Roles & Permissions**

*   **Purpose**: To provide a flexible and granular access control system.
*   **Functionality**: The system allows administrators to create, edit, and delete user roles dynamically. Each role can be assigned a specific set of permissions, which dictate access to different pages (e.g., Dashboard, Clients, Settings) and actions (e.g., Create, Read, Update, Delete). There are also system-protected roles that cannot be modified.
*   **Implementation**: The `backend/routes/roles.js` file defines the API endpoints for managing roles. Permissions are defined in a schema and stored as a JSON object in the database for each role.

#### **2.2.2. Email Notifications (SMTP)**

*   **Purpose**: To send automated email notifications for various application events.
*   **Functionality**: The system sends emails for events such as new user registration, role assignments, and data synchronization completion.
*   **Implementation**: The `EmailNotificationService` uses the **Nodemailer** library to send emails via a configured **SMTP server**. SMTP credentials and email templates are stored in the database, allowing for easy configuration and customization of email content.

### 2.3. Backend Dependencies

#### **Production Dependencies**
*   **@prisma/client**: Prisma's auto-generated database client for querying.
*   **axios**: Promise-based HTTP client for making requests to external APIs (Mautic).
*   **bcryptjs**: Library for hashing passwords.
*   **cors**: Express middleware to enable Cross-Origin Resource Sharing.
*   **date-fns**: Modern JavaScript date utility library.
*   **dotenv**: Loads environment variables from a `.env` file.
*   **express**: Fast, unopinionated, minimalist web framework for Node.js.
*   **express-rate-limit**: Basic rate-limiting middleware for Express.
*   **helmet**: Helps secure Express apps by setting various HTTP headers.
*   **jsonwebtoken**: Library to work with JSON Web Tokens for authentication.
*   **multer**: Middleware for handling `multipart/form-data`, used for file uploads.
*   **node-cron**: A simple cron-like job scheduler for Node.js.
*   **nodemailer**: Module for sending emails from Node.js applications.
*   **p-limit**: Utility to limit concurrent promise-based operations.
*   **ssh2-sftp-client**: A client for SFTP.
*   **winston**: A multi-transport async logging library.
*   **zod**: TypeScript-first schema declaration and validation library.

#### **Development Dependencies**
*   **nodemon**: Utility that monitors for file changes and automatically restarts the server.
*   **prisma**: The Prisma CLI for database migrations and client generation.

---

## 3. Frontend Architecture

The frontend is a single-page application (SPA) built with **React**. It provides a user-friendly interface for visualizing the data fetched by the backend. The application is built using **Vite** and styled with **Tailwind CSS**.

### 3.1. Core Libraries

*   **React**: A JavaScript library for building user interfaces.
*   **React Router**: For declarative routing within the React application.
*   **Zustand**: A small, fast, and scalable state management solution for React.
*   **Axios**: Used for making API calls to the backend.
*   **Recharts**: A composable charting library built on React components.
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.

### 3.2. Frontend Dependencies

#### **Production Dependencies**
*   **@tailwindcss/vite**: Tailwind CSS integration for Vite.
*   **axios**: Promise-based HTTP client for backend communication.
*   **date-fns**: Modern JavaScript date utility library.
*   **lucide-react**: A library of simply beautiful open-source icons.
*   **react**: The core library for building the UI.
*   **react-dom**: Provides DOM-specific methods for React.
*   **react-router-dom**: DOM bindings for React Router.
*   **react-select**: A flexible and beautiful Select Input control for React.
*   **react-toastify**: Library for adding notifications to the app.
*   **recharts**: Charting library for creating data visualizations.
*   **zustand**: State management library.

#### **Development Dependencies**
*   **@vitejs/plugin-react**: The official Vite plugin for React.
*   **autoprefixer**: A PostCSS plugin to parse CSS and add vendor prefixes.
*   **eslint**: Pluggable and configurable linter tool for identifying and reporting on patterns in JavaScript.
*   **postcss**: A tool for transforming CSS with JavaScript.
*   **tailwindcss**: The CSS framework.
*   **vite**: Next-generation frontend tooling.

