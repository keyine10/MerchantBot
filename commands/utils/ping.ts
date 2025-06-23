import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord-api-types/v10";
import { execSync } from "child_process";
import logger from "../../utils/logger";

const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and bot information!")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const start = Date.now();
      await interaction.deferReply();
      const latency = Date.now() - start;

      // Get git commit information
      let commitHash = "Unknown";
      let commitDate = "Unknown";
      let commitMessage = "Unknown";

      try {
        const gitInfo = execSync(`git log -1 --format="%h|%ai|%s"`, {
          encoding: "utf8",
          cwd: process.cwd(),
        })
          .trim()
          .split("|");

        if (gitInfo.length >= 3 && gitInfo[0] && gitInfo[1] && gitInfo[2]) {
          commitHash = gitInfo[0];
          commitDate = new Date(gitInfo[1]).toLocaleString();
          commitMessage = gitInfo[2];
        }
      } catch (error) {
        // Fallback if git command fails
        logger.warn("Could not fetch git information:", error);
      }

      const embed = new EmbedBuilder()
        .setTitle("🏓 Pong!")
        .setColor(0x00ff00)
        .addFields(
          { name: "📡 API Latency", value: `${latency}ms`, inline: true },
          {
            name: "🤖 Bot Latency",
            value: `${interaction.client.ws.ping}ms`,
            inline: true,
          },
          { name: "\u200b", value: "\u200b", inline: true }, // Empty field for layout
          {
            name: "📝 Latest Commit",
            value: `\`${commitHash}\``,
            inline: true,
          },
          {
            name: "📅 Commit Date",
            value:
              commitDate !== "Unknown"
                ? `<t:${Math.floor(new Date(commitDate).getTime() / 1000)}:F>`
                : "Unknown",
            inline: true,
          },
          { name: "\u200b", value: "\u200b", inline: true }, // Empty field for layout
          {
            name: "💬 Commit Message",
            value:
              commitMessage.length > 100
                ? commitMessage.substring(0, 97) + "..."
                : commitMessage,
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error in ping command:", error);
      await interaction.editReply({
        content: "Pong! (Error fetching additional info)",
      });
    }
  },
};

export default pingCommand;
