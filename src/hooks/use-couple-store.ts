'use client';

import { create } from 'zustand';
import { onSnapshot, doc, collection, query, where, getDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, CoupleLink } from '@/types';
import { getAuth, User } from 'firebase/auth';

// Types
export type CoupleStatus = "single" | "pending_sent" | "pending_received" | "linked";

interface CoupleState {
  partner: AppUser | null;
  status: CoupleStatus;
  invite: {
    id?: string;
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

function cleanup() {
  try {
    unsubUser?.();
    unsubSentInvites?.();
    unsubReceivedInvites?.();
  } catch (e) {
    // ignore
  } finally {
    unsubUser = null;
    unsubSentInvites = null;
    unsubReceivedInvites = null;
  }
}

/**
 * initializeCoupleStore(user)
 * - user: firebase auth User
 * Behaviour:
 *  - listens user doc
 *  - only after coupleId exists, fetches couple doc and then fetches partner via single getDoc (not continuous listener)
 *  - uses two independent listeners for invites (sent / received)
 *  - avoids creating listeners before permissions are in place
 */
export function initializeCoupleStore(user: User | null) {
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

  // Listen to user's own document changes (coupleId will be observed here)
  unsubUser = onSnapshot(
    userDocRef,
    async (userDoc) => {
      try {
        if (!userDoc.exists()) {
          reset();
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data() || {};
        const coupleId: string | undefined = userData.coupleId;

        // If linked to a couple
        if (coupleId) {
          // clear pending invites state
          setInvite(null);
          // Cancel invite listeners (we are linked)
          unsubSentInvites?.();
          unsubReceivedInvites?.();

          // Get couples doc once
          const coupleDocRef = doc(db, 'couples', coupleId);
          const coupleSnap = await getDoc(coupleDocRef);

          if (!coupleSnap.exists()) {
            // data inconsistency: treat as single
            setCoupleLink(null);
            setStatus('single');
            setPartner(null);
            setIsLoading(false);
            return;
          }

          const coupleData = coupleSnap.data() as Omit<CoupleLink, 'id'>;
          setCoupleLink({ id: coupleId, ...coupleData });
          setStatus('linked');

          // Determine partnerId
          const partnerId = Array.isArray(coupleData.members)
            ? coupleData.members.find((id: string) => id !== user.uid)
            : undefined;

          if (partnerId) {
            try {
              // Fetch partner data once - uses getDoc to avoid permission race on snapshot listeners
              const partnerDocSnap = await getDoc(doc(db, 'users', partnerId));
              if (partnerDocSnap.exists()) {
                setPartner(partnerDocSnap.data() as AppUser);
              } else {
                setPartner(null);
              }
            } catch (e) {
              console.error("Error fetching partner data:", e);
              setPartner(null);
            }
          } else {
            setPartner(null);
          }

          setIsLoading(false);
          return;
        }

        // Not linked: ensure partner and coupleLink cleared
        setPartner(null);
        setCoupleLink(null);

        // Ensure invite listeners are fresh
        unsubSentInvites?.();
        unsubReceivedInvites?.();

        // Flags to coordinate initial loading
        let sentDone = false;
        let receivedDone = false;
        let hasSentInvite = false;
        let hasReceivedInvite = false;

        // Listener: invites sent by user
        const sentInvitesQuery = query(
          collection(db, 'invites'),
          where('sentBy', '==', user.uid),
          where('status', '==', 'pending'),
          limit(1)
        );

        unsubSentInvites = onSnapshot(
          sentInvitesQuery,
          (snapshot) => {
            try {
              sentDone = true;
              hasSentInvite = !snapshot.empty;
              if (hasSentInvite) {
                const docSnap = snapshot.docs[0];
                setInvite({ id: docSnap.id, ...docSnap.data() });
                setStatus('pending_sent');
                setIsLoading(false);
              } else {
                // only mark single if other listener also finished and no invites found
                if (receivedDone && !hasReceivedInvite) {
                  setStatus('single');
                  setInvite(null);
                  setIsLoading(false);
                }
              }
            } catch (e) {
              console.error("Error in sentInvites listener:", e);
            }
          },
          (error) => {
            // Permission or other error — handle gracefully (do not block UI)
            console.warn('sentInvites listener error', error);
            sentDone = true;
            if (receivedDone && !hasReceivedInvite) {
              setStatus('single');
              setInvite(null);
              setIsLoading(false);
            }
          }
        );

        // Listener: invites received by user email
        if (user.email) {
          const receivedInvitesQuery = query(
            collection(db, 'invites'),
            where('sentToEmail', '==', user.email),
            where('status', '==', 'pending'),
            limit(1)
          );

          unsubReceivedInvites = onSnapshot(
            receivedInvitesQuery,
            (snapshot) => {
              try {
                receivedDone = true;
                hasReceivedInvite = !snapshot.empty;
                if (hasReceivedInvite) {
                  const docSnap = snapshot.docs[0];
                  setInvite({ id: docSnap.id, ...docSnap.data() });
                  setStatus('pending_received');
                  setIsLoading(false);
                } else {
                  if (sentDone && !hasSentInvite) {
                    setStatus('single');
                    setInvite(null);
                    setIsLoading(false);
                  }
                }
              } catch (e) {
                console.error("Error in receivedInvites listener:", e);
              }
            },
            (error) => {
              console.warn('receivedInvites listener error', error);
              receivedDone = true;
              if (sentDone && !hasSentInvite) {
                setStatus('single');
                setInvite(null);
                setIsLoading(false);
              }
            }
          );
        } else {
          // If no email, can't have received invites
          receivedDone = true;
          hasReceivedInvite = false;
          if (sentDone && !hasSentInvite) {
            setStatus('single');
            setInvite(null);
            setIsLoading(false);
          }
        }
        
      } catch (e) {
        console.error("Unexpected error in user snapshot:", e);
        // defensive reset so UI can continue
        reset();
        setIsLoading(false);
      }
    },
    (error) => {
      // Handle listener-level errors (permission denied, network, etc)
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied while listening to user document. Resetting couple state.');
      } else {
        console.error("Error on user snapshot listener:", error);
      }
      reset();
      setIsLoading(false);
    }
  );
}
