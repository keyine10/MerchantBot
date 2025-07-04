import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import Query, { IQuery } from "../../models/Query";
import { MerchantBotClient } from "../../types/client";
import logger from "../../utils/logger";

export default {
  data: new SlashCommandBuilder()
    .setName("check-tracked")
    .setDescription("Manually check your tracked queries for new items")
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;

      // Get user's tracked queries
      const trackedQueries: IQuery[] = await Query.find({
        userId,
        isTracked: true,
      });

      if (trackedQueries.length === 0) {
        return interaction.editReply({
          content:
            "You don't have any tracked queries. Use `/list-queries` to enable tracking for your queries.",
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🔍 Manual Query Check")
        .setColor(0x0099ff)
        .setDescription(
          `Checking ${trackedQueries.length} tracked queries for new items...`
        )
        .addFields(
          ...trackedQueries.map((query) => ({
            name: query.name,
            value: `**Keyword:** ${
              query.searchParams.keyword || "None"
            }\n**Tracked:** ✅`,
            inline: true,
          }))
        )
        .setTimestamp()
        .setFooter({
          text: "You will receive DMs with any new items found. This may take a moment.",
        });

      await interaction.editReply({ embeds: [embed] });

      // Trigger manual check using the cron service
      const client = interaction.client as MerchantBotClient;
      if (client.cronService) {
        try {
          await client.cronService.checkTrackedQueries(userId);
          await interaction.followUp({
            content:
              "✅ Manual check completed. You should have received DMs for any new items found.",
          });
        } catch (error) {
          logger.error(`Error during manual check: ${error}`);
          await interaction.followUp({
            content:
              "⚠️ Manual check initiated but there may have been some errors.",
          });
        }
      } else {
        await interaction.followUp({
          content: "⚠️ Cron service not available. Please try again later.",
        });
      }
    } catch (error) {
      logger.error(`Error in check-tracked command:${error}`);
      await interaction.editReply({
        content: "There was an error while checking your queries!",
      });
    }
  },
};
