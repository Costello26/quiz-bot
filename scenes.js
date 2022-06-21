import { Scenes } from 'telegraf';
const { BaseScene } = Scenes;
import locales from './locales/index.js';
import keyboardLocales from './locales/keyboard.js'
import config from './config.js';

class ScenesRepo {
    ageScene() {
        const age = new BaseScene('age');
        age.enter(async (ctx) => {
            await ctx.reply(locales.selectAge, {
                reply_markup: {
                    keyboard: [
                        [keyboardLocales.firstAge, keyboardLocales.secondAge]
                    ], resize_keyboard: true
                }
            });
        });
        age.on('text', async (ctx) => {
            const childAge = ctx.message.text;
            
            if(childAge != keyboardLocales.firstAge && childAge != keyboardLocales.secondAge){
                return await ctx.reply(locales.incorrectValue);
            }
            
            ctx.session.age = childAge;
            ctx.scene.enter('category');
        });
        return age;
    }

    categoryScene() {
        const category = new BaseScene('category');
        category.enter(async (ctx) => {
            const childAge = ctx.session.age;
            const categoriesKeyboard = childAge == keyboardLocales.firstAge ?
                keyboardLocales.firstAgeCats 
                : 
                keyboardLocales.secondAgeCats;

            if(!childAge) return ctx.scene.enter('age');
            await ctx.reply(locales.selectCategory, {
                reply_markup: {
                    keyboard: categoriesKeyboard, one_time_keyboard: true
                }
            });
        });
        category.on('text', async (ctx) => {
            if(ctx.message.text == 'На шаг назад') return ctx.scene.enter('age');
            if(locales.categoriesArray.includes(ctx.message.text)) return ctx.scene.enter('payment');
            
        });
        return category;
    }

    paymentScene() {
        const payment = new BaseScene('payment');
        payment.enter(async (ctx) => {
            
            await ctx.reply(locales.paymentIntro, {
                parse_mode: "Markdown",
                reply_markup: {
                    keyboard: [
                        ['На шаг назад']
                    ], resize_keyboard: true, one_time_keyboard: true
                }
            });
            await ctx.reply(locales.paymentRequisites, {
                parse_mode: "Markdown",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: keyboardLocales.getqr, callback_data: 'getqr' },
                        ],
                        [
                            { text: locales.quickpayment, url: 'https://checkout.paycom.uz/62ac76bb27f10a0f1de0acf1' },
                        ]
                    ]
                }
            });
        });
        payment.on('text', async (ctx) => {
            if(ctx.message.text == 'На шаг назад') return ctx.scene.enter('category');
            // eslint-disable-next-line no-undef
            const adminId = process.env.ADMIN_ID;
            if(ctx.message.text.length <= 3) return await ctx.reply(locales.paymentRejected);
            await ctx.telegram.sendMessage(
                adminId, 
                '*Новая покупка продукта!* Для отправки материала покупателю подтвердите поступление средств.\n' +
                `*Id покупателя:* \`${ctx.message.from.id}\`(нажмите чтобы скопировать)\n` +
                `*Выбранный материал: для ${ctx.session.age}*\n` +
                `${ctx.message.from.username ? `*Юзернейм покупателя:* @${ctx.message.from.username}` : null}\n` +
                `*Номер перевода/Имя отправителя:* ${ctx.message.text}` + 
                `Для отправки материала пользователю, введите /send`
                ,
                {
                    keyboard: {
                        reply_markup: [
                            [ 'Подтвердить' ]
                        ]
                    },
                    parse_mode: "Markdown"
                }
            );
            await ctx.reply(locales.submitPayment, { parse_mode: 'Markdown' });
            await ctx.scene.leave();
        });
        payment.on('photo', async (ctx) => {
            console.log(ctx.message);
            // eslint-disable-next-line no-undef
            const adminId = process.env.ADMIN_ID;
            await ctx.telegram.sendMessage(
                adminId, 
                '*Новая покупка продукта!* Для отправки материала покупателю подтвердите поступление средств.\n' +
                `*Id покупателя:* \`${ctx.message.from.id}\`(нажмите чтобы скопировать)\n` +
                `*Выбранный материал: для ${ctx.session.age}*\n` +
                `${ctx.message.from.username ? `*Юзернейм покупателя:* @${ctx.message.from.username}` : null}\n` +
                `*Номер перевода/Имя отправителя:* ${ctx.message.text}\n` + 
                `Для отправки материала пользователю, введите /send`
                ,
                {
                    keyboard: {
                        reply_markup: [
                            ['Подтвердить ']
                        ]
                    },
                    parse_mode: "Markdown"
                }
            );
            await ctx.telegram.sendPhoto(adminId, ctx.message.photo[ctx.message.photo.length-1].file_id);
            await ctx.reply(locales.submitPayment, { parse_mode: 'Markdown' });
            await ctx.scene.leave();
        })
        return payment;
    }

    adminSelectCat() {
        const adminSelectCat = new BaseScene('adminSelectCat');
        adminSelectCat.enter(async (ctx) => {
            await ctx.replyWithMarkdown('*Выберите материал для отправки:*', {
                reply_markup: {
                    keyboard: [
                        [keyboardLocales.firstAge, keyboardLocales.secondAge]
                    ], resize_keyboard: true, one_time_keyboard: true
                }
            });
        });
        adminSelectCat.on('text', async (ctx) => {
            if(ctx.message.text == keyboardLocales.firstAge) {
                ctx.session.content = config.firstAge;
            } else if(ctx.message.text == keyboardLocales.secondAge){
                ctx.session.content = config.secondAge; 
            } else {
                return ctx.reply('Введено некорректное значение');
            }
            return ctx.scene.enter('adminSendToId');
        });
        return adminSelectCat;
    }

    adminSendToId() {
        const adminSendToId = new BaseScene('adminSendToId');
        adminSendToId.enter(async (ctx) => {
            await ctx.replyWithMarkdown('*Введите id пользователя, которому будет отправлен материал:*');
        });
        adminSendToId.on('text', async (ctx) => {
            try{
                const contentToSend = ctx.session.content;
                await ctx.telegram.sendMessage(+ctx.message.text, 
                    'Благодарим Вас за покупку!\n' +
                    'Выбранные материалы отправлены Вам в виде ссылки, а также в качестве ' + 
                    'бонуса Вы получили дополнительные увлекательные задания!');
                await ctx.telegram.sendMessage(+ctx.message.text, `Ссылка для загрузки: ${contentToSend}`);
                await ctx.replyWithMarkdown('*Материал успешно отправлен!*')
            } catch(err) {
                ctx.reply('Не удалось отправить материал, некорректно введен id или пользователь должен запустить бота.')
            } finally {
                ctx.scene.leave();
            }
        });
        return adminSendToId;
    }
}

export default ScenesRepo;