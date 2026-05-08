import { logger } from "@/lib/logger";
import axios from "axios";
// API configuration - Update these URLs to match your actual backend endpoints
export const API_CONFIG = {
  BASE_URL: "http://localhost:3000",
  
  ENDPOINTS: {
    BOT_LOGIN: "/bot-profile/login",
    JOIN_MEETING: "/google-bot/join",
    LEAVE_MEETING: "/google-bot/leave",
    SUMMARIZE: "/ai/summarize",
  },
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MeetingJoinResponse {
  meetingId: string;
  status: "joined" | "failed";
}

export interface MeetingLeaveResponse {
  status: "left" | "failed";
}

export interface SummaryResponse {
  meetingSummary: string;
  keyDiscussionPoints: string[];
  participantContributions: Record<string, string>;
  participantCount: number;
  notes: string;
}

export function mapSummaryResponse(raw: Record<string, unknown>): SummaryResponse {
  let participantContributions: Record<string, string> = {};
  if (Array.isArray(raw.participants)) {
    participantContributions = raw.participants.reduce((acc, participant) => {
      if (participant && typeof participant === 'object' && 'name' in participant && 'summary' in participant) {
        acc[participant.name as string] = participant.summary as string;
      }
      return acc;
    }, {} as Record<string, string>);
  } else if (raw.participants && typeof raw.participants === 'object') {
    participantContributions = raw.participants as Record<string, string>;
  }

  return {
    meetingSummary: (raw.summary as string) || "",
    keyDiscussionPoints: (raw.key_points as string[]) ?? [],
    participantContributions,
    participantCount: Number(raw.participant_count) || 0,
    notes: (raw.notes as string) ?? ""
  };
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  logger.api.info(`Request: ${options.method || "GET"} ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (response.ok) {
      const data = await response.json();
      logger.api.info(`Response: ${response.status} OK`, { endpoint });
      return { success: true, data };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Request failed with status ${response.status}`;
      logger.api.error(`Response: ${response.status} Error`, { endpoint, error: errorMessage });
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    logger.api.error(`Network Error: ${errorMessage}`, { endpoint });
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

export const api = {
  botLogin: async (): Promise<ApiResponse<{ status: string }>> => {
    logger.auth.info("Initiating bot login");
    const result = await apiCall<{ status: string }>(API_CONFIG.ENDPOINTS.BOT_LOGIN, {
      method: "POST",
    });
    if (result.success) {
      logger.auth.info("Bot login successful");
    } else {
      logger.auth.error("Bot login failed", { error: result.error });
    }
    return result;
  },

  joinMeeting: async (meetingLink: string): Promise<ApiResponse<MeetingJoinResponse>> => {
    logger.meeting.info("Joining meeting", { meetingLink });
    const result = await apiCall<MeetingJoinResponse>(API_CONFIG.ENDPOINTS.JOIN_MEETING, {
      method: "POST",
      body: JSON.stringify({
        meetURL: meetingLink,
      }),
    });
    if (result.success) {
      logger.meeting.info("Successfully joined meeting", { meetingId: result.data?.meetingId });
    } else {
      logger.meeting.error("Failed to join meeting", { error: result.error });
    }
    return result;
  },

  leaveMeeting: async (meetingId: string): Promise<ApiResponse<MeetingLeaveResponse>> => {
    logger.meeting.info("Leaving meeting", { meetingId });
    const result = await apiCall<MeetingLeaveResponse>(API_CONFIG.ENDPOINTS.LEAVE_MEETING, {
      method: "POST",
      body: JSON.stringify({ meetingId }),
    });
    if (result.success) {
      logger.meeting.info("Successfully left meeting");
    } else {
      logger.meeting.error("Failed to leave meeting", { error: result.error });
    }
    return result;
  },

  getSummary: async (): Promise<ApiResponse<SummaryResponse>> => {
    logger.meeting.info("Fetching meeting summary");
    const result = await apiCall<SummaryResponse>(API_CONFIG.ENDPOINTS.SUMMARIZE, {
      method: "GET"
    });
    if (result.success) {
      logger.meeting.info("Summary fetched successfully");
    } else {
      logger.meeting.error("Failed to fetch summary", { error: result.error });
    }
    return result;
  },

  async getTranscript(): Promise<{ transcript: string }> {
    const res = await axios.get("http://localhost:3000/ai/transcript");
    logger.meeting.info("Fetched transcript");
    return res.data;
  }
};
