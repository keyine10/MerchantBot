import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    ApplicationIntegrationType,
    InteractionContextType,
} from 'discord.js';
import Query, { IQuery } from '../../models/Query';

export default {
    data: new SlashCommandBuilder()
        .setName('list-queries')
        .setDescription('List your saved search queries')
        .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            // Find all queries for this user
            const queries: IQuery[] = await Query.find({ userId });

            if (queries.length === 0) {
                return interaction.editReply({
                    content: 'You don\'t have any saved queries yet. Use `/create-query` to create one.',
                });
            }

            // Create embed to display queries
            const embed = new EmbedBuilder()
                .setTitle('Your Saved Queries')
                .setColor(0x0099ff)
                .setDescription('Select a query to run it or use the buttons below to manage your queries.');

            queries.forEach((query: IQuery) => {
                const { keyword, excludeKeyword, priceMin, priceMax } = query.searchParams;
                let fieldValue = `Keyword: ${keyword}`;

                if (excludeKeyword) fieldValue += `\nExclude: ${excludeKeyword}`;
                if (priceMin) fieldValue += `\nMin Price: ${priceMin}¥`;
                if (priceMax) fieldValue += `\nMax Price: ${priceMax}¥`;
                fieldValue += `\nTracked: ${query.isTracked ? '✅' : '❌'}`;

                embed.addFields({ name: query.name, value: fieldValue });
            });

            // Create select menu for running queries
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('run_query')
                .setPlaceholder('Select a query to run')
                .addOptions(
                    queries.map(query => new StringSelectMenuOptionBuilder()
                        .setLabel(query.name)
                        .setValue(query.name)
                        .setDescription(`Keyword: ${query.searchParams.keyword?.substring(0, 90) || 'No keyword'}`)
                    )
                );

            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(selectMenu);

            // Buttons for managing queries
            const trackButton = new ButtonBuilder()
                .setCustomId('toggle_track')
                .setLabel('Toggle Tracking')
                .setStyle(ButtonStyle.Primary);

            const deleteButton = new ButtonBuilder()
                .setCustomId('delete_query')
                .setLabel('Delete Query')
                .setStyle(ButtonStyle.Danger);

            const buttonRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(trackButton, deleteButton);

            await interaction.editReply({
                embeds: [embed],
                components: [selectRow, buttonRow],
            });
        } catch (error) {
            console.error('Error listing queries:', error);
            return interaction.editReply({
                content: 'An error occurred while fetching your queries.',
            });
        }
    },
};