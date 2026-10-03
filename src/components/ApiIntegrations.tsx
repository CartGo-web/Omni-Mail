import React, { useState } from 'react';
import {
  Key,
  Plus,
  Copy,
  Check,
  ShieldCheck,
  Code2,
  Play,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  Terminal,
  Lock,
} from 'lucide-react';
import { ApiKeyRecord } from '../lib/types.ts';
import { saveApiKey, revokeApiKey, deleteApiKey } from '../lib/store.ts';

interface ApiIntegrationsProps {
  userId: string;
  userEmail: string;
  apiKeys: ApiKeyRecord[];
}

export const ApiIntegrations: React.FC<ApiIntegrationsProps> = ({
  userId,
  userEmail,
  apiKeys,
}) => {
  const [keyName, setKeyName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    apiKey: string;
    apiSecret: string;
    name: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});

  // Interactive API Console / Tester states
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/v1/auth/token');
  const [selectedKeyId, setSelectedKeyId] = useState<string>(apiKeys[0]?.id || '');
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(
      {
        grant_type: 'client_credentials',
        client_id: apiKeys[0]?.apiKey || 'omni_live_example_key',
        client_secret: apiKeys[0]?.apiSecret || 'omni_sec_example_secret',
      },
      null,
      2
    )
  );
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<{
    status: number;
    data: unknown;
    timeMs: number;
  } | null>(null);

  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'node' | 'python'>('curl');

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setIsGenerating(true);
    try {
      const randomHex1 = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const randomHex2 = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const apiKey = `omni_live_${randomHex1}`;
      const apiSecret = `omni_sec_${randomHex2}`;

      const newRecord: ApiKeyRecord = {
        id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        name: keyName.trim(),
        apiKey,
        apiSecret,
        scopes: 'transfers:send,contacts:read,drafts:write',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveApiKey(newRecord);

      setCreatedCredentials({
        apiKey,
        apiSecret,
        name: newRecord.name,
      });
      setKeyName('');
      setSelectedKeyId(newRecord.id);
    } catch (err) {
      console.error('Failed generating API key:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (window.confirm('Revoke this API Key? External applications using it will be blocked.')) {
      try {
        await revokeApiKey(id);
      } catch (err) {
        console.error('Revoke failed:', err);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Permanently delete this API Key and Secret?')) {
      try {
        await deleteApiKey(id);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecretMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Run live interactive API test
  const runLiveTest = async () => {
    setIsTesting(true);
    setTestResponse(null);
    const start = performance.now();

    try {
      let parsedBody: unknown = {};
      try {
        parsedBody = JSON.parse(testPayload);
      } catch {
        alert('Invalid JSON in Request Payload');
        setIsTesting(false);
        return;
      }

      const activeKeyRecord = apiKeys.find((k) => k.id === selectedKeyId) || apiKeys[0];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (activeKeyRecord) {
        headers['X-API-Key'] = activeKeyRecord.apiKey;
        headers['X-API-Secret'] = activeKeyRecord.apiSecret;
      }

      const res = await fetch(testEndpoint, {
        method: testEndpoint.includes('contacts') && !testPayload.includes('{') ? 'GET' : 'POST',
        headers,
        body: testEndpoint.includes('contacts') && !testPayload.includes('{') ? undefined : JSON.stringify(parsedBody),
      });

      const data = await res.json().catch(() => ({ statusText: res.statusText }));
      const timeMs = Math.round(performance.now() - start);

      setTestResponse({
        status: res.status,
        data,
        timeMs,
      });
    } catch (err) {
      const timeMs = Math.round(performance.now() - start);
      setTestResponse({
        status: 500,
        data: { error: err instanceof Error ? err.message : 'Request failed' },
        timeMs,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const activeKeyForSnippet = apiKeys[0]?.apiKey || 'YOUR_API_KEY';
  const activeSecretForSnippet = apiKeys[0]?.apiSecret || 'YOUR_API_SECRET';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-300 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Secure OAuth 2.0 &amp; REST Endpoints</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Third-Party API &amp; Secret Keys
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Connect external systems, CRMs, Zapier, Make, and backend servers. Every dispatch executes through your authenticated Gmail (<span className="text-blue-300 font-mono">{userEmail}</span>) with automated attachments.
          </p>
        </div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Newly Created Credentials Modal / Banner */}
      {createdCredentials && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-950 text-base">
                Credentials Generated: {createdCredentials.name}
              </h3>
            </div>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Save your <strong>API Secret</strong> now. For security purposes, secret tokens are masked after creation.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
                API Key (Client ID)
              </label>
              <div className="flex items-center space-x-2 bg-white rounded-xl border border-emerald-200 p-2.5">
                <code className="text-xs font-mono text-slate-800 truncate flex-1">
                  {createdCredentials.apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdCredentials.apiKey, 'new_key')}
                  className="p-1 text-slate-500 hover:text-emerald-600"
                  title="Copy API Key"
                >
                  {copiedField === 'new_key' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
                API Secret (Client Secret)
              </label>
              <div className="flex items-center space-x-2 bg-white rounded-xl border border-emerald-200 p-2.5">
                <code className="text-xs font-mono text-slate-800 truncate flex-1">
                  {createdCredentials.apiSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(createdCredentials.apiSecret, 'new_sec')}
                  className="p-1 text-slate-500 hover:text-emerald-600"
                  title="Copy API Secret"
                >
                  {copiedField === 'new_sec' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Generator & Active Keys List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Generate new key */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Generate New API Key</h3>
          </div>
          <p className="text-xs text-slate-500">
            Create integration tokens for external apps to automate document and video email transfers.
          </p>

          <form onSubmit={handleGenerateKey} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Application Name
              </label>
              <input
                type="text"
                required
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Zapier Workflow, CRM Transfer Service"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700">Included Scopes:</span>
              <ul className="list-disc pl-4 text-slate-600 text-[11px] space-y-0.5">
                <li><code>transfers:send</code> (Execute transfers via Gmail)</li>
                <li><code>contacts:read</code> (Query Address Book)</li>
                <li><code>drafts:write</code> (Store transfer drafts)</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : 'Generate Key & Secret'}</span>
            </button>
          </form>
        </div>

        {/* Right: Active Keys Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Active Credentials ({apiKeys.length})</h3>
              <p className="text-xs text-slate-500">Your authorized third-party OAuth 2.0 credentials</p>
            </div>
          </div>

          {apiKeys.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
              <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No API keys created yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Use the generator to obtain an API Key and Secret value for connecting other apps.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => {
                const isSecretShown = !!showSecretMap[key.id];
                const isRevoked = key.status === 'revoked';

                return (
                  <div
                    key={key.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isRevoked ? 'bg-slate-50/70 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">{key.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isRevoked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {key.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {!isRevoked && (
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(key.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* API Key */}
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">API Key</span>
                          <span className="font-mono text-slate-800 text-[11px] truncate block">
                            {key.apiKey}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(key.apiKey, `key_${key.id}`)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                          title="Copy API Key"
                        >
                          {copiedField === `key_${key.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* API Secret */}
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div className="truncate mr-2">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Secret Value</span>
                          <span className="font-mono text-slate-800 text-[11px] truncate block">
                            {isSecretShown ? key.apiSecret : '••••••••••••••••••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => toggleSecretVisibility(key.id)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title={isSecretShown ? 'Hide Secret' : 'Reveal Secret'}
                          >
                            {isSecretShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(key.apiSecret, `sec_${key.id}`)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Copy API Secret"
                          >
                            {copiedField === `sec_${key.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive API Tester & Console */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Interactive API Tester</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Execute real API requests using your credentials
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Endpoint
            </label>
            <select
              value={testEndpoint}
              onChange={(e) => {
                const ep = e.target.value;
                setTestEndpoint(ep);
                if (ep === '/api/v1/auth/token') {
                  setTestPayload(
                    JSON.stringify(
                      {
                        grant_type: 'client_credentials',
                        client_id: activeKeyForSnippet,
                        client_secret: activeSecretForSnippet,
                      },
                      null,
                      2
                    )
                  );
                } else if (ep === '/api/v1/send') {
                  setTestPayload(
                    JSON.stringify(
                      {
                        to: 'partner@example.com',
                        subject: 'Automated Asset Delivery',
                        body: 'Documents and media delivered via OmniMail API',
                        attachments: [
                          {
                            name: 'readme.txt',
                            type: 'text/plain',
                            base64Data: 'SGVsbG8gZnJvbSBPbW5pTWFpbCBBUEkh',
                          },
                        ],
                      },
                      null,
                      2
                    )
                  );
                } else if (ep === '/api/v1/contacts') {
                  setTestPayload('{}');
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-medium"
            >
              <option value="/api/v1/auth/token">POST /api/v1/auth/token (OAuth 2.0)</option>
              <option value="/api/v1/send">POST /api/v1/send (Send Transfer)</option>
              <option value="/api/v1/contacts">GET /api/v1/contacts (Address Book)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Test with API Key
            </label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
            >
              {apiKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.apiKey.substring(0, 16)}...)
                </option>
              ))}
              {apiKeys.length === 0 && <option value="">No keys generated</option>}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={runLiveTest}
              disabled={isTesting}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isTesting ? 'Sending Request...' : 'Execute Request'}</span>
            </button>
          </div>
        </div>

        {/* Payload and Response */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
              Request Payload (JSON)
            </span>
            <textarea
              rows={6}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Response Output
              </span>
              {testResponse && (
                <span className="text-[11px] font-mono font-bold">
                  <span
                    className={
                      testResponse.status < 300
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }
                  >
                    HTTP {testResponse.status}
                  </span>{' '}
                  • {testResponse.timeMs}ms
                </span>
              )}
            </div>
            <pre className="w-full h-34 p-3 font-mono text-xs rounded-xl border border-slate-300 bg-slate-900 text-emerald-400 overflow-auto">
              {testResponse ? JSON.stringify(testResponse.data, null, 2) : '// Click "Execute Request" to test endpoint'}
            </pre>
          </div>
        </div>
      </div>

      {/* Code Snippets (cURL, Python, Node.js) */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Quickstart Integration Snippets</h3>
          </div>

          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveCodeLang('curl')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeCodeLang === 'curl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveCodeLang('node')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeCodeLang === 'node' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node.js
            </button>
            <button
              onClick={() => setActiveCodeLang('python')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeCodeLang === 'python' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python
            </button>
          </div>
        </div>

        {/* Code Block */}
        <div className="relative">
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
            {activeCodeLang === 'curl' &&
`# 1. Exchange API Key & Secret for OAuth 2.0 Bearer Token
curl -X POST https://ais-dev-e5y3zlttaevzbbwdk74fkd-731023574997.asia-east1.run.app/api/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "${activeKeyForSnippet}",
    "client_secret": "${activeSecretForSnippet}"
  }'

# 2. Automated File Transfer via Gmail API
curl -X POST https://ais-dev-e5y3zlttaevzbbwdk74fkd-731023574997.asia-east1.run.app/api/v1/send \\
  -H "X-API-Key: ${activeKeyForSnippet}" \\
  -H "X-API-Secret: ${activeSecretForSnippet}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "client@example.com",
    "subject": "Automated Document Delivery",
    "body": "Hi, please review the attached contract.",
    "attachments": [
      {
        "name": "contract.pdf",
        "type": "application/pdf",
        "base64Data": "JVBERi0xLjQK..."
      }
    ]
  }'`}

            {activeCodeLang === 'node' &&
`// Node.js Automated Transfer Workflow
import fetch from 'node-fetch';
import fs from 'fs';

const API_KEY = '${activeKeyForSnippet}';
const API_SECRET = '${activeSecretForSnippet}';

async function sendFileTransfer() {
  const fileBuffer = fs.readFileSync('./spec.pdf');
  const base64Data = fileBuffer.toString('base64');

  const response = await fetch('https://ais-dev-e5y3zlttaevzbbwdk74fkd-731023574997.asia-east1.run.app/api/v1/send', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'X-API-Secret': API_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'receiver@gmail.com',
      subject: 'Automated PDF Deliverable',
      body: 'Attached is the completed project PDF.',
      attachments: [{
        name: 'spec.pdf',
        type: 'application/pdf',
        base64Data,
      }],
    }),
  });

  const result = await response.json();
  console.log('Transfer dispatched:', result);
}

sendFileTransfer();`}

            {activeCodeLang === 'python' &&
`# Python Automated File Transfer
import requests
import base64

API_KEY = "${activeKeyForSnippet}"
API_SECRET = "${activeSecretForSnippet}"

with open("report.docx", "rb") as f:
    encoded_file = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "to": "receiver@gmail.com",
    "subject": "Quarterly Report Document",
    "body": "Please find attached the latest report.",
    "attachments": [{
        "name": "report.docx",
        "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "base64Data": encoded_file
    }]
}

headers = {
    "X-API-Key": API_KEY,
    "X-API-Secret": API_SECRET,
    "Content-Type": "application/json"
}

resp = requests.post(
    "https://ais-dev-e5y3zlttaevzbbwdk74fkd-731023574997.asia-east1.run.app/api/v1/send",
    json=payload,
    headers=headers
)

print("Status:", resp.status_code)
print("Response:", resp.json())`}
          </pre>

          <button
            onClick={() => {
              const code =
                activeCodeLang === 'curl'
                  ? `curl -X POST /api/v1/send -H "X-API-Key: ${activeKeyForSnippet}"`
                  : activeCodeLang === 'node'
                  ? `fetch('/api/v1/send')`
                  : `requests.post('/api/v1/send')`;
              copyToClipboard(code, 'snippet');
            }}
            className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1"
          >
            {copiedField === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono">Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
