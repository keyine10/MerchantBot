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
    ButtonInteraction,
    StringSelectMenuInteraction,
} from 'discord.js';
import Query, { IQuery } from '../../models/Query';
import searchCommand from './search';
import { MercariItemConditionId, MercariSearchOrder, MercariSearchSort } from '../../mercari/types';

function buildQueryEmbedAndSelectRow(queries: IQuery[], selectedQuery: string, interaction: ChatInputCommandInteraction, embedTitle = 'Your Saved Queries') {
    if (queries.length === 0) {
        throw new Error('No queries found for the user.');
    }
    const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setColor(0x0099ff)
        .setDescription('Select a query and use the buttons below to manage your queries.');
    
    // Only show basic query info if no query is selected
    if (!selectedQuery) {
        queries.forEach((query: IQuery) => {
            const { keyword, excludeKeyword, priceMin, priceMax } = query.searchParams;
            let fieldValue = `Keyword: ${keyword}`;
            if (excludeKeyword) fieldValue += `\nExclude: ${excludeKeyword}`;
            if (priceMin) fieldValue += `\nMin Price: ${priceMin}¥`;
            if (priceMax) fieldValue += `\nMax Price: ${priceMax}¥`;
            fieldValue += `\nTracked: ${query.isTracked ? '✅' : '❌'}`;
            embed.addFields({ name: query.name, value: fieldValue });
        });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_query:${interaction.id}`)
        .setPlaceholder('Select a query')
        .addOptions(
            queries.map(query => {
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(query.name)
                    .setValue(query.name)
                    .setDescription(`Keyword: ${query.searchParams.keyword?.substring(0, 90) || 'No keyword'}`);
                if (query.name === selectedQuery) {
                    option.setDefault(true);
                }
                return option;
            })
        );
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    return { embed, selectRow };
}

async function handleSelectQuery(componentInteraction: StringSelectMenuInteraction, interaction: ChatInputCommandInteraction, queries: IQuery[], buttonRow: ActionRowBuilder<ButtonBuilder>, selectedQuery: string) {
    const value = componentInteraction.values[0];
    if (value) {
        selectedQuery = value;
        const query = queries.find(q => q.name === selectedQuery);
        if (query) {
            // Create a detailed view of the selected query's search parameters
            const { embed, selectRow } = buildQueryEmbedAndSelectRow(queries, selectedQuery, interaction, `Selected Query: ${selectedQuery}`);
            
            // Add a field showing all search parameters
            const params = query.searchParams;
            let paramsText = '';
            
            if (params.keyword) paramsText += `**Keyword:** \`${params.keyword}\`\n`;
            if (params.excludeKeyword) paramsText += `**Exclude:** \`${params.excludeKeyword}\`\n`;
            if (params.priceMin) paramsText += `**Min Price:** ${params.priceMin}¥\n`;
            if (params.priceMax) paramsText += `**Max Price:** ${params.priceMax}¥\n`;
            if (params.sort) paramsText += `**Sort:** ${params.sort}\n`;
            if (params.order) paramsText += `**Order:** ${params.order}\n`;
            if (params.itemConditionId && params.itemConditionId.length > 0) {
                const conditionNames = params.itemConditionId.map(id => {
                    switch(id) {
                        case MercariItemConditionId.NEW: return 'New';
                        case MercariItemConditionId.ALMOSTNEW: return 'Almost New';
                        case MercariItemConditionId.NOSCRATCHES: return 'No Scratches';
                        case MercariItemConditionId.SMALLSCRATCHES: return 'Small Scratches';
                        case MercariItemConditionId.SCRATCHED: return 'Scratched';
                        case MercariItemConditionId.BAD: return 'Bad';
                        default: return `ID: ${id}`;
                    }
                });
                paramsText += `**Item Conditions:** ${conditionNames.join(', ')}\n`;
            }
            if (params.createdAfterDate && params.createdAfterDate !== '0') {
                paramsText += `**Created After:** <t:${params.createdAfterDate}:R>\n`;
            }
            if (params.createdBeforeDate && params.createdBeforeDate !== '0') {
                paramsText += `**Created Before:** <t:${params.createdBeforeDate}:R>\n`;
            }
            paramsText += `**Tracked:** ${query.isTracked ? '✅' : '❌'}`;
            
            embed.addFields({ name: 'Search Parameters', value: paramsText || 'No parameters set' });
            
            await interaction.editReply({
                embeds: [embed],
                components: [selectRow, buttonRow],
            });
        }
    }
    return selectedQuery;
}

async function handleRunQuery(componentInteraction: ButtonInteraction, selectedQuery: string, queries: IQuery[], interaction: ChatInputCommandInteraction) {
    if (selectedQuery) {
        const query = queries.find(q => q.name === selectedQuery);
        if (!query) {
            await componentInteraction.followUp({
                content: 'Query not found.',
                flags: 'Ephemeral',
            });
            return;
        }
        // Use the search command's logic to run the search
        try {
            const {
                keyword = '',
                excludeKeyword = '',
                priceMin = 300,
                priceMax = 9999999,
                sort = MercariSearchSort.CREATED_TIME,
                order = MercariSearchOrder.DESC,
                itemConditionId = [],
            } = query.searchParams || {};
            // Convert itemConditionId to boolean for itemConditionUsed
            const itemConditionUsed = Array.isArray(itemConditionId) && itemConditionId.length > 0;
            // Pass the componentInteraction instead of the original interaction
            await searchCommand.runSearch(
                componentInteraction,
                {
                    keyword,
                    excludeKeyword,
                    priceMin,
                    priceMax,
                    sort,
                    order,
                    itemConditionUsed
                },
            );
        } catch (err) {
            console.log(err);
            await componentInteraction.followUp({
                content: 'Failed to run search.' + err,
                flags: 'Ephemeral',
            });
        }
    } else {
        await componentInteraction.followUp({
            content: 'Query not selected or not found.',
            flags: 'Ephemeral',
        });
    }
}

