Алгоритм бота:

1. здравсте. вас вітає крамниця!
   [Кнопка Обрати товар, пока что ведет просто к пункту 2, без условий и действий]

2. Дякуємо за вибір! ($СПИСОК - довге текстове поле, preset значення "TEST").
   Ви підтверждуєте свій вибір?

[кнопка ТАК - переход к п.3, кпопка, НІ, ХОЧУ ВИБРАТИ ЩЕ - повтор п.2]

3. Напишіть вашу адресу дл Нової Пошти [Поле вводу, $АДРЕСА]

4. Ваша адреса така: $АДРЕСА, підтверджуєте?
   [Кнопка ТАК- до п.5, Кнопка НІТ - до п. 3 ще раз, переписує значення $АДРЕСА]

5. Ви хочете оплатити наложкою чи на рахунок?
   [Кнопка НАЛОЖКА - параметр $ОПЛАТА = "Наложка", далі до п.8
   Кнопка НА РАХУНОК - до п.6]

6. Будь ласка, оплатіть з на рахунок UA1234567890, та скиньте скріншот оплати

[Поле вводу, якщо юзер надсилає пустий месседж чи месседж без зображення - то ще раз п 6., якщо скрін є - то генерується значення $ОПЛАТА = "Оплату виконано", та перехід до п. 7]

7. Чекаємо на оплату, просимо надати скрін оплати!

[Кнопка Я ОПЛАЧУ ПІЗНІШЕ, $ОПЛАТА "Очікується оплата", перехід до п.8]

- [Поле вводу $ФАЙЛ, якщо юзер надсилає пустий месседж чи месседж без зображення - то п.8,

Якщо файл - то оновлюєтьс $ОПЛАТА = "Оплату виконано", та перехід до п.8]

8. Якщо ви маєте якісь коментарі та побажання - саме час ними поділитися:

[Поле задає $КОМЕНТ, перехід до
п.9]

9.

Нарешті, все!
Дякуємо за замовлення!
Ви замовили: $СПИСОК
Ваша адреса: $АДРЕСА
Ваш коментар: $КОМЕНТАР
Статус оплати: $ОПЛАТА

If $ОПЛАТА = "Очікується оплата" then "Надішліть скриншот оплати в цього бота та ваше замовлення буде відправлено найближчим часом"

Else "ваше замовлення буде відправлено найближчим часом!"