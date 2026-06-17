# Gmail SMTP setup

The contact form sends every submission to `ash8518@gmail.com` through the Netlify function exposed at `/api/send-audit`.

Set these environment variables in Netlify before testing live delivery:

- `GMAIL_USER`: `ash8518@gmail.com`
- `GMAIL_APP_PASSWORD`: a Gmail app password for that account

Use a Gmail app password, not the regular Gmail login password. In Google Account settings, enable 2-Step Verification, then create an app password for Mail.

If an SMTP transcript or app password was shared anywhere, revoke that app password and create a new one before deploying.

After saving the variables, redeploy the site and submit the audit form from the live URL. The email should arrive at `ash8518@gmail.com`, with the visitor's email set as the reply-to address.
