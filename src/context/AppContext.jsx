import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { tasksService } from '../services/tasksService';
import { membersService } from '../services/membersService';
import { calendarService } from '../services/calendarService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- 초기 데이터 로딩 ----
  useEffect(() => {
    Promise.all([
      tasksService.getAll(),
      membersService.getAll(),
      calendarService.getAll(),
    ])
      .then(([tasksData, membersData, eventsData]) => {
        setTasks(tasksData);
        setMembers(membersData);
        setCalendarEvents(eventsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ---- Members ----
  const addMember = useCallback(async (member) => {
    const created = await membersService.create(member);
    setMembers((prev) => [...prev, created]);
  }, []);

  const updateMember = useCallback(async (id, updates) => {
    const updated = await membersService.update(id, updates);
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, []);

  const deleteMember = useCallback(async (id) => {
    await membersService.delete(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setTasks((prev) =>
      prev.map((t) => (t.assignee === id ? { ...t, assignee: null } : t))
    );
  }, []);

  // ---- Tasks ----
  const addTask = useCallback(async (task) => {
    const created = await tasksService.create(task);
    setTasks((prev) => [...prev, created]);
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    const updated = await tasksService.update(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const deleteTask = useCallback(async (id) => {
    await tasksService.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---- Calendar Events ----
  const addCalendarEvent = useCallback(async (event) => {
    const created = await calendarService.create(event);
    setCalendarEvents((prev) => [...prev, created]);
  }, []);

  const deleteCalendarEvent = useCallback(async (id) => {
    await calendarService.delete(id);
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        tasks,
        calendarEvents,
        members,
        loading,
        error,
        addTask,
        updateTask,
        deleteTask,
        addMember,
        updateMember,
        deleteMember,
        addCalendarEvent,
        deleteCalendarEvent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
