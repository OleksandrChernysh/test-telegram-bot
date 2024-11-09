const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.TELEGRAM_APP_URL; // Replace with your actual ngrok URL
const bot = new Telegraf(token);

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(express.json());
// Add this line to allow all origins, or specify your WebApp's origin
app.use(cors({ origin: webAppUrl }));

// Local file path for orders CSV
const path = './orders.csv';

// Check for write access to the orders CSV file
fs.access(path, fs.constants.W_OK, (err) => {
    console.log(err ? 'No write access' : 'Write access granted');
});

// CSV writer for orders
const orderWriter = createCsvWriter({
    path: 'orders.csv', // Path to the local CSV file
    header: [
        { id: 'orderId', title: 'OrderID' },
        { id: 'receiver', title: 'Receiver' },
        { id: 'phone', title: 'Phone' },
        { id: 'city', title: 'City' },
        { id: 'region', title: 'Region' },
        { id: 'address', title: 'Address' },
        { id: 'paymentMethod', title: 'PaymentMethod' },
        { id: 'total', title: 'Total' },
        { id: 'products', title: 'Products' },
    ],
});

// Start command for the bot
bot.start((ctx) => {
    ctx.reply('Вітаю! Ви можете обрати товари в нашому міні-додатку', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Відкрити міні-додаток', web_app: { url: webAppUrl } }],
            ],
        },
    });
});

// Handle incoming order data from the mini app
bot.on('message', (ctx) => {
    if (ctx.message.web_app_data) {
        const chatId = ctx.message.chat.id;

        try {
            const orderDetails = JSON.parse(ctx.message.web_app_data.data);

            // Check if required properties exist
            if (!orderDetails.delivery || !orderDetails.products || !orderDetails.finalTotal || !orderDetails.paymentMethod) {
                ctx.reply('Сталася помилка: дані замовлення неповні.');
                return;
            }

            // Save the order to the local CSV file
            orderWriter
                .writeRecords([
                    {
                        orderId: `order${Date.now()}`,
                        receiver: orderDetails.delivery.receiver,
                        phone: orderDetails.delivery.phone,
                        city: orderDetails.delivery.city,
                        region: orderDetails.delivery.region,
                        address: orderDetails.delivery.np,
                        paymentMethod: orderDetails.paymentMethod,
                        total: orderDetails.finalTotal,
                        products: orderDetails.products.map((p) => `${p.name} x ${p.quantity}`).join(', '),
                    },
                ])
                .then(() => {
                    let message = `Дякуємо за замовлення!\n\nВи замовили:\n`;
                    orderDetails.products.forEach((product) => {
                        message += `- ${product.name} x ${product.quantity}\n`;
                    });
                    message += `\nЗагальна сума зі знижкою: ${orderDetails.finalTotal.toFixed(2)} грн`;

                    message += orderDetails.paymentMethod === 'peredplata'
                        ? `\n\nРахунок для оплати: 1112223333444545`
                        : `\n\nОплата при отриманні`;

                    ctx.reply(message);
                })
                .catch((error) => {
                    console.error('Error saving order to CSV:', error);
                    ctx.reply('Сталася помилка під час оформлення замовлення. Спробуйте пізніше.');
                });
        } catch (error) {
            console.error('Error processing web_app_data:', error);
            ctx.reply('Сталася помилка з отриманими даними. Спробуйте ще раз.');
        }
    }
});

// Handle any text message
bot.on('text', (ctx) => {
    console.log('Received a text message:', ctx.message.text);
});

app.post('/save-order', (req, res) => {
    // Handle the request and send a response
    console.log(req.body); // Log the incoming data
    // Respond with a JSON object
    res.status(200).json({
        message: 'Order saved successfully',
        orderId: 12345  // Example additional data
    });
});

// Webhook route to handle Telegram updates
app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body, res);
    res.sendStatus(200); // Send a 200 OK response
});

// Initialize the bot webhook
const initBotWebhook = async () => {
    const webhookUrl = `${webAppUrl}/webhook`; // Replace with your actual ngrok URL

    try {
        await bot.telegram.setWebhook(webhookUrl);
        console.log(`Webhook set to ${webhookUrl}`);
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
};

// Call the function to set the webhook
initBotWebhook();

// Start the express server
app.listen(port, () => {
    console.log(`Bot server is running on http://localhost:${port}`);
});

// Launch the bot
bot.launch();
