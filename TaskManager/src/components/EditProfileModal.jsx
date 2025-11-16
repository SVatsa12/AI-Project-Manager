// src/components/EditProfileModal.jsx
import React, { useEffect, useState } from "react"
import { X, PlusCircle, Trash2, User, GraduationCap, Building2, BookOpen, Sparkles } from "lucide-react"

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
    console.log("[EditProfileModal] Adding skill:", v)
    if (!v) return
    if (!localSkills.includes(v)) setLocalSkills((s) => [...s, v])
    setSkillInput("")
  }
  const handleAddInterest = () => {
    const v = interestInput.trim()
    console.log("[EditProfileModal] Adding interest:", v)
    if (!v) return
    if (!localInterests.includes(v)) setLocalInterests((i) => [...i, v])
    setInterestInput("")
  }
  const removeSkill = (s) => setLocalSkills((arr) => arr.filter((x) => x !== s))
  const removeInterest = (i) => setLocalInterests((arr) => arr.filter((x) => x !== i))

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("[EditProfileModal] Submitting form:", {
      profile: form,
      skills: localSkills,
      interests: localInterests,
    })
    onSave({
      profile: form,
      skills: localSkills,
      interests: localInterests,
      avatar: avatarFile,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/60 to-pink-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Edit Your Profile</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:bg-white/20 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1 ml-14">Update your information and skills</p>
        </div>

        {/* Content (scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <h4>Basic Information</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Year</label>
                <input
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="e.g. 3rd year"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="Your department"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">College</label>
                <input
                  value={form.college}
                  onChange={(e) => setForm({ ...form, college: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="Your college"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">About You</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[80px] resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100"></div>

          {/* Skills Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-slate-700">Skills</h4>
              </div>
              <p className="text-xs text-slate-400">Press Enter to add</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {localSkills.length > 0 ? (
                  localSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-medium shadow-sm"
                    >
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="p-0.5 hover:bg-indigo-100 rounded transition">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-1">No skills added yet</div>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Interests Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-slate-700">Interests</h4>
              </div>
              <p className="text-xs text-slate-400">Press Enter to add</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl px-4 py-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {localInterests.length > 0 ? (
                  localInterests.map((i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 text-xs font-medium shadow-sm"
                    >
                      {i}
                      <button type="button" onClick={() => removeInterest(i)} className="p-0.5 hover:bg-purple-100 rounded transition">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-1">No interests added yet</div>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddInterest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-white transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-medium shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
