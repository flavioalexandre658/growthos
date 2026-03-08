import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export interface ISendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: ISendEmailParams): Promise<void> {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
  const fromAddress = params.from ?? process.env.AWS_SES_FROM_EMAIL ?? "noreply@groware.io";

  const command = new SendEmailCommand({
    Source: fromAddress,
    Destination: {
      ToAddresses: toAddresses,
    },
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    Message: {
      Subject: {
        Data: params.subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: params.html,
          Charset: "UTF-8",
        },
        ...(params.text && {
          Text: {
            Data: params.text,
            Charset: "UTF-8",
          },
        }),
      },
    },
  });

  await sesClient.send(command);
}
