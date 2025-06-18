import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  APIEmbed,
  InteractionContextType,
  ApplicationIntegrationType,
  AttachmentBuilder,
} from "discord.js";
import sharp from "sharp";
import mercari from "../../mercari/mercari";
import {
  MercariItem,
  MercariItemInfo,
  MercariItemTranslation,
  MercariURLs,
  MercariItemConditionId,
} from "../../mercari/types";
import logger from "../../utils/logger";

// Export a function to get item details and translation and return the embed objects
export async function getItemDetailViewModel(
  itemId: string
): Promise<{ embeds: APIEmbed[]; content?: string; photoUrls?: string[] }> {
  if (!itemId) throw new Error("Item ID is required");

  try {
    const itemDetails = await mercari.getItemDetails(itemId);
    if (!itemDetails || !itemDetails.data) {
      return {
        embeds: [
          {
            title: "Item not found",
            description:
              "(This item has been deleted or is no longer available.)",
            color: 0xff0000,
          },
        ],
        content: undefined,
      };
    }
    const translationData: MercariItemTranslation =
      await mercari.getItemTranslation(itemId);
    const item = itemDetails.data;
    // Helper to format numbers with commas
    const formatNumber = (num: number) => num.toLocaleString("en-US");

    // Helper to get condition name
    const getConditionName = (conditionId: MercariItemConditionId) => {
      switch (conditionId) {
        case MercariItemConditionId.NEW:
          return "New";
        case MercariItemConditionId.ALMOSTNEW:
          return "Almost New";
        case MercariItemConditionId.NOSCRATCHES:
          return "No Scratches";
        case MercariItemConditionId.SMALLSCRATCHES:
          return "Small Scratches";
        case MercariItemConditionId.SCRATCHED:
          return "Scratched";
        case MercariItemConditionId.BAD:
          return "Bad";
        default:
          return "Unknown";
      }
    };

    const thumbnailUrl =
      typeof item.photos[0] === "string" ? item.photos[0] : item.photos[0]?.uri;

    // Get all photo URLs
    const getPhotoUrl = (photo: any): string => {
      return typeof photo === "string" ? photo : photo?.uri;
    };

    const allPhotoUrls = item.photos.map(getPhotoUrl).filter(Boolean);

    // Build base fields
    const baseFields = [
      { name: "id", value: `\`${item.id}\``, inline: true },
      {
        name: "price",
        value: `${formatNumber(item?.price)}¥ | ${formatNumber(
          item?.converted_price?.price || item?.converted_price
        )}${item?.converted_price?.currency_code}`,
        inline: true,
      },
      {
        name: "condition",
        value: item.item_condition
          ? `${getConditionName(item.item_condition.id)}`
          : "Unknown",
        inline: true,
      },
      { name: "created", value: `<t:${item.created}:R>`, inline: true },
      { name: "updated", value: `<t:${item.updated}:R>`, inline: true },
      { name: "status", value: item?.status, inline: true },

    ];

    // Add auction fields if auction_info exists
    if (item.auction_info) {
      const auctionFields = [
        {
          name: "auction state",
          value: item.auction_info.state.replace("STATE_", ""),
          inline: true,
        },
        {
          name: "number of bids",
          value: `${item.auction_info.}¥`,
          inline: true,
        },
        {
          name: "highest bid",
          value: `${formatNumber(item.auction_info.highest_bid)}¥`,
          inline: true,
        },
        {
          name: "auction ends",
          value: item.auction_info.expected_end_time
            ? `<t:${item.auction_info.expected_end_time}:R>`
            : "Ended/Unknown",
          inline: true,
        },
      ];
      baseFields.push(...auctionFields);
    }

    const itemOverviewEmbed: APIEmbed = {
      title: translationData.name.substring(0, 100),
      url: MercariURLs.ROOT_PRODUCT + item.id,
      author: {
        name: `${item.seller.id}${
          item.seller.is_official ||
          item.seller.register_sms_confirmation.length > 0
            ? "✅"
            : ""
        } | ${item.seller.num_ratings}(${item.seller.ratings.good}👍${
          item.seller.ratings.bad
        }👎) ${item.seller.star_rating_score}⭐`,
        icon_url: item.seller.photo_thumbnail_url,
        url: `${MercariURLs.USER_PROFILE}${item.seller.id}`,
      },
      ...(thumbnailUrl && { thumbnail: { url: thumbnailUrl } }),
      fields: baseFields,
    };
    const itemDescriptionEmbed: APIEmbed = {
      title: "Item description",
      description: translationData.description,
    };

    // Create comments embed if there are comments
    const embeds = [itemOverviewEmbed, itemDescriptionEmbed];

    if (item.comments && item.comments.length > 0) {
      const commentsEmbed: APIEmbed = {
        title: `Comments (${item.num_comments})`,
        fields: item.comments.slice(0, 5).map((comment, index) => ({
          name: `💬 ${
            comment.user.id.toString() === item.seller.id.toString()
              ? `${comment.user.name} (seller)`
              : comment.user.name
          }`,
          value: `${
            comment.message.length > 200
              ? comment.message.substring(0, 200) + "..."
              : comment.message
          }\n*<t:${comment.created}:R>*`,
          inline: false,
        })),
        ...(item.comments.length > 5 && {
          footer: {
            text: `Showing 5 of ${item.comments.length} comments`,
          },
        }),
      };
      embeds.push(commentsEmbed);
    }

    return {
      embeds: embeds,
      photoUrls: allPhotoUrls,
    };
  } catch (error) {
    logger.error(
      `Error getting item details: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      content:
        "Error getting item details: " +
        (error instanceof Error ? error.message : String(error)),
      embeds: [],
    };
  }
}

const itemCommand = {
  data: new SlashCommandBuilder()
    .setName("item")
    .setDescription("Get details for a specific Mercari item by ID")
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall)
    .addStringOption((option) =>
      option
        .setName("item_id")
        .setDescription("The id of the item ex. m13270631255")
        .setMaxLength(30)
        .setMinLength(12)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const itemId = interaction.options.getString("item_id", true);
    await interaction.deferReply({});
    const result = await getItemDetailViewModel(itemId);

    // Send the main item details
    await interaction.editReply({
      embeds: result.embeds,
      content: result.content,
    });

    // Send photos as attachments in a follow-up message if available
    if (result.photoUrls && result.photoUrls.length > 0) {
      try {
        // Download and create attachments for each photo (limit to 10 for Discord's limit)
        const photosToSend = result.photoUrls.slice(0, 10);

        // Download all photos in parallel for faster processing
        const downloadPromises = photosToSend.map(async (photoUrl, i) => {
          if (!photoUrl) return null;

          try {
            const response = await fetch(photoUrl);
            if (response.ok) {
              const originalBuffer = Buffer.from(await response.arrayBuffer());

              // Compress the image using sharp
              const compressedBuffer = await sharp(originalBuffer)
                .jpeg({
                  quality: 70,
                  progressive: true,
                })
                .toBuffer();
              return new AttachmentBuilder(compressedBuffer, {
                name: `item_photo_${i + 1}.jpg`,
              });
            }
          } catch (error) {
            logger.error(
              `Failed to download/compress photo ${i + 1}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
          return null;
        });

        // Wait for all downloads to complete
        const downloadResults = await Promise.all(downloadPromises);
        const attachments = downloadResults.filter(
          (attachment): attachment is AttachmentBuilder => attachment !== null
        );

        if (attachments.length > 0) {
          await interaction.followUp({
            content: `📸 **Item Photos** (${attachments.length} ${
              attachments.length === 1 ? "photo" : "photos"
            }):`,
            files: attachments,
          });
        }
      } catch (error) {
        logger.error(
          `Error sending photos: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // Fallback to URL method if attachment method fails
        const photoMessage =
          result.photoUrls.length > 1
            ? `📸 **Item Photos** (${
                result.photoUrls.length
              } photos):\n${result.photoUrls.join("\n")}`
            : `📸 **Item Photo**:\n${result.photoUrls[0]}`;

        await interaction.followUp({
          content: photoMessage,
        });
      }
    }
  },
  getItemDetailViewModel, // export for reuse
};

export default itemCommand;
