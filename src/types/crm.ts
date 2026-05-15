export type ClientStage = 'new_lead' | 'contacted' | 'qualified' | 'customer' | 'vip' | 'inactive';

export type ClientSource = 'site' | 'google' | 'session' | 'admin-manual' | 'import-users';

export interface Client {
  id: string;
  uid?: string;
  name: string;
  email?: string;
  normalizedEmail?: string;
  phone?: string;
  company?: string;
  source?: string;
  stage: ClientStage;
  tags?: string[];
  ownerId?: string;
  preferredCategories?: string[];
  preferredSizes?: string[];
  lastContactAt?: Date;
  nextFollowUpAt?: Date;
  lastActivityAt?: Date;
  totalOrders: number;
  totalSpent: number;
  notesCount: number;
  photoURL?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ActivityType = 
  | 'created'
  | 'imported'
  | 'stage_changed'
  | 'note_added'
  | 'task_created'
  | 'task_completed'
  | 'profile_updated';

export interface ClientActivity {
  id: string;
  clientId: string;
  type: ActivityType;
  title: string;
  body?: string;
  createdAt: Date;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface ClientTask {
  id: string;
  clientId: string;
  title: string;
  status: TaskStatus;
  dueAt?: Date;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ClientTag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
}

export const STAGE_OPTIONS: ClientStage[] = ['new_lead', 'contacted', 'qualified', 'customer', 'vip', 'inactive'];

export const SOURCE_OPTIONS: ClientSource[] = ['site', 'google', 'session', 'admin-manual', 'import-users'];

export const STAGE_LABELS: Record<ClientStage, string> = {
  new_lead: 'Nuovo Lead',
  contacted: 'Contattato',
  qualified: 'Qualificato',
  customer: 'Cliente',
  vip: 'VIP',
  inactive: 'Inattivo',
};

export function getStageFromStatus(status: string): ClientStage {
  if (status === 'lead') return 'new_lead';
  if (status === 'active') return 'customer';
  return status as ClientStage;
}

export function getStatusFromStage(stage: ClientStage): string {
  if (stage === 'new_lead') return 'lead';
  if (stage === 'customer') return 'active';
  return stage;
}
