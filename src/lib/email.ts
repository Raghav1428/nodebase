import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST!,
    port: Number(process.env.EMAIL_SERVER_PORT!),
    auth: {
      user: process.env.EMAIL_SERVER_USER!,
      pass: process.env.EMAIL_SERVER_PASSWORD!,
    },
});

transporter.verify((error) => {
    if (error) {
      console.error("[Email] Transporter connection failed:", error);
    }
});

export const sendEmailVerification = async ({ user, url }: { user: { email: string }; url: string }) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email address</title>
        <style>
          /* Base - dark by default to match Nodebase */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0a0a0a;
            margin: 0;
            padding: 0;
            line-height: 1.6;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .card {
            background-color: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
          }
          .logo {
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 28px;
            letter-spacing: -0.3px;
          }
          .logo span {
            color: #e8612c;
          }
          h1 {
            color: #ffffff;
            font-size: 22px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            color: #a0a0a0;
            font-size: 15px;
            margin-bottom: 28px;
          }
          .button {
            display: inline-block;
            background-color: #e8612c;
            color: #ffffff !important;
            text-decoration: none;
            font-size: 15px;
            font-weight: 500;
            padding: 12px 32px;
            border-radius: 6px;
            margin-bottom: 28px;
          }
          .divider {
            border: none;
            border-top: 1px solid #2a2a2a;
            margin: 24px 0;
          }
          .link-label {
            color: #666;
            font-size: 12px;
            margin-bottom: 6px;
          }
          .link-text {
            color: #888;
            font-size: 11px;
            word-break: break-all;
          }
          .link-text a {
            color: #888;
          }
          .footer {
            color: #555;
            font-size: 12px;
            margin-top: 28px;
          }

          /* Light mode override for users with light OS theme */
          @media (prefers-color-scheme: light) {
            body { background-color: #f6f9fc; }
            .card { background-color: #ffffff; border-color: #e8e8e8; }
            .logo { color: #1a1a1a; }
            h1 { color: #1a1a1a; }
            p { color: #4a5568; }
            .divider { border-color: #e8e8e8; }
            .link-text, .link-text a { color: #999; }
            .footer { color: #a0aec0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">Nodebase</div>

            <h1>Verify your email</h1>
            <p>Click the button below to verify your email address and get started with Nodebase.</p>

            <a href="${url}" class="button">Verify Email</a>

            <hr class="divider" />

            <p class="link-label">Or copy this link into your browser:</p>
            <p class="link-text">
              <a href="${url}">${url}</a>
            </p>

            <div class="footer">
              If you didn't create an account, you can safely ignore this email.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {

      await transporter.sendMail({
        from: `"Nodebase" <${process.env.EMAIL_FROM!}>`,
        to: user.email,
        subject: "Verify your email — Nodebase",
        html: htmlContent,
        text: `Verify your email address\n\nClick this link to verify your Nodebase account:\n${url}\n\nIf you didn't create an account, ignore this email.`,
      });

    } catch (error) {
      throw new Error("Failed to send verification email. Please try again.");
    }
};