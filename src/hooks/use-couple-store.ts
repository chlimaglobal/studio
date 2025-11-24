
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
  invite: { inviteId?: string; sentBy?: string, sentTo?: string, sentByName?: string; sentByEmail?: string } | null,
  coupleLink: CoupleLink | null;
  loading: boolean;
  setPartner: (partner: AppUser | null) => void;
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

let unsubUser: (() => void) | null = null;
let unsubSentInvites: (() => void) | null = null;
let unsubReceivedInvites: (() => void) | null = null;
let unsubPartner: (() => void) | null = null;


export function initializeCoupleStore() {
    const auth = getAuth();
    
    auth.onAuthStateChanged(user => {
        // Clear all previous listeners on auth state change
        unsubUser?.();
        unsubSentInvites?.();
        unsubReceivedInvites?.();
        unsubPartner?.();

        if (user) {
            const { setLoading, setStatus, setPartner, setInvite, setCoupleLink, reset } = useCoupleStore.getState();
            setLoading(true);

            // Listen to the user's own document for coupleId changes
            unsubUser = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, async (userDoc) => {
                if (!userDoc.exists()) {
                    reset();
                    return;
                }
                
                const userData = userDoc.data();
                const coupleId = userData.coupleId;

                unsubPartner?.(); // Cancel any existing partner listener

                if (coupleId) {
                    setInvite(null); // No pending invites if linked
                    
                    const coupleLinkDoc = await getDoc(doc(db, 'coupleLinks', coupleId));
                    if(coupleLinkDoc.exists()) {
                        setStatus('linked');
                        const coupleLinkData = coupleLinkDoc.data() as Omit<CoupleLink, 'id'>;
                        setCoupleLink({ id: coupleId, ...coupleLinkData });
                        const partnerId = coupleLinkData.userA === user.uid ? coupleLinkData.userB : coupleLinkData.userA;
                        
                        unsubPartner = onSnapshot(doc(db, 'users', partnerId), (partnerDoc) => {
                            if (partnerDoc.exists()) {
                                setPartner(partnerDoc.data() as AppUser);
                            } else {
                                setPartner(null);
                            }
                            setLoading(false);
                        });
                    } else {
                        // Data inconsistency, treat as single for now
                        reset();
                    }

                } else {
                    // Not linked, check for invites
                    setPartner(null);
                    setCoupleLink(null);

                    // Listen for invites SENT BY the user
                    const sentInvitesQuery = query(collection(db, 'invites'), where('sentBy', '==', user.uid), where('status', '==', 'pending'), limit(1));
                    unsubSentInvites = onSnapshot(sentInvitesQuery, { includeMetadataChanges: true }, (snapshot) => {
                        if (!snapshot.empty) {
                            setInvite(snapshot.docs[0].data());
                            setStatus('pending_sent');
                        } else if (get().status === 'pending_sent') {
                            setStatus('single');
                            setInvite(null);
                        }
                        setLoading(false);
                    });

                    // Listen for invites SENT TO the user
                    const receivedInvitesQuery = query(collection(db, 'invites'), where('sentTo', '==', user.uid), where('status', '==', 'pending'), limit(1));
                    unsubReceivedInvites = onSnapshot(receivedInvitesQuery, { includeMetadataChanges: true }, (snapshot) => {
                         if (!snapshot.empty) {
                            setInvite(snapshot.docs[0].data());
                            setStatus('pending_received');
                        } else if (get().status === 'pending_received') {
                            setStatus('single');
                            setInvite(null);
                        }
                        setLoading(false);
                    });
                }
            });
        } else {
            // User logged out
            useCoupleStore.getState().reset();
        }
    });
}
