const TelegramBot = require("node-telegram-bot-api");
const token = "7808856823:AAEn4sPXRfcXISlK8CQNFhQ5uexDVRIU5ww";
const bot = new TelegramBot(token, { polling: true });

// Store user data
const users = {};

// Keyboard layouts
const mainKeyboard = {
  reply_markup: {
    keyboard: [["Обрати товар"]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

const confirmationKeyboard = {
  reply_markup: {
    keyboard: [["ТАК", "НІ, ХОЧУ ВИБРАТИ ЩЕ"]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

const paymentKeyboard = {
  reply_markup: {
    keyboard: [["НАЛОЖКА", "НА РАХУНОК"]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

const laterPaymentKeyboard = {
  reply_markup: {
    keyboard: [["Я ОПЛАЧУ ПІЗНІШЕ"]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { state: "start", СПИСОК: "TEST" };
  bot.sendMessage(chatId, "Здравствуйте, вас вітає крамниця!", mainKeyboard);
});

// Main logic
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!users[chatId]) {
    users[chatId] = { state: "start", СПИСОК: "TEST" };
  }

  switch (users[chatId].state) {
    case "start":
      if (text === "Обрати товар") {
        users[chatId].state = "select_product";
        bot.sendMessage(
          chatId,
          `Дякуємо за вибір! ${users[chatId].СПИСОК}\nВи підтверджуєте свій вибір?`,
          confirmationKeyboard
        );
      }
      break;

    case "select_product":
      if (text === "ТАК") {
        users[chatId].state = "enter_address";
        bot.sendMessage(chatId, "Напишіть вашу адресу для Нової Пошти");
      } else if (text === "НІ, ХОЧУ ВИБРАТИ ЩЕ") {
        bot.sendMessage(
          chatId,
          `Дякуємо за вибір! ${users[chatId].СПИСОК}\nВи підтверджуєте свій вибір?`,
          confirmationKeyboard
        );
      }
      break;

    case "enter_address":
      users[chatId].АДРЕСА = text;
      users[chatId].state = "confirm_address";
      bot.sendMessage(
        chatId,
        `Ваша адреса така: ${text}, підтверджуєте?`,
        confirmationKeyboard
      );
      break;

    case "confirm_address":
      if (text === "ТАК") {
        users[chatId].state = "choose_payment";
        bot.sendMessage(
          chatId,
          "Ви хочете оплатити наложкою чи на рахунок?",
          paymentKeyboard
        );
      } else if (text === "НІ, ХОЧУ ВИБРАТИ ЩЕ") {
        users[chatId].state = "enter_address";
        bot.sendMessage(chatId, "Напишіть вашу адресу для Нової Пошти");
      }
      break;

    case "choose_payment":
      if (text === "НАЛОЖКА") {
        users[chatId].ОПЛАТА = "Наложка";
        users[chatId].state = "enter_comment";
        bot.sendMessage(
          chatId,
          "Якщо ви маєте якісь коментарі та побажання - саме час ними поділитися:"
        );
      } else if (text === "НА РАХУНОК") {
        users[chatId].state = "wait_payment";
        bot.sendMessage(
          chatId,
          "Будь ласка, оплатіть на рахунок UA1234567890, та скиньте скріншот оплати"
        );
      }
      break;

    case "wait_payment":
      if (msg.photo) {
        users[chatId].ОПЛАТА = "Оплату виконано";
        users[chatId].state = "enter_comment";
        bot.sendMessage(
          chatId,
          "Якщо ви маєте якісь коментарі та побажання - саме час ними поділитися:"
        );
      } else if (text === "Я ОПЛАЧУ ПІЗНІШЕ") {
        users[chatId].ОПЛАТА = "Очікується оплата";
        users[chatId].state = "enter_comment";
        bot.sendMessage(
          chatId,
          "Якщо ви маєте якісь коментарі та побажання - саме час ними поділитися:"
        );
      } else {
        bot.sendMessage(
          chatId,
          "Будь ласка, оплатіть на рахунок UA1234567890, та скиньте скріншот оплати",
          laterPaymentKeyboard
        );
      }
      break;

    case "enter_comment":
      users[chatId].КОМЕНТАР = text;
      users[chatId].state = "finish";
      let finalMessage = `Нарешті, все!\nДякуємо за замовлення!\nВи замовили: ${users[chatId].СПИСОК}\nВаша адреса: ${users[chatId].АДРЕСА}\nВаш коментар: ${users[chatId].КОМЕНТАР}\nСтатус оплати: ${users[chatId].ОПЛАТА}\n`;

      if (users[chatId].ОПЛАТА === "Очікується оплата") {
        finalMessage +=
          "Надішліть скриншот оплати в цього бота та ваше замовлення буде відправлено найближчим часом";
      } else {
        finalMessage += "Ваше замовлення буде відправлено найближчим часом!";
      }

      bot.sendMessage(chatId, finalMessage);
      delete users[chatId]; // Reset user state
      break;

    default:
      bot.sendMessage(
        chatId,
        "Щось пішло не так. Будь ласка, почніть спочатку з команди /start"
      );
  }
});
