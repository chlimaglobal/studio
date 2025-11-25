'use client';

import { create } from 'zustand';
import { onSnapshot, doc, collection, query, where, getDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, CoupleLink } from '@/lib/types';
import { getAuth, User } from 'firebase/auth';

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
  isLoading: boolean;
  setPartner: (partner: AppUser | null) => void;
  setStatus: (status: CoupleStatus) => void;
  setInvite: (invite: any | null) => void;
  setCoupleLink: (coupleLink: CoupleLink | null) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCoupleStore = create<CoupleState>((set) => ({
  partner: null,
  status: 'single',
  invite: null,
  coupleLink: null,
  isLoading: true,
  setPartner: (partner) => set({ partner }),
  setStatus: (status) => set({ status }),
  setInvite: (invite) => set({ invite }),
  setCoupleLink: (coupleLink) => set({ coupleLink }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      partner: null,
      status: 'single',
      isLoading: false,
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


export function initializeCoupleStore(user: User) {
  cleanup();
  
  const {
    setIsLoading,
    setStatus,
    setPartner,
    setInvite,
    setCoupleLink,
    reset,
  } = useCoupleStore.getState();

  if (!user) {
    reset();
    return;
  }

  setIsLoading(true);

  const userDocRef = doc(db, 'users', user.uid);
  
  unsubUser = onSnapshot(
    userDocRef,
    async (userDoc) => {
      if (!userDoc.exists()) {
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
            setIsLoading(false);
          }, (error) => {
              if (error.code === 'permission-denied') {
                  console.warn("Permission denied fetching partner data. This may be temporary.");
              } else {
                  console.error("Partner listener error:", error);
              }
          });
        } else {
          reset();
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
          setIsLoading(false);
        } else if (!hasReceivedInvite) {
          setStatus('single');
          setInvite(null);
          setIsLoading(false);
        }
      });

      const receivedInvitesQuery = query(collection(db, 'invites'), where('sentTo', '==', user.uid), where('status', '==', 'pending'), limit(1));
      unsubReceivedInvites = onSnapshot(receivedInvitesQuery, (snapshot) => {
        hasReceivedInvite = !snapshot.empty;
        if (hasReceivedInvite) {
          setInvite(snapshot.docs[0].data());
          setStatus('pending_received');
          setIsLoading(false);
        } else if (!hasSentInvite) {
          setStatus('single');
          setInvite(null);
          setIsLoading(false);
        }
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
}
