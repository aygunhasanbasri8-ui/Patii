FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_BACKEND_URL
ENV EXPO_PUBLIC_BACKEND_URL=${EXPO_PUBLIC_BACKEND_URL}
ENV EXPO_NONINTERACTIVE=1
RUN npx expo export --platform web

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
