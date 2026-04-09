import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Family, DEFAULT_PERMISSIONS, UserRole } from '@/types';
import { generateInviteCode } from '@/lib/utils';

export async function createFamily(
  userId: string,
  name: string
): Promise<string> {
  const familyRef = doc(collection(db, 'families'));
  const inviteCode = generateInviteCode();

  const family: Omit<Family, 'id'> = {
    name,
    inviteCode,
    ownerId: userId,
    members: [userId],
    settings: {
      theme: 'auto',
      language: 'de',
    },
    createdAt: serverTimestamp() as any,
  };

  await setDoc(familyRef, family);

  await updateDoc(doc(db, 'users', userId), {
    familyId: familyRef.id,
    role: 'owner',
    permissions: DEFAULT_PERMISSIONS.owner,
  });

  return familyRef.id;
}

export async function joinFamily(
  userId: string,
  inviteCode: string
): Promise<string> {
  const familiesRef = collection(db, 'families');
  const q = query(familiesRef, where('inviteCode', '==', inviteCode.toUpperCase()));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Ungültiger Einladungscode');
  }

  const familyDoc = snap.docs[0];
  const familyId = familyDoc.id;

  await updateDoc(doc(db, 'families', familyId), {
    members: arrayUnion(userId),
  });

  await updateDoc(doc(db, 'users', userId), {
    familyId,
    role: 'adult',
    permissions: DEFAULT_PERMISSIONS.adult,
  });

  return familyId;
}

export async function regenerateInviteCode(familyId: string): Promise<string> {
  const newCode = generateInviteCode();
  await updateDoc(doc(db, 'families', familyId), { inviteCode: newCode });
  return newCode;
}

export async function updateFamilySettings(
  familyId: string,
  settings: Partial<Family['settings']>
) {
  const ref = doc(db, 'families', familyId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Familie nicht gefunden');

  const current = snap.data() as Family;
  await updateDoc(ref, {
    settings: { ...current.settings, ...settings },
  });
}

export async function updateUserRole(userId: string, role: UserRole) {
  await updateDoc(doc(db, 'users', userId), {
    role,
    permissions: DEFAULT_PERMISSIONS[role],
  });
}

export async function removeFamilyMember(familyId: string, userId: string) {
  await updateDoc(doc(db, 'families', familyId), {
    members: arrayRemove(userId),
  });
  await updateDoc(doc(db, 'users', userId), {
    familyId: null,
    role: 'owner',
  });
}

export async function getFamilyMembers(memberIds: string[]) {
  const members = await Promise.all(
    memberIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'users', id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    })
  );
  return members.filter(Boolean);
}
