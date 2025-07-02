import cron from "node-cron";
import { EmbedBuilder, User } from "discord.js";
import Query, { IQuery } from "../models/Query";
import mercariInstance from "../mercari/mercari";
import {
  MercariSearchResult,
  MercariItem,
  MercariItemConditionIdObject,
  MercariSearchSort,
} from "../mercari/types";
import { MerchantBotClient } from "../types/client";
import searchCommand from "../commands/mercari/search";
import logger from "../utils/logger";

export class CronJobService {
  private client: MerchantBotClient;
  private isRunning = false;
  private cronTask: ReturnType<typeof cron.schedule> | null = null;

  constructor(client: MerchantBotClient) {
    this.client = client;
  }

  start() {
    if (this.isRunning) {
      logger.info("Cron jobs are already running");
      return;
    }

    logger.info("Starting cron jobs...");

    const cronSchedule = "*/10 * * * *";
    this.cronTask = cron.schedule(cronSchedule, async () => {
      logger.info("Running tracked queries check...");
      await this.checkTrackedQueries();
    });

    this.isRunning = true;
    logger.info("Cron jobs started successfully");
  }

  stop() {
    if (!this.isRunning) {
      logger.info("Cron jobs are not running");
      return;
    }

    if (this.cronTask) {
      this.cronTask.destroy();
      this.cronTask = null;
    }
    this.isRunning = false;
    logger.info("Cron jobs stopped");
  }

  public async checkTrackedQueries(userId?: string) {
    if (userId)
      logger.info(`Manually checking tracked queries for user: ${userId}`);
    try {
      // Get all tracked queries from database
      let trackedQueries: IQuery[] = await Query.find({ isTracked: true });
      if (userId) {
        // Filter queries for specific user if provided
        trackedQueries = trackedQueries.filter(
          (query) => query.userId === userId
        );
      }

      if (trackedQueries.length === 0) {
        logger.info("No tracked queries found");
        return;
      }

      logger.info(`Found ${trackedQueries.length} tracked queries`);

      // Process all queries and collect updates
      const bulkUpdates: any[] = [];
      const notifications: Array<{
        user: User;
        query: IQuery;
        searchResult: MercariSearchResult;
      }> = [];

      // Process each tracked query
      await Promise.all(
        trackedQueries.map((query) =>
          this.processTrackedQueryForBatch(query).then((result) => {
            if (result) {
              if (result.bulkUpdate) {
                bulkUpdates.push(result.bulkUpdate);
              }
              if (result.notification) {
                notifications.push(result.notification);
              }
            }
            return result;
          })
        )
      );

      // Execute all database updates in a single batch operation
      if (bulkUpdates.length > 0) {
        logger.info(`Executing batch update for ${bulkUpdates.length} queries`);
        await Query.bulkWrite(bulkUpdates);
        logger.info("Batch update completed successfully");
      }

      // Send all notifications
      notifications.map(
        async (notificationData) =>
          await this.sendQueryResults(
            notificationData.user,
            notificationData.query,
            notificationData.searchResult
          )
      );
    } catch (error) {
      logger.error("Error checking tracked queries:", error);
    }
  }

