// src/main.jsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./auth/AuthContext"
import { CompetitionsProvider } from "./contexts/CompetitionsContext"
import { ProjectsProvider } from "./contexts/ProjectsContext"
import { StudentProvider } from "./contexts/StudentContext"
import { ChatProvider } from "./contexts/ChatContext"
import { ThemeProvider } from "./contexts/ThemeContext" // <- added
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>                    {/* ThemeProvider wraps app so pages can use useTheme() */}
          <CompetitionsProvider>
            <ProjectsProvider>
              <StudentProvider>
                <ChatProvider>
                  <App />
                </ChatProvider>
              </StudentProvider>
            </ProjectsProvider>
          </CompetitionsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
