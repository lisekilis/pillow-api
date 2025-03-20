import { verifyKey } from 'discord-interactions';
import { PillowType } from './types';
import {
	APIBaseInteraction,
	InteractionType,
	InteractionResponseType,
	APIApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIChatInputApplicationCommandGuildInteraction,
	APIMessageComponentButtonInteraction,
	MessageFlags,
	APIApplicationCommandInteractionDataStringOption,
	APIInteractionResponse,
	ApplicationCommandOptionType,
} from 'discord-api-types/v10';
import { getTimestamp } from 'discord-snowflake';

export async function handleListPillows(env: Env): Promise<Response> {
	const list = await env.FRY_PILLOWS.list();

	const files =
		list.objects?.map((obj: R2Object) => ({
			key: obj.key,
			pillowType: obj.customMetadata?.pillowType || PillowType.NORMAL,
			pillowName: obj.customMetadata?.pillowName || '',
			submittedAt: obj.customMetadata?.submittedAt || new Date(),
			discordApproverId: obj.customMetadata?.discordApproverId || 0,
			discordUserId: obj.customMetadata?.discordUserId || 0,
			userName: obj.customMetadata?.userName || '',
		})) || [];
	return new Response(JSON.stringify(files), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handleGetPillow(env: Env, pillowId: string): Promise<Response> {
	const object = await env.FRY_PILLOWS.get(pillowId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	const body = await object.arrayBuffer();
	return new Response(body, {
		headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' },
	});
}
export async function handleGetPillowData(env: Env, pillowId: string): Promise<Response> {
	const object = await env.FRY_PILLOWS.get(pillowId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	return new Response(JSON.stringify(object.customMetadata), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handleUploadPillow(request: Request, env: Env): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const discordUserId = formData.get('discordUserId') as string;
		const discordApproverId = formData.get('discordApproverId') as string;
		const pillowName = formData.get('pillowName') as string;
		const submittedAt = (formData.get('submittedAt') as string) || new Date().toISOString();
		const pillowType = formData.get('pillowType') as PillowType;
		const userName = formData.get('userName') as string;
		if (!file || !(file instanceof File)) {
			return new Response('File missing or invalid', { status: 400 });
		}
		if (!discordUserId || !userName || !pillowName || !pillowType) {
			return new Response('Missing discordUserId, userName, pillowName or pillowType', { status: 400 });
		}
		const key = `${discordUserId}_${pillowType}`;

		await env.FRY_PILLOWS.put(key, file.stream(), {
			httpMetadata: {
				contentType: file.type,
			},
			customMetadata: {
				discordUserId,
				discordApproverId,
				submittedAt,
				pillowName,
				pillowType,
				userName,
			},
		});

		return new Response(JSON.stringify({ success: true, key }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Upload failed', { status: 500 });
	}
}
export async function handleDeletePillow(env: Env, pillowId: string): Promise<Response> {
	try {
		await env.FRY_PILLOWS.delete(pillowId);
		return new Response(JSON.stringify({ success: true, key: pillowId }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Delete failed', { status: 500 });
	}
}
export async function handleListImages(env: Env): Promise<Response> {
	const list = await env.FRY_PHOTOS.list();
	const files =
		list.objects?.map((obj: R2Object) => ({
			key: obj.key,
			submittedAt: obj.customMetadata?.submittedAt || new Date(),
			date: obj.customMetadata?.date || '',
			discordUserId: obj.customMetadata?.discordUserId || 0,
			userName: obj.customMetadata?.userName || '',
		})) || [];
	return new Response(JSON.stringify(files), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handleGetImage(env: Env, imageId: string): Promise<Response> {
	const object = await env.FRY_PHOTOS.get(imageId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	const body = await object.arrayBuffer();
	return new Response(body, {
		headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' },
	});
}
export async function handleGetImageData(env: Env, imageId: string): Promise<Response> {
	const object = await env.FRY_PHOTOS.get(imageId);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}
	return new Response(JSON.stringify(object.customMetadata), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handleUploadImage(request: Request, env: Env): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const discordUserId = formData.get('discordUserId') as string;
		const submittedAt = (formData.get('submittedAt') as string) || new Date().toISOString();
		const date = formData.get('date') as string;
		const userName = formData.get('userName') as string;

		if (!file || !(file instanceof File)) {
			return new Response('File missing or invalid', { status: 400 });
		}
		if (!discordUserId || !userName) {
			return new Response('Missing discordUserId or userName', { status: 400 });
		}
		const key = crypto.randomUUID();

		await env.FRY_PHOTOS.put(key, file.stream(), {
			httpMetadata: {
				contentType: file.type,
			},
			customMetadata: {
				discordUserId,
				submittedAt,
				date,
				userName,
			},
		});

		return new Response(JSON.stringify({ success: true, key }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Upload failed', { status: 500 });
	}
}
export async function handleDeleteImage(env: Env, imageId: string): Promise<Response> {
	try {
		await env.FRY_PHOTOS.delete(imageId);
		return new Response(JSON.stringify({ success: true, key: imageId }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Delete failed', { status: 500 });
	}
}
export async function handleGetSettings(env: Env, id: string): Promise<Response> {
	const settings = await env.FRY_SETTINGS.get('settings');
	return new Response(JSON.stringify(settings), {
		headers: { 'Content-Type': 'application/json' },
	});
}
export async function handlePatchSettings(request: Request, env: Env, guildId: string): Promise<Response> {
	try {
		const formData = await request.formData();
		const newSettings = JSON.parse(formData.get('settings') as string); // Fetch existing settings
		await patchSettings(guildId, newSettings, env);
		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return new Response('Update failed', { status: 500 });
	}
}
async function patchSettings(guildId: string, settings: any, env: Env): Promise<void> {
	const existingSettings = await env.FRY_SETTINGS.get(guildId);
	const parsedSettings = existingSettings ? JSON.parse(existingSettings) : {};
	const updatedSettings = { ...parsedSettings, ...settings };
	await env.FRY_SETTINGS.put(guildId, JSON.stringify(updatedSettings));
}
// Discord interactions
export async function handleDiscordInteractions(request: Request, env: Env): Promise<Response> {
	const signature = request.headers.get('x-signature-ed25519');
	const timestamp = request.headers.get('x-signature-timestamp');
	const body = await request.text();
	if (!signature || !timestamp || !(await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))) {
		return new Response('Bad request signature', { status: 401 });
	}
	const interaction = JSON.parse(body) as APIBaseInteraction<InteractionType, any>;

	switch (interaction.type) {
		case InteractionType.Ping:
			return new Response(JSON.stringify({ type: InteractionResponseType.Pong }), { status: 200 });
		case InteractionType.ApplicationCommand:
			return await handleApplicationCommand(interaction as APIChatInputApplicationCommandGuildInteraction, env);
		case InteractionType.MessageComponent:
			return handleMessageComponent(interaction as APIMessageComponentInteraction);
		default:
			return new Response('Interaction not handled', { status: 400 });
	}
}
function messageResponse(content: string, flags?: MessageFlags): Response {
	const response: APIInteractionResponse = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			tts: false,
			content,
			embeds: [],
			allowed_mentions: { parse: [] },
			flags,
		},
	};
	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
async function handleApplicationCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	try {
		console.log(`Processing command: ${interaction.data.name}`);

		switch (interaction.data.name) {
			case 'ping':
				return handlePingCommand(interaction);
			case 'config':
				return await handleConfigCommand(interaction, env);
			default:
				console.log(`Unknown command: ${interaction.data.name}`);
				return messageResponse(`Command '${interaction.data.name}' not implemented yet.`, MessageFlags.Ephemeral);
		}
	} catch (error) {
		console.error(`Error in handleApplicationCommand: ${error}`);
		return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
	}
}
async function handleConfigCommand(interaction: APIChatInputApplicationCommandGuildInteraction, env: Env): Promise<Response> {
	if (
		interaction.data.options?.[0].type != ApplicationCommandOptionType.Subcommand &&
		interaction.data.options?.[0].type != ApplicationCommandOptionType.SubcommandGroup
	) {
		return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);
	}
	switch (interaction.data.options?.[0].name) {
		case 'mod':
			if (!interaction.data.options?.[0].options) {
				const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
				const parsedSettings = settings ? JSON.parse(settings) : {};
				if (parsedSettings.modRoleId) {
					return messageResponse(`Current mod role: ${parsedSettings.modRoleId}`, MessageFlags.Ephemeral);
				}
				return messageResponse('No mod role set', MessageFlags.Ephemeral);
			}
			try {
				const roleOption = interaction.data.options?.[0].options?.find(
					(option) => option.name === 'role'
				) as APIApplicationCommandInteractionDataStringOption;
				patchSettings(interaction.guild_id, { modRoleId: roleOption.value }, env);
				console.log(`Setting mod role: ${roleOption.value} for guild: ${interaction.guild_id}`);
				return messageResponse('Mod role set successfully', MessageFlags.Ephemeral);
			} catch (error) {
				console.error(`Error in handleConfigCommand: ${error}`);
				return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
			}
		case 'channel':
			if (interaction.data.options?.[0].options?.[0].type != ApplicationCommandOptionType.Subcommand) {
				break;
			}
			switch (interaction.data.options?.[0].options?.[0].name) {
				case 'pillow':
					if (!interaction.data.options?.[0].options?.[0].options) {
						const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
						const parsedSettings = settings ? JSON.parse(settings) : {};
						if (parsedSettings.pillowChannelId) {
							return messageResponse(`Current pillow channel: ${parsedSettings.pillowChannelId}`, MessageFlags.Ephemeral);
						}
						return messageResponse('No pillow channel set', MessageFlags.Ephemeral);
					}
					try {
						const channelOption = interaction.data.options?.[0].options?.[0].options?.find(
							(option) => option.name === 'channel'
						) as APIApplicationCommandInteractionDataStringOption;
						patchSettings(interaction.guild_id, { pillowChannelId: channelOption.value }, env);
						console.log(`Setting pillow channel: ${channelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse('Pillow channel set successfully', MessageFlags.Ephemeral);
					} catch (error) {
						console.error(`Error in handleConfigCommand: ${error}`);
						return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
					}
				case 'photo':
					if (!interaction.data.options?.[0].options?.[0].options) {
						const settings = await env.FRY_SETTINGS.get(interaction.guild_id);
						const parsedSettings = settings ? JSON.parse(settings) : {};
						if (parsedSettings.photoChannelId) {
							return messageResponse(`Current photo channel: ${parsedSettings.photoChannelId}`, MessageFlags.Ephemeral);
						}
						return messageResponse('No photo channel set', MessageFlags.Ephemeral);
					}
					try {
						const channelOption = interaction.data.options?.[0].options?.[0].options?.find(
							(option) => option.name === 'channel'
						) as APIApplicationCommandInteractionDataStringOption;
						patchSettings(interaction.guild_id, { photoChannelId: channelOption.value }, env);
						console.log(`Setting photo channel: ${channelOption.value} for guild: ${interaction.guild_id}`);
						return messageResponse('Photo channel set successfully', MessageFlags.Ephemeral);
					} catch (error) {
						console.error(`Error in handleConfigCommand: ${error}`);
						return messageResponse('An error occurred while processing the command', MessageFlags.Ephemeral);
					}
			}
		default:
			return messageResponse('Please provide a valid subcommand', MessageFlags.Ephemeral);
	}
}
function handlePingCommand(interaction: APIChatInputApplicationCommandGuildInteraction): Response {
	// Calculate response time in ms
	const interactionTimestamp = getTimestamp(`${BigInt(interaction.id)}`); //1420070400000 - discord epoch
	const responseTime = Date.now() - interactionTimestamp;

	return messageResponse(`🏓 Pong! (Response time: ${responseTime}ms)`);
}
function handleMessageComponent(interaction: APIMessageComponentInteraction): Response {
	switch (interaction.data.custom_id) {
		case 'approve':
			return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
		case 'deny':
			return messageResponse('Button Pressed!', MessageFlags.Ephemeral);
		default:
			return new Response('Button interaction not handled', { status: 400 });
	}
}
