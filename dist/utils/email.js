import ejs from 'ejs';
import nodemailer from 'nodemailer';
import AppError from '../helpers/errorHelpers/AppError.js';
import path from 'node:path';
import { envVar } from '../config/envVar.js';
const transporter = nodemailer.createTransport({
    host: envVar.SMTP_SENDER.HOST,
    port: envVar.SMTP_SENDER.PORT,
    secure: envVar.SMTP_SENDER.PORT === 465, // true for 465, false for other ports
    auth: {
        user: envVar.SMTP_SENDER.USER,
        pass: envVar.SMTP_SENDER.PASSWORD,
    },
});
export const sendEmail = async (options) => {
    const { to, subject, template, templateData, attachments } = options;
    try {
        const templatePath = path.resolve(process.cwd(), `src/templates/${template}.ejs`);
        const html = await ejs.renderFile(templatePath, templateData);
        const info = await transporter.sendMail({
            from: envVar.SMTP_SENDER.USER,
            to,
            subject,
            html,
            attachments: attachments?.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType,
            })),
        });
        console.log("Email sent:", info.messageId);
    }
    catch (error) {
        console.log("Error sending email:", error);
        throw new AppError(500, "Error sending email");
    }
};
