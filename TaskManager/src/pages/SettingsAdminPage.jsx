// App.jsx — includes professional SettingsAdminPage and routes
// - Single-file for quick drop-in. Extract components into separate files as needed.
// - Uses react-router-dom v6+ for routing. Tailwind CSS classes used for styling.
// - Admin settings include tabs: General, Security, Integrations, Audit Logs
// - Save actions are stubbed to localStorage and demonstrate form validation and toasts

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

// Simple Toast - Unchanged
function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed right-6 bottom-6 bg-slate-900 text-white px-4 py-2 rounded-md shadow-md z-50 animate-fade-in-up">{message}</div>
  );
}

// Reusable card wrapper (glass-like) - ENHANCED for better glassmorphism
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl p-6 shadow-2xl bg-white/60 border border-white/30 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

// Simple form field - Unchanged
function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div>{children}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}


// ================== SettingsAdminPage (professional) - IMPROVED UI ==================
export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [toast, setToast] = useState('');

  // General settings
  const [orgName, setOrgName] = useState(() => localStorage.getItem('admin_org_name') || 'Acme Corp');
  const [orgDomain, setOrgDomain] = useState(() => localStorage.getItem('admin_org_domain') || 'acme.example.com');
  const [supportEmail, setSupportEmail] = useState(() => localStorage.getItem('admin_support_email') || 'support@example.com');
  const [timezone, setTimezone] = useState(() => localStorage.getItem('admin_timezone') || 'UTC');
  const [language, setLanguage] = useState(() => localStorage.getItem('admin_language') || 'en');

  // Security
  const [force2FA, setForce2FA] = useState(() => JSON.parse(localStorage.getItem('admin_force_2fa') || 'false'));
  const [passwordPolicy, setPasswordPolicy] = useState(() => localStorage.getItem('admin_password_policy') || 'strong');
  const [sessionTimeout, setSessionTimeout] = useState(() => localStorage.getItem('admin_session_timeout') || '30');
  const [ipWhitelist, setIpWhitelist] = useState(() => localStorage.getItem('admin_ip_whitelist') || '');

  // Integrations
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('admin_webhook') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('admin_api_key') || '');
  const [slackWebhook, setSlackWebhook] = useState(() => localStorage.getItem('admin_slack_webhook') || '');
  const [emailNotifications, setEmailNotifications] = useState(() => JSON.parse(localStorage.getItem('admin_email_notifications') || 'true'));

  // Task & Project Settings
  const [defaultTaskDuration, setDefaultTaskDuration] = useState(() => localStorage.getItem('admin_default_task_duration') || '7');
  const [maxTasksPerStudent, setMaxTasksPerStudent] = useState(() => localStorage.getItem('admin_max_tasks_per_student') || '5');
  const [autoAssignTasks, setAutoAssignTasks] = useState(() => JSON.parse(localStorage.getItem('admin_auto_assign_tasks') || 'false'));
  const [enableGamification, setEnableGamification] = useState(() => JSON.parse(localStorage.getItem('admin_enable_gamification') || 'true'));
  const [pointsPerTask, setPointsPerTask] = useState(() => localStorage.getItem('admin_points_per_task') || '10');

  // Audit logs (mocked)
  const [auditItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_audit_items')) || [] } catch { return [] }
  });

  useEffect(() => { if (toast) { const t = setTimeout(()=>setToast(''), 3000); return ()=>clearTimeout(t) } }, [toast]);

  // Save handlers
  function saveGeneral(e) {
    e.preventDefault();
    if (!orgName.trim()) return setToast('Organization name is required');
    localStorage.setItem('admin_org_name', orgName);
    localStorage.setItem('admin_org_domain', orgDomain);
    localStorage.setItem('admin_support_email', supportEmail);
    localStorage.setItem('admin_timezone', timezone);
    localStorage.setItem('admin_language', language);
    setToast('General settings saved');
  }

  function saveSecurity(e) {
    e.preventDefault();
    localStorage.setItem('admin_force_2fa', JSON.stringify(force2FA));
    localStorage.setItem('admin_password_policy', passwordPolicy);
    localStorage.setItem('admin_session_timeout', sessionTimeout);
    localStorage.setItem('admin_ip_whitelist', ipWhitelist);
    setToast('Security settings updated');
  }

  function saveIntegrations(e) {
    e.preventDefault();
    localStorage.setItem('admin_webhook', webhookUrl);
    localStorage.setItem('admin_api_key', apiKey);
    localStorage.setItem('admin_slack_webhook', slackWebhook);
    localStorage.setItem('admin_email_notifications', JSON.stringify(emailNotifications));
    setToast('Integrations saved');
  }

  function saveTaskSettings(e) {
    e.preventDefault();
    localStorage.setItem('admin_default_task_duration', defaultTaskDuration);
    localStorage.setItem('admin_max_tasks_per_student', maxTasksPerStudent);
    localStorage.setItem('admin_auto_assign_tasks', JSON.stringify(autoAssignTasks));
    localStorage.setItem('admin_enable_gamification', JSON.stringify(enableGamification));
    localStorage.setItem('admin_points_per_task', pointsPerTask);
    setToast('Task & Project settings saved');
  }

  function generateApiKey() {
    const key = `adm_${Math.random().toString(36).slice(2,14)}`;
    setApiKey(key);
    setToast('API key generated');
  }

  // Simple accessible tab component - IMPROVED STYLING
  function Tabs() {
    const tabs = [
      { id: 'general', label: 'General' },
      { id: 'security', label: 'Security' },
      { id: 'tasks', label: 'Tasks & Projects' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'audit', label: 'Audit Logs' },
    ];
    return (
      <nav className="flex gap-2 border-b border-white/20 pb-3 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-white/80 text-indigo-600 shadow-md'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-fuchsia-400 opacity-20 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-400 opacity-20 blur-[100px]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>
            <p className="text-sm text-slate-600 mt-1">Configure organization-level preferences, security controls and integrations.</p>
          </div>
          <Link to="/" className="text-sm text-slate-600 hover:text-indigo-600 hover:underline transition-colors">Back to dashboard</Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 flex flex-col gap-6">
            <Card>
              <h3 className="font-semibold text-slate-800">Organization</h3>
              <p className="text-sm text-slate-500 mt-1">Quick actions and overview for admins.</p>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-400">Org name</div>
                  <div className="font-medium text-slate-700">{orgName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Domain</div>
                  <div className="font-medium text-slate-700">{orgDomain}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Support</div>
                  <div className="font-medium text-slate-700">{supportEmail}</div>
                </div>
              </div>
            </Card>

            <Card>
              <h4 className="font-semibold text-slate-800">Danger zone</h4>
              <p className="text-sm text-slate-500 mt-1">Reset org settings or revoke keys. Actions here are destructive.</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => { if(confirm('Reset org settings to defaults?')){ localStorage.removeItem('admin_org_name'); localStorage.removeItem('admin_org_domain'); localStorage.removeItem('admin_support_email'); setOrgName('Acme Corp'); setOrgDomain('acme.example.com'); setSupportEmail('support@example.com'); setToast('Org reset to defaults') } }} 
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white/70 text-sm font-medium hover:bg-slate-50 transition-colors">
                  Reset org
                </button>
                <button 
                  onClick={() => { if(confirm('Revoke API key?')){ setApiKey(''); localStorage.removeItem('admin_api_key'); setToast('API key revoked') } }} 
                  className="w-full px-3 py-2 rounded-md border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                  Revoke key
                </button>
              </div>
            </Card>
          </aside>

          <main className="lg:col-span-3">
            <Card>
              <Tabs />
              {/* Common input style */}
              
              <div className="prose prose-sm max-w-none">
                {activeTab === 'general' && (
                  <form onSubmit={saveGeneral} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Field label="Organization name">
                        <input className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={orgName} onChange={(e)=>setOrgName(e.target.value)} />
                      </Field>
                      <Field label="Organization domain">
                        <input className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={orgDomain} onChange={(e)=>setOrgDomain(e.target.value)} />
                      </Field>
                      <Field label="Support email">
                        <input className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" type="email" value={supportEmail} onChange={(e)=>setSupportEmail(e.target.value)} />
                      </Field>
                      <Field label="Timezone" hint="Default timezone for all users">
                        <select className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={timezone} onChange={(e)=>setTimezone(e.target.value)}>
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </Field>
                      <Field label="Language" hint="Default language for the platform">
                        <select className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={language} onChange={(e)=>setLanguage(e.target.value)}>
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="ja">Japanese</option>
                        </select>
                      </Field>
                    </div>

                    <div>
                      <Field label="Branding preview">
                        <div className="p-4 rounded-md border border-white/50 bg-white/50">
                          <div className="text-sm font-medium text-slate-800">{orgName}</div>
                          <div className="text-xs text-slate-400">{orgDomain}</div>
                          <div className="text-xs text-slate-400 mt-2">Support: {supportEmail}</div>
                          <div className="text-xs text-slate-400">Timezone: {timezone}</div>
                          <div className="text-xs text-slate-400">Language: {language.toUpperCase()}</div>
                        </div>
                      </Field>
                      <div className="mt-6">
                        <button className="px-5 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:opacity-95 transform hover:-translate-y-0.5 transition-all" type="submit">Save general</button>
                      </div>
                    </div>
                  </form>
                )}

                {activeTab === 'security' && (
                  <form onSubmit={saveSecurity}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Field label="Two-Factor Authentication">
                          <label className="inline-flex items-center gap-3 p-2 rounded-md hover:bg-white/50 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={force2FA} onChange={(e)=>setForce2FA(e.target.checked)} />
                            <span className="text-sm text-slate-600">Force 2FA for all users</span>
                          </label>
                        </Field>
                        <Field label="Password policy">
                          <select className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={passwordPolicy} onChange={(e)=>setPasswordPolicy(e.target.value)}>
                            <option value="basic">Basic (6+ characters)</option>
                            <option value="medium">Medium (8+ characters)</option>
                            <option value="strong">Strong (12+ characters, with symbols)</option>
                          </select>
                        </Field>
                        <Field label="Session timeout (minutes)" hint="Automatic logout after inactivity">
                          <input type="number" min="5" max="1440" className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={sessionTimeout} onChange={(e)=>setSessionTimeout(e.target.value)} />
                        </Field>
                      </div>
                      <div>
                        <Field label="IP Whitelist" hint="Comma-separated IP addresses allowed to access admin panel">
                          <textarea rows="4" className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={ipWhitelist} onChange={(e)=>setIpWhitelist(e.target.value)} placeholder="192.168.1.1, 10.0.0.1" />
                        </Field>
                        <div className="p-4 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-800">
                          <strong>⚠️ Warning:</strong> IP whitelisting can lock you out if configured incorrectly. Ensure you have access recovery options.
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button type="submit" className="px-5 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:opacity-95 transform hover:-translate-y-0.5 transition-all">Save security</button>
                    </div>
                  </form>
                )}

                {activeTab === 'tasks' && (
                  <form onSubmit={saveTaskSettings}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Field label="Default task duration (days)" hint="Default deadline for new tasks">
                          <input type="number" min="1" max="365" className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={defaultTaskDuration} onChange={(e)=>setDefaultTaskDuration(e.target.value)} />
                        </Field>
                        <Field label="Max tasks per student" hint="Maximum concurrent tasks a student can have">
                          <input type="number" min="1" max="20" className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={maxTasksPerStudent} onChange={(e)=>setMaxTasksPerStudent(e.target.value)} />
                        </Field>
                        <Field label="AI Task Assignment">
                          <label className="inline-flex items-center gap-3 p-2 rounded-md hover:bg-white/50 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={autoAssignTasks} onChange={(e)=>setAutoAssignTasks(e.target.checked)} />
                            <span className="text-sm text-slate-600">Enable automatic AI-powered task assignment</span>
                          </label>
                        </Field>
                      </div>
                      <div>
                        <Field label="Gamification">
                          <label className="inline-flex items-center gap-3 p-2 rounded-md hover:bg-white/50 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={enableGamification} onChange={(e)=>setEnableGamification(e.target.checked)} />
                            <span className="text-sm text-slate-600">Enable points, badges, and leaderboard</span>
                          </label>
                        </Field>
                        {enableGamification && (
                          <Field label="Points per completed task" hint="Base points awarded for task completion">
                            <input type="number" min="1" max="100" className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={pointsPerTask} onChange={(e)=>setPointsPerTask(e.target.value)} />
                          </Field>
                        )}
                        <div className="p-4 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
                          <strong>💡 Tip:</strong> AI task assignment considers student skills, workload, and availability for fair distribution.
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button type="submit" className="px-5 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:opacity-95 transform hover:-translate-y-0.5 transition-all">Save task settings</button>
                    </div>
                  </form>
                )}

                {activeTab === 'integrations' && (
                  <form onSubmit={saveIntegrations}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Field label="Webhook URL" hint="Receive real-time notifications for events">
                          <input className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={webhookUrl} onChange={(e)=>setWebhookUrl(e.target.value)} placeholder="https://hooks.example.com/notify" />
                        </Field>
                        <Field label="Slack webhook URL" hint="Post notifications to Slack channel">
                          <input className="w-full px-3 py-2 rounded-md border border-white/50 bg-white/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={slackWebhook} onChange={(e)=>setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                        </Field>
                        <Field label="Email notifications">
                          <label className="inline-flex items-center gap-3 p-2 rounded-md hover:bg-white/50 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={emailNotifications} onChange={(e)=>setEmailNotifications(e.target.checked)} />
                            <span className="text-sm text-slate-600">Send email notifications for important events</span>
                          </label>
                        </Field>
                      </div>
                      <div>
                        <Field label="Admin API key" hint="Use this key to authenticate API requests">
                          <div className="flex gap-2">
                            <input className="flex-1 px-3 py-2 rounded-md border border-white/50 bg-slate-50 text-slate-500 font-mono text-sm" value={apiKey} readOnly />
                            <button type="button" onClick={generateApiKey} className="px-4 py-2 rounded-md border border-slate-300 bg-white/70 text-sm font-medium hover:bg-slate-50 transition-colors">Generate</button>
                          </div>
                        </Field>
                        <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
                          <strong>✓ Integrations Available:</strong>
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>Webhooks for real-time events</li>
                            <li>Slack notifications</li>
                            <li>Email alerts</li>
                            <li>REST API access</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button type="submit" className="px-5 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:opacity-95 transform hover:-translate-y-0.5 transition-all">Save integrations</button>
                    </div>
                  </form>
                )}
                
                {activeTab === 'audit' && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Audit Logs</h3>
                    {auditItems.length === 0 ? (
                      <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md p-6 text-center">No recent admin activity.</div>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {auditItems.slice().reverse().map((it, idx) => (
                          <li key={idx} className="p-3 rounded-md border border-white/50 bg-white/50">
                            <div className="text-sm font-medium text-slate-700">{it.action}</div>
                            <div className="text-xs text-slate-500">{it.time}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-6">
                      <button onClick={() => { localStorage.setItem('admin_audit_items', JSON.stringify([])); setToast('Audit logs cleared') }} className="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">Clear logs</button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </main>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}


// ================== Example App wiring (wrap this in your project) - Unchanged ==================
export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={(
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Example Dashboard</h2>
              <div className="mt-4">
                <Link to="/admin/settings" className="px-4 py-2 rounded-md bg-indigo-600 text-white">Open Admin Settings</Link>
              </div>
            </div>
          </div>
        )} />
        <Route path="/admin/settings" element={<SettingsAdminPage />} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}