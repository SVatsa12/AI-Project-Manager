// src/contexts/CompetitionsContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io as ioClient } from "socket.io-client";
import { useAuth } from "../auth/AuthContext";

const CompetitionsContext = createContext();

export function CompetitionsProvider({ children }) {
  const { token, user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const socketRef = useRef(null);

  const BACKEND_API = import.meta.env.VITE_BACKEND_URL || "http://localhost:4003";
  const BACKEND_WS = BACKEND_API;

  async function loadPersisted() {
    try {
      const res = await fetch(`${BACKEND_API}/api/competitions/persisted`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        console.warn("Failed to fetch persisted competitions", res.status);
        return;
      }
      const js = await res.json();
      setCompetitions(js.items || []);
    } catch (e) {
      console.warn("loadPersisted error", e);
    }
  }

  async function createCompetition(payload) {
    try {
      const res = await fetch(`${BACKEND_API}/api/competitions/persisted`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || "Failed to create competition");
      setCompetitions((prev) => [js.competition, ...prev]);
      return js.competition;
    } catch (e) {
      console.error("createCompetition error", e);
      throw e;
    }
  }

  async function enroll(competitionId) {
    if (!token) throw new Error("Not authenticated");
    setCompetitions((prev) =>
      prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: (c.registeredCount || 0) + 1 } : c))
    );
    try {
      const res = await fetch(`${BACKEND_API}/api/competitions/persisted/${competitionId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok) {
        setCompetitions((prev) =>
          prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: Math.max(0, (c.registeredCount || 1) - 1) } : c))
        );
        throw new Error(js.error || "Enroll failed");
      }
      if (js.registeredCount !== undefined) {
        setCompetitions((prev) => prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: js.registeredCount } : c)));
      }
      return js;
    } catch (e) {
      console.error("enroll error", e);
      throw e;
    }
  }

  async function unenroll(competitionId) {
    if (!token) throw new Error("Not authenticated");
    setCompetitions((prev) =>
      prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: Math.max(0, (c.registeredCount || 1) - 1) } : c))
    );
    try {
      const res = await fetch(`${BACKEND_API}/api/competitions/persisted/${competitionId}/enroll`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok) {
        setCompetitions((prev) =>
          prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: (c.registeredCount || 0) + 1 } : c))
        );
        throw new Error(js.error || "Unenroll failed");
      }
      if (js.registeredCount !== undefined) {
        setCompetitions((prev) => prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: js.registeredCount } : c)));
      }
      return js;
    } catch (e) {
      console.error("unenroll error", e);
      throw e;
    }
  }

  // admin enroll as
  async function enrollAs(competitionId, email) {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await fetch(`${BACKEND_API}/api/competitions/persisted/${competitionId}/enroll-as`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || "enroll-as failed");
      // reconcile state
      if (js.registeredCount !== undefined) {
        setCompetitions((prev) => prev.map((c) => (String(c._id) === String(competitionId) ? { ...c, registeredCount: js.registeredCount } : c)));
      }
      return js;
    } catch (e) {
      console.error("enrollAs error", e);
      throw e;
    }
  }

  useEffect(() => {
    const socket = ioClient(BACKEND_WS, {
      auth: { token: token || "" },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('competition:created', (payload) => {
      if (!payload) return;
      setCompetitions(prev => {
        if (prev.some(p => String(p._id) === String(payload._id))) return prev;
        return [payload, ...prev];
      });
    });

    socket.on('competition:enrollment', (payload) => {
      if (!payload || !payload.competitionId) return;
      const id = String(payload.competitionId);
      setCompetitions(prev => prev.map(c => {
        if (String(c._id) === id) {
          return {
            ...c,
            registeredCount: payload.registeredCount !== undefined ? payload.registeredCount : (c.registeredCount || 0) + (payload.action === 'enrolled' ? 1 : -1)
          };
        }
        return c;
      }));
    });

    return () => {
      try { socket.disconnect(); } catch (e) {}
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    loadPersisted();
  }, [token]);

  return (
    <CompetitionsContext.Provider value={{
      competitions,
      loadPersisted,
      createCompetition,
      enroll,
      unenroll,
      enrollAs,
      socket: socketRef.current,
      refresh: loadPersisted
    }}>
      {children}
    </CompetitionsContext.Provider>
  );
}

export function useCompetitions() {
  return useContext(CompetitionsContext);
}