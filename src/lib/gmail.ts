import { FileAttachment } from './types.ts';

export interface SendEmailPayload {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments?: FileAttachment[];
}

/**
 * Base64URL encoder conforming to RFC 4648
 */
function base64UrlEncode(str: string): string {
  // Convert utf-8 string to binary string safely
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds RFC 2822 compliant MIME message string
 */
export function buildMimeMessage(payload: SendEmailPayload): string {
  const boundary = `====_NextPart_OmniMail_${Date.now()}_${Math.random().toString(36).substring(2, 9)}====`;
  const cleanSubject = payload.subject.trim() || 'Automated Transfer via OmniMail';
  
  const headers = [
    `From: <${payload.from}>`,
    `To: <${payload.to}>`,
    payload.cc ? `Cc: <${payload.cc}>` : null,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(cleanSubject)))}?=`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
  ].filter(Boolean) as string[];

  const attachments = payload.attachments || [];

  if (attachments.length === 0) {
    headers.push(`Content-Type: text/html; charset="UTF-8"`);
    headers.push(`Content-Transfer-Encoding: 8bit`);
    const formattedBody = payload.body.replace(/\n/g, '<br/>');
    return `${headers.join('\r\n')}\r\n\r\n${formattedBody}`;
  }

  // Multi-part with attachments
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  let mimeBody = headers.join('\r\n') + '\r\n\r\n';

  // Part 1: HTML body
  mimeBody += `--${boundary}\r\n`;
  mimeBody += `Content-Type: text/html; charset="UTF-8"\r\n`;
  mimeBody += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  
  const formattedHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="padding: 24px 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${escapeHtml(cleanSubject)}</h2>
        <p style="margin: 6px 0 0 0; color: #64748b; font-size: 13px;">Transferred securely via OmniMail from <strong>${escapeHtml(payload.from)}</strong></p>
      </div>
      <div style="padding: 10px 0; font-size: 15px; white-space: pre-wrap;">${escapeHtml(payload.body)}</div>
      
      ${attachments.length > 0 ? `
        <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
            Attached Files (${attachments.length})
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
            ${attachments.map(a => `<li><strong>${escapeHtml(a.name)}</strong> (${formatFileSize(a.size)})</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        Automated file &amp; document transfer powered by OmniMail • Verified Google OAuth 2.0
      </div>
    </div>
  `;

  mimeBody += `${formattedHtml}\r\n\r\n`;

  // Attached files parts
  for (const att of attachments) {
    mimeBody += `--${boundary}\r\n`;
    mimeBody += `Content-Type: ${att.type || 'application/octet-stream'}; name="${att.name}"\r\n`;
    mimeBody += `Content-Disposition: attachment; filename="${att.name}"\r\n`;
    mimeBody += `Content-Transfer-Encoding: base64\r\n\r\n`;
    
    // Ensure standard 76-char line wraps for standard base64 in MIME
    const base64Chunked = att.base64Data.replace(/(.{76})/g, '$1\r\n');
    mimeBody += `${base64Chunked}\r\n\r\n`;
  }

  mimeBody += `--${boundary}--\r\n`;
  return mimeBody;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sends an email using Gmail API users.messages.send
 */
export async function sendGmailMessage(accessToken: string, payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const mimeMessage = buildMimeMessage(payload);
  const rawBase64Url = base64UrlEncode(mimeMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API error (${response.status}): ${response.statusText}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Saves a draft using Gmail API users.drafts.create
 */
export async function createGmailDraft(accessToken: string, payload: SendEmailPayload): Promise<{ id: string; message: { id: string } }> {
  const mimeMessage = buildMimeMessage(payload);
  const rawBase64Url = base64UrlEncode(mimeMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: rawBase64Url,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail Draft API error (${response.status}): ${response.statusText}`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Retrieves the user profile from Gmail API
 */
export async function getGmailProfile(accessToken: string): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load Gmail profile: ${response.statusText}`);
  }

  return response.json();
}
