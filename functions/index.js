"use strict";

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const {
    getFirestore,
    FieldValue,
    Timestamp
} = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");

initializeApp();

const db = getFirestore();
const auth = getAuth();

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


const RESELLER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeTemporaryPassword() {
    return "SUB@" + crypto.randomBytes(12).toString("base64url");
}

async function createUniqueResellerCode(existingCode, uid) {
    if (existingCode) {
        const existing = await db.collection("resellerCodes").doc(existingCode).get();
        if (existing.exists && existing.data().uid === uid) return existingCode;
    }

    for (let attempt = 0; attempt < 25; attempt++) {
        const bytes = crypto.randomBytes(5);
        let code = "SUB";
        for (let i = 0; i < 4; i++) {
            code += RESELLER_CODE_CHARS[bytes[i] % RESELLER_CODE_CHARS.length];
        }
        const ref = db.collection("resellerCodes").doc(code);
        const snapshot = await ref.get();
        if (!snapshot.exists) return code;
    }

    throw new HttpsError("resource-exhausted", "Could not generate a unique reseller code. Please try again.");
}

function requiredText(value, label, maxLength = 160) {
    const text = String(value == null ? "" : value).trim();
    if (!text) throw new HttpsError("invalid-argument", `${label} is required.`);
    if (text.length > maxLength) throw new HttpsError("invalid-argument", `${label} is too long.`);
    return text;
}

exports.createResellerAccount = onCall(
    { maxInstances: 5, timeoutSeconds: 60 },
    async (request) => {
        const callerUid = request.auth && request.auth.uid;
        if (!callerUid) {
            throw new HttpsError("unauthenticated", "Please sign in as an admin.");
        }

        const callerSnapshot = await db.collection("users").doc(callerUid).get();
        const caller = callerSnapshot.exists ? callerSnapshot.data() : null;
        if (
            !caller ||
            caller.role !== "admin" ||
            !["Super Admin", "Manager"].includes(caller.adminRole) ||
            caller.status !== "active" ||
            caller.access === "Suspended"
        ) {
            throw new HttpsError("permission-denied", "Only an active Super Admin or Manager can approve or create resellers.");
        }

        const input = request.data || {};
        let applicationRef = null;
        let application = null;
        let data = input;

        if (input.applicationId) {
            const applicationId = requiredText(input.applicationId, "Application ID", 150);
            applicationRef = db.collection("resellerApplications").doc(applicationId);
            const applicationSnapshot = await applicationRef.get();

            if (!applicationSnapshot.exists) {
                throw new HttpsError("not-found", "This reseller application no longer exists.");
            }

            application = applicationSnapshot.data() || {};
            if (application.status === "Approved" && application.resellerUid) {
                const approvedUser = await db.collection("users").doc(application.resellerUid).get();
                const approvedData = approvedUser.exists ? approvedUser.data() : {};
                if (approvedData.role === "reseller" && approvedData.resellerCode) {
                    return {
                        uid: application.resellerUid,
                        code: approvedData.resellerCode,
                        password: null,
                        existingAccount: true,
                        alreadyApproved: true
                    };
                }
            }

            if (application.status !== "Pending") {
                throw new HttpsError("failed-precondition", "Only pending reseller applications can be approved.");
            }
            data = application;
        }

        const name = requiredText(data.name || data.fullName, "Full name", 120);
        const email = requiredText(data.email, "Email", 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new HttpsError("invalid-argument", "Please enter a valid email address.");
        }

        const phone = String(data.phone || "").trim().slice(0, 40);
        const city = String(data.city || "").trim().slice(0, 100);
        const paymentMethod = String(data.paymentMethod || "").trim().slice(0, 80);
        const accountNumber = String(data.accountNumber || data.account || "").trim().slice(0, 120);

        let authUser = null;
        let existingAccount = false;
        let temporaryPassword = null;
        let createdAuthUser = false;

        try {
            try {
                authUser = await auth.getUserByEmail(email);
                existingAccount = true;
            } catch (error) {
                if (error.code !== "auth/user-not-found") throw error;
                temporaryPassword = makeTemporaryPassword();
                authUser = await auth.createUser({
                    email,
                    password: temporaryPassword,
                    displayName: name,
                    disabled: false
                });
                createdAuthUser = true;
            }

            const userRef = db.collection("users").doc(authUser.uid);
            const userSnapshot = await userRef.get();
            const previous = userSnapshot.exists ? userSnapshot.data() : {};

            if (previous.role === "admin") {
                throw new HttpsError("failed-precondition", "This email belongs to an admin account and cannot be converted into a reseller.");
            }

            const code = await createUniqueResellerCode(previous.resellerCode, authUser.uid);
            const now = FieldValue.serverTimestamp();

            const resellerProfile = {
                name: name || previous.name || authUser.displayName || "",
                email,
                phone: phone || previous.phone || previous.whatsapp || "",
                whatsapp: phone || previous.whatsapp || previous.phone || "",
                city: city || previous.city || "",
                paymentMethod: paymentMethod || previous.paymentMethod || "",
                account: accountNumber || previous.account || "",
                role: "reseller",
                status: previous.status || "active",
                access: previous.access || "Allowed",
                resellerCode: code,
                points: Number.isFinite(Number(previous.points)) ? Number(previous.points) : 0,
                wallet: Number.isFinite(Number(previous.wallet)) ? Number(previous.wallet) : 0,
                walletUsed: Number.isFinite(Number(previous.walletUsed)) ? Number(previous.walletUsed) : 0,
                createdAt: previous.createdAt || now,
                updatedAt: now,
                createdBy: previous.createdBy || caller.name || callerUid
            };

            const batch = db.batch();
            batch.set(userRef, resellerProfile, { merge: true });
            batch.set(db.collection("resellerCodes").doc(code), {
                uid: authUser.uid,
                name,
                email,
                updatedAt: now
            }, { merge: true });

            if (applicationRef) {
                batch.update(applicationRef, {
                    status: "Approved",
                    resellerUid: authUser.uid,
                    resellerCode: code,
                    processedAt: now,
                    processedBy: caller.name || callerUid
                });
            }

            await batch.commit();

            return {
                uid: authUser.uid,
                code,
                password: temporaryPassword,
                existingAccount,
                alreadyApproved: false
            };
        } catch (error) {
            if (createdAuthUser && authUser && authUser.uid) {
                await auth.deleteUser(authUser.uid).catch(() => {});
            }
            if (error instanceof HttpsError) throw error;
            console.error("Reseller account creation failed", {
                email,
                code: error && error.code,
                message: error && error.message
            });
            throw new HttpsError("internal", "Could not approve this reseller. Please try again or check the Functions logs.");
        }
    }
);

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
