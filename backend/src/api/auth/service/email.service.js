
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use an app password, not your real password
  },
});

export async function sendPasswordResetEmail(toEmail, code) {
  await transporter.sendMail({
    from: `"Evangadi Forum" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Password Reset Code",
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
        <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; text-align: center; padding: 1rem; background: #f4f4f4; border-radius: 8px;">
          ${code}
        </div>
        <p style="color: #999; font-size: 0.85rem; margin-top: 1rem;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
