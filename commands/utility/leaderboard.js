const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');

module.exports = {
    // Command registration data.
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top 10 counters in the server.'),

    // Executes the leaderboard command.
    async execute(interaction) {
        const guildId = interaction.guild.id;

        const generateBoard = (type) => {
            let orderBy = 'counts DESC, highest DESC';
            let condition = 'counts > 0 OR ruins > 0'; // ensure at least some stats

            if (type === 'highest') {
                orderBy = 'highest DESC, counts DESC';
                condition = 'highest > 0';
            } else if (type === 'ruins') {
                orderBy = 'ruins DESC, counts ASC';
                condition = 'ruins > 0';
            } else {
                // type === 'total'
                orderBy = 'counts DESC, highest DESC';
                condition = 'counts > 0';
            }

            const users = db.prepare(`
                SELECT user_id, counts as total, highest, ruins 
                FROM user_stats 
                WHERE guild_id = ? AND (${condition})
                ORDER BY ${orderBy} 
                LIMIT 10
            `).all(guildId);

            if (users.length === 0) {
                return `📊 No stats found for this category!`;
            }

            let boardText = '';
            users.forEach((u, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';

                if (type === 'highest') {
                    boardText += `${medal} **#${index + 1}** <@${u.user_id}> — Score: **${u.highest}** 🏆\n`;
                } else if (type === 'ruins') {
                    boardText += `${medal} **#${index + 1}** <@${u.user_id}> — Ruins: **${u.ruins}** 💀\n`;
                } else {
                    boardText += `${medal} **#${index + 1}** <@${u.user_id}> — Total: **${u.total}** 🔢\n`;
                }
            });

            return boardText;
        };

        const createEmbed = (type) => {
            const titleMap = {
                'total': '🏆 Top 10: Total Numbers',
                'highest': '🏆 Top 10: Highest Scores',
                'ruins': '💀 Top 10: Most Ruins'
            };

            const colorMap = {
                'total': 0x00FF00,
                'highest': 0xFFD700,
                'ruins': 0xFF0000
            };

            return new EmbedBuilder()
                .setTitle(titleMap[type])
                .setDescription(generateBoard(type))
                .setColor(colorMap[type])
                .setFooter({ text: `Server: ${interaction.guild.name}` });
        };

        const createButtons = (currentType) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lb_total')
                    .setLabel('Total Numbers')
                    .setStyle(currentType === 'total' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('lb_highest')
                    .setLabel('Top Score')
                    .setStyle(currentType === 'highest' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('lb_ruins')
                    .setLabel('Most Ruins')
                    .setStyle(currentType === 'ruins' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
        };

        let currentType = 'total';

        const embed = createEmbed(currentType);
        const components = createButtons(currentType);

        // Send public message but fetch reply so we can attach a collector
        const reply = await interaction.reply({
            embeds: [embed],
            components: [components],
            fetchReply: true
        });

        // 60-second collector for interactions
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            // Only allow the original command sender to use the buttons
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Run `/leaderboard` yourself to switch categories!', ephemeral: true });
            }

            if (i.customId === 'lb_total') currentType = 'total';
            else if (i.customId === 'lb_highest') currentType = 'highest';
            else if (i.customId === 'lb_ruins') currentType = 'ruins';

            await i.update({
                embeds: [createEmbed(currentType)],
                components: [createButtons(currentType)]
            });
        });

        collector.on('end', () => {
            // Disable buttons after 1 minute so they no longer respond
            const disabledButtons = createButtons(currentType).components.map(b => ButtonBuilder.from(b).setDisabled(true));
            const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    },
};
