import { APIMessageComponentInteraction, MessageFlags } from 'discord-api-types/v10';
import { messageResponse } from './responses';
import { isGuildInteraction, isMessageComponentButtonInteraction } from 'discord-api-types/utils';

export async function handleMessageComponent(interaction: APIMessageComponentInteraction, env: Env): Promise<Response> {
	if (!isMessageComponentButtonInteraction(interaction)) {
		return messageResponse('Only buttons are supported', MessageFlags.Ephemeral);
	}

	if (!isGuildInteraction(interaction)) {
		return messageResponse('This interaction is not in a guild', MessageFlags.Ephemeral);
	}

	if (!interaction.message.interaction_metadata?.user) {
		return messageResponse('This interaction has no user', MessageFlags.Ephemeral);
	}

	// Check if the user is a mod
	const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
	const parsedSettings = settings ? JSON.parse(settings) : {};

	if (!parsedSettings.modRoleId) {
		return messageResponse('No mod role set', MessageFlags.Ephemeral);
	}

	if (!interaction.member.roles.includes(parsedSettings.modRoleId)) {
		return messageResponse('Only image moderators are allowed to manage submissions', MessageFlags.Ephemeral);
	}

	const message = interaction.message;
	const embed = message.embeds[0];
	const fields = embed.fields;

	if (!fields) {
		return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
	}

	const pillowName = fields.find((field) => field.name === 'Name:')?.value;
	const pillowType = fields.find((field) => field.name === 'Type:')?.value;

	if (!pillowName || !pillowType) {
		return messageResponse('The submission lacks a name or type', MessageFlags.Ephemeral);
	}

	const userName = embed.title?.split("'s Pillow Submission")[0];

	if (!userName) {
		return messageResponse('The submission lacks a user name', MessageFlags.Ephemeral);
	}

	switch (interaction.data.custom_id) {
		case 'approve':
			// fetch the message
			const freshImageUrl = (
				(await (
					await fetch(`https://discord.com/api/v10/channels/${interaction.channel.id}/messages/${interaction.message.id}`, {
						headers: {
							Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
						},
					})
				).json()) as { embeds: { image: { url: string } }[] }
			).embeds[0].image.url;
			if (!embed.image || !embed.image.url) {
				return messageResponse('The submission lacks a texture, how bizarre!', MessageFlags.Ephemeral);
			}
			console.log(freshImageUrl);
			const textureResponse = await fetch(freshImageUrl);

			if (!textureResponse.ok) {
				console.error(`Error fetching texture: ${textureResponse.status} - ${await textureResponse.text()}`);
				return messageResponse(`Failed to fetch the texture (${textureResponse.status})`, MessageFlags.Ephemeral);
			}

			// Use the body stream directly
			const texture = textureResponse.body;
			if (!texture) {
				return messageResponse('Failed to fetch the texture', MessageFlags.Ephemeral);
			}

			await env.FRY_PILLOWS.put(`${interaction.message.interaction_metadata.user.id}_${pillowType}`, texture, {
				httpMetadata: {
					contentType: 'image/png',
				},
				customMetadata: {
					discordUserId: interaction.message.interaction_metadata.user.id,
					discordApproverId: interaction.member.user.id,
					submittedAt: interaction.message.timestamp,
					pillowName,
					pillowType,
					userName,
				},
			});

			const newEmbed = {
				...embed,
				footer: {
					text: `Approved by ${interaction.member.user.username}`,
					icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
				},
				timestamp: new Date().toISOString(),
			};

			const response = await fetch(
				`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						embeds: [newEmbed],
						components: [],
					}),
				}
			);
			console.log(await response.text());
			if (!response.ok) {
				console.error(`Error updating message: ${await response.text()}`);
			}

			console.log(`Approving pillow submission: ${pillowName} (${pillowType}) by ${userName}`);

			return messageResponse(
				`Approved pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>`,
				MessageFlags.Ephemeral
			);

		case 'deny':
			const newEmbedDeny = {
				...embed,
				footer: {
					text: `Denied by ${interaction.member.user.username}`,
					icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
				},
				timestamp: new Date().toISOString(),
			};

			const denyResponse = await fetch(
				`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						embeds: [newEmbedDeny],
						components: [],
					}),
				}
			);

			if (!denyResponse.ok) {
				console.error(`Error updating message: ${await denyResponse.text()}`);
			}

			console.log(`Denied pillow submission: ${pillowName} (${pillowType}) by ${userName}`);

			return messageResponse(
				`Denied pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>`,
				MessageFlags.Ephemeral
			);

		default:
			return messageResponse('Unknown button interaction', MessageFlags.Ephemeral);
	}
}
