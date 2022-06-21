/* eslint-disable no-undef */
import 'dotenv/config';
import { Telegraf, session } from "telegraf";
import locales from './locales/index.js';
import keyboardLocales from './locales/keyboard.js';
import { Scenes } from 'telegraf';
const { Stage } = Scenes;
import ScenesRepo from './scenes.js';
import fs from 'fs';
import config from './config.js';
//import { fileContains } from './helpers.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

const scenesRepository = new ScenesRepo();
const ageScene = scenesRepository.ageScene();
const categoryScene = scenesRepository.categoryScene();
const paymentScene = scenesRepository.paymentScene();

const adminSelectCat = scenesRepository.adminSelectCat();
const adminSendToId = scenesRepository.adminSendToId();

const stage = new Stage([ageScene, categoryScene, paymentScene, adminSelectCat, adminSendToId]);

bot.use(session());
bot.use(stage.middleware());


bot.start(async (ctx) => {
    await ctx.telegram.setMyCommands(
        [
            { command: '/order', description: 'Повторный заказ' },
            { command: '/stop', description: 'Остановить бота' },
        ]
    );
    if(ctx.session && ctx.session.start == true) { // && fileContains('./storage/users.txt', ctx.from.id)
       return await ctx.reply(locales.registeredUser);
    } 
    ctx.session.start = true;
    fs.readFile(config.usersFilePath, 'utf8', function (err, data) {
        if (err) throw err;
        if(data.indexOf(ctx.message.from.id) >= 0){
            return ctx.reply(locales.registeredUser)
        }
        
        fs.appendFile(config.usersFilePath, ctx.message.from.id + '\n', () => {
            ctx.replyWithHTML(locales.start, {
                reply_markup: {
                    keyboard: [
                        [keyboardLocales.letsgo]
                    ], resize_keyboard: true, one_time_keyboard: true
                }
            });
        });
      });
});

bot.hears(keyboardLocales.letsgo, async (ctx) => {
    await ctx.scene.enter('age');
});

bot.action('getqr', async ctx => {
    await ctx.telegram.sendPhoto(ctx.chat.id, { source: 'storage/qr.jpg' });
});

bot.command('send', async (ctx) => {
    const adminId = +process.env.ADMIN_ID || 34660611;
    if(ctx.message.from.id != adminId) return;
    await ctx.scene.enter('adminSelectCat');
});

bot.command('order', async (ctx) => {
    await ctx.scene.enter('age');
});

bot.command('stop', async (ctx) => {
    ctx.session = {};
    fs.readFile(config.usersFilePath, 'utf-8', async (err, data) => {
        if(err) return await ctx.reply('Системная ошибка. Попробуйте позже')
        var userid = ctx.from.id;
        var newValue = data.replace(new RegExp(userid), '');
        fs.writeFile(config.usersFilePath, newValue, 'utf-8', async () => {
            await ctx.reply('Бот оставновлен.');
        });
    });
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));