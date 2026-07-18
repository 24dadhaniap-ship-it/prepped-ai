# Build Stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package configurations and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build static output
COPY . .
ENV VITE_API_URL=/api/v1
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
