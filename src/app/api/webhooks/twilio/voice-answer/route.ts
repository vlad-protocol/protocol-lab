import { NextResponse } from "next/server";

// Twilio hits this once the rep's phone answers. It responds with TwiML
// that bridges them to the contact's number and starts recording as soon
// as the contact picks up.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const dialTo = url.searchParams.get("dial");
  const baseUrl = process.env.PUBLIC_APP_URL || "";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer" recordingStatusCallback="${baseUrl}/api/webhooks/twilio/recording-status">
    <Number>${dialTo}</Number>
  </Dial>
</Response>`;

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export async function GET(req: Request) {
  return POST(req);
}
