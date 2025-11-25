'use client';

import { create } from 'zustand';
import { onSnapshot, doc, query, collection, where, limit } from 'firebase/firestore';
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

  const cleanup = () => {
    unsubUser?.();
    unsubSentInvites?.();
    unsubReceivedInvites?.();
    unsubPartner?.();
    unsubCoupleLink?.();
    useCoupleStore.getState().reset();
  };

  auth.onAuthStateChanged(async (user) => {
    cleanup();

    if (!user) {
      return;
    }

    const { setLoading, setStatus, setPartner, setInvite, setCoupleLink, reset } = useCoupleStore.getState();

    setLoading(true);

    unsubUser = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, async (userDoc) => {
      if (!userDoc.exists()) {
        console.log("User document not found, resetting state.");
        reset();
        return;
      }
      
      const userData = userDoc.data();
      const coupleId = userData.coupleId;

      unsubCoupleLink?.();
      unsubPartner?.();

      if (coupleId) {
        setInvite(null); // Clear any old invite state
        
        unsubCoupleLink = onSnapshot(doc(db, 'couples', coupleId), (coupleDoc) => {
          if (!coupleDoc.exists()) {
            console.log("Couple link document not found for coupleId:", coupleId);
            reset();
            return;
          }
          const coupleData = coupleDoc.data() as Omit<CoupleLink, 'id'>;
          setCoupleLink({ id: coupleId, ...coupleData });
          setStatus('linked');
          
          const partnerId = coupleData.members.find(id => id !== user.uid);
          
          if (partnerId) {
            unsubPartner?.();
            unsubPartner = onSnapshot(doc(db, 'users', partnerId), (partnerDoc) => {
              if (partnerDoc.exists()) {
                setPartner(partnerDoc.data() as AppUser);
              } else {
                setPartner(null);
              }
              setLoading(false);
            });
          } else {
             setLoading(false);
          }
        });
      } else {
        // No coupleId, handle invites
        reset(); // Reset partner and couple link first

        let hasPendingInvite = false;

        const sentInvitesQuery = query(collection(db, 'invites'), where('sentBy', '==', user.uid), where('status', '==', 'pending'), limit(1));
        unsubSentInvites = onSnapshot(sentInvitesQuery, (snapshot) => {
          if (!snapshot.empty) {
            hasPendingInvite = true;
            setStatus('pending_sent');
            setInvite(snapshot.docs[0].data());
          } else if (useCoupleStore.getState().status === 'pending_sent') {
            if (!hasPendingInvite) {
               setInvite(null);
               setStatus('single');
            }
          }
           setLoading(false);
        });

        const receivedInvitesQuery = query(collection(db, 'invites'), where('sentTo', '==', user.uid), where('status', '==', 'pending'), limit(1));
        unsubReceivedInvites = onSnapshot(receivedInvitesQuery, (snapshot) => {
          if (!snapshot.empty) {
            hasPendingInvite = true;
            setStatus('pending_received');
            setInvite(snapshot.docs[0].data());
          } else if (useCoupleStore.getState().status === 'pending_received') {
             if (!hasPendingInvite) {
               setInvite(null);
               setStatus('single');
            }
          }
           setLoading(false);
        });
      }
    });
  });
}