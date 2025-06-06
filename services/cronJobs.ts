import cron from "node-cron";
import { Client, EmbedBuilder, User } from "discord.js";
import Query, { IQuery } from "../models/Query";
import mercariInstance from "../mercari/mercari";
import { MercariSearchResult, MercariItem } from "../mercari/types";
import { MerchantBotClient } from "../types/client";

export class CronJobService {
  private client: MerchantBotClient;
  private isRunning = false;
  private cronTask: any = null;

  constructor(client: MerchantBotClient) {
    this.client = client;
  }

  start() {
    if (this.isRunning) {
      console.log("Cron jobs are already running");
      return;
    }

    console.log("Starting cron jobs...");

    // Schedule job to run every 5 minutes
    this.cronTask = cron.schedule("*/5 * * * *", async () => {
      console.log("Running tracked queries check...");
      await this.checkTrackedQueries();
    });

    this.isRunning = true;
    console.log("Cron jobs started successfully");
  }

  stop() {
    if (!this.isRunning) {
      console.log("Cron jobs are not running");
      return;
    }

    if (this.cronTask) {
      this.cronTask.destroy();
      this.cronTask = null;
    }
    this.isRunning = false;
    console.log("Cron jobs stopped");
  }

  public async checkTrackedQueries(userId?: string) {
    if (userId)
      console.log(`Manually checking tracked queries for user: ${userId}`);
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
        console.log("No tracked queries found");
        return;
      }

      console.log(`Found ${trackedQueries.length} tracked queries`);

      // Process all queries and collect updates
      const bulkUpdates: any[] = [];
      const notifications: Array<{
        user: User;
        query: IQuery;
        searchResult: MercariSearchResult;
      }> = [];

      // Process each tracked query
      for (const query of trackedQueries) {
        const result = await this.processTrackedQueryForBatch(query);
        if (result) {
          if (result.bulkUpdate) {
            bulkUpdates.push(result.bulkUpdate);
          }
          if (result.notification) {
            notifications.push(result.notification);
          }
        }
        // Add a small delay between API calls to avoid rate limiting
        await this.delay(1000);
      }

      // Execute all database updates in a single batch operation
      if (bulkUpdates.length > 0) {
        console.log(`Executing batch update for ${bulkUpdates.length} queries`);
        await Query.bulkWrite(bulkUpdates);
        console.log("Batch update completed successfully");
      }

      // Send all notifications
      for (const notificationData of notifications) {
        await this.sendQueryResults(
          notificationData.user,
          notificationData.query,
          notificationData.searchResult
        );
        // Small delay between notifications to avoid rate limiting Discord
        await this.delay(500);
      }
    } catch (error) {
      console.error("Error checking tracked queries:", error);
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
      console.log(`Processing query: ${query.name} for user: ${query.userId}`);

      // Perform search with the query parameters - only get items created after last run
      const now = new Date();
      const lastRunTimestamp = query.lastRun
        ? Math.floor(query.lastRun.getTime() / 1000)
        : Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000); // Default to 24 hours ago if no last run
      console.log(
        `Last run timestamp for query ${query.name}: ${lastRunTimestamp}`
      );
      console.log("last run:", query.lastRun.toTimeString());
      const searchResult: MercariSearchResult = await mercariInstance.search({
        keyword: query.searchParams.keyword,
        excludeKeyword: query.searchParams.excludeKeyword,
        priceMin: query.searchParams.priceMin,
        priceMax: query.searchParams.priceMax,
        sort: query.searchParams.sort,
        order: query.searchParams.order,
        itemConditionId: query.searchParams.itemConditionId,
        createdAfterDate: lastRunTimestamp.toString(),
        createdBeforeDate: query.searchParams.createdBeforeDate || "0",
        pageSize: 100,
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

      // Filter items that were created before the last run timestamp
      searchResult.items = searchResult.items.filter((item: MercariItem) => {
        console.log(
          `Checking item ${item.id} created at ${
            item.created
          }, last run at ${lastRunTimestamp},  comparison: ${
            Number(item.created) > lastRunTimestamp
          }`
        );
        return Number(item.created) > lastRunTimestamp;
      });

      if (!searchResult.items || searchResult.items.length === 0) {
        console.log(`No new items found for query: ${query.name}`);
        return { bulkUpdate };
      }

      // Get the user for notification
      const user = await this.client.users.fetch(query.userId);
      if (!user) {
        console.log(`User not found: ${query.userId}`);
        return null;
      }

      return {
        bulkUpdate,
        notification: { user, query, searchResult },
      };
    } catch (error) {
      console.error(`Error processing query ${query.name}:`, error);
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
      const itemsToShow = newItems.slice(0, 5);

      const embed = new EmbedBuilder()
        .setTitle(`🔔 Tracked Query: ${query.name}`)
        .setColor(hasNewItems ? 0x00ff00 : 0x0099ff)
        .setDescription(
          hasNewItems
            ? `🆕 Found ${newItems.length} new items matching your tracked query!`
            : `Found ${searchResult.meta.numFound} items matching your tracked query`
        )
        .setTimestamp();

      // Add query parameters info
      let queryInfo = "";
      if (query.searchParams.keyword)
        queryInfo += `**Keyword:** ${query.searchParams.keyword}\n`;
      if (query.searchParams.excludeKeyword)
        queryInfo += `**Exclude:** ${query.searchParams.excludeKeyword}\n`;
      if (query.searchParams.priceMin)
        queryInfo += `**Min Price:** ${query.searchParams.priceMin}¥\n`;
      if (query.searchParams.priceMax)
        queryInfo += `**Max Price:** ${query.searchParams.priceMax}¥\n`;

      if (queryInfo) {
        embed.addFields({
          name: "Search Parameters",
          value: queryInfo,
          inline: false,
        });
      }

      // Add items
      for (const [index, item] of itemsToShow.entries()) {
        const isNew =
          hasNewItems || newItems.some((newItem) => newItem.id === item.id);
        const itemValue = `**Price:** ${item.price}¥\n**ID:** \`${
          item.id
        }\`\n**Status:** ${item.status}${isNew ? " 🆕" : ""}`;
        embed.addFields({
          name: `${index + 1}. ${item.name.substring(0, 100)}${
            item.name.length > 100 ? "..." : ""
          }`,
          value: itemValue,
          inline: true,
        });
      }

      await user.send({ embeds: [embed] });
      console.log(
        `Sent query results to user ${user.username} for query: ${query.name}`
      );
    } catch (error) {
      console.error(`Error sending query results to user ${user.id}:`, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}
