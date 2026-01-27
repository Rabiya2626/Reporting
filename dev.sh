docker compose -f docker-compose.dev.yml up -d

cd backend
cp .env.example .env
npm install

npx prisma migrate deploy
npx prisma generate

cd ../frontend
cp .env.example .env
npm install

