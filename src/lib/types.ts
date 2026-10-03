export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  base64Data: string; // Base64 encoded payload
  previewUrl?: string;
}

export interface Draft {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sendCopyToSelf: boolean;
  attachmentCount: number;
  attachmentSummary: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRecord {
  id: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  fileCount: number;
  totalSizeBytes: number;
  fileNames: string;
  sendCopyToSelf: boolean;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  scopes: string;
  status: 'active' | 'revoked';
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
