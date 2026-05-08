export const SELECTORS = {
  TURN_ON_CAPTIONS_BUTTON: 'button[aria-label="Turn on captions"]',
  // Button to turn on captions

  CAPTIONS_REGION: '[aria-label="Captions"]',
  // Region where captions appear

  PEOPLE_BUTTON: 'button[aria-label*="People"]',
  // Button showing people count (e.g., "People - 5 joined")

  ROLE_JOIN_BUTTON: { role: "button", name: /join/i },
  // "Join" button on Google Meet page

  ROLE_GOT_IT_BUTTON: { role: "button", name: /got it/i },
  // Dismiss popup "Got it"

  ROLE_TURN_ON_CAPTIONS_BY_ROLE: { role: "button", name: "Turn on captions" },
  // Alternative role-based caption button

  LEAVE_MEETING_BUTTON : 'button[aria-label="Leave call"]',
  // Button to leave meeting
}as const;
