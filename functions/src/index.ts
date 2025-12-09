import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

// ✅ IMPORTAÇÃO SENDGRID (FALTAVA)
import * as sgMail from "@sendgrid/mail";

// ✅ CONFIGURAÇÃO DA API KEY (FALTAVA)
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

admin.initializeApp();
const db = admin.firestore();

const REGION = "us-central1";

/**
 * Enviar convite de parceiro
 */
export const sendPartnerInvite = functions
  .region(REGION)
  .runWith({ secrets: ["SENDGRID_API_KEY"] })
  .https.onCall(async (data, context) => {
    try {
      const { partnerEmail, senderName } = data;

      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "O usuário precisa estar autenticado."
        );
      }

      if (!partnerEmail || !senderName) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Parâmetros inválidos ao enviar convite."
        );
      }

      const inviteToken = db.collection("invites").doc().id;

      const senderEmail =
        context.auth.token.email || context.auth.token?.email_verified;

      const inviteData = {
        sentBy: context.auth.uid,
        sentByName: senderName,
        sentByEmail: senderEmail || null,
        sentToEmail: partnerEmail,
        status: "pending",
        createdAt: new Date(),
      };

      // 🔥 ISSO DISPARA o gatilho onInviteCreated
      await db.collection("invites").doc(inviteToken).set(inviteData);

      return {
        success: true,
        inviteToken,
        message: "Convite criado com sucesso!",
      };
    } catch (error) {
      console.error("Erro em sendPartnerInvite:", error);

      throw new functions.https.HttpsError(
        "internal",
        "Erro ao enviar convite."
      );
    }
  });

/**
 * 🔥 Gatilho que envia o e-mail do convite (o que estava quebrando)
 */
export const onInviteCreated = functions
  .region(REGION)
  .runWith({ secrets: ["SENDGRID_API_KEY"] })
  .firestore.document("invites/{inviteId}")
  .onCreate(async (snap, context) => {
    try {
      const invite = snap.data() as DocumentData;

      if (!invite.sentToEmail) {
        console.warn("Convite sem e-mail de destino, ignorando.");
        return;
      }

      const msg = {
        to: invite.sentToEmail,
        from: {
          email: "no-reply@financeflow.app",
          name: "FinanceFlow",
        },
        subject: "Você recebeu um convite para o Modo Casal 💙",
        text: `
Olá!

${invite.sentByName} convidou você para vincular contas no FinanceFlow.
Acesse o app para aceitar o convite.
        `,
        html: `
<p>Olá!</p>
<p><strong>${invite.sentByName}</strong> convidou você para usar o <strong>Modo Casal</strong> no FinanceFlow.</p>
<p>Acesse o aplicativo para visualizar e aceitar o convite.</p>
        `,
      };

      // 🔥 AQUI QUEBRAVA – AGORA FUNCIONA
      await sgMail.send(msg);

      return { success: true };
    } catch (error) {
      console.error("Erro ao enviar email de convite:", error);
      throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail.");
    }
  });

/**
 * Desvincular parceiro
 */
export const disconnectPartner = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado."
      );
    }

    const userId = context.auth.uid;

    try {
      const userDocRef = db.collection("users").doc(userId);
      const userDoc = await userDocRef.get();
      const userData = userDoc.data();

      if (!userData || !userData.coupleId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Você não está vinculado a um parceiro."
        );
      }

      const coupleId = userData.coupleId;
      const coupleDocRef = db.collection("couples").doc(coupleId);
      const coupleDoc = await coupleDocRef.get();

      const members = coupleDoc.exists
        ? (coupleDoc.data()?.members || [])
        : [];

      const partnerId = members.find((id: string) => id !== userId);

      const batch = db.batch();

      batch.update(userDocRef, {
        coupleId: admin.firestore.FieldValue.delete(),
        memberIds: [userId],
      });

      if (partnerId) {
        batch.update(db.collection("users").doc(partnerId), {
          coupleId: admin.firestore.FieldValue.delete(),
          memberIds: [partnerId],
        });
      }

      batch.delete(coupleDocRef);

      await batch.commit();

      return { success: true, message: "Desvinculação concluída." };
    } catch (error) {
      console.error("Erro ao desvincular parceiro:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Erro inesperado ao desvincular."
      );
    }
  });
