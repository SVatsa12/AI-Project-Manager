// src/components/EditProfileModal.jsx
import React, { useEffect, useState } from "react"
import { X, PlusCircle, Trash2 } from "lucide-react"

export default function EditProfileModal({
  profile = {},
  skills = [],
  interests = [],
  onClose = () => {},
  onSave = () => {},
}) {
  const [form, setForm] = useState({
    name: profile.name || "",
    year: profile.year || "",
    department: profile.department || "",
    college: profile.college || "",
    bio: profile.bio || "",
  })
  const [localSkills, setLocalSkills] = useState([...skills])
  const [localInterests, setLocalInterests] = useState([...interests])
  const [skillInput, setSkillInput] = useState("")
  const [interestInput, setInterestInput] = useState("")
  const [avatarFile, setAvatarFile] = useState(null)

  useEffect(() => {
    setForm({
      name: profile.name || "",
      year: profile.year || "",
      department: profile.department || "",
      college: profile.college || "",
      bio: profile.bio || "",
    })
    setLocalSkills([...skills])
    setLocalInterests([...interests])
  }, [profile, skills, interests])

  const handleAddSkill = () => {
    const v = skillInput.trim()
    if (!v) return
    if (!localSkills.includes(v)) setLocalSkills((s) => [...s, v])
    setSkillInput("")
  }
  const handleAddInterest = () => {
    const v = interestInput.trim()
    if (!v) return
    if (!localInterests.includes(v)) setLocalInterests((i) => [...i, v])
    setInterestInput("")
  }
  const removeSkill = (s) => setLocalSkills((arr) => arr.filter((x) => x !== s))
  const removeInterest = (i) => setLocalInterests((arr) => arr.filter((x) => x !== i))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      profile: form,
      skills: localSkills,
      interests: localInterests,
      avatar: avatarFile,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Edit Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="p-6 overflow-y-auto">
          {/* Top grid: name/year/department/college */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Year</label>
              <input
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="e.g. 3rd year"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Department"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">College</label>
              <input
                value={form.college}
                onChange={(e) => setForm({ ...form, college: e.target.value })}
                className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="College"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-600">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="mt-2 w-full px-3 py-3 border rounded-lg min-h-[110px] resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Short bio"
            />
          </div>

          {/* Bottom area: Avatar + Skills & Interests */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Avatar column */}
            <div className="flex flex-col items-center lg:items-start">
              <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                No avatar
              </div>
              <label className="mt-3 text-sm text-slate-600">Choose avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="mt-2 text-sm"
              />
            </div>

            {/* Skills (span 2 columns on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Skills */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Skills</h4>
                  <p className="text-xs text-slate-400">Tip: press Enter to add</p>
                </div>

                {/* chips + input */}
                <div className="mt-3 bg-slate-50 border rounded-lg px-4 py-3">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {localSkills.length > 0 ? (
                      localSkills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm"
                        >
                          {s}
                          <button type="button" onClick={() => removeSkill(s)} className="p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">No skills added yet</div>
                    )}
                  </div>

                  {/* input row: ensure it can shrink (min-w-0) */}
                  <div className="flex items-center gap-3">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddSkill()
                        }
                      }}
                      placeholder="Add a skill..."
                      className="flex-1 min-w-0 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Interests</h4>
                  <p className="text-xs text-slate-400">Tip: press Enter to add</p>
                </div>

                <div className="mt-3 bg-slate-50 border rounded-lg px-4 py-3">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {localInterests.length > 0 ? (
                      localInterests.map((i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm"
                        >
                          {i}
                          <button type="button" onClick={() => removeInterest(i)} className="p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">No interests added yet</div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddInterest()
                        }
                      }}
                      placeholder="Add an interest..."
                      className="flex-1 min-w-0 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}
