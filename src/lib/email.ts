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