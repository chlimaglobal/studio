
'use client';

import { create } from 'zustand';
import { onSnapshot, doc, collection, query, where, getDoc, limit } from 'firebase/firestore';
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

function cleanup() {
    unsubUser?.();
    unsubSentInvites?.();
    unsubReceivedInvites?.();
    unsubPartner?.();
    unsubUser = null;
    unsubSentInvites = null;
    unsubReceivedInvites = null;
    unsubPartner = null;
};


export function initializeCoupleStore() {
  const auth = getAuth();

  auth.onAuthStateChanged(async (user) => {
    cleanup();

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

    const userDocRef = doc(db, 'users', user.uid);
    
    // Initial check for doc existence
    const initialDocSnap = await getDoc(userDocRef);
    if (!initialDocSnap.exists()) {
      console.warn("User document doesn't exist yet, listener will wait.");
      // We still set up the listener, which will fire once the doc is created.
    }

    unsubUser = onSnapshot(
      userDocRef,
      async (userDoc) => {
        if (!userDoc.exists()) {
          console.log("User document not found, resetting state.");
          reset();
          return;
        }

        const userData = userDoc.data() || {};
        const coupleId = userData.coupleId;

        unsubPartner?.();

        if (coupleId) {
          setInvite(null);
          const coupleLinkDoc = await getDoc(doc(db, 'couples', coupleId));
          if (!coupleLinkDoc.exists()) {
            reset();
            return;
          }
          const data = coupleLinkDoc.data() as Omit<CoupleLink, 'id'>;
          setStatus('linked');
          setCoupleLink({ id: coupleId, ...data });
          const partnerId = data.members.find((id) => id !== user.uid);
          if (partnerId) {
            unsubPartner = onSnapshot(doc(db, 'users', partnerId), (partnerDoc) => {
              if (partnerDoc.exists()) {
                setPartner(partnerDoc.data() as AppUser);
              } else {
                setPartner(null);
              }
              setLoading(false);
            }, (error) => {
                if (error.code === 'permission-denied') {
                    console.warn("Permission denied fetching partner data. This may be temporary.");
                } else {
                    console.error("Partner listener error:", error);
                }
            });
          } else {
            reset();
            setLoading(false);
          }
          return;
        }

        setPartner(null);
        setCoupleLink(null);

        unsubSentInvites?.();
        unsubReceivedInvites?.();
        
        let hasSentInvite = false;
        let hasReceivedInvite = false;

        const sentInvitesQuery = query(collection(db, 'invites'), where('sentBy', '==', user.uid), where('status', '==', 'pending'), limit(1));
        unsubSentInvites = onSnapshot(sentInvitesQuery, (snapshot) => {
          hasSentInvite = !snapshot.empty;
          if (hasSentInvite) {
            setInvite(snapshot.docs[0].data());
            setStatus('pending_sent');
          } else if (!hasReceivedInvite) {
            setStatus('single');
            setInvite(null);
          }
          setLoading(false);
        });

        const receivedInvitesQuery = query(collection(db, 'invites'), where('sentTo', '==', user.uid), where('status', '==', 'pending'), limit(1));
        unsubReceivedInvites = onSnapshot(receivedInvitesQuery, (snapshot) => {
          hasReceivedInvite = !snapshot.empty;
          if (hasReceivedInvite) {
            setInvite(snapshot.docs[0].data());
            setStatus('pending_received');
          } else if (!hasSentInvite) {
            setStatus('single');
            setInvite(null);
          }
          setLoading(false);
        });
      },
      (error) => {
        if (error.code === 'permission-denied') {
            console.warn('Permission denied to user document. This is unexpected but handled.');
        } else {
            console.error("Error on user snapshot listener:", error);
        }
        reset();
      }
    );
  });
}
