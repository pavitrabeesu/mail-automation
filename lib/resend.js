import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to, subject, body) {
  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY environment variable");
    return { error: "Missing RESEND_API_KEY" };
  }

  try {
    const data = await resend.emails.send({
      from: "Business Bulk Email <onboarding@resend.dev>",
      to,
      subject,
      text: body
    });
    console.log("success");
    return { data };
  } catch (error) {
    console.error("Error sending email with Resend", error);
    return { error: error.message || "Failed to send email" };
  }
}

