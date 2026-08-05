# -----------------------------------------------------------------------------
# ETAPA 1: Construcción (Build)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero para aprovechar el caché de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar todo el código fuente del proyecto
COPY . .

# Compilar la aplicación para producción
RUN npm run build

# -----------------------------------------------------------------------------
# ETAPA 2: Servidor Web de Producción (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Copiar los archivos compilados desde la etapa de builder a la carpeta de Nginx
# Nota: Si tu carpeta de salida es 'build' en lugar de 'dist', cambia 'dist' por 'build' abajo
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración para SPA (Single Page Application) si Nginx necesita manejar rutas de React
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Arrancar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
