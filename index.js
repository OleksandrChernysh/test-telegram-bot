const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Telegraf } = require("telegraf");
const fs = require("fs");
const fetch = require("node-fetch"); // Add node-fetch for raw API calls
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
require("dotenv").config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.TELEGRAM_APP_URL;
const nodeAppUrl = process.env.TELEGRAM_NODEJS_APP_URL;
const bot = new Telegraf(token);

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors({ origin: webAppUrl }));

// Local file path for orders CSV
const path = "./orders.csv";

// Check for write access to the orders CSV file
fs.access(path, fs.constants.W_OK, (err) => {
  console.log(err ? "No write access" : "Write access granted");
});

// CSV writer for orders
const orderWriter = createCsvWriter({
  path: "orders.csv",
  header: [
    { id: "orderId", title: "OrderID" },
    { id: "receiver", title: "Receiver" },
    { id: "phone", title: "Phone" },
    { id: "city", title: "City" },
    { id: "region", title: "Region" },
    { id: "address", title: "Address" },
    { id: "paymentMethod", title: "PaymentMethod" },
    { id: "total", title: "Total" },
    { id: "products", title: "Products" },
  ],
});

// Start command for the bot
bot.start((ctx) => {
  ctx.reply("Вітаю! Ви можете обрати товари в нашому міні-додатку", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Відкрити міні-додаток", web_app: { url: webAppUrl } }],
      ],
    },
  });
});

// Handle user messages
bot.on("message", async (ctx) => {
  const chatId = ctx.chat.id;
  const username = ctx.from.username || "Unknown";
  const text = ctx.message.text;

  console.log(`Received message from ${username} (ID: ${chatId}): ${text}`);

  // Forward the message to KeyCRM
  const keyCrmEndpoint = process.env.KEYCRM_API_URL; // Replace with KeyCRM's endpoint

  try {
    const response = await fetch(keyCrmEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.KEYCRM_API_KEY}`, // Add API key if required
      },
      body: JSON.stringify({
        chat_id: chatId,
        username,
        message: text,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Message successfully forwarded to KeyCRM:", result);
    } else {
      console.error("Error forwarding message to KeyCRM:", result);
    }
  } catch (error) {
    console.error("Error forwarding message to KeyCRM:", error);
  }
});

// Handle incoming order data directly from the backend
app.post("/webhook", async (req, res) => {
  const orderDetails = req.body;
  const chatId = orderDetails.chatId;

  // Compose the order message
  let message = `Дякуємо за замовлення!\n\nОтримувач: ${orderDetails.delivery.receiver}\nТелефон: ${orderDetails.delivery.phone}\nМісто: ${orderDetails.delivery.city}, ${orderDetails.delivery.region}\nНова Пошта: ${orderDetails.delivery.np}\nМетод оплати: ${orderDetails.paymentMethod}\n\nТовари:\n`;
  orderDetails.products.forEach((product) => {
    message += `- ${product.name} x ${product.quantity} (Ціна: ${product.price} грн)\n`;
  });
  message += `\nЗагальна сума зі знижкою: ${orderDetails.finalTotal.toFixed(
    2
  )} грн`;

  // Send message using raw Telegram Bot API
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      console.log("Message sent to Telegram successfully");
      res.sendStatus(200);
    } else {
      console.error("Failed to send message to Telegram:", data);
      res.status(500).send({ error: data.description });
    }
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
    res.sendStatus(500);
  }
});

// Save the order to the local CSV file
app.post("/save-order", (req, res) => {
  const orderDetails = req.body;

  if (
    !orderDetails.delivery ||
    !orderDetails.products ||
    !orderDetails.finalTotal ||
    !orderDetails.paymentMethod
  ) {
    console.log("Order data is incomplete.");
    return res.status(400).json({ message: "Order data is incomplete" });
  }

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
        products: orderDetails.products
          .map((p) => `${p.name} x ${p.quantity}`)
          .join(", "),
      },
    ])
    .then(() => {
      console.log("Order successfully saved to CSV.");
      res.status(200).json({ message: "Order saved successfully" });
    })
    .catch((error) => {
      console.error("Error saving order to CSV:", error);
      res.status(500).json({ message: "Error saving order to CSV" });
    });
});

// Initialize the bot webhook
const initBotWebhook = async () => {
  const webhookUrl = `${nodeAppUrl}/webhook`;

  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Webhook set to ${webhookUrl}`);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
};

// Call the function to set the webhook
initBotWebhook();

// Start the bot
bot.launch().then(() => {
  console.log("Bot launched successfully");
});

// Start the express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
