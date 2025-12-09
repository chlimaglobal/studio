import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

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
