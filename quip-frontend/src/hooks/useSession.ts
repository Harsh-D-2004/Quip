import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

const SESSION_KEY = "quip_session";
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface SessionData {
  loginTime: number;
  isInMeeting: boolean;
}

export const useSession = () => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const getSession = (): SessionData | null => {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const createSession = useCallback(() => {
    const session: SessionData = {
      loginTime: Date.now(),
      isInMeeting: false,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setIsValid(true);
    setTimeRemaining(SESSION_DURATION);
    logger.session.info("Session created", { expiresIn: "30 minutes" });
  }, []);

  const setMeetingStatus = useCallback((inMeeting: boolean) => {
    const session = getSession();
    if (session) {
      session.isInMeeting = inMeeting;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      logger.session.info(`Meeting status updated: ${inMeeting ? "IN_MEETING" : "NOT_IN_MEETING"}`);
    }
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsValid(false);
    setTimeRemaining(0);
    logger.session.info("Session cleared");
  }, []);

  const checkSession = useCallback(() => {
    const session = getSession();
    if (!session) {
      setIsValid(false);
      setTimeRemaining(0);
      return false;
    }

    const elapsed = Date.now() - session.loginTime;
    const remaining = SESSION_DURATION - elapsed;

    // If in meeting, session stays valid regardless of time
    if (session.isInMeeting) {
      setIsValid(true);
      setTimeRemaining(Math.max(0, remaining));
      return true;
    }

    // Check if session expired
    if (remaining <= 0) {
      logger.session.warn("Session expired");
      clearSession();
      return false;
    }

    setIsValid(true);
    setTimeRemaining(remaining);
    return true;
  }, [clearSession]);

  useEffect(() => {
    checkSession();
    setIsLoading(false);
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [checkSession]);

  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    isValid,
    isLoading,
    timeRemaining,
    formatTimeRemaining,
    createSession,
    clearSession,
    setMeetingStatus,
    checkSession,
  };
};
