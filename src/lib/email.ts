import nodemailer from "nodemailer";
import { render, darkTheme } from "emailmd";

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

/** Nodebase brand theme — dark mode with orange accent */
const nodebaseTheme = {
    ...darkTheme,
    brandColor: "#e8612c",
    buttonColor: "#e8612c",
    buttonTextColor: "#ffffff",
};

export const sendEmailVerification = async ({ user, url }: { user: { email: string }; url: string }) => {
    const markdown = `---
preheader: "Verify your email address for Nodebase"
---

::: header
# Nodebase
:::

## Verify your email

Click the button below to verify your email address and get started with Nodebase.

[Verify Email](${url}){button}

---

Or copy this link into your browser:

${url}

::: footer
If you didn't create an account, you can safely ignore this email.
:::`;

    const { html, text } = render(markdown, { theme: nodebaseTheme });

    try {
      await transporter.sendMail({
        from: `"Nodebase" <${process.env.EMAIL_FROM!}>`,
        to: user.email,
        subject: "Verify your email — Nodebase",
        html,
        text,
      });
    } catch (error) {
      console.error("[Email] Failed to send verification email:", error);
      throw new Error("Failed to send verification email. Please try again.");
    }
};

export const sendResetPasswordEmail = async ({ user, url }: { user: { email: string }; url: string }) => {
    const markdown = `---
preheader: "Reset your Nodebase password"
---

::: header
# Nodebase
:::

## Reset Your Password

You recently requested to reset your password for your Nodebase account. Click the button below to reset it.

[Reset Password](${url}){button}

---

If you did not request a password reset, please ignore this email or contact support if you have concerns.

::: footer
This link will expire in 24 hours.
:::`;

    const { html, text } = render(markdown, { theme: nodebaseTheme });

    try {
      // Intentionally not awaiting here as per Better-Auth best practices 
      // or at least not strictly required, though the signature implies an async call
      // The current implementation in this file uses await for transporter.sendMail.
      // We will await it to ensure delivery errors are caught here.
      await transporter.sendMail({
        from: `"Nodebase" <${process.env.EMAIL_FROM!}>`,
        to: user.email,
        subject: "Reset your password — Nodebase",
        html,
        text,
      });
    } catch (error) {
      console.error("[Email] Failed to send reset password email:", error);
      throw new Error("Failed to send reset password email. Please try again.");
    }
};