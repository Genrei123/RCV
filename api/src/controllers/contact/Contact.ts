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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Contact Submission</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">New message from website contact form:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #10b981;">
            <p style="margin: 0 0 15px 0; font-weight: bold; color: #374151;">Contact Information:</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Name:</strong> <span style="font-weight: 600;">${fullName}</span></p>
            <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> <span style="font-weight: 600;"><a href="mailto:${email}" style="color: #10b981; text-decoration: none;">${email}</a></span></p>
            <p style="margin: 8px 0; color: #374151;"><strong>Concern:</strong> <span style="font-weight: 600;">${concern || "General Inquiry"}</span></p>
          </div>

          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">Message Details:</p>
            <p style="margin: 0; color: #374151; white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${details}</p>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              <strong>Note:</strong> Please review and respond to this contact request at your earliest convenience.
            </p>
          </div>
        </div>
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} RCV Platform. All rights reserved.
          </p>
        </div>
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
