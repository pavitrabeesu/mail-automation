import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pavitrabeesu@gmail.com",
    pass: "qwwc knxo cwkm okpi"
  }
});

export async function sendEmail(to, subject, body) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("Missing SMTP_USER or SMTP_PASS environment variables");
    return { error: "Email is not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Business Bulk Email"}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body
    });

    return { data: info };
  } catch (error) {
    console.error("Error sending email with Nodemailer", error);
    return { error: error.message || "Failed to send email" };
  }
}

