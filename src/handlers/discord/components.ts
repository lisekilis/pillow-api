import {
	APIMessage,
	APIMessageComponentInteraction,
	ImageFormat,
	MessageFlags,
	MessageType,
	RouteBases,
	Routes,
} from 'discord-api-types/v10';
import { messageResponse, updateResponse } from './responses';
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

	const user = interaction.message.interaction_metadata.user;
	const message = interaction.message;
	const embed = message.embeds[0];
	const fields = embed.fields;

	if (!fields) {
		return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
	}

	const pillowName = fields.find((field) => field.name === 'Name:')?.value;
	const pillowType = fields.find((field) => field.name === 'Type:')?.value;
	const pillowId = `${user.id}_${pillowType}`;

	if (!pillowName || !pillowType) {
		return messageResponse('The submission lacks a name or type', MessageFlags.Ephemeral);
	}

	const userName = embed.title?.split("'s Pillow Submission")[0];

	if (!userName) {
		return messageResponse('The submission lacks a user name', MessageFlags.Ephemeral);
	}

	switch (interaction.data.custom_id) {
		case 'approve':
			try {
				const pillow = await env.FRY_PILLOW_SUBMISSIONS.get(pillowId);
				if (!pillow) {
					return messageResponse('The pillow submission was not found', MessageFlags.Ephemeral);
				}
				await env.FRY_PILLOWS.put(pillowId, pillow.body, {
					httpMetadata: pillow.httpMetadata,
					customMetadata: {
						...pillow.customMetadata,
						discordApproverId: interaction.member.user.id,
						submittedAt: pillow.uploaded.toISOString(),
					},
				});
				// delete the submission
				await env.FRY_PILLOW_SUBMISSIONS.delete(pillowId);
				// update the message
				const newEmbedApprove = {
					...embed,
					footer: {
						text: `Approved by <@${interaction.member.user.id}>`,
						icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
					},
					timestamp: new Date().toISOString(),
				};
				const approveResponse = await fetch(
					RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token),
					updateResponse({
						content: '',
						embeds: [newEmbedApprove],
						components: [],
						attachments: [
							{
								id: interaction.message.attachments[0].id,
							},
						],
					})
				);
				if (!approveResponse.ok) {
					console.error(`Error updating message: ${await approveResponse.text()}`);
					return messageResponse('An error occurred while updating the message', MessageFlags.Ephemeral);
				}
				return messageResponse(
					`Approved pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>
					[View Pillow](https://pillows.fry.api.lisekilis.dev/${pillowId})`,
					MessageFlags.Ephemeral
				);
			} catch (error) {
				console.error('Error in approve flow:', error);
				return messageResponse(
					`An error occurred while approving: ${error instanceof Error ? error.message : String(error)}`,
					MessageFlags.Ephemeral
				);
			}

		case 'deny':
			try {
				// delete the submission
				await env.FRY_PILLOW_SUBMISSIONS.delete(pillowId);

				const newEmbedDeny = {
					...embed,
					footer: {
						text: `Denied by <@${interaction.member.user.id}>`,
						icon_url: `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`,
					},
					timestamp: new Date().toISOString(),
				};

				const denyResponse = await fetch(
					RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token),
					updateResponse({
						content: '',
						embeds: [newEmbedDeny],
						components: [],
						attachments: interaction.message.attachments,
					})
				);

				if (!denyResponse.ok) {
					console.error(`Error updating message: ${await denyResponse.text()}`);
				}

				console.log(`Denied pillow submission: ${pillowName} (${pillowType}) by ${userName}`);

				return messageResponse(
					`Denied pillow submission: ${pillowName} (${pillowType}) by <@${interaction.message.interaction_metadata.user.id}>`,
					MessageFlags.Ephemeral
				);
			} catch (error) {
				console.error('Error in deny flow:', error);
				return messageResponse(
					`An error occurred while denying: ${error instanceof Error ? error.message : String(error)}`,
					MessageFlags.Ephemeral
				);
			}

		default:
			return messageResponse('Unknown button interaction', MessageFlags.Ephemeral);
	}
}
