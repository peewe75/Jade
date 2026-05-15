import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  query, 
  orderBy, 
  where,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Client, ClientActivity, ClientTask, ClientTag, ActivityType, TaskStatus, ClientStage } from '../types/crm';

export function normalizeClientEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export async function createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'totalOrders' | 'totalSpent' | 'notesCount'>): Promise<string> {
  const normalizedEmail = normalizeClientEmail(clientData.email);
  const docRef = await addDoc(collection(db, 'clients'), {
    ...clientData,
    email: normalizedEmail || clientData.email || null,
    normalizedEmail,
    totalOrders: 0,
    totalSpent: 0,
    notesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  const normalizedEmail = Object.prototype.hasOwnProperty.call(data, 'email')
    ? normalizeClientEmail(data.email)
    : undefined;
  await updateDoc(doc(db, 'clients', clientId), {
    ...data,
    ...(normalizedEmail !== undefined ? { normalizedEmail } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function createActivity(
  clientId: string, 
  type: ActivityType, 
  title: string, 
  createdBy: string, 
  body?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'clientActivities'), {
    clientId,
    type,
    title,
    body: body || null,
    createdAt: serverTimestamp(),
    createdBy,
    metadata: metadata || null,
  });
  const client = await getClient(clientId);
  await updateDoc(doc(db, 'clients', clientId), {
    lastActivityAt: serverTimestamp(),
    notesCount: type === 'note_added' ? (client?.notesCount || 0) + 1 : client?.notesCount || 0,
  });
  return docRef.id;
}

export async function getClient(clientId: string): Promise<Client | null> {
  const docSnap = await getDoc(doc(db, 'clients', clientId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Client;
}

export async function getClientActivities(clientId: string): Promise<ClientActivity[]> {
  const q = query(
    collection(db, 'clientActivities'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      clientId: data.clientId,
      type: data.type,
      title: data.title,
      body: data.body || undefined,
      createdAt: convertTimestamp(data.createdAt) || new Date(),
      createdBy: data.createdBy,
      metadata: data.metadata || undefined,
    } as ClientActivity;
  });
}

export async function getClientTasks(clientId: string): Promise<ClientTask[]> {
  const q = query(
    collection(db, 'clientTasks'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      clientId: data.clientId,
      title: data.title,
      status: data.status as TaskStatus,
      dueAt: convertTimestamp(data.dueAt),
      assignedTo: data.assignedTo || undefined,
      createdAt: convertTimestamp(data.createdAt) || new Date(),
      updatedAt: convertTimestamp(data.updatedAt) || new Date(),
      completedAt: convertTimestamp(data.completedAt),
    } as ClientTask;
  });
}

export async function createTask(
  clientId: string,
  title: string,
  assignedTo?: string,
  dueAt?: Date
): Promise<string> {
  const docRef = await addDoc(collection(db, 'clientTasks'), {
    clientId,
    title,
    status: 'pending',
    assignedTo: assignedTo || null,
    dueAt: dueAt ? Timestamp.fromDate(dueAt) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  });
  return docRef.id;
}

export async function updateTask(taskId: string, data: Partial<ClientTask>): Promise<void> {
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  if (data.status === 'completed') {
    updateData.completedAt = serverTimestamp();
  }
  await updateDoc(doc(db, 'clientTasks', taskId), updateData);
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'clientTasks', taskId));
}

export async function getAllTags(): Promise<ClientTag[]> {
  const snapshot = await getDocs(query(collection(db, 'clientTags'), orderBy('name')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClientTag));
}

export async function createTag(name: string, color?: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'clientTags'), {
    name,
    color: color || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteTag(tagId: string): Promise<void> {
  await deleteDoc(doc(db, 'clientTags', tagId));
}

export async function changeClientStage(
  clientId: string, 
  newStage: ClientStage, 
  adminUserId: string
): Promise<void> {
  const client = await getClient(clientId);
  if (!client) return;
  
  await updateDoc(doc(db, 'clients', clientId), {
    stage: newStage,
    updatedAt: serverTimestamp(),
  });
  
  await createActivity(
    clientId,
    'stage_changed',
    `Stage cambiato da ${client.stage} a ${newStage}`,
    adminUserId,
    undefined,
    { oldStage: client.stage, newStage }
  );
}

export async function importUsersToClients(
  adminUserId: string,
  onProgress?: (count: number) => void
): Promise<number> {
  const [usersSnapshot, clientsSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'clients')),
  ]);

  const existingUids = new Set<string>();
  const existingEmails = new Map<string, string>();
  clientsSnapshot.docs.forEach((clientDoc) => {
    const data = clientDoc.data();
    if (data.uid) existingUids.add(data.uid);
    const normalizedEmail = normalizeClientEmail(data.normalizedEmail || data.email);
    if (normalizedEmail) existingEmails.set(normalizedEmail, clientDoc.id);
  });

  let imported = 0;
  for (const userDoc of usersSnapshot.docs) {
    if (existingUids.has(userDoc.id)) continue;
    
    const userData = userDoc.data();
    const emailValue = userData.email;
    const normalizedEmail = normalizeClientEmail(emailValue);
    const fallbackName = emailValue ? emailValue.split('@')[0] : 'Cliente';

    if (normalizedEmail && existingEmails.has(normalizedEmail)) {
      const existingClientId = existingEmails.get(normalizedEmail)!;
      await setDoc(doc(db, 'clients', existingClientId), {
        uid: userDoc.id,
        email: normalizedEmail,
        normalizedEmail,
        photoURL: userData.photoURL || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      existingUids.add(userDoc.id);
      continue;
    }
    
    await setDoc(doc(db, 'clients', userDoc.id), {
      uid: userDoc.id,
      name: fallbackName,
      email: normalizedEmail || null,
      normalizedEmail,
      photoURL: userData.photoURL || null,
      source: 'import-users',
      stage: 'new_lead',
      totalOrders: 0,
      totalSpent: 0,
      notesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await createActivity(userDoc.id, 'imported', 'Importato da utenti', adminUserId);
    if (normalizedEmail) existingEmails.set(normalizedEmail, userDoc.id);
    imported++;
    onProgress?.(imported);
  }
  
  return imported;
}

export function convertTimestamp(ts: unknown): Date | undefined {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  if (ts instanceof Timestamp) return ts.toDate();
  if (typeof ts === 'number') return new Date(ts);
  return undefined;
}

export interface UserRecord {
  id: string;
  uid: string;
  email: string;
  role: string;
  createdAt?: Date;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'users'), orderBy('email')));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as UserRecord));
}

