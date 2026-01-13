import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { emailChannel } from "@/inngest/channels/email";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";
import nodemailer from "nodemailer";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type EmailData = {
    variableName?: string;
    credentialId?: string;
    to?: string;
    subject?: string;
    body?: string;
}

type SmtpCredentialValue = {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    from: string;
}

export const emailExecutor: NodeExecutor<EmailData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        emailChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.variableName) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Variable name is required");
    }

    if (!data.credentialId) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Email credential is required");
    }

    if (!data.to) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Recipient email is required");
    }

    if (!data.subject) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Subject is required");
    }

    if (!data.body) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Body is required");
    }

    // Compile templates with Handlebars
    const rawTo = Handlebars.compile(data.to)(context);
    const to = decode(rawTo);

    const rawSubject = Handlebars.compile(data.subject)(context);
    const subject = decode(rawSubject);

    const rawBody = Handlebars.compile(data.body)(context);
    const body = decode(rawBody);

    const credential = await step.run("get-email-credential", () => {
        return prisma.credential.findUnique({
            where: {
                id: data.credentialId,
                userId,
            },
        })
    });

    if (!credential) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Credential not found");
    }

    try {
        const result = await step.run("send-email", async () => {
            let transporter: nodemailer.Transporter;
            let fromAddress: string;

            if (credential.type === CredentialType.EMAIL_GMAIL) {
                // Gmail credentials: name = email, value = app password (plain string)
                const gmailEmail = credential.name;
                const gmailAppPassword = decrypt(credential.value);
                transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: gmailEmail,
                        pass: gmailAppPassword,
                    },
                });
                fromAddress = gmailEmail;
            } else if (credential.type === CredentialType.EMAIL_SMTP) {
                // SMTP credentials: value = JSON with host, port, secure, username, password, from
                const decryptedValue = decrypt(credential.value);
                const smtpCred = JSON.parse(decryptedValue) as SmtpCredentialValue;
                transporter = nodemailer.createTransport({
                    host: smtpCred.host,
                    port: smtpCred.port,
                    secure: smtpCred.secure,
                    auth: {
                        user: smtpCred.username,
                        pass: smtpCred.password,
                    },
                });
                fromAddress = smtpCred.from || smtpCred.username;
            } else {
                throw new NonRetriableError(`Email Node: Unsupported credential type: ${credential.type}`);
            }

            const info = await transporter.sendMail({
                from: fromAddress,
                to: to,
                subject: subject,
                html: body,
            });

            return {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
            };
        });

        await publish(
            emailChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: {
                emailSent: true,
                messageId: result.messageId,
                to: to,
                subject: subject,
            }
        };

    } catch (error) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("Email Node: Email sending failed", {
            cause: error,
        });
    }
};
