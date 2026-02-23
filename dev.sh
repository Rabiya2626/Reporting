docker compose -f docker-compose.dev.yml up -d


sleep 5

cd backend
cp .env.example .env
sleep 1
npm install

sleep 1

npx prisma migrate deploy

sleep 1
npx prisma generate


sleep 2

cd ../frontend
cp .env.example .env
npm install

cd ..

pwd

(cd backend && 
npm run start) &

(cd frontend && 
npm run dev )

wait