export async function getAdminUsers(): Promise<UserRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), orderBy('email')));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as UserRecord));
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const docSnap = await getDoc(doc(db, 'users', userId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as UserRecord;
}

export async function updateClientOwner(clientId: string, ownerId: string | null, adminUserId: string): Promise<void> {
  const client = await getClient(clientId);
  if (!client) return;
  
  await updateDoc(doc(db, 'clients', clientId), {
    ownerId: ownerId,
    updatedAt: serverTimestamp(),
  });
  
  await createActivity(
    clientId,
    'profile_updated',
    ownerId ? `Assegnato a owner` : 'Rimosso owner',
    adminUserId,
    undefined,
    { field: 'ownerId', oldValue: client.ownerId, newValue: ownerId }
  );
}

export async function updateClientTags(clientId: string, tags: string[], adminUserId: string): Promise<void> {
  const client = await getClient(clientId);
  if (!client) return;
  
  await updateDoc(doc(db, 'clients', clientId), {
    tags: tags,
    updatedAt: serverTimestamp(),
  });
  
  await createActivity(
    clientId,
    'profile_updated',
    `Tag aggiornati`,
    adminUserId,
    undefined,
    { field: 'tags', oldValue: client.tags, newValue: tags }
  );
}

export async function updateTaskAssignee(taskId: string, assignedTo: string | null): Promise<void> {
  await updateDoc(doc(db, 'clientTasks', taskId), {
    assignedTo: assignedTo,
    updatedAt: serverTimestamp(),
  });
}

export function getTodayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function getTodayEnd(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

export function isOverdue(client: Client): boolean {
  if (client.stage === 'inactive') return false;
  if (!client.nextFollowUpAt) return false;
  return client.nextFollowUpAt < getTodayStart();
}

export function isDueToday(client: Client): boolean {
  if (!client.nextFollowUpAt) return false;
  const today = getTodayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return client.nextFollowUpAt >= today && client.nextFollowUpAt < tomorrow;
}
