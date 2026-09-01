import twilioLib from "twilio";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export async function getTwilioConfig() {
  const conn = await prisma.twilioConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  if (!conn) return null;
  return {
    accountSid: conn.accountSid,
    authToken: decryptSecret(conn.authToken),
    phoneNumber: conn.phoneNumber,
  };
}

export async function getTwilioClient() {
  const config = await getTwilioConfig();
  if (!config) throw new Error("Twilio isn't connected yet. Add it in Settings.");
  return { client: twilioLib(config.accountSid, config.authToken), config };
}

export async function sendSms(to: string, body: string) {
  const { client, config } = await getTwilioClient();
  const msg = await client.messages.create({ to, from: config.phoneNumber, body });
  return msg.sid;
}

// Bridges the rep's own phone to the contact's phone and records the call
// once connected. Legal note (surfaced in the UI too): call recording
// consent laws vary — some places require telling the other party, some
// require their explicit consent. Confirm what applies where you operate
// before turning this on.
export async function startRecordedCall(repPhone: string, contactPhone: string, baseUrl: string) {
  const { client, config } = await getTwilioClient();
  const call = await client.calls.create({
    to: repPhone,
    from: config.phoneNumber,
    url: `${baseUrl}/api/webhooks/twilio/voice-answer?dial=${encodeURIComponent(contactPhone)}`,
    statusCallback: `${baseUrl}/api/webhooks/twilio/call-status`,
    statusCallbackEvent: ["completed"],
  });
  return call.sid;
}

export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
) {
  return twilioLib.validateRequest(authToken, signature, url, params);
}
