import { createTransport, Transport } from 'nodemailer'
import dotenv from 'dotenv';
dotenv.config();

const nodemailer_transporter = createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
    },
});

/**
 * Send an email using the configured nodemailer transporter
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content of the email
 */
export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
    await nodemailer_transporter.sendMail({
        from: `"RCV Platform" <${process.env.NODEMAILER_USER}>`,
        to,
        subject,
        html,
    });
};

export default nodemailer_transporter;