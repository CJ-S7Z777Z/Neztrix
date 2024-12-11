// server.js
const express = require('express');
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// Инициализация бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const app = express();

// Настройка CORS
app.use(cors({
    origin: 'https://www.neztrix.ru/' // Замените '*' на домен вашего сайта для безопасности
}));

// Настройка хранения файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Убедитесь, что папка "uploads" существует
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Создание папки uploads, если она не существует
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Функция для экранирования HTML
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Маршрут для обработки формы контактов
app.post('/api/contact', upload.single('file'), async (req, res) => {
    const { name, telegram, budget, phone, message, hasTz } = req.body;
    const file = req.file;

    // Валидация обязательных полей
    if (!name || !telegram || !budget || !phone || !message) {
        return res.status(400).send('Все поля обязательны.');
    }

    // Валидация длины сообщения
    if (message.trim().length < 15) {
        return res.status(400).send('Сообщение должно содержать не менее 15 символов.');
    }

    // Экранирование пользовательских вводов
    const safeName = escapeHtml(name);
    const safeTelegram = escapeHtml(telegram);
    const safeBudget = escapeHtml(budget);
    const safePhone = escapeHtml(phone);
    const safeMessage = escapeHtml(message);
    const safeHasTz = (hasTz === 'yes') ? 'Да' : 'Нет';

    // Формирование сообщения
    let msg = `📩 <b>Новое сообщение с сайта</b>\n\n`;
    msg += `<b>Имя:</b> ${safeName}\n`;
    msg += `<b>Username в Telegram:</b> @${safeTelegram}\n`;
    msg += `<b>Бюджет:</b> ${safeBudget}\n`;
    msg += `<b>Номер телефона:</b> ${safePhone}\n`;
    msg += `<b>Сообщение:</b> ${safeMessage}\n`;
    msg += `<b>Есть ТЗ:</b> ${safeHasTz}`;

    try {
        // Отправка текстового сообщения
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg, { parse_mode: 'HTML' });

        // Если файл прикреплён и есть ТЗ, отправляем его
        if (file && hasTz === 'yes') {
            const filePath = path.join(__dirname, file.path);
            await bot.sendDocument(process.env.TELEGRAM_CHAT_ID, filePath, {}, { filename: file.originalname });
            // Удаление файла после отправки
            fs.unlinkSync(filePath);
        }

        res.status(200).send('Сообщение отправлено успешно');
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        res.status(500).send('Произошла ошибка при отправке сообщения');
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
