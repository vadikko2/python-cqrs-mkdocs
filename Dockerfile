# Этап сборки (Builder)
FROM python:3.11-slim as builder

WORKDIR /app

# Копируем и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код и собираем статику
COPY . .
RUN mkdocs build

# Этап запуска (Nginx)
FROM nginx:alpine

# Копируем собранный сайт в папку nginx
COPY --from=builder /app/site /usr/share/nginx/html

# Порт 80 стандартный для веб-сервера
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
