'use client';

import { create } from 'zustand';
import { onSnapshot, doc, getDoc, query, collection, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, CoupleLink } from '@/lib/types';
import { getAuth } from 'firebase/auth';

export type CoupleStatus = "single" | "pending_sent" | "pending_received" | "linked";

interface CoupleState {
  partner: AppUser | null;
  status: CoupleStatus;
  invite: {
    inviteId?: string;
    sentBy?: string;
    sentTo?: string;
    sentToEmail?: string;
    sentByName?: string;
    sentByEmail?: string;
  } | null;
  coupleLink: CoupleLink | null;
  loading: boolean;
  setPartner: (partner: AppUser | null) => void;
  setStatus: (status: CoupleStatus) => void;
  setInvite: (invite: any | null) => void;
  setCoupleLink: (coupleLink: CoupleLink | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCoupleStore = create<CoupleState>((set) => ({
  partner: null,
  status: 'single',
  invite: null,
  coupleLink: null,
  loading: true,
  setPartner: (partner) => set({ partner }),
  setStatus: (status) => set({ status }),
  setInvite: (invite) => set({ invite }),
  setCoupleLink: (coupleLink) => set({ coupleLink }),
  setLoading: (loading) => set({ loading }),
  reset: () =>
    set({
      partner: null,
      status: 'single',
      loading: false,
      invite: null,
      coupleLink: null,
    }),
}));

// Global listeners
let unsubUser: (() => void) | null = null;
let unsubSentInvites: (() => void) | null = null;
let unsubReceivedInvites: (() => void) | null = null;
let unsubPartner: (() => void) | null = null;
let unsubCoupleLink: (() => void) | null = null;


export function initializeCoupleStore() {
  const auth = getAuth();

  auth.onAuthStateChanged(async (user) => {
    // Clean previous listeners
    unsubUser?.();
    unsubSentInvites?.();
    unsubReceivedInvites?.();
    unsubPartner?.();
    unsubCoupleLink?.();

    if (!user) {
      useCoupleStore.getState().reset();
      return;
    }

    const {
      setLoading,
      setStatus,
      setPartner,
      setInvite,
      setCoupleLink,
      reset,
    } = useCoupleStore.getState();

    setLoading(true);

    // Listener do documento do próprio usuário
    unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      { includeMetadataChanges: true },
      async (userDoc) => {
        if (!userDoc.exists()) {
          console.log("User document not found, resetting state.");
          reset();
          return;
        }

        const userData = userDoc.data();
        const coupleId = userData.coupleId;

        // Clean up partner listeners before proceeding
        unsubPartner?.();
        unsubCoupleLink?.();

        // ------------ 🔗 SE JÁ ESTÁ VINCULADO ------------
        if (coupleId) {
          setInvite(null); // Clear any lingering invite state

          unsubCoupleLink = onSnapshot(doc(db, 'couples', coupleId), (coupleLinkDoc) => {
            if (!coupleLinkDoc.exists()) {
              console.log("Couple link not found, resetting state.");
              reset();
              return;
            }

            const data = coupleLinkDoc.data() as Omit<CoupleLink, 'id'>;
            setStatus('linked');
            setCoupleLink({ id: coupleId, ...data });

            const partnerId = data.members.find((id) => id !== user.uid);

            if (partnerId) {
              unsubPartner?.(); // Clean up previous partner listener
              unsubPartner = onSnapshot(doc(db, 'users', partnerId), (partnerDoc) => {
                if (partnerDoc.exists()) {
                  setPartner(partnerDoc.data() as AppUser);
                } else {
                  setPartner(null);
                }
                setLoading(false);
              });
            } else {
              reset();
              setLoading(false);
            }
          });

          return; // ⛔ Impede execução da parte de convites
        }

        // ------------ 🧍‍♂️ SE AINDA NÃO TEM PARCEIRO ------------
        setPartner(null);
        setCoupleLink(null);

        // Cancel previous invite listeners
        unsubSentInvites?.();
        unsubReceivedInvites?.();

        let hasPendingInvite = false;

        // 🔥 LISTENER 1 — CONVITES ENVIADOS PELO USER
        const sentInvitesQuery = query(
          collection(db, 'invites'),
          where('sentBy', '==', user.uid),
          where('status', '==', 'pending'),
          limit(1)
        );

        unsubSentInvites = onSnapshot(sentInvitesQuery, (snapshot) => {
          if (!snapshot.empty) {
            hasPendingInvite = true;
            const inviteData = snapshot.docs[0].data();
            setInvite(inviteData);
            setStatus('pending_sent');
          } else if (useCoupleStore.getState().status === 'pending_sent') {
             if (!hasPendingInvite) {
                setStatus('single');
                setInvite(null);
            }
          }
          setLoading(false);
        });

        // 🔥 LISTENER 2 — CONVITES RECEBIDOS PELO USER
        const receivedInvitesQuery = query(
          collection(db, 'invites'),
          where('sentTo', '==', user.uid),
          where('status', '==', 'pending'),
          limit(1)
        );

        unsubReceivedInvites = onSnapshot(receivedInvitesQuery, (snapshot) => {
          if (!snapshot.empty) {
            hasPendingInvite = true;
            const inviteData = snapshot.docs[0].data();
            setInvite(inviteData);
            setStatus('pending_received');
          } else if (useCoupleStore.getState().status === 'pending_received') {
             if (!hasPendingInvite) {
                setStatus('single');
                setInvite(null);
            }
          }
          setLoading(false);
        });
      }
    );
  });
}
