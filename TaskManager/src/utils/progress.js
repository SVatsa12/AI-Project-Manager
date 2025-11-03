// utils/progress.js
export function projectProgress(project) {
  const tasks = project.tasks || []
  if (tasks.length === 0) return { percent: 0, done: 0, total: 0 }
  const done = tasks.filter(t => t.status === 'done').length
  const percent = Math.round((done / tasks.length) * 100)
  return { percent, done, total: tasks.length }
}
