import express, { Request, Response } from 'express';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware for API access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-API-Secret');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory token cache for OAuth 2.0 client credential exchanges
interface ActiveToken {
  token: string;
  clientId: string;
  expiresAt: number;
}
const activeTokens = new Map<string, ActiveToken>();

// Middleware to authenticate API requests via Bearer token or X-API-Key + X-API-Secret
function authenticateApi(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const apiSecretHeader = req.headers['x-api-secret'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const cached = activeTokens.get(token);
    if (!cached || cached.expiresAt < Date.now()) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'The provided access token is expired or invalid.',
      });
    }
    return next();
  }

  if (apiKeyHeader && apiSecretHeader) {
    if (apiKeyHeader.startsWith('omni_live_') && apiSecretHeader.startsWith('omni_sec_')) {
      return next();
    }
  }

  // Allow test mock mode for console tester
  if (apiKeyHeader || authHeader) {
    return next();
  }

  return res.status(401).json({
    error: 'unauthorized',
    error_description:
      'Missing or invalid authentication credentials. Provide a Bearer token or X-API-Key and X-API-Secret headers.',
  });
}

// ----------------------------------------------------------------------
// Health Check
// ----------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'OmniMail API Engine', timestamp: new Date().toISOString() });
});

// ----------------------------------------------------------------------
// OAuth 2.0 Token Endpoint: Client Credentials Grant
// ----------------------------------------------------------------------
app.post('/api/v1/auth/token', (req: Request, res: Response) => {
  const { grant_type, client_id, client_secret } = req.body;

  if (grant_type !== 'client_credentials') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only grant_type=client_credentials is supported.',
    });
  }

  if (!client_id || !client_secret) {
    return res.status(400).json({
      error: 'invalid_client',
      error_description: 'client_id and client_secret are required.',
    });
  }

  const token = `omni_tok_${Math.random().toString(36).substring(2)}${Date.now()}`;
  const expiresIn = 3600;

  activeTokens.set(token, {
    token,
    clientId: client_id,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: 'transfers:send contacts:read drafts:write',
  });
});

// ----------------------------------------------------------------------
// Endpoint: Automated Transfer Send
// ----------------------------------------------------------------------
app.post('/api/v1/send', authenticateApi, (req: Request, res: Response) => {
  const { to, subject, body, attachments, sendCopyToSelf } = req.body;

  if (!to) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Receiver email address "to" is required.',
    });
  }

  const files = Array.isArray(attachments) ? attachments : [];

  return res.status(200).json({
    success: true,
    message: 'File & email transfer processed successfully via OmniMail Engine.',
    transferId: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    details: {
      recipient: to,
      subject: subject || 'Automated Transfer via OmniMail API',
      filesAttached: files.length,
      fileNames: files.map((f: { name?: string }) => f.name || 'file'),
      sendCopyToSelf: !!sendCopyToSelf,
      status: 'dispatched',
      deliveredAt: new Date().toISOString(),
    },
  });
});

// ----------------------------------------------------------------------
// Endpoint: Address Book Contacts
// ----------------------------------------------------------------------
app.get('/api/v1/contacts', authenticateApi, (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    total: 3,
    contacts: [
      {
        id: 'contact_demo_1',
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@gmail.com',
        category: 'Clients',
      },
      {
        id: 'contact_demo_2',
        name: 'Alex Rivera',
        email: 'alex.rivera@gmail.com',
        category: 'Team',
      },
      {
        id: 'contact_demo_3',
        name: 'Design Deliverables Team',
        email: 'assets@designstudio.com',
        category: 'Vendors',
      },
    ],
  });
});

app.post('/api/v1/contacts', authenticateApi, (req: Request, res: Response) => {
  const { name, email, category, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  return res.status(201).json({
    success: true,
    message: 'Contact added to address book.',
    contact: {
      id: `contact_${Date.now()}`,
      name,
      email,
      category: category || 'General',
      phone,
      createdAt: new Date().toISOString(),
    },
  });
});

// ----------------------------------------------------------------------
// Endpoint: Drafts
// ----------------------------------------------------------------------
app.post('/api/v1/drafts', authenticateApi, (req: Request, res: Response) => {
  const { to, subject, body } = req.body;
  return res.status(201).json({
    success: true,
    message: 'Draft stored in OmniMail workflow.',
    draftId: `draft_${Date.now()}`,
    draft: {
      to,
      subject,
      body,
      createdAt: new Date().toISOString(),
    },
  });
});

export default app;
