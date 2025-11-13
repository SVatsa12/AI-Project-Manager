import React from "react";
import { motion } from "framer-motion";
import { Users, Calendar } from "lucide-react";



// A helper function to derive percentage directly from the status
function getProgressPercentageFromStatus(status) {
  switch (status) {
    case "completed":
      return 100;
    case "almost-done":
    case "almost_done":
      return 85;
    case "in-progress":
    case "inprogress":
      return 45;
    case "not-started":
    case "not_started":
    default:
      return 0;
  }
}

function normalizeTechStack(techStack) {
  if (!techStack) return [];
  if (Array.isArray(techStack)) {
    return techStack
      .flatMap((t) =>
        typeof t === "string" ? t.split(",").map((s) => s.trim()) : []
      )
      .filter(Boolean);
  }
  if (typeof techStack === "string") {
    return techStack.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function ProjectCard({
  project = {},
  isJoined,
  userEmail,
  onJoin = () => {},
  onLeave = () => {},
  onOpen = () => {},
}) {
  const {
    title = "Untitled Project",
    category = "General",
    description = "No description available.",
    techStack,
    startDate,
    endDate,
    members = [],
    maxMembers = 4,
    userProgress = {},
    tasks = [],
  } = project;

  // This logic ensures the progress bar always reflects the current status from the project prop.
  // For this to work, the `project` prop must be up-to-date.
  let progressPct = 0;
  if (isJoined && userEmail && userProgress[userEmail]) {
    progressPct = getProgressPercentageFromStatus(
      userProgress[userEmail]
    );
  } else {
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const totalTasks = tasks.length > 0 ? tasks.length : 1;
    progressPct = Math.round((doneTasks / totalTasks) * 100);
  }

  console.log('[ProjectCard] Progress calc:', {
    projectId: project.id,
    isJoined,
    userEmail,
    userProgress,
    userProgressForUser: userProgress[userEmail],
    tasks,
    doneTasks: tasks.filter((t) => t.status === "done").length,
    progressPct
  });

  const tech = normalizeTechStack(techStack);

  return (
    <motion.div
      /* 
        FIX: Added initial, animate, and exit props for a smooth fade transition.
        The `layout` prop is kept here to animate changes to the card itself, 
        like if its size changes.
      */
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      layout
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full"
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold tracking-wide">
            {category}
          </span>
        </div>

        <h3 className="font-bold text-gray-800 text-lg mt-3">{title}</h3>
        <p className="text-gray-500 text-sm mt-1 h-12 line-clamp-2">
          {description}
        </p>

        <div className="mt-4">
          <h5 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Tech Stack
          </h5>
          <div className="flex flex-wrap gap-2 mt-2">
            {tech.length > 0 ? (
              tech.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">Not specified</span>
            )}
            {tech.length > 3 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                +{tech.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-3 pb-5 bg-gray-50/50">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{startDate || "TBD"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>
              {members.length}/{maxMembers} Members
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-gray-500">
              Your Progress
            </span>
            <span className="text-xs font-bold text-indigo-600">
              {progressPct}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <motion.div
              className={`h-1.5 rounded-full ${
                progressPct === 100 ? "bg-green-500" : "bg-indigo-600"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {isJoined ? (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onLeave(project)}
                className="w-full px-3 py-2 text-sm font-semibold text-red-600 bg-red-100/50 border border-red-200/80 rounded-lg hover:bg-red-100 transition-colors"
              >
                Leave
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onOpen(project)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Manage
              </motion.button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onJoin(project)}
              className="w-full col-span-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
            >
              Join Project
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}