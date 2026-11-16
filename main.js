import { program } from 'commander';
import fs from 'fs/promises';
import http from 'http';
import path from 'node:path';
import superagent from 'superagent';

// Налаштування параметрів командного рядка
program
  .requiredOption('-h, --host <address>', 'адреса, на якій працює сервер')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до теки кешу');

// Парсинг аргументів
program.parse(process.argv);
const options = program.opts();

// Допоміжна функція для отримання тіла запиту
async function getBody(req) {
  const chunks = [];
  
  // Цикл чекає кожен наступний шматочок даних із потоку
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  
  // Коли потік завершується, цикл закінчується і буфер склеюється в один
  return Buffer.concat(chunks);
}

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
            // Формування шляху до файлу в теці кешу
            const filePath = path.join(options.cache, `${statusCode}.jpg`);

            try {
              const image = await fs.readFile(filePath);
              
              // Якщо помилки немає, клієнт отримує файл з кодом 200
              res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Cache-Source': 'Cache'
              });
              res.end(image);
              console.log(`[GET] ${statusCode} - Віддано з кешу`);

            } catch (err) {
              // Якщо файл не знайдено в кеші, завантажуємо його з http.cat
              try {
                console.log(`[GET] ${statusCode} - Немає в кеші, завантажуємо з http.cat...`);
                
                // Запит через superagent
                const catResponse = await superagent.get(`https://http.cat/${statusCode}`);
                const imageBuffer = catResponse.body;

                // Зберігання отриманих двійкових даних в кеш
                await fs.writeFile(filePath, imageBuffer);

                // Віддаємо клієнту
                res.writeHead(200, {
                  'Content-Type': 'image/jpeg',
                  'Cache-Source': 'http.cat'
                });
                res.end(imageBuffer);
                console.log(`[GET] ${statusCode} - Успішно збережено в кеш та віддано`);

              } catch (superagentErr) {
                // Обробка помилок superagent
                if (superagentErr.status === 404) {
                  res.writeHead(404, { 'Content-Type': 'text/plain' });
                  res.end('Not Found: Картинки для такого коду не існує');
                } else {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Internal Server Error: Помилка при зверненні до http.cat');
                }
                console.error(`[GET] Помилка завантаження ${statusCode}:`, superagentErr.message);
              }
            }
            break;
            
          case 'PUT':
            const putFilePath = path.join(options.cache, `${statusCode}.jpg`);
            
            try {
              // Запис потоку даних у буфер
              const bodyBuffer = await getBody(req);
              
              // Запис зібраної картинки в кеш
              await fs.writeFile(putFilePath, bodyBuffer);

              // Відрпавлення відповіді клієнту
              res.writeHead(201, { 'Content-Type': 'text/plain' });
              res.end('Created');
              console.log(`[PUT] ${statusCode} - Картинку збережено в кеш`);
            } catch (putError) {
              console.error(`[PUT] Помилка збереження ${statusCode}:`, putError);
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Internal Server Error');
            }
            break;
            
          case 'DELETE':
            const deleteFilePath = path.join(options.cache, `${statusCode}.jpg`);
            
            try {
              // Спроба асинхронного видалення файлу із кешу
              await fs.unlink(deleteFilePath);
              
              // Якщо помилки немає — файл успішно видалено
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('OK: File deleted');
              console.log(`[DELETE] ${statusCode} - Картинку успішно видалено з кешу`);
              
            } catch (deleteErr) {
              if (deleteErr.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found: Картинки немає в кеші');
                console.log(`[DELETE] ${statusCode} - Спроба видалити неіснуючий файл`);
              } else {
                console.error(`[DELETE] Помилка видалення ${statusCode}:`, deleteErr);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              }
            }
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