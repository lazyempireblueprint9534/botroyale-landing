import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check queue every 10 seconds and start matches if enough bots
crons.interval(
  "check queue and start matches",
  { seconds: 10 },
  internal.gameEngine.checkQueueAndStartMatch
);

export default crons;
