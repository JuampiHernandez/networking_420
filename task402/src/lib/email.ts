/**
 * Outreach email sender.
 *  - real: sends via Resend when RESEND_API_KEY is set.
 *  - sim:  logs the email and returns a fake id (still demoable).
 *
 * DEMO_CONTACT_EMAIL, if set, overrides every recipient so all outreach lands
 * in your inbox during a demo.
 */
import { getEmailMode, serverConfig } from "./config";

export type SendEmailResult = {
  ok: boolean;
  id: string;
  to: string;
  simulated: boolean;
  error?: string;
};

export async function sendOutreachEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  const to = serverConfig.demoContactEmail ?? args.to;
  const html = args.body
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");

  if (getEmailMode() === "sim") {
    return {
      ok: true,
      id: `sim_email_${Date.now().toString(36)}`,
      to,
      simulated: true,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverConfig.resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverConfig.resendFrom,
        to: [to],
        subject: args.subject,
        html,
        text: args.body,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        id: "",
        to,
        simulated: false,
        error: data.message ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, id: data.id ?? "", to, simulated: false };
  } catch (err) {
    return {
      ok: false,
      id: "",
      to,
      simulated: false,
      error: err instanceof Error ? err.message : "email failed",
    };
  }
}
