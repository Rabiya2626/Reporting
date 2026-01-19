# Reporting Application

## Prerequisites

* **Node.js** 22.x (use NVM)
* **MySQL** 8.0+ (or Docker)
* **npm** or **yarn**
* **Docker & Docker Compose** (optional, for MySQL)

---

## Quick Deployment (Production)

Single-command deployment with interactive setup:

```bash
chmod +x deploy.sh
./deploy.sh
```

### What the deployment script does

* Checks prerequisites (Node.js, npm, PM2)
* Asks for database configuration (MySQL/PostgreSQL)
* Generates secure JWT and encryption keys
* Installs all dependencies
* Validates database connection
* Builds frontend for production
* Sets up database schema
* Starts the application with PM2

### Quick redeploy (existing configuration)

```bash
./deploy.sh --quick
```

### View deployment options

```bash
./deploy.sh --help
```

---

## Development Setup (Manual)

For local development without full deployment.

### 1. Clone the repository

```bash
git clone <repository-url>
cd Reporting
```

---

### 2. Environment Configuration

#### Backend environment

Copy the example file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=3026
DATABASE_URL="mysql://user:password@localhost:3306/database"
JWT_SECRET=<generate-with-openssl-rand-hex-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Disable schedulers in development
ENABLE_SCHEDULER=false
ENABLE_MAUTIC_SCHEDULER=false
```

#### Frontend environment

Copy the example file:

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3026
```

The frontend uses this value as the base URL for all API requests.

---

### 3. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### 4. Database Setup

```bash
cd backend
npx prisma generate
npx prisma db push        # Or: npx prisma migrate dev
node prisma/seed-notifications.js
cd ..
```

---

### 5. Start Development Servers

**Backend**

```bash
cd backend
npm run dev
```

**Frontend (separate terminal)**

```bash
cd frontend
npm run dev
```

### Local URLs

* Backend API: [http://localhost:3026](http://localhost:3026)
* Frontend: [http://localhost:5173](http://localhost:5173)

---

## Backend Development

```bash
cd backend

# Run in development mode (nodemon)
npm run dev

# Run Prisma Studio (database GUI)
npm run prisma:studio

# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Run production
npm start
```

---

## Frontend Development

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## Database Migrations

```bash
cd backend

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (DATA LOSS)
npx prisma migrate reset
```

---

## Using Docker for MySQL (If Not Available Locally)

If MySQL 8.0+ is not available locally, the project already includes a Docker Compose configuration in the **root directory**.

### Existing `docker-compose.yml`

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: repdtb_mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: repdtb
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

---

### Start MySQL with Docker

```bash
docker compose up -d
```

---

### Configure Backend to Use Docker MySQL

Update `backend/.env`:

```env
DATABASE_URL="mysql://root:rootpassword@localhost:3306/repdtb"
```

---

### Verify MySQL Is Running

```bash
docker ps
docker exec -it repdtb_mysql mysql -u root -p
```

---

### Run Prisma with Docker MySQL

```bash
cd backend
npx prisma generate
npx prisma db push
node prisma/seed-notifications.js
```

---

### Stop MySQL

```bash
docker compose down
```

Remove volumes (data loss):

```bash
docker compose down -v
```

---

## Notes

* Ports `3026` (backend), `5173` (frontend), and `3306` (MySQL) must be available.
* The frontend **must** have `VITE_API_URL` set correctly to communicate with the backend.
* Database data is persisted in the `mysql_data` Docker volume.
* For production, always change default credentials and use a dedicated database user.
