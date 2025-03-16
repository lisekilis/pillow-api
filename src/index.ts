/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {
	handleListPillows,
	handleGetPillow,
	handleDeletePillow,
	handleUploadPillow,
	handleDeleteImage,
	handleGetImage,
	handleGetSettings,
	handleListImages,
	handleUploadImage,
	handleSetSettings,
} from './handlers';

export async function validateToken(request: Request, env: Env): Promise<boolean> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		return false;
	}

	const token = authHeader.replace('Bearer ', '');
	return token === (await env.API_TOKENS.get('fry-api'));
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Validate the token
		if (!validateToken(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}

		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		// Split the path into parts
		const pathParts = path.split('/').filter(Boolean);

		switch (pathParts[0]) {
			case 'pillow':
				switch (true) {
					case method === 'GET' && pathParts[1] === 'list':
						return await handleListPillows(env);

					case method === 'GET' && pathParts[1].startsWith('image/'):
						return await handleGetPillow(env, pathParts[2]);

					case method === 'POST' && pathParts[1] === 'upload':
						return await handleUploadPillow(request, env);

					case method === 'DELETE' && pathParts[1] === 'delete':
						return await handleDeletePillow(env, pathParts[2]);

					default:
						return new Response('Not found', { status: 404 });
				}
			case 'photos':
				switch (true) {
					case method === 'GET' && pathParts[1] === 'list':
						return await handleListImages(env);

					case method === 'GET' && pathParts[1].startsWith('image/'):
						return await handleGetImage(env, pathParts[2]);

					case method === 'POST' && pathParts[1] === 'upload':
						return await handleUploadImage(request, env);

					case method === 'DELETE' && pathParts[1] === 'delete':
						return await handleDeleteImage(env, pathParts[2]);

					default:
						return new Response('Not found', { status: 404 });
				}
			case 'settings':
				switch (true) {
					case method === 'GET':
						return await handleGetSettings(env, pathParts[2]);
					case method === 'POST':
						return await handleSetSettings(request, env, pathParts[2]);
					default:
						return new Response('Not found', { status: 404 });
				}
			default:
				return new Response('Not found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
