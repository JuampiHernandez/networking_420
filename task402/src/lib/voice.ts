/**
 * Outbound AI voice calls via ElevenLabs Conversational AI (Twilio outbound).
 *  - real: places a live call when ELEVENLABS_API_KEY + agent + phone id are set.
 *  - sim:  returns a fake conversation id + a templated transcript preview.
 *
 * DEMO_CONTACT_PHONE, if set, overrides every recipient so all calls reach
 * your phone during a demo.
 */
import { getCallMode, serverConfig } from "./config";

export type PlaceCallResult = {
  ok: boolean;
  conversationId: string;
  to: string;
  simulated: boolean;
  transcriptPreview?: string;
  callSid?: string;
  status?: string;
  error?: string;
};

/** Normalize a phone string to E.164 ("+12125550100") for Twilio/ElevenLabs. */
function toE164(raw: string): string {
  const trimmed = (raw ?? "").trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `${hasPlus ? "+" : "+"}${digits}` : trimmed;
}

/** Human-readable guidance when ElevenLabs/Twilio rejects an outbound call. */
function explainCallFailure(raw: string, to: string): string {
  if (/unverified/i.test(raw)) {
    return (
      `Twilio trial accounts can only call verified numbers. ` +
      `Verify ${to} at console.twilio.com → Phone Numbers → Verified Caller IDs ` +
      `(or upgrade your Twilio account linked to ElevenLabs). Raw: ${raw}`
    );
  }
  if (/insufficient|balance|credit/i.test(raw)) {
    return `ElevenLabs/Twilio account needs credits to place calls. Raw: ${raw}`;
  }
  return raw;
}

export async function placeOutreachCall(args: {
  to: string;
  name: string;
  objective: string;
  firstMessage?: string;
}): Promise<PlaceCallResult> {
  const to = toE164(serverConfig.demoContactPhone ?? args.to);
  const first =
    args.firstMessage ??
    `Hi ${args.name.split(" ")[0]}, I'm an AI assistant reaching out about ${args.objective}. Do you have a minute?`;

  if (getCallMode() === "sim") {
    return {
      ok: true,
      conversationId: `sim_call_${Date.now().toString(36)}`,
      to,
      simulated: true,
      transcriptPreview: first,
    };
  }

  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": serverConfig.elevenLabsKey as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: serverConfig.elevenLabsAgentId,
          agent_phone_number_id: serverConfig.elevenLabsAgentPhoneId,
          to_number: to,
          conversation_initiation_client_data: {
            dynamic_variables: {
              contact_name: args.name,
              objective: args.objective,
            },
            conversation_config_override: {
              agent: { first_message: first },
            },
          },
        }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      conversation_id?: string;
      callSid?: string;
      success?: boolean;
      message?: string;
      detail?: unknown;
    };

    // ElevenLabs can return HTTP 200 with `success: false` (e.g. Twilio number
    // can't dial the destination, no balance, agent not configured for
    // outbound). Treat that as a failure so the timeline shows *why* no call
    // landed instead of a silent empty conversation id.
    const detailMsg =
      typeof data.detail === "string"
        ? data.detail
        : data.detail
        ? JSON.stringify(data.detail)
        : undefined;

    if (!res.ok || data.success !== true) {
      const raw =
        data.message ?? detailMsg ?? `ElevenLabs HTTP ${res.status}`;
      const error = explainCallFailure(raw, to);
      console.warn(`[place-call] failed for ${to}: ${raw}`);
      return {
        ok: false,
        conversationId: "",
        to,
        simulated: false,
        callSid: data.callSid ?? undefined,
        status: data.success === false ? "rejected" : `http_${res.status}`,
        error,
      };
    }

    if (!data.conversation_id && !data.callSid) {
      const error = explainCallFailure(
        data.message ?? "Call accepted but no conversation_id or callSid returned",
        to,
      );
      return {
        ok: false,
        conversationId: "",
        to,
        simulated: false,
        status: "no_session",
        error,
      };
    }

    return {
      ok: true,
      conversationId: data.conversation_id ?? "",
      to,
      simulated: false,
      callSid: data.callSid,
      status: "initiated",
      transcriptPreview: first,
    };
  } catch (err) {
    return {
      ok: false,
      conversationId: "",
      to,
      simulated: false,
      error: err instanceof Error ? err.message : "call failed",
    };
  }
}
