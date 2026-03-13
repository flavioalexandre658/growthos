import type { Job } from "bullmq";
import type { EmailJobData } from "@/lib/queue";
import { sendEmail } from "@/lib/email";

export async function processEmailJob(job: Job<EmailJobData>) {
  const { to, subject, htmlBody, from } = job.data;

  await sendEmail({
    to,
    subject,
    html: htmlBody,
    from,
  });

  return { sent: true, to };
}
