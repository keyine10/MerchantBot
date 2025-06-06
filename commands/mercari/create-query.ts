import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ApplicationIntegrationType,
    InteractionContextType,
} from 'discord.js';
import mercari from '../../mercari/mercari';
import Query from '../../models/Query';
import { MercariSearchOrder, MercariSearchSort, MercariSearchStatus } from '../../mercari/types';

export default {
    data: new SlashCommandBuilder()
        .setName('create-query')
        .setDescription('Create a named search query that can be rerun later')
        .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)

        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Name of the query')
                .setMaxLength(100)
                .setMinLength(1)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('keyword')
                .setDescription('Keyword to search for')
                .setMaxLength(100)
                .setMinLength(1)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('exclude_keyword')
                .setDescription('Exclude keyword')
                .setMaxLength(100)
                .setMinLength(0)
        )
        .addNumberOption((option) =>
            option
                .setName('price_min')
                .setDescription('Minimum item price')
                .setMinValue(300)
        )
        .addNumberOption((option) =>
            option
                .setName('price_max')
                .setDescription('Maximum item price')
                .setMaxValue(9999999)
        )
        .addStringOption((option) =>
            option
                .setName('sort')
                .setDescription('sort items by default/date/likes/score/price')
                .addChoices(
                    (Object.keys(MercariSearchSort) as Array<keyof typeof MercariSearchSort>).map((key) => ({
                        name: key,
                        value: MercariSearchSort[key],
                    }))
                )
        )
        .addStringOption((option) =>
            option
                .setName('order')
                .setDescription('order items in ascending/descending')
                .addChoices(
                    (Object.keys(MercariSearchOrder) as Array<keyof typeof MercariSearchOrder>).map((key) => ({
                        name: key,
                        value: MercariSearchOrder[key],
                    }))
                )
        )
        .addBooleanOption((option) =>
            option
                .setName('item_condition_used')
                .setDescription('search for used items only')
        )
        .addBooleanOption(option =>
            option.setName('track')
                .setDescription('Track this query for notifications')),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const name = interaction.options.getString('name', true).trim();
            const keyword = interaction.options.getString('keyword', true).trim();
            const excludeKeyword = interaction.options.getString('exclude_keyword')?.trim() || '';
            const priceMin = interaction.options.getNumber('price_min') || 300;
            const priceMax = interaction.options.getNumber('price_max') || 9999999;
            const sort = interaction.options.getString('sort') as MercariSearchSort || MercariSearchSort.CREATED_TIME;
            const order = interaction.options.getString('order') as MercariSearchOrder || MercariSearchOrder.DESC;
            const itemConditionUsed = interaction.options.getBoolean('item_condition_used') || false;
            const isTracked = interaction.options.getBoolean('track') || false;
            const itemConditionId = itemConditionUsed ? [2, 3, 4, 5, 6] : [];

            // Check if a query with the same keyword already exists for this user
            const existingQuery = await Query.findOne({ 
                userId, 
                'searchParams.keyword': keyword 
            });

            if (existingQuery) {
                return interaction.editReply({
                    content: `⚠️ You already have a query with the keyword "${keyword}". Each keyword must be unique per user. Please use a different keyword.`,
                });
            }

            // Build search parameters
            const searchParams = {
                keyword,
                excludeKeyword,
                priceMin,
                priceMax,
                sort,
                order,
                itemConditionId,
            };

            // Save query to database
            const query = new Query({
                userId,
                name,
                searchParams,
                isTracked,
                lastResults: []
            });

            await query.save();

            return interaction.editReply({
                content: `✅ Query "${name}" has been created successfully${isTracked ? ' and will be tracked for notifications' : ''}.`,
            });
        } catch (error) {
            console.error('Error creating query:', error);

            if (error.code === 11000) { // Duplicate key error
                // Check if the error is specifically about the keyword uniqueness
                if (error.message.includes('searchParams.keyword')) {
                    return interaction.editReply({
                        content: `⚠️ You already have a query with this keyword. Each keyword must be unique per user. Please use a different keyword.`,
                    });
                } else {
                    return interaction.editReply({
                        content: '⚠️ A query with this name already exists. Please choose a different name.',
                    });
                }
            }

            return interaction.editReply({
                content: '⚠️ An error occurred while creating the query.',
            });
        }
    },
};