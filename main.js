import { program } from 'commander';
import fs from 'fs/promises';
import http from 'http';

// Налаштування параметрів командного рядка
program
  .requiredOption('-h, --host <address>', 'адреса, на якій працює сервер')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до теки кешу');

// Парсинг аргументів
program.parse(process.argv);
const options = program.opts();

// Основна асинхронна функція ініціалізації
async function startServer() {
  try {
    // Перевірка, чи існує тека кешу
    try {
      await fs.access(options.cache);
      console.log(`Тека кешу "${options.cache}" знайдена.`);
    } catch (error) {
      // Якщо теки немає, створюємо її
      await fs.mkdir(options.cache, { recursive: true });
      console.log(`Теку кешу "${options.cache}" успішно створено.`);
    }

    // Створення HTTP-сервера
    const server = http.createServer(async (req, res) => {
      try {
        const method = req.method;
        const url = req.url;
        const statusCode = url.slice(1);

        console.log(`Отримано запит: ${method} ${url}`);

        // Обробка запитів на основі методу
        switch (method) {
          case 'GET':
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`Логіка GET для коду ${statusCode}`);
            break;
            
          case 'PUT':
            res.writeHead(201, { 'Content-Type': 'text/plain' });
            res.end(`Логіка PUT для коду ${statusCode}`);
            break;
            
          case 'DELETE':
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`Логіка DELETE для коду ${statusCode}`);
            break;
            
          default:
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            break;
        }
      } catch (error) {
        // Глобальний обробник помилок для запиту
        console.error('Помилка обробки запиту:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });

    // Запуск сервера
    server.listen(options.port, options.host);
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);

  } catch (error) {
    console.error('Помилка під час ініціалізації:', error.message);
    process.exit(1);
  }
}

startServer();