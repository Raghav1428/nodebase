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
    let to: string;
    let subject: string;
    let body: string;

    try {
        const rawTo = Handlebars.compile(data.to)(context);
        to = decode(rawTo);

        const rawSubject = Handlebars.compile(data.subject)(context);
        subject = decode(rawSubject);

        const rawBody = Handlebars.compile(data.body)(context);
        body = decode(rawBody);
    } catch (error) {
        await publish(
            emailChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Email Node: Template compilation failed", {
            cause: error,
        });
    }

    const credential = await step.run("get-email-credential", () => {
        return prisma.credential.findUnique({
            where: {
                id: data.credentialId,
            },
        })
    });

    if (!credential || credential.userId !== userId) {
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
                    connectionTimeout: 60000,
                    greetingTimeout: 30000,
                    socketTimeout: 300000,
                });
                fromAddress = gmailEmail;
            } else if (credential.type === CredentialType.EMAIL_SMTP) {
                // SMTP credentials: value = JSON with host, port, secure, username, password, from
                try {
                    const decryptedValue = decrypt(credential.value);
                    const rawCred = JSON.parse(decryptedValue);

                    // Runtime validation
                    if (!rawCred || typeof rawCred !== 'object') {
                        throw new Error("Credential value is not a valid JSON object");
                    }
                    if (typeof rawCred.host !== 'string' || !rawCred.host) {
                        throw new Error("Missing or invalid 'host' in SMTP credentials");
                    }

                    const port = Number(rawCred.port);
                    if (isNaN(port)) {
                        throw new Error(`Invalid 'port' in SMTP credentials: ${rawCred.port}`);
                    }

                    const smtpCred: SmtpCredentialValue = {
                        host: rawCred.host,
                        port: port,
                        secure: Boolean(rawCred.secure),
                        username: String(rawCred.username || ''),
                        password: String(rawCred.password || ''),
                        from: String(rawCred.from || '')
                    };

                    transporter = nodemailer.createTransport({
                        host: smtpCred.host,
                        port: smtpCred.port,
                        secure: smtpCred.secure,
                        auth: {
                            user: smtpCred.username,
                            pass: smtpCred.password,
                        },
                        connectionTimeout: 60000,
                        greetingTimeout: 30000,
                        socketTimeout: 300000,
                    });
                    fromAddress = smtpCred.from || smtpCred.username;
                } catch (error) {
                    throw new NonRetriableError('Invalid SMTP credentials: failed to decrypt or parse credential value', {
                        cause: error
                    });
                }
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
