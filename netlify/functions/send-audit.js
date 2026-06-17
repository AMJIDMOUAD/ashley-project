const nodemailer = require("nodemailer");

const RECIPIENT = "ash8518@gmail.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseBody(event) {
  const rawBody = event.body || "";
  const headers = event.headers || {};
  const contentType = headers["content-type"] || headers["Content-Type"] || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }

  return JSON.parse(rawBody || "{}");
}

function envAny(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name].trim();
  }
  return "";
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = parseBody(event);
  } catch (error) {
    return json(400, { error: "Invalid request body" });
  }

  if (clean(body["bot-field"])) {
    return json(200, { ok: true });
  }

  const name = clean(body.name);
  const business = clean(body.business);
  const email = clean(body.email);
  const phone = clean(body.phone);

  if (!name || !business || !email || !phone || !isEmail(email)) {
    return json(400, { error: "Please complete every required field." });
  }

  const smtpUser = envAny(["GMAIL_USER", "SMTP_USER", "SMTP_USERNAME"]);
  const smtpPass = envAny(["GMAIL_APP_PASSWORD", "GMAIL_PASSWORD", "GMAIL_PASS", "SMTP_PASS", "SMTP_PASSWORD"]);

  if (!smtpUser || !smtpPass) {
    console.error("Missing Gmail SMTP environment variables.");
    return json(500, { error: "Email delivery is not configured." });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  });

  try {
    await transporter.sendMail({
      from: `"Summit Studio Website" <${smtpUser}>`,
      to: RECIPIENT,
      replyTo: email,
      subject: `New audit request from ${name}`,
      text: [
        "New Summit Studio audit request",
        "",
        `Name: ${name}`,
        `Business: ${business}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Submitted: ${submittedAt}`
      ].join("\n"),
      html: `
        <h2>New Summit Studio audit request</h2>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;">
          <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
          <tr><td><strong>Business</strong></td><td>${escapeHtml(business)}</td></tr>
          <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone)}</td></tr>
          <tr><td><strong>Submitted</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
        </table>
      `
    });
  } catch (error) {
    console.error("Gmail SMTP delivery failed:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return json(502, { error: "Email delivery failed." });
  }

  return json(200, { ok: true });
};
