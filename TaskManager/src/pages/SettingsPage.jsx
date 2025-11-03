import React, { useEffect, useState } from "react"

export default function SettingsPage() {
  // === USER PROFILE ===
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gpa_user")) || {
        name: "Student User",
        email: "you@example.com",
        bio: "",
        avatar: null,
      }
    } catch {
      return { name: "Student User", email: "you@example.com", bio: "", avatar: null }
    }
  })
  const [avatarPreview, setAvatarPreview] = useState(user.avatar)

  // === THEME ===
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light")
  useEffect(() => {
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.body.classList.toggle("theme-dark", prefersDark)
      document.body.classList.toggle("theme-light", !prefersDark)
    } else {
      document.body.classList.toggle("theme-dark", theme === "dark")
      document.body.classList.toggle("theme-light", theme === "light")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  // === STATE SETUP ===
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifTask, setNotifTask] = useState(true)
  const [notifChat, setNotifChat] = useState(false)
  const [notifDesktop, setNotifDesktop] = useState(false)
  const [notifSound, setNotifSound] = useState(true)
  const [language, setLanguage] = useState("en")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [dateFormat, setDateFormat] = useState("24h")
  const [twoFactor, setTwoFactor] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwStatus, setPwStatus] = useState(null)
  const [visibility, setVisibility] = useState("team")
  const [apiKey, setApiKey] = useState(localStorage.getItem("fake_api_key") || "")
  const [webhook, setWebhook] = useState(localStorage.getItem("webhook_url") || "")

  // === FUNCTIONS ===
  const handleProfileSave = () => {
    const newUser = { ...user, avatar: avatarPreview }
    setUser(newUser)
    localStorage.setItem("gpa_user", JSON.stringify(newUser))
    alert("Profile updated locally ✅")
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handlePasswordUpdate = (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword)
      return setPwStatus("Please fill all fields.")
    if (newPassword !== confirmPassword)
      return setPwStatus("Passwords do not match.")
    setTimeout(() => {
      setPwStatus("Password changed successfully (stub).")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }, 500)
  }

  const generateApiKey = () => {
    const newKey = `api_${Math.random().toString(36).substring(2, 12)}`
    setApiKey(newKey)
    localStorage.setItem("fake_api_key", newKey)
  }

  // === THEME COLORS / STYLES ===
  const bg =
    theme === "dark"
      ? "bg-gradient-to-br from-[#0a0f1f] via-[#0d1328] to-[#141b3a] text-slate-100"
      : "bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900"

  const card =
    theme === "dark"
      ? "bg-white/10 border border-slate-700 backdrop-blur-lg"
      : "bg-white/60 border border-slate-200 backdrop-blur-lg"

  const button =
    "px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-xl transition"

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* HEADER */}
        <div className={`rounded-2xl p-6 shadow-lg ${card}`}>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
            Settings
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Manage your profile, preferences, and account controls.
          </p>
        </div>

        {/* PROFILE */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="text-center">
              <img
                src={avatarPreview || "https://placehold.co/100x100"}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover shadow-md ring-2 ring-indigo-200"
              />
              <input
                type="file"
                accept="image/*"
                className="mt-3 text-xs text-slate-500"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                placeholder="Name"
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md focus:ring-2 focus:ring-indigo-300 outline-none"
              />
              <input
                type="email"
                value={user.email}
                readOnly
                className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-100"
              />
              <textarea
                rows="3"
                value={user.bio}
                onChange={(e) => setUser({ ...user, bio: e.target.value })}
                placeholder="Short bio"
                className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
              />
            </div>
          </div>
          <button onClick={handleProfileSave} className={`${button} mt-5`}>
            Save Profile
          </button>
        </section>

        {/* THEME */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="flex items-center gap-3">
            {["light", "dark", "system"].map((mode) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`px-4 py-2 rounded-lg border transition ${
                  theme === mode
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "bg-white/50 hover:bg-white/80 border-slate-200"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <div className="space-y-2 text-sm">
            {[
              ["Email updates", notifEmail, setNotifEmail],
              ["Task reminders", notifTask, setNotifTask],
              ["Chat alerts", notifChat, setNotifChat],
              ["Desktop notifications", notifDesktop, setNotifDesktop],
              ["Sound on message", notifSound, setNotifSound],
            ].map(([label, val, setter]) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={val}
                  onChange={() => setter(!val)}
                  className="accent-indigo-600"
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {/* LANGUAGE & REGION */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Language & Region</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
            </select>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            >
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </section>

        {/* SECURITY */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={() => setTwoFactor(!twoFactor)}
              className="accent-indigo-600"
            />
            Enable Two-Factor Authentication
          </label>
          <form onSubmit={handlePasswordUpdate} className="grid md:grid-cols-3 gap-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            />
            <button type="submit" className={`${button} md:col-span-3`}>
              Update Password
            </button>
            {pwStatus && (
              <div className="text-sm text-green-600 md:col-span-3">{pwStatus}</div>
            )}
          </form>
        </section>

        {/* PRIVACY */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Privacy & Data</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
            >
              <option value="public">Public</option>
              <option value="team">Team Only</option>
              <option value="private">Private</option>
            </select>
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition">
              Download My Data
            </button>
            <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">
              Delete My Account
            </button>
          </div>
        </section>

        {/* DEVELOPER SETTINGS */}
        <section className={`rounded-2xl p-6 shadow-md ${card}`}>
          <h2 className="text-xl font-semibold mb-4">Developer Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">API Key</label>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-100"
                />
                <button onClick={generateApiKey} className={button}>
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm">Webhook URL</label>
              <input
                type="text"
                value={webhook}
                onChange={(e) => {
                  setWebhook(e.target.value)
                  localStorage.setItem("webhook_url", e.target.value)
                }}
                placeholder="https://example.com/webhook"
                className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg bg-white/70 backdrop-blur-md"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
