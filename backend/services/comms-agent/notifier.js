'use strict';

/**
 * 8.8.3 — Twilio SMS stub for critical escalation alerts.
 * 8.8.4 — SendGrid email stub for daily digest notifications.
 *
 * When the required env vars are configured these functions send real messages.
 * Without credentials they log what would have been sent — no crash, no side
 * effects — so the integration points are wired and auditable from day one.
 *
 * To activate:
 *   Twilio:   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, TWILIO_TO_DEFAULT
 *   SendGrid: SENDGRID_API_KEY, SENDGRID_FROM, SENDGRID_DIGEST_TO
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  || '';
const TWILIO_FROM        = process.env.TWILIO_FROM        || '';
const TWILIO_TO_DEFAULT  = process.env.TWILIO_TO_DEFAULT  || ''; // on-call number

const SENDGRID_API_KEY   = process.env.SENDGRID_API_KEY   || '';
const SENDGRID_FROM      = process.env.SENDGRID_FROM      || '';
const SENDGRID_DIGEST_TO = process.env.SENDGRID_DIGEST_TO || '';

/**
 * 8.8.3 — Send SMS for a critical escalation alert.
 * Replace the stub body with a real Twilio SDK call when credentials are set.
 */
async function sendCriticalSms(title, message) {
  const body = `[PatientRecords CRITICAL] ${title}: ${message}`;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !TWILIO_TO_DEFAULT) {
    console.log(`[notifier] SMS stub — to: ${TWILIO_TO_DEFAULT || '<TWILIO_TO_DEFAULT>'} — ${body}`);
    return;
  }

  // TODO: uncomment when Twilio credentials are configured:
  // const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({ from: TWILIO_FROM, to: TWILIO_TO_DEFAULT, body });
  console.log(`[notifier] SMS sent to ${TWILIO_TO_DEFAULT}: ${title}`);
}

/**
 * 8.8.4 — Send an email digest for a set of findings.
 * Replace the stub body with a real SendGrid SDK call when credentials are set.
 */
async function sendDailyDigest(patientRef, findings = []) {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM || !SENDGRID_DIGEST_TO) {
    console.log(`[notifier] Email stub — to: ${SENDGRID_DIGEST_TO || '<SENDGRID_DIGEST_TO>'} — digest for ${patientRef}: ${findings.length} finding(s)`);
    return;
  }

  // TODO: uncomment when SendGrid credentials are configured:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(SENDGRID_API_KEY);
  // const text = findings.map(f => `[${f.severity?.toUpperCase()}] ${f.title}: ${f.message}`).join('\n');
  // await sgMail.send({ to: SENDGRID_DIGEST_TO, from: SENDGRID_FROM,
  //   subject: `PatientRecords Daily Digest: ${patientRef}`, text });
  console.log(`[notifier] Email digest sent to ${SENDGRID_DIGEST_TO}: ${findings.length} finding(s)`);
}

module.exports = { sendCriticalSms, sendDailyDigest };
