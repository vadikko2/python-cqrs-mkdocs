# Этап сборки (Builder)
FROM python:3.11-slim as builder

WORKDIR /app

# Копируем и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код
COPY . .
# При сборке можно передать SITE_URL: docker build --build-arg SITE_URL=https://mkdocs.python-cqrs.dev/ .
ARG SITE_URL=https://mkdocs.python-cqrs.dev/
RUN sed -i "s|^site_url:.*|site_url: ${SITE_URL}|" mkdocs.yml && mkdocs build

# Этап запуска (Nginx)
FROM nginx:alpine

# Копируем собранный сайт в папку nginx
COPY --from=builder /app/site /usr/share/nginx/html

# Порт 80 стандартный для веб-сервера
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
