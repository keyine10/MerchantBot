import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import mercari from '../../mercari/mercari';
import Query from '../../models/Query';
import { MercariSearchOrder, MercariSearchSort, MercariSearchStatus } from '../../mercari/types';

export default {
    data: new SlashCommandBuilder()
        .setName('create-query')
        .setDescription('Create a named search query that can be rerun later')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of the query')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('keyword')
                .setDescription('Search keyword')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('exclude')
                .setDescription('Keywords to exclude'))
        .addNumberOption(option => 
            option.setName('pricemin')
                .setDescription('Minimum price'))
        .addNumberOption(option => 
            option.setName('pricemax')
                .setDescription('Maximum price'))
        .addStringOption(option => 
            option.setName('sort')
                .setDescription('Sort by')
                .addChoices(
                    { name: 'Created Time', value: MercariSearchSort.CREATED_TIME },
                    { name: 'Price', value: MercariSearchSort.PRICE },
                    { name: 'Likes', value: MercariSearchSort.NUM_LIKES },
                ))
        .addStringOption(option => 
            option.setName('order')
                .setDescription('Sort order')
                .addChoices(
                    { name: 'Ascending', value: MercariSearchOrder.ASC },
                    { name: 'Descending', value: MercariSearchOrder.DESC },
                ))
        .addBooleanOption(option => 
            option.setName('track')
                .setDescription('Track this query for notifications')),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        
        try {
            const userId = interaction.user.id;
            const name = interaction.options.getString('name', true);
            const keyword = interaction.options.getString('keyword', true);
            const excludeKeyword = interaction.options.getString('exclude') || '';
            const priceMin = interaction.options.getNumber('pricemin') || 0;
            const priceMax = interaction.options.getNumber('pricemax') || 0;
            const sort = interaction.options.getString('sort') as MercariSearchSort || MercariSearchSort.CREATED_TIME;
            const order = interaction.options.getString('order') as MercariSearchOrder || MercariSearchOrder.DESC;
            const isTracked = interaction.options.getBoolean('track') || false;

            // Build search parameters
            const searchParams = {
                keyword,
                excludeKeyword,
                priceMin,
                priceMax,
                sort,
                order,
                status: [MercariSearchStatus.ON_SALE]
            };

            // Test the search to ensure it works
            const testSearch = await mercari.search({
                ...searchParams,
                pageSize: 1
            });

            // Save query to database
            const query = new Query({
                userId,
                name,
                searchParams,
                isTracked,
                lastResults: testSearch.items?.map(item => item.id) || []
            });

            await query.save();

            return interaction.editReply({
                content: `✅ Query "${name}" has been created successfully${isTracked ? ' and will be tracked for notifications' : ''}.`,
            });
        } catch (error) {
            console.error('Error creating query:', error);
            
            if (error.code === 11000) { // Duplicate key error
                return interaction.editReply({
                    content: '⚠️ A query with this name already exists. Please choose a different name.',
                });
            }
            
            return interaction.editReply({
                content: '⚠️ An error occurred while creating the query.',
            });
        }
    },
};