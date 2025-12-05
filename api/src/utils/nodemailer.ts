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

export default nodemailer_transporter;