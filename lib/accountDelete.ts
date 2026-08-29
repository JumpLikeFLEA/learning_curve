// Shared vocabulary for account deletion (mirrors lib/accountExport.ts).
//
// Pure and dependency-free so both the route handler and the client component
// import the same constants.

export const DELETE_ENDPOINT = "/api/account/delete";

/** The word the user must type to arm the destructive confirm. */
export const DELETE_CONFIRM_PHRASE = "DELETE";

/** What deletion does, for the danger-zone copy. Mirrors Privacy Policy §9. */
export const DELETE_EFFECTS = [
  "Erases your name, public name, city and profile picture",
  "Removes your notifications, preferences and any in-progress quiz",
  "Removes you from every leaderboard",
  "Closes your sign-in — permanently, and this cannot be undone",
] as const;

/** What is deliberately kept, anonymised, and why. */
export const DELETE_RETAINED =
  "Your past quiz results and any questions or quizzes you contributed are kept in " +
  "anonymised form, with no link back to you, so other members' histories and shared " +
  "content stay intact.";

export type DeleteBlockingGroup = { id: string; name: string };
