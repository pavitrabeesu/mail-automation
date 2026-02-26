import { NextResponse } from "next/server";
import { sendEmail } from "../../../lib/resend";

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, body: messageBody } = body || {};

    if (!to || !subject || !messageBody) {
      return NextResponse.json(
        { error: "Missing to, subject or body" },
        { status: 400 }
      );
    }

    const result = await sendEmail(to, subject, messageBody);

    if (result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}

