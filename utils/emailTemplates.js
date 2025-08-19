export function verificationEmailHTML({ verifyLink }) {
  return `
  <div style="background:#0b1220;padding:30px 12px;font-family:Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#101a34;border-radius:14px;overflow:hidden;border:1px solid #1e2a4a;">
      <div style="background:#0d5bff;color:#fff;padding:18px 20px;display:flex;align-items:center;gap:10px;">
        <img src="https://i.imgur.com/ie9o5wQ.png" alt="Dark-Love-MD" style="height:32px;">
        <div style="font-size:18px;font-weight:700;">Dark-Love-MD</div>
      </div>
      <div style="padding:24px;color:#d9e3ff;">
        <h2 style="margin:0 0 10px;font-size:22px;">Welcome to Dark-Love-MD 🎉</h2>
        <p style="margin:0 0 8px;line-height:1.6;">
          This is where you can see all bot repos and visit them for deployment.
        </p>
        <p style="margin:0 0 18px;">Click below to verify your email:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${verifyLink}" style="
             background:#0d5bff;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;display:inline-block;font-weight:700;">
            Verify Email
          </a>
        </p>
        <p style="opacity:.8;font-size:13px;margin-top:22px;">
          This link expires in 15 minutes for your security.
        </p>
      </div>
      <div style="background:#0b1220;color:#9ab0ff;padding:14px 20px;text-align:center;font-size:13px;">
        ©2025 Dark-Love-MD Bot Platform
      </div>
    </div>
  </div>`;
}
