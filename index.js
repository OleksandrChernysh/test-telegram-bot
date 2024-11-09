const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.TELEGRAM_APP_URL; // Replace with your actual ngrok URL for WebApp
const nodeAppUrl = process.env.TELEGRAM_NODEJS_APP_URL; // Replace with your actual ngrok URL for backend
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

// Handle incoming order data directly from the backend
app.post('/webhook', async (req, res) => {
    const orderDetails = req.body;
    const chatId = orderDetails.chatId;

    // Compose the order message for the bot
    let message = `Дякуємо за замовлення!\n\nОтримувач: ${orderDetails.delivery.receiver}\nТелефон: ${orderDetails.delivery.phone}\nМісто: ${orderDetails.delivery.city}, ${orderDetails.delivery.region}\nНова Пошта: ${orderDetails.delivery.np}\nМетод оплати: ${orderDetails.paymentMethod}\n\nТовари:\n`;
    orderDetails.products.forEach(product => {
        message += `- ${product.name} x ${product.quantity} (Ціна: ${product.price} грн)\n`;
    });
    message += `\nЗагальна сума зі знижкою: ${orderDetails.finalTotal.toFixed(2)} грн`;

    // Send the message to Telegram
    try {
        await bot.telegram.sendMessage(chatId, message);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
        res.sendStatus(500);
    }
});

// Save the order to the local CSV file
app.post('/save-order', (req, res) => {
    // Log incoming data to verify it's being received
    console.log('Received order data:', req.body);

    const orderDetails = req.body; // The order details from the request body

    // Check if required properties exist in the order data
    if (!orderDetails.delivery || !orderDetails.products || !orderDetails.finalTotal || !orderDetails.paymentMethod) {
        console.log('Order data is incomplete.');
        return res.status(400).json({ message: 'Order data is incomplete' });
    }

    // Write the order to the CSV file
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
            console.log('Order successfully saved to CSV.');

            // Send a success response back to the frontend
            res.status(200).json({
                message: 'Order saved successfully',
                orderId: `order${Date.now()}`, // Return an example orderId
            });
        })
        .catch((error) => {
            console.error('Error saving order to CSV:', error);
            res.status(500).json({ message: 'Error saving order to CSV' });
        });
});

// Initialize the bot webhook
const initBotWebhook = async () => {
    const webhookUrl = `${nodeAppUrl}/webhook`; // Set webhook to backend URL

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
