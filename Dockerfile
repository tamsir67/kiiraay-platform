# ---------- Étape 1 : compilation du frontend ----------
FROM node:22-alpine AS front
WORKDIR /app
COPY shared ./shared
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund
COPY frontend ./frontend
RUN cd frontend && npm run build

# ---------- Étape 2 : image d'exécution (API + frontend compilé) ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY shared ./shared
COPY database ./database
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev --no-audit --no-fund
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY --from=front /app/frontend/dist ./frontend/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:4000/api/sante || exit 1
CMD ["sh", "-c", "node backend/scripts/migrate.js && node backend/src/server.js"]
