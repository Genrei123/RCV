import { Request, Response } from "express";
import transporter from "../../utils/nodemailer";

export const sendContactEmail = async (req: Request, res: Response) => {
  try {
    const { fullName, email, concern, details } = req.body || {};

    if (!fullName || !email || !details) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const to =
      process.env.CONTACT_RECEIVER_EMAIL || "rcvsteel.connect@gmail.com";

    const subject = `[RCV Contact] ${
      concern || "General Inquiry"
    } - ${fullName}`;
    const html = `
      <div>
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Concern:</strong> ${concern || "N/A"}</p>
        <p><strong>Details:</strong></p>
        <pre style="white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${details}</pre>
      </div>
    `;

    await transporter.sendMail({
      to,
      from: process.env.NODEMAILER_USER || to,
      replyTo: email,
      subject,
      html,
    });

    return res.status(200).json({ success: true, message: "Message sent" });
  } catch (err) {
    console.error("sendContactEmail error", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message" });
  }
};
