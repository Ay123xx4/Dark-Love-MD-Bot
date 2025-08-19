import nodemailer from "nodemailer";

export async function sendVerificationEmail(to, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or "smtp.mailtrap.io" for testing
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${token}`;

  const mailOptions = {
    from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email - Dark-Love-MD",
    html: `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2>Verify your email</h2>
        <p>Click the link below to verify your account. This link expires in <b>15 minutes</b>:</p>
        <a href="${verificationUrl}" 
           style="display:inline-block;padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">
          Verify Email
        </a>
        <p>If you did not request this, you can safely ignore it.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", to);
  } catch (err) {
    console.error("Email sending failed:", err);
    throw new Error("Failed to send verification email");
  }
}
