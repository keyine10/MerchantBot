import { Client, Collection } from "discord.js";

// Forward declaration to avoid circular dependency
declare class CronJobService {
  constructor(client: Client);
  start(): void;
  stop(): void;
  getStatus(): { isRunning: boolean };
  checkTrackedQueries(userId?: string): Promise<void>;
}

// Extend the Client type to include a commands property and cronService
export interface MerchantBotClient extends Client {
  commands: Collection<string, any>;
  cronService?: CronJobService;
}
