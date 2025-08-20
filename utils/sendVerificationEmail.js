import nodemailer from "nodemailer";

export const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const verificationUrl = `https://dark-love-md-bot-2.onrender.com/api/auth/verify/${token}`;

    await transporter.sendMail({
      from: `"Dark Love MD" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `<h3>Welcome!</h3><p>Click below to verify your email:</p>
             <a href="${verificationUrl}">Verify Email</a>`
    });

    console.log("✅ Verification email sent");
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
