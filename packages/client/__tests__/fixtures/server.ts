import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';
import { Server } from '@deot/dev-test';
import formidable from 'formidable';

const createServer = async (port: number, host: string) => {
	return new Promise((resolve) => {
		const server = http
			.createServer(async (req, res) => {
				// 处理CORS
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Credentials', '*');
				res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
				res.setHeader('Access-Control-Allow-Headers', '*');

				if (req.method === 'OPTIONS') {
					res.writeHead(204); // No Content
					res.end();
					return;
				}

				if (req.url!.includes('500')) {
					res.writeHead(500);
					res.end();
					return;
				}

				if (req.url!.includes('404')) {
					res.writeHead(404);
					res.end();
					return;
				}

				if (req.url!.includes('jsonp')) {
					const key = req.url!.split('/').pop();
					res.end(`window['${key}']({})`);
					return;
				}

				// 也可以用searchParams
				const query = (url.parse(req.url!).query || '')
					.split('&')
					.filter(i => !!i)
					.reduce((pre, cur) => {
						const [key, value] = cur.split('=');

						pre[key] = decodeURIComponent(value);
						return pre;
					}, {});

				let body = {};

				if (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT') {
					body = await new Promise((resolve$) => {
						if (req.headers['formidable'] || req.headers['content-type']?.includes('multipart/form-data')) {
							const form = formidable();
							form
								.parse(req)
								.then(([fields, files]) => {
									let response = JSON.parse(fields?.response?.[0] || null);
									if (!response && files && Object.keys(files).length) {
										const file = files[Object.keys(files)[0]][0];
										response = JSON.parse(fs.readFileSync(file.filepath).toString())?.response;
									}
									resolve$({ response });
								})
								.catch((e: any) => {
									resolve$({ response: { status: 0, body: e } });
								});
							return;
						}

						let postData = '';
						req.on('data', (chunk) => {
							postData += chunk;
						});
						req.on('end', async () => {
							try {
								resolve$(JSON.parse(postData.toString() || '{}'));
							} catch (e) {
								try {
									const data = new URLSearchParams(postData.toString());
									resolve$({ response: JSON.parse(data.get('response')!) });
								} catch {
									resolve$({ response: { status: 0 } });
								}
							}
						});
					});
				}

				const {
					delay = 0.1,
					response = JSON.stringify({
						method: req.method,
						url: req.url,
						reuqest: body
					})
				} = { ...query, ...body };

				const response$ = typeof response === 'string' ? response : JSON.stringify(response);
				setTimeout(() => res.end(response$), delay * 1000);
			});

		server.listen({ port, host }, () => {
			resolve(server);
		});
	});
};
export const impl = async () => {
	const host = Server.host();
	const port = await Server.port(host, Math.ceil(Math.random() * 20000 + 1024));
	const baseUrl = `http://${host}:${port}`;

	let server: any;
	beforeAll(async () => {
		server = await createServer(port as number, host);
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			server.close(resolve);
		});
	});

	return baseUrl;
};

if (typeof beforeAll === 'undefined') {
	(async () => {
		const { port, host, baseUrl } = await Server.available();
		await createServer(port as number, host);
		console.log(baseUrl);
	})();
}