  private async processTrackedQueryForBatch(query: IQuery): Promise<{
    bulkUpdate?: any;
    notification?: {
      user: User;
      query: IQuery;
      searchResult: MercariSearchResult;
    };
  } | null> {
    try {
      logger.info(`Processing query: ${query.name} for user: ${query.userId}`);

      // Perform search with the query parameters - only get items created after last run
      const now = new Date();
      const lastRunTimestamp = query.lastRun
        ? Math.floor(query.lastRun.getTime() / 1000)
        : Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000); // Default to 24 hours ago if no last run
      logger.info(`lastRun: ${query.lastRun}, now: ${now}`);
      logger.info(
        `Last run timestamp for query ${query.name}: ${lastRunTimestamp}`
      );
      const searchResult: MercariSearchResult = await mercariInstance.search({
        keyword: query.searchParams.keyword,
        excludeKeyword: query.searchParams.excludeKeyword,
        priceMin: query.searchParams.priceMin,
        priceMax: query.searchParams.priceMax,
        sort: MercariSearchSort.DEFAULT,
        itemConditionId: query.searchParams.itemConditionId,
        // createdAfterDate: lastRunTimestamp.toString(),
        createdAfterDate: query.searchParams.createdAfterDate || "0",
        createdBeforeDate: query.searchParams.createdBeforeDate || "0",
        pageSize: 2000,
      });

      const bulkUpdate = {
        updateOne: {
          filter: { _id: query._id },
          update: {
            $set: {
              lastRun: now,
            },
          },
        },
      };

      // Only take items that were updated after the last run timestamp
      searchResult.items = searchResult.items.filter((item: MercariItem) => {
        return Number(item.updated) > lastRunTimestamp;
      });

      // Get the user for notification
      const user = await this.client.users.fetch(query.userId);
      if (!user) {
        logger.info(`User not found: ${query.userId}`);
        // Delete all queries for this user since they don't exist anymore
        logger.info(
          `User ${query.userId} not found, deleting all their queries`
        );
        await Query.deleteMany({ userId: query.userId });
        return null;
      }

      if (!searchResult.items || searchResult.items.length === 0) {
        logger.info(`No new items found for query: ${query.name}`);
        return { bulkUpdate };
      }

      return {
        bulkUpdate,
        notification: { user, query, searchResult },
      };
    } catch (error) {
      logger.error(`Error processing query ${query.name}:`, error);
      return null;
    }
  }

  private async sendQueryResults(
    user: User,
    query: IQuery,
    searchResult: MercariSearchResult
  ) {
    try {
      const newItems = searchResult.items;
      const hasNewItems = newItems.length > 0;

      const embed = new EmbedBuilder()
        .setTitle(`🔔 Tracked Query: ${query.name}`)
        .setColor(hasNewItems ? 0x00ff00 : 0x0099ff)
        .setDescription(
          (hasNewItems
            ? `🆕 Found ${newItems.length} new items matching your tracked query!`
            : `Found ${searchResult.meta.numFound} items matching your tracked query`) +
            "\nCheck item details with `/item <item_id>` command."
        )
        .setTimestamp();

      let queryInfo = "";
      if (query.searchParams.keyword)
        queryInfo += `**Keyword:** ${query.searchParams.keyword}\n`;
      if (query.searchParams.excludeKeyword)
        queryInfo += `**Exclude:** ${query.searchParams.excludeKeyword}\n`;
      if (query.searchParams.priceMin)
        queryInfo += `**Min Price:** ${query.searchParams.priceMin}¥\n`;
      if (query.searchParams.priceMax)
        queryInfo += `**Max Price:** ${query.searchParams.priceMax}¥\n`;
      if (
        query.searchParams.itemConditionId &&
        query.searchParams.itemConditionId.length > 0
      ) {
        queryInfo += `**Condition:** ${query.searchParams.itemConditionId
          .map((id) => MercariItemConditionIdObject[id])
          .join(", ")}\n`;
      }
      if (queryInfo) {
        embed.addFields({
          name: "Search Parameters",
          value: queryInfo,
          inline: false,
        });
      }
      await user.send({ embeds: [embed] });

      // Add items and send in batches of 5 embeds per message
      const itemsPerMessage = 5;
      for (let i = 0; i < newItems.length; i += itemsPerMessage) {
        const itemsToShow = newItems.slice(i, i + itemsPerMessage);
        const embeds = searchCommand.createEmbedForItems(itemsToShow);
        await user.send({ embeds });
      }

      logger.info(
        `Sent query results to user ${user.username} for query: ${query.name}`
      );
    } catch (error) {
      logger.error(`Error sending query results to user ${user.id}:`, JSON.stringify(error));
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}
