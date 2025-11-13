import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, Loader2 } from "lucide-react";

import ProjectCard from "../components/ProjectCard";
import { useProjectsBackend } from "../contexts/ProjectsBackendContext";
import { useAuth } from "../auth/AuthContext";

export default function StudentProjectsPage() {
  const { projects, loading: isLoading, updateProject } = useProjectsBackend();
  const auth = useAuth();
  const userEmail = auth?.user?.email?.toLowerCase();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTech, setSelectedTech] = useState("all");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const safeProjects = useMemo(
    () => (Array.isArray(projects) ? projects : []),
    [projects]
  );

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return safeProjects.find((p) => p.id === selectedProjectId);
  }, [selectedProjectId, safeProjects]);

  const allTechs = useMemo(() => {
    const techSet = new Set(safeProjects.flatMap((p) => p.techStack || []));
    return ["all", ...Array.from(techSet)];
  }, [safeProjects]);

  const filteredProjects = useMemo(() => {
    return safeProjects
      .filter((p) => {
        const lowerQuery = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery)
        );
      })
      .filter((p) => {
        if (selectedTech === "all") return true;
        return p.techStack?.includes(selectedTech);
      })
      .filter((p) => {
        const isJoined = p.members?.includes(userEmail);
        if (activeTab === "joined") return isJoined;
        if (activeTab === "available") return !isJoined;
        return true;
      });
  }, [safeProjects, searchQuery, selectedTech, activeTab, userEmail]);

  const handleJoin = async (project) => {
    try {
      const updatedMembers = [...(project.members || []), userEmail];
      await updateProject(project.id, { members: updatedMembers });
    } catch (err) {
      console.error('Failed to join project:', err);
      alert('Failed to join project. Please try again.');
    }
  };

  const handleLeave = async (project) => {
    try {
      const updatedMembers = (project.members || []).filter(m => m !== userEmail);
      await updateProject(project.id, { members: updatedMembers });
      if (selectedProjectId === project.id) {
        closeDrawer();
      }
    } catch (err) {
      console.error('Failed to leave project:', err);
      alert('Failed to leave project. Please try again.');
    }
  };

  const handleSetProgress = async (projectId, status) => {
    try {
      // Update user's progress status in project metadata
      const project = safeProjects.find(p => p.id === projectId);
      if (!project) return;
      
      const userProgress = project.userProgress || {};
      userProgress[userEmail] = status;
      
      await updateProject(projectId, { userProgress });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const openDrawer = (project) => {
    setSelectedProjectId(project.id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedProjectId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-lg text-gray-600">Loading Projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Projects Portal
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Discover, collaborate, and bring ideas to life.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <div className="relative">
              <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full appearance-none pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                {allTechs.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech === "all" ? "All Technologies" : tech}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200/80 mb-6 flex items-center justify-between">
          <div className="flex space-x-2">
            {["all", "joined", "available"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 pr-2">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {filteredProjects.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {safeProjects.length}
            </span>{" "}
            projects
          </p>
        </div>

        <AnimatePresence>
          {/* 
            FIX: Removed the `layout` prop from this motion.div.
            This will prevent the "weird" reshuffling animation when you switch tabs.
            The `AnimatePresence` component will handle the entrance and exit of cards.
          */}
          <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((p) => {
              const isJoined = p.members?.includes(userEmail);
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isJoined={isJoined}
                  userEmail={userEmail}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  onOpen={openDrawer}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>

        {safeProjects.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-700">
              No Projects Available
            </h3>
            <p className="text-gray-500 mt-1">
              Please check back later, or contact an administrator to add new
              projects.
            </p>
          </div>
        )}
      </main>

      <ProjectDrawer
        project={selectedProject}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onSetProgress={handleSetProgress}
        onLeave={handleLeave}
        userEmail={userEmail}
      />
    </div>
  );
}

const ProjectDrawer = ({
  project,
  isOpen,
  onClose,
  onSetProgress,
  onLeave,
  userEmail,
}) => {
  if (!project) return null;

  const status = project?.userProgress?.[userEmail] ?? "not-started";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{project.category}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 my-4">{project.description}</p>
            <div className="space-y-4">
              <InfoRow label="Technology Stack" items={project.techStack} />
              <InfoRow
                label="Timeline"
                value={`${project.startDate} to ${project.endDate}`}
              />
              <InfoRow
                label="Team Members"
                value={project.members?.join(", ") || "None"}
              />
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-2">Your Progress</h4>
              <select
                value={status}
                onChange={(e) => onSetProgress(project.id, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="almost-done">Almost Done</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="mt-6">
              <button
                onClick={() => onLeave(project)}
                className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Project
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const InfoRow = ({ label, value, items }) => (
  <div>
    <h5 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
      {label}
    </h5>
    {value && <p className="text-sm text-gray-700 mt-1">{value}</p>}
    {Array.isArray(items) && (
      <div className="flex flex-wrap gap-2 mt-2">
        {items.map((item) => (
          <span
            key={item}
            className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    )}
  </div>
);