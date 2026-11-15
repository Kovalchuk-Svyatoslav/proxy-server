import { program } from 'commander';
import fs from 'fs/promises';
// import http from 'http';

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

    console.log(`Усі налаштування застосовано: хост ${options.host}, порт ${options.port}`);
    


  } catch (error) {
    console.error('Помилка під час ініціалізації:', error.message);
    process.exit(1);
  }
}

startServer();