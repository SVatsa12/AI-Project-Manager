import React, { useEffect, useState, useRef } from "react";
import { User, Bell, Globe, Shield, Key, Trash2, Moon, Sun, Monitor, Mail, MessageSquare, Clock, Languages, MapPin, Lock, Eye, EyeOff, Webhook, Settings as SettingsIcon } from "lucide-react";

// Modern Student Settings Page with improved structure and UI
export default function SettingsPage() {
  const [user, setUser] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("gpa_user")) || {
          name: "Student User",
          email: "you@example.com",
          bio: "",
          avatar: null,
        }
      );
    } catch {
      return { name: "Student User", email: "you@example.com", bio: "", avatar: null };
    }
  });

  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const avatarInputRef = useRef(null);

  // theme: light | dark | system
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  // persist theme and apply classes to documentElement so Tailwind dark styles (if any) can react
  useEffect(() => {
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("theme-dark", prefersDark);
      document.documentElement.classList.toggle("theme-light", !prefersDark);
    } else {
      document.documentElement.classList.toggle("theme-dark", theme === "dark");
      document.documentElement.classList.toggle("theme-light", theme === "light");
    }
  }, [theme]);

  // persisted toggles
  const [notifEmail, setNotifEmail] = useState(() => JSON.parse(localStorage.getItem("notif_email")) ?? true);
  const [notifTask, setNotifTask] = useState(() => JSON.parse(localStorage.getItem("notif_task")) ?? true);
  const [notifChat, setNotifChat] = useState(() => JSON.parse(localStorage.getItem("notif_chat")) ?? false);
  const [notifDesktop, setNotifDesktop] = useState(() => JSON.parse(localStorage.getItem("notif_desktop")) ?? false);
  const [notifSound, setNotifSound] = useState(() => JSON.parse(localStorage.getItem("notif_sound")) ?? true);
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("timezone") || "Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("date_format") || "24h");
  const [twoFactor, setTwoFactor] = useState(() => JSON.parse(localStorage.getItem("two_factor")) ?? false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState(null);
  const [visibility, setVisibility] = useState(() => localStorage.getItem("visibility") || "team");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("fake_api_key") || "");
  const [webhook, setWebhook] = useState(() => localStorage.getItem("webhook_url") || "");
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  useEffect(() => localStorage.setItem("notif_email", JSON.stringify(notifEmail)), [notifEmail]);
  useEffect(() => localStorage.setItem("notif_task", JSON.stringify(notifTask)), [notifTask]);
  useEffect(() => localStorage.setItem("notif_chat", JSON.stringify(notifChat)), [notifChat]);
  useEffect(() => localStorage.setItem("notif_desktop", JSON.stringify(notifDesktop)), [notifDesktop]);
  useEffect(() => localStorage.setItem("notif_sound", JSON.stringify(notifSound)), [notifSound]);
  useEffect(() => localStorage.setItem("language", language), [language]);
  useEffect(() => localStorage.setItem("timezone", timezone), [timezone]);
  useEffect(() => localStorage.setItem("date_format", dateFormat), [dateFormat]);
  useEffect(() => localStorage.setItem("two_factor", JSON.stringify(twoFactor)), [twoFactor]);
  useEffect(() => localStorage.setItem("visibility", visibility), [visibility]);
  useEffect(() => localStorage.setItem("webhook_url", webhook), [webhook]);

  const handleProfileSave = () => {
    const newUser = { ...user, avatar: avatarPreview };
    setUser(newUser);
    localStorage.setItem("gpa_user", JSON.stringify(newUser));
    toast("Profile saved");
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return setPwStatus("Please fill all fields.");
    if (newPassword.length < 8) return setPwStatus("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setPwStatus("Passwords do not match.");
    
    // Simulate API call
    setPwStatus(null);
    setTimeout(() => {
      setPwStatus("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordStrength(false);
      toast("Password updated successfully");
    }, 600);
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) return { strength, label: "Weak", color: "bg-red-500" };
    if (strength <= 3) return { strength, label: "Fair", color: "bg-yellow-500" };
    if (strength <= 4) return { strength, label: "Good", color: "bg-blue-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  };

  const generateApiKey = () => {
    const newKey = `gpa_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    setApiKey(newKey);
    localStorage.setItem("fake_api_key", newKey);
    toast("API key generated successfully");
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast("API key copied to clipboard");
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "⚠️ Are you sure you want to delete your account?\n\nThis action cannot be undone. All your data will be permanently deleted."
    );
    
    if (confirmed) {
      const doubleConfirm = window.confirm(
        "This is your final warning!\n\nType your email to confirm deletion."
      );
      
      if (doubleConfirm) {
        // Simulate account deletion
        setTimeout(() => {
          localStorage.clear();
          toast("Account deleted. Redirecting...");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }, 500);
      }
    }
  };

  const requestDesktopNotifications = async () => {
    if (!('Notification' in window)) {
      toast("Desktop notifications not supported");
      return;
    }

    if (Notification.permission === 'granted') {
      setNotifDesktop(true);
      toast("Desktop notifications enabled");
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifDesktop(true);
        toast("Desktop notifications enabled");
        new Notification('GPA Task Manager', {
          body: 'You will now receive desktop notifications!',
          icon: '/favicon.ico'
        });
      } else {
        toast("Desktop notification permission denied");
      }
    } else {
      toast("Desktop notifications blocked. Please enable in browser settings.");
    }
  };

  const [toastMsg, setToastMsg] = useState("");
  function toast(msg = "") {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
                <p className="text-sm text-slate-600">Manage your account and preferences</p>
              </div>
            </div>
            <button onClick={handleProfileSave} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-sm font-medium">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-24">
              <nav className="space-y-1">
                {[
                  { id: "profile", label: "Profile", icon: User },
                  { id: "notifications", label: "Notifications", icon: Bell },
                  { id: "preferences", label: "Preferences", icon: Globe },
                  { id: "security", label: "Security", icon: Shield },
                  { id: "developer", label: "Developer", icon: Key },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                      activeSection === id
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 font-medium shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </button>
                ))}
                
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button 
                    onClick={handleDeleteAccount}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9 space-y-6">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="space-y-6">
                {/* Avatar & Basic Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <User className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Profile Information</h2>
                      <p className="text-sm text-slate-600">Update your photo and personal details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center ring-4 ring-white shadow-lg">
                          <img 
                            src={avatarPreview || "https://placehold.co/128x128"} 
                            alt="avatar" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <label className="px-4 py-2 bg-white text-slate-800 rounded-lg cursor-pointer text-sm font-medium">
                            Change
                            <input 
                              ref={avatarInputRef} 
                              onChange={handleAvatarUpload} 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                      <button 
                        onClick={removeAvatar} 
                        className="mt-4 text-sm text-slate-600 hover:text-red-600 transition"
                      >
                        Remove photo
                      </button>
                    </div>

                    {/* Form Fields */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={user.name}
                          onChange={(e) => setUser({ ...user, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <input
                            type="email"
                            value={user.email}
                            readOnly
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                        <textarea
                          value={user.bio}
                          onChange={(e) => setUser({ ...user, bio: e.target.value })}
                          rows={4}
                          placeholder="Tell us about yourself..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                        />
                        <p className="mt-1.5 text-xs text-slate-500">{user.bio?.length || 0}/200 characters</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-2 mb-6">
                  <Bell className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Notification Preferences</h2>
                    <p className="text-sm text-slate-600">Manage how you receive notifications</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { key: "email", label: "Email Notifications", desc: "Receive updates via email", icon: Mail, state: notifEmail, setState: setNotifEmail, standard: true },
                    { key: "task", label: "Task Reminders", desc: "Get notified about task deadlines", icon: Clock, state: notifTask, setState: setNotifTask, standard: true },
                    { key: "chat", label: "Chat Messages", desc: "Alerts for new chat messages", icon: MessageSquare, state: notifChat, setState: setNotifChat, standard: true },
                    { key: "desktop", label: "Desktop Notifications", desc: "Browser push notifications", icon: Bell, state: notifDesktop, setState: setNotifDesktop, standard: false },
                  ].map(({ key, label, desc, icon: Icon, state, setState, standard }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <div className="font-medium text-slate-800">{label}</div>
                          <div className="text-sm text-slate-600">{desc}</div>
                        </div>
                      </div>
                      {standard ? (
                        <input
                          type="checkbox"
                          checked={state}
                          onChange={(e) => setState(e.target.checked)}
                          className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                        />
                      ) : (
                        <button
                          onClick={requestDesktopNotifications}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            state
                              ? 'bg-green-50 text-green-600 border border-green-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {state ? 'Enabled' : 'Enable'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === "preferences" && (
              <div className="space-y-6">
                {/* Appearance */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Monitor className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Appearance</h2>
                      <p className="text-sm text-slate-600">Customize how the app looks</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`p-4 rounded-xl border-2 transition ${
                          theme === value
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region & Language */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Globe className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Region & Language</h2>
                      <p className="text-sm text-slate-600">Set your location and language preferences</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="America/New_York">America/New York (EST)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time Format
                      </label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="12h">12-hour (1:00 PM)</option>
                        <option value="24h">24-hour (13:00)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <div className="space-y-6">
                {/* Password */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Lock className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Change Password</h2>
                      <p className="text-sm text-slate-600">Update your password to keep your account secure</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setShowPasswordStrength(e.target.value.length > 0);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter new password"
                      />
                      {showPasswordStrength && newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Password Strength:</span>
                            <span className={`text-xs font-medium ${getPasswordStrength(newPassword).strength >= 4 ? 'text-green-600' : getPasswordStrength(newPassword).strength >= 3 ? 'text-blue-600' : getPasswordStrength(newPassword).strength >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {getPasswordStrength(newPassword).label}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                  level <= getPasswordStrength(newPassword).strength
                                    ? getPasswordStrength(newPassword).color
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Use 8+ characters with uppercase, lowercase, numbers & symbols</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Confirm new password"
                      />
                    </div>

                    {pwStatus && (
                      <div className={`px-4 py-2.5 rounded-xl text-sm ${pwStatus.includes("successfully") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                        {pwStatus}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-sm font-medium"
                    >
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Two-Factor Authentication</h2>
                      <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
                    </div>
                  </div>

                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-800">Enable 2FA</div>
                      <div className="text-sm text-slate-600">Require verification code when signing in</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => setTwoFactor(e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Developer Section */}
            {activeSection === "developer" && (
              <div className="space-y-6">
                {/* API Key */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Key className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">API Key</h2>
                      <p className="text-sm text-slate-600">Use this key to access our API programmatically</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={apiKey || "No API key generated"}
                        readOnly
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono text-sm"
                      />
                      <button
                        onClick={generateApiKey}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
                      >
                        Generate
                      </button>
                      {apiKey && (
                        <button
                          onClick={copyApiKey}
                          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                    {apiKey && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Keep your API key secure. Don't share it publicly.
                      </p>
                    )}
                  </div>
                </div>

                {/* Webhook */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Webhook className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Webhook URL</h2>
                      <p className="text-sm text-slate-600">Receive real-time updates at your endpoint</p>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={webhook}
                    onChange={(e) => setWebhook(e.target.value)}
                    placeholder="https://your-domain.com/webhook"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Privacy */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start gap-2 mb-6">
                    <Eye className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Profile Visibility</h2>
                      <p className="text-sm text-slate-600">Control who can see your profile</p>
                    </div>
                  </div>

                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="team">Team Only - Only team members</option>
                    <option value="private">Private - Only you</option>
                  </select>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in-up">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
