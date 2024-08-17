const axios = require('axios');
const dayjs = require('dayjs');

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

// Function to send message to Discord
const sendDiscordNotification = async (fileName, fileUrl) => {
		if (!webhookUrl) {
				console.error('Discord webhook URL not set in environment variables');
				return;
		}

		const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss'); // Current Indian time

		const message = {
				content: `**{==========} \`NEW FILE\` {==========}**\n\n` +
								 `**- [${fileName}](${fileUrl})**\n` +
								 `**- \`${timestamp}\`**\n` +
								 `**- By LegendYt4k\n` +
								 `{================================}**`,
		};

		try {
				await axios.post(webhookUrl, message);
				console.log('Notification sent to Discord successfully');
		} catch (error) {
				console.error('Error sending notification to Discord:', error);
		}
};

module.exports = sendDiscordNotification;  // Export the function using CommonJS syntax
