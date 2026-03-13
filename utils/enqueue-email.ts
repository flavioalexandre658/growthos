import { getEmailQueue } from "@/lib/queue";
import type { EmailJobData } from "@/lib/queue";

export async function enqueueEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
}): Promise<string | undefined> {
  const jobData: EmailJobData = {
    to: params.to,
    subject: params.subject,
    htmlBody: params.htmlBody,
    from: params.from,
  };

  const job = await getEmailQueue().add(
    `email-${Date.now()}`,
    jobData,
  );

  return job.id;
}
