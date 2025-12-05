import { createTransport, Transport } from "nodemailer";

const nodemailer_transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS, // fixed env var name
  },
});

export default nodemailer_transporter;
