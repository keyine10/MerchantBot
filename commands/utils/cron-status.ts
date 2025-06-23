import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import { MerchantBotClient } from "../../types/client";
import logger from "../../utils/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("cron-status")
    .setDescription("Check the status of the cron job service")
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user has permission to view cron status (you can modify this logic)
      const allowedUserIds = process.env.ALLOWED_USER_IDS
        ? process.env.ALLOWED_USER_IDS.split(",")
        : [];

      if (!allowedUserIds.includes(interaction.user.id)) {
        return interaction.editReply({
          content: "You do not have permission to view cron job status.",
        });
      }

      const client = interaction.client as MerchantBotClient;
      const cronService = client.cronService;
      const status = cronService?.getStatus() || { isRunning: false };

      const embed = new EmbedBuilder()
        .setTitle("🕒 Cron Job Service Status")
        .setColor(status.isRunning ? 0x00ff00 : 0xff0000)
        .setDescription(
          "Current status of the tracked queries notification service"
        )
        .addFields(
          {
            name: "Status",
            value: status.isRunning ? "✅ Running" : "❌ Stopped",
            inline: true,
          },
          {
            name: "Interval",
            value: "Every 5 minutes",
            inline: true,
          },
          {
            name: "Function",
            value: "Checks tracked queries and sends notifications to users",
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter({
          text: "Use /list-queries to manage your tracked queries",
        });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error in cron-status command:", error);
      await interaction.editReply({
        content: "There was an error while checking the cron job status!",
      });
    }
  },
};
