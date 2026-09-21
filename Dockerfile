FROM node:16-alpine
WORKDIR /app
# Копируем package.json из папки document
COPY document/package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем весь код из папки document
COPY document/ ./

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
USER nodeuser

EXPOSE 3000

# Запускаем приложение
CMD ["node", "index.js"]
