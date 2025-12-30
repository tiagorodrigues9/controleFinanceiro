# Multi-stage build para frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage final com backend e frontend
FROM node:18-alpine
WORKDIR /app

# Instalar dependências do backend
COPY backend/package*.json ./
RUN npm install --production

# Copiar arquivos do backend
COPY backend/ .

# Copiar frontend build para /app/public (servido estaticamente)
COPY --from=frontend-build /app/frontend/build ./public

# Expor porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Iniciar server
CMD ["npm", "start"]
