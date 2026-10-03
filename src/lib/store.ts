import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { Contact, Draft, TransferRecord, ApiKeyRecord } from './types.ts';

// -------------------------------------------------------------
// CONTACTS / ADDRESS BOOK
// -------------------------------------------------------------
export async function getContacts(userId: string): Promise<Contact[]> {
  const collectionPath = 'contacts';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contact));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export function subscribeContacts(userId: string, onUpdate: (contacts: Contact[]) => void, onError?: (err: unknown) => void) {
  const collectionPath = 'contacts';
  const q = query(collection(db, collectionPath), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const contacts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contact));
      onUpdate(contacts);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
}

export async function saveContact(contact: Contact): Promise<void> {
  const path = `contacts/${contact.id}`;
  try {
    await setDoc(doc(db, 'contacts', contact.id), contact);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeContact(contactId: string): Promise<void> {
  const path = `contacts/${contactId}`;
  try {
    await deleteDoc(doc(db, 'contacts', contactId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// DRAFTS
// -------------------------------------------------------------
export async function getDrafts(userId: string): Promise<Draft[]> {
  const collectionPath = 'drafts';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Draft));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export function subscribeDrafts(userId: string, onUpdate: (drafts: Draft[]) => void, onError?: (err: unknown) => void) {
  const collectionPath = 'drafts';
  const q = query(collection(db, collectionPath), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const drafts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Draft));
      onUpdate(drafts);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
}

export async function saveDraft(draft: Draft): Promise<void> {
  const path = `drafts/${draft.id}`;
  try {
    await setDoc(doc(db, 'drafts', draft.id), draft);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeDraft(draftId: string): Promise<void> {
  const path = `drafts/${draftId}`;
  try {
    await deleteDoc(doc(db, 'drafts', draftId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// TRANSFERS & SCHEDULED QUEUE
// -------------------------------------------------------------
export async function getTransfers(userId: string): Promise<TransferRecord[]> {
  const collectionPath = 'transfers';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransferRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export function subscribeTransfers(userId: string, onUpdate: (transfers: TransferRecord[]) => void, onError?: (err: unknown) => void) {
  const collectionPath = 'transfers';
  const q = query(collection(db, collectionPath), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransferRecord));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
}

export async function saveTransfer(transfer: TransferRecord): Promise<void> {
  const path = `transfers/${transfer.id}`;
  try {
    await setDoc(doc(db, 'transfers', transfer.id), transfer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransferStatus(transferId: string, status: 'scheduled' | 'sent' | 'failed' | 'cancelled', sentAt?: string): Promise<void> {
  const path = `transfers/${transferId}`;
  try {
    const updatePayload: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (sentAt) updatePayload.sentAt = sentAt;
    await updateDoc(doc(db, 'transfers', transferId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeTransfer(transferId: string): Promise<void> {
  const path = `transfers/${transferId}`;
  try {
    await deleteDoc(doc(db, 'transfers', transferId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// API KEYS & INTEGRATIONS
// -------------------------------------------------------------
export async function getApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const collectionPath = 'api_keys';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiKeyRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export function subscribeApiKeys(userId: string, onUpdate: (keys: ApiKeyRecord[]) => void, onError?: (err: unknown) => void) {
  const collectionPath = 'api_keys';
  const q = query(collection(db, collectionPath), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const keys = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiKeyRecord));
      onUpdate(keys);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
}

export async function saveApiKey(apiKeyRecord: ApiKeyRecord): Promise<void> {
  const path = `api_keys/${apiKeyRecord.id}`;
  try {
    await setDoc(doc(db, 'api_keys', apiKeyRecord.id), apiKeyRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const path = `api_keys/${keyId}`;
  try {
    await updateDoc(doc(db, 'api_keys', keyId), {
      status: 'revoked',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteApiKey(keyId: string): Promise<void> {
  const path = `api_keys/${keyId}`;
  try {
    await deleteDoc(doc(db, 'api_keys', keyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
