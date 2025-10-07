import { createTransport, Transport } from 'nodemailer'

const nodemailer_transporter = createTransport({
    service: 'gmail',
    auth: {
        user: "genreycristobal03@gmail.com",
        pass: "fnnc qbub wegs aztd",
    },
});

export default nodemailer_transporter;