# AI Task Assistant

AI Task Assistant is a full‑stack web application designed to help admins and students manage tasks, projects, and productivity using AI‑powered tools. It includes real‑time collaboration, intelligent suggestions, task allocation via AI, CSV import, and a modern dashboard experience.

---

## 🚀 Features

### **Admin Features**

* **Authentication (JWT‑based)** for secure access.
* **Student Management:**

  * Add students manually.
  * Import students through CSV.
  * Automatic real‑time dashboard updates using Socket.io.
* **AI‑Powered Task Allocation:**

  * Allocates tasks based on skills, difficulty, fairness, and workload.
  * Backend implemented using an Allocation Service.
* **Projects Module:**

  * Create projects.
  * Kanban-style task view.
  * Allocation modal for members.
* **Admin Dashboard:**

  * Student overview.
  * Project analytics.
  * Competitions and productivity charts.

### **Student Features**

* **Clean Student Dashboard** with:

  * Assigned tasks
  * Productivity graph
  * Competition overview
  * AI insights (coming soon)
* **Real‑time task updates** from admin actions.

---

## 🏗️ Tech Stack

### **Frontend**

* React.js (Vite or CRA)
* TailwindCSS (UI styling)
* Recharts (Charts)
* ShadCN UI components

### **Backend**

* Node.js + Express
* MongoDB (Atlas or local)
* Mongoose
* Socket.io (real-time updates)
* JWT Authentication

### **Others**

* CSV Import handling
* Role-based access (admin / student)
* AI logic for task allocation

---

## 📁 Folder Structure (Simplified)

```
AITaskAssistant/
├── .gitignore
├── README.md
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── vite.config.js
│
├── Server/
│   ├── .env
│   ├── config/
│   │   └── db.js
│   │
│   ├── data/
│   │   ├── assignments.json
│   │   ├── projects.json
│   │   ├── users.json
│   │   ├── users.json.bak.1761142325470
│   │   ├── users.json.bak.1761142360839
│   │   └── users.json.bak.1761142373386
│   │
│   ├── invoke-endpoints-interactive.ps1
│   ├── io.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── Competition.js
│   │   ├── Enrollment.js
│   │   ├── Project.js
│   │   └── user.js
│   │
│   ├── routes/
│   │   ├── allocator.js
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── competitionsPersisted.js
│   │   ├── projects.js
│   │   └── students.js
│   │
│   ├── scraper_mlh.html
│   │
│   ├── scripts/
│   │   ├── checkUsers.js
│   │   ├── inspectDB.js
│   │   ├── listUsers.js
│   │   └── set_passwords.js
│   │
│   ├── server.js
│   │
│   ├── services/
│   │   ├── AllocatorService.js
│   │   ├── conversationStore.js
│   │   └── googleClient.js
│   │
│   ├── sources.json
│   ├── test-backend.ps1
│   ├── test-socket.js
│   └── tree.js
│
├── TaskManager/
│   ├── .env
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   │
│   ├── public/
│   │   └── vite.svg
│   │
│   ├── src/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   │
│   │   ├── assets/
│   │   │   └── react.svg
│   │   │
│   │   ├── auth/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── components/
│   │   │   ├── AllocationModal.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   ├── EditProfileModal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── ProjectTabs.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SidebarAdmin.jsx
│   │   │   ├── SidebarStudent.jsx
│   │   │   └── StatCard.jsx
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ChatContext.jsx
│   │   │   ├── CompetitionsContext.jsx
│   │   │   ├── ProjectsBackendContext.jsx
│   │   │   ├── ProjectsContext.jsx
│   │   │   ├── StudentContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   │
│   │   ├── lib/
│   │   │   └── api.js
│   │   │
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminProjectsPage.jsx
│   │   │   ├── CompetitionsPage.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── SettingsAdminPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── StudentProjectsPage.jsx
│   │   │   └── StudentsPage.jsx
│   │   │
│   │   ├── styles/
│   │   │   └── admin-projects.css
│   │   │
│   │   ├── ui/
│   │   │   ├── AuthModal.jsx
│   │   │   ├── CTA.jsx
│   │   │   ├── FeatureModal.jsx
│   │   │   ├── Features.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── HowItWorks.jsx
│   │   │   ├── Logo.jsx
│   │   │   └── PolicyModal.jsx
│   │   │
│   │   ├── utils/
│   │   │   └── progress.js
│   │   │
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   └── vite.config.js

```

---

## ⚙️ Setup Instructions

### **1. Clone the Repo**

```bash
git clone <repo-url>
cd AI-Task-Assistant
```

### **2. Setup Backend**

```bash
cd Server
npm install
```

Create a `.env` file:

```env
PORT=4003
JWT_SECRET=dev-secret-key
MONGO_URI=<your-mongodb-uri>
BCRYPT_SALT_ROUNDS=12
SCRAPER_PROVIDER=scraperapi
SCRAPER_API_KEY=your_key
```

Run backend:

```bash
npm start
```

---

### **3. Setup Frontend**

```bash
cd ../Client
npm install
npm run dev
```

---

## 🔄 API Endpoints (Main)

### **Auth**

* `POST /api/auth/signup`
* `POST /api/auth/login`

### **Students**

* `POST /api/students` – Add student
* `POST /api/students/importcsv` – Import CSV
* `GET /api/students` – Fetch all students

### **Allocator**

* `POST /api/allocator/allocate` – Run AI allocation engine
* `GET /api/allocator/assignments` – Fetch assignments
* `POST /api/allocator/unassign` – Remove assignment

---

## 🤖 AI Task Allocation Logic (Summary)

The AI engine uses the following parameters:

* **Skill Match Weighting**
* **Task Difficulty Score**
* **Student Workload Balance**
* **Fairness Distribution**
* **Clustering for grouping tasks**

This ensures tasks are distributed efficiently, fairly, and smartly.

## 📈 Future Scope

* GitHub integration for auto task syncing.
* Trello/Jira-style board integration.
* AI-powered weekly reports & insights.
* Personalized learning analytics for students.
* Chat-based assistant interface.
* Model-based recommendation system.

## 🧑‍💻 Contributing

Contributions are welcome! Feel free to open PRs or issues.

If you want me to customize the README with logos, badges, or screenshots, just upload them or tell me!
