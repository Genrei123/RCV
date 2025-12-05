import { Router } from "express";
import { sendContactEmail } from "../../controllers/contact/Contact";

const ContactRouter = Router();

// Public route to send contact messages
ContactRouter.post("/send", sendContactEmail);

export default ContactRouter;
