'use client';

import { create } from 'zustand';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Partner, CoupleLink } from '@/lib/types';
import { getAuth } from 'firebase/auth';

export type CoupleStatus = "single" | "pending_sent" | "pending_received" | "linked";

interface CoupleState {
  partner: Partner | null;
  status: CoupleStatus;
  invite: { inviteId?: string; sentBy?: string, sentTo?: string, sentByName?: string; sentByEmail?: string } | null,
  coupleLink: CoupleLink | null;
  loading: boolean;
  setPartner: (partner: Partner | null) => void;
  setStatus: (status: CoupleStatus) => void;
  setInvite: (invite: { inviteId?: string; sentBy?: string, sentTo?: string, sentByName?: string; sentByEmail?: string } | null) => void;
  setCoupleLink: (coupleLink: CoupleLink | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
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
  reset: () => set({ partner: null, status: 'single', loading: false, invite: null, coupleLink: null }),
}));

let unsubPartner: (() => void) | null = null;
let unsubInvite: (() => void) | null = null;
let unsubCoupleLink: (() => void) | null = null;


export function initializeCoupleStore() {
    const auth = getAuth();
    
    auth.onAuthStateChanged(user => {
        if (user) {
            const { setLoading, setStatus, setPartner, setInvite, setCoupleLink, reset } = useCoupleStore.getState();
            setLoading(true);

            // Cancel previous listeners
            unsubPartner?.();
            unsubInvite?.();
            unsubCoupleLink?.();

            // Listen to partner document
            unsubPartner = onSnapshot(doc(db, 'users', user.uid, 'couple', 'partner'), (docSnap) => {
                if (docSnap.exists()) {
                    const partnerData = docSnap.data() as Partner;
                    const coupleId = docSnap.data().coupleId;
                    setPartner(partnerData);
                    setStatus('linked');
                    setInvite(null);

                    // If partner is linked, listen to the global coupleLinks document
                    if (coupleId) {
                       unsubCoupleLink = onSnapshot(doc(db, 'coupleLinks', coupleId), (coupleDoc) => {
                            if (coupleDoc.exists()) {
                                setCoupleLink({ id: coupleDoc.id, ...coupleDoc.data() } as CoupleLink);
                            }
                       });
                    }
                } else {
                    // No partner, check for invites
                    setPartner(null);
                    setCoupleLink(null);
                    unsubInvite = onSnapshot(doc(db, 'users', user.uid, 'couple', 'invite'), (inviteSnap) => {
                        if (inviteSnap.exists()) {
                            const inviteData = inviteSnap.data();
                            setInvite({ 
                                inviteId: inviteData.inviteId,
                                sentBy: inviteData.sentBy,
                                sentTo: inviteData.sentTo,
                                sentByName: inviteData.sentByName,
                                sentByEmail: inviteData.sentByEmail,
                            });
                            setStatus(inviteData.sentBy === user.uid ? 'pending_sent' : 'pending_received');
                        } else {
                            setInvite(null);
                            setStatus('single');
                        }
                    });
                }
                 setLoading(false);
            }, (error) => {
                console.error("Error listening to partner document:", error);
                setLoading(false);
            });

        } else {
            // User logged out, reset state and listeners
            unsubPartner?.();
            unsubInvite?.();
            unsubCoupleLink?.();
            useCoupleStore.getState().reset();
        }
    });
}
