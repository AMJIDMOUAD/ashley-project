const nodemailer = require("nodemailer");

const RECIPIENT = "ash8518@gmail.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type"
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
  // Netlify may base64-encode the body for binary-safe transport
  let rawBody = event.body || "";
  if (event.isBase64Encoded && rawBody) {
    rawBody = Buffer.from(rawBody, "base64").toString("utf8");
  }

  const headers = event.headers || {};
  const contentType = (headers["content-type"] || headers["Content-Type"] || "").toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }

  // Default: JSON
  return JSON.parse(rawBody || "{}");
}

function envAny(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name].trim();
  }
  return "";
}

exports.handler = async function (event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return json(200, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = parseBody(event);
  } catch (err) {
    console.error("Body parse error:", err.message, "| raw body:", event.body);
    return json(400, { error: "Invalid request body" });
  }

  // Honeypot
  if (clean(body["bot-field"])) {
    return json(200, { ok: true });
  }

  const name     = clean(body.name);
  const business = clean(body.business);
  const email    = clean(body.email);
  const phone    = clean(body.phone);

  console.log("Received fields — name:", !!name, "| business:", !!business,
    "| email:", !!email, "| phone:", !!phone, "| validEmail:", isEmail(email));

  if (!name || !business || !email || !phone || !isEmail(email)) {
    console.error("Validation failed:", { name, business, email, phone });
    return json(400, { error: "Please complete every required field." });
  }

  // Read credentials
  const smtpUser = envAny(["GMAIL_USER", "SMTP_USER", "SMTP_USERNAME"]);
  const smtpPass = envAny([
    "GMAIL_APP_PASSWORD", "GMAIL_PASSWORD", "GMAIL_PASS", "SMTP_PASS", "SMTP_PASSWORD"
  ]).replace(/\s+/g, ""); // strip spaces — app passwords are often stored with spaces

  if (!smtpUser || !smtpPass) {
    console.error("Missing SMTP env vars. GMAIL_USER set:", !!smtpUser, "| GMAIL_APP_PASSWORD set:", !!smtpPass);
    return json(500, { error: "Email delivery is not configured." });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: true }
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
        `Name:      ${name}`,
        `Business:  ${business}`,
        `Email:     ${email}`,
        `Phone:     ${phone}`,
        `Submitted: ${submittedAt}`
      ].join("\n"),
      html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#061711;border-bottom:2px solid #25C979;padding-bottom:10px;">
    New Summit Studio Audit Request
  </h2>
  <table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:collapse;">
    <tr style="background:#f5f5f5;">
      <td style="font-weight:bold;width:120px;">Name</td>
      <td>${escapeHtml(name)}</td>
    </tr>
    <tr>
      <td style="font-weight:bold;">Business</td>
      <td>${escapeHtml(business)}</td>
    </tr>
    <tr style="background:#f5f5f5;">
      <td style="font-weight:bold;">Email</td>
      <td><a href="mailto:${escapeHtml(email)}" style="color:#25C979;">${escapeHtml(email)}</a></td>
    </tr>
    <tr>
      <td style="font-weight:bold;">Phone</td>
      <td>${escapeHtml(phone)}</td>
    </tr>
    <tr style="background:#f5f5f5;">
      <td style="font-weight:bold;">Submitted</td>
      <td>${escapeHtml(submittedAt)}</td>
    </tr>
  </table>
  <p style="margin-top:20px;color:#666;font-size:13px;">
    Reply directly to this email to respond to ${escapeHtml(name)}.
  </p>
</body>
</html>`
    });
  } catch (err) {
    console.error("Gmail SMTP delivery failed:", {
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      message: err.message
    });
    return json(502, { error: "Email delivery failed. Please try again or contact us directly." });
  }

  return json(200, { ok: true });
};