async function handleToggleTrackQuery(componentInteraction: ButtonInteraction, selectedQuery: string, userId: string) {
    const query = await Query.findOne({ userId, name: selectedQuery });
    if (selectedQuery && query) {
        query.isTracked = !query.isTracked;
        await query.save();
        await componentInteraction.followUp({
            content: `Tracking for "${selectedQuery}" is now ${query.isTracked ? 'enabled ✅' : 'disabled ❌'}.`,
        });
    } else if (!selectedQuery) {
        await componentInteraction.followUp({
            content: 'No query selected.',
            flags: 'Ephemeral',
        });
    } else {
        await componentInteraction.followUp({
            content: 'Query not found.',
            flags: 'Ephemeral',
        });
    }
}

async function handleDeleteQuery(componentInteraction: ButtonInteraction, interaction: ChatInputCommandInteraction, queries: IQuery[], buttonRow: ActionRowBuilder<ButtonBuilder>, selectedQuery: string, userId: string) {
    if (selectedQuery) {
        const result = await Query.deleteOne({ userId, name: selectedQuery });
        if (result.deletedCount > 0) {
            const updatedQueries = queries.filter(q => q.name !== selectedQuery);
            if (updatedQueries.length === 0) {
                await interaction.editReply({
                    content: 'You have no saved queries. Use `/create-query` to create one.',
                    embeds: [],
                    components: [],
                });
                return '';
            }

            const { embed: updatedEmbed, selectRow: updatedSelectRow } = buildQueryEmbedAndSelectRow(updatedQueries, '', interaction, 'Your Saved Queries');
            await interaction.editReply({
                embeds: [updatedEmbed],
                components: [updatedSelectRow, buttonRow],
            });
            return ''; // Reset selectedQuery after successful deletion
        } else {
            await componentInteraction.followUp({
                content: 'Query not found or already deleted.',
            });
        }
    } else {
        await componentInteraction.followUp({
            content: 'No query selected.',
            flags: 'Ephemeral',
        });
    }
    return selectedQuery; // Return unchanged if deletion failed or no query selected
}

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
            let selectedQuery: string = '';

            const queries: IQuery[] = await Query.find({ userId });

            if (queries.length === 0) {
                return interaction.editReply({
                    content: 'You don\'t have any saved queries yet. Use `/create-query` to create one.',
                });
            }

            // Build initial embed and select menu
            const { embed, selectRow } = buildQueryEmbedAndSelectRow(queries, selectedQuery, interaction);

            // Buttons for managing queries
            const runButton = new ButtonBuilder()
                .setCustomId(`run_query:${interaction.id}`)
                .setLabel('Run query')
                .setStyle(ButtonStyle.Primary);

            const trackButton = new ButtonBuilder()
                .setCustomId(`toggle_track_query:${interaction.id}`)
                .setLabel('Toggle Tracking')
                .setStyle(ButtonStyle.Primary);

            const deleteButton = new ButtonBuilder()
                .setCustomId(`delete_query:${interaction.id}`)
                .setLabel('Delete Query')
                .setStyle(ButtonStyle.Danger);

            const buttonRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(runButton, trackButton, deleteButton);

            await interaction.editReply({
                embeds: [embed],
                components: [selectRow, buttonRow],
            });

            const collectorFilter = (i: any) =>
                (
                    i.customId.startsWith(`select_query:${interaction.id}`) ||
                    i.customId.startsWith(`run_query:${interaction.id}`) ||
                    i.customId.startsWith(`toggle_track_query:${interaction.id}`) ||
                    i.customId.startsWith(`delete_query:${interaction.id}`)) &&
                i.user.id === interaction.user.id;

            if (interaction.channel && typeof interaction.channel.createMessageComponentCollector === 'function') {
                const collector = interaction.channel.createMessageComponentCollector({
                    filter: collectorFilter,
                    time: 600000
                });

                collector.on('collect', async (componentInteraction: ButtonInteraction | StringSelectMenuInteraction) => {
                    await componentInteraction.deferUpdate();
                    console.log(`Component ${componentInteraction.customId} clicked`);
                    const customId = componentInteraction.customId.replace(`:${interaction.id}`, '');
                    switch (customId) {
                        case 'select_query': {
                            if (componentInteraction.isStringSelectMenu()) {
                                selectedQuery = await handleSelectQuery(componentInteraction, interaction, queries, buttonRow, selectedQuery);
                            }
                            break;
                        }
                        case 'run_query': {
                            if (componentInteraction.isButton()) {
                                await handleRunQuery(componentInteraction, selectedQuery, queries, interaction);
                            }
                            break;
                        }
                        case 'toggle_track_query': {
                            if (componentInteraction.isButton()) {
                                await handleToggleTrackQuery(componentInteraction, selectedQuery, userId);
                            }
                            break;
                        }
                        case 'delete_query': {
                            if (componentInteraction.isButton()) {
                                selectedQuery = await handleDeleteQuery(componentInteraction, interaction, queries, buttonRow, selectedQuery, userId);
                            }
                            break;
                        }
                        default:
                            break;
                    }
                });

                collector.on('end', async () => {
                    await interaction.editReply({
                        components: [],
                    });
                });
            }
        } catch (error) {
            console.error('Error in list-queries command:', error);
            await interaction.editReply({
                content: 'There was an error while executing this command!',
            });
        }
    },
};