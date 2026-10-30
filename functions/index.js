"use strict";

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const {
    getFirestore,
    FieldValue,
    Timestamp
} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();

const db = getFirestore();

// Set these with `firebase functions:secrets:set`.
// Never put the mailbox password in frontend code or Firestore settings.
const HOSTINGER_SMTP_USER = defineSecret("HOSTINGER_SMTP_USER");
const HOSTINGER_SMTP_PASS = defineSecret("HOSTINGER_SMTP_PASS");

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SENDER_EMAIL = "info@subeesha.com";
const DEFAULT_SENDER_NAME = "Subeesha";

function cleanText(value, maxLength = 1000) {
    return String(value == null ? "" : value).slice(0, maxLength);
}

function getRecipients(to) {
    const values = Array.isArray(to) ? to : [to];
    return values
        .map(value => String(value || "").trim())
        .filter(Boolean);
}

async function markInvalid(ref, reason) {
    await ref.set({
        delivery: {
            state: "ERROR",
            error: reason,
            failedAt: FieldValue.serverTimestamp()
        }
    }, { merge: true });
}

exports.sendSubeeshaMail = onDocumentCreated(
    {
        document: "mail/{mailId}",
        secrets: [HOSTINGER_SMTP_USER, HOSTINGER_SMTP_PASS],
        retry: true,
        maxInstances: 5
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const mailRef = snapshot.ref;
        const mailData = snapshot.data() || {};
        const message = mailData.message || {};
        const recipients = getRecipients(mailData.to);

        // Reject malformed queue documents without repeatedly retrying them.
        if (!recipients.length || !message.subject || (!message.html && !message.text)) {
            await markInvalid(mailRef, "Email document must contain to, message.subject, and message.html or message.text.");
            return;
        }

        // Firestore events are delivered at least once. Claim the mail document
        // transactionally so duplicate invocations do not send at the same time.
        let claimed = false;
        let attemptNumber = 0;

        await db.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(mailRef);
            if (!currentSnapshot.exists) return;

            const delivery = currentSnapshot.get("delivery") || {};
            if (delivery.state === "SUCCESS") return;

            const leaseUntil = delivery.leaseUntil && typeof delivery.leaseUntil.toMillis === "function"
                ? delivery.leaseUntil.toMillis()
                : 0;

            // Another invocation is currently sending this email.
            if (delivery.state === "PROCESSING" && leaseUntil > Date.now()) return;

            attemptNumber = Math.max(0, Number(delivery.attempts) || 0) + 1;
            transaction.set(mailRef, {
                delivery: {
                    state: "PROCESSING",
                    attempts: attemptNumber,
                    eventId: event.id,
                    startedAt: FieldValue.serverTimestamp(),
                    leaseUntil: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000)
                }
            }, { merge: true });

            claimed = true;
        });

        if (!claimed) return;

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: true,
            auth: {
                user: HOSTINGER_SMTP_USER.value(),
                pass: HOSTINGER_SMTP_PASS.value()
            },
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 30000
        });

        try {
            const emailSettingsSnapshot = await db.collection("settings").doc("email").get();
            const emailSettings = emailSettingsSnapshot.exists ? emailSettingsSnapshot.data() : {};
            const senderName = cleanText(emailSettings.fromName || DEFAULT_SENDER_NAME, 80);

            const result = await transporter.sendMail({
                from: `${senderName} <${SENDER_EMAIL}>`,
                replyTo: SENDER_EMAIL,
                to: recipients,
                subject: cleanText(message.subject, 250),
                text: message.text ? String(message.text) : undefined,
                html: message.html ? String(message.html) : undefined
            });

            if (!result.accepted || result.accepted.length === 0) {
                throw new Error("The SMTP server did not accept any recipient.");
            }

            await mailRef.set({
                delivery: {
                    state: "SUCCESS",
                    attempts: attemptNumber,
                    messageId: result.messageId || "",
                    accepted: (result.accepted || []).map(String),
                    rejected: (result.rejected || []).map(String),
                    sentAt: FieldValue.serverTimestamp(),
                    leaseUntil: FieldValue.delete()
                }
            }, { merge: true });

            console.log("Subeesha email sent", {
                mailId: event.params.mailId,
                recipients,
                messageId: result.messageId || ""
            });
        } catch (error) {
            await mailRef.set({
                delivery: {
                    state: "ERROR",
                    attempts: attemptNumber,
                    error: cleanText(error && error.message ? error.message : "SMTP delivery failed.", 1000),
                    failedAt: FieldValue.serverTimestamp(),
                    leaseUntil: FieldValue.delete()
                }
            }, { merge: true });

            console.error("Subeesha email delivery failed", {
                mailId: event.params.mailId,
                code: error && error.code,
                message: error && error.message
            });

            // retry:true allows Firebase to retry temporary SMTP/network failures.
            throw error;
        } finally {
            transporter.close();
        }
    }
);
