// server/routes/chat.js
const express = require("express");
const router = express.Router();
const GoogleClient = require("../services/googleClient"); // new client
const { conversationStore } = require("../services/conversationStore");
const { requireAuthIfEnabled } = require("../middleware/authMiddleware");

/**
 * Minimal payload validator used by the chat route.
 * Returns null when valid, otherwise returns a string message or an object describing errors.
 *
 * Shape expected:
 *  {
 *    message: string,            // required
 *    conversationId?: string     // optional (if present we look up conversation)
 *  }
 *
 * You should replace / extend this with your project's real validator when available.
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Invalid payload"
  const errors = []

  if (!("message" in payload)) {
    errors.push("`message` is required")
  } else if (typeof payload.message !== "string" || payload.message.trim().length === 0) {
    errors.push("`message` must be a non-empty string")
  }

  if ("conversationId" in payload && payload.conversationId !== undefined && payload.conversationId !== null) {
    if (typeof payload.conversationId !== "string" || payload.conversationId.trim() === "") {
      errors.push("`conversationId`, if provided, must be a non-empty string")
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return null
}

/**
 * System prompt used to prime the assistant with context about the AITaskManager application.
 * This provides the chatbot with knowledge about the app's features and functionality.
 */
const systemPrompt = `You are the AITaskManager Assistant, a helpful AI that guides users through the AITaskManager application.

**About AITaskManager:**
AITaskManager is a comprehensive project and task management platform designed for teams, especially students and educational groups. It helps make group projects fair by automatically allocating tasks based on team members' skills and availability.

**Key Features:**
1. **Smart Task Allocation**: AI-powered system that fairly distributes tasks among team members based on their skills, availability, and workload
2. **Student Dashboard**: View assigned tasks, track progress, and manage personal workload
3. **Admin Dashboard**: Manage students, create and assign projects, monitor team progress
4. **Project Management**: Create projects, define tasks, set deadlines, and track completion
5. **Competition/Hackathon Support**: Participate in coding competitions and hackathons
6. **Leaderboard**: Track individual and team performance with gamification
7. **Real-time Chat**: Get instant help from this AI assistant about features and workflows
8. **User Authentication**: Secure login for students and administrators

**User Roles:**
- **Students**: Can view assigned tasks, update progress, participate in competitions, and manage their profiles
- **Admins**: Can create projects, manage students, allocate tasks, monitor progress, and configure system settings

**Main Pages:**
- Landing Page: Introduction to features and how the system works
- Login/Signup: User authentication
- Student Dashboard: Personal task view and statistics
- Admin Dashboard: Overview of all students and projects
- Projects Page: Browse and manage all projects
- Students Page: View and manage student roster (admin only)
- Competitions: Browse and join hackathons
- Leaderboard: View rankings and achievements
- Settings: Manage profile and preferences

**How to Get Started:**
1. Sign up or log in to the platform
2. Complete your profile with skills and availability
3. Admins can create projects and the AI will suggest fair task allocations
4. Students can view assigned tasks and update progress
5. Track your progress on the leaderboard

**Demo Flow:**
1. Create an account (student or admin role)
2. Admin: Create a new project with multiple tasks
3. Admin: Use the AI allocator to fairly distribute tasks based on skills
4. Student: View assigned tasks on your dashboard
5. Update task progress and earn points
6. Check the leaderboard to see your ranking

Be concise, friendly, and helpful. Answer questions about features, guide users through workflows, and help them understand how to use the platform effectively. If users ask about specific functionality, explain it clearly with step-by-step instructions when needed.`

router.post("/", requireAuthIfEnabled, async (req, res) => {
  try {
    const err = validatePayload(req.body)
    if (err) {
      // support both string and structured error responses
      if (typeof err === "string") return res.status(400).json({ error: err })
      return res.status(400).json({ error: "validation_error", details: err.errors || err })
    }

    const { message, conversationId } = req.body

    const ctx = conversationId ? (conversationStore.get(conversationId) || []) : []
    const messages = [
      { role: "system", content: systemPrompt },
      ...ctx.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ]

    // send to Google client - adapt params as needed for your wrapper
    const reply = await GoogleClient.chat({ messages, max_output_tokens: 700 })

    if (conversationId) {
      // store both user message and assistant reply (make sure your conversationStore supports push/get)
      conversationStore.push(conversationId, { role: "user", content: message })
      conversationStore.push(conversationId, { role: "assistant", content: reply })
    }

    return res.json({ reply })
  } catch (err) {
    console.error("Chat route error:", err)
    if (err.name === "GoogleAPIError" || (err.message && err.message.includes("timed out"))) {
      return res.status(502).json({ error: "Upstream Google generative API error. Try again later." })
    }
    return res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
