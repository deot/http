import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';
import { Server } from '@deot/dev-test';
import formidable from 'formidable';

const createServer = async (port: number, host: string) => {
	return new Promise((resolve) => {
		let server = http
			.createServer(async (req, res) => {
				// 处理CORS 
				res.setHeader('Access-Control-Allow-Origin', "*");
				res.setHeader('Access-Control-Allow-Credentials', "*");
				res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
				res.setHeader('Access-Control-Allow-Headers', '*');

				if (req.method === 'OPTIONS') {
					res.writeHead(204); // No Content
				}

				// 也可以用searchParams
				let query = (url.parse(req.url!).query || '')
					.split('&')
					.filter(i => !!i)
					.reduce((pre, cur) => {
						let [key, value] = cur.split('=');

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
										let file = files[Object.keys(files)[0]][0];
										response = JSON.parse(fs.readFileSync(file.filepath).toString())?.response;
									}
									resolve$({ response });
								})
								.catch(e => {
									console.log(e);
									resolve$({ response: { status: 0 } });
								});
							return;
						} 

						let postData = '';
						req.on('data', chunk => {  
							postData += chunk;
						});
						req.on('end', async () => {
							try {
								resolve$(JSON.parse(postData.toString() || '{}'));
							} catch (e) {
								try {
									let data = new URLSearchParams(postData.toString());
									resolve$({ response: JSON.parse(data.get('response')!) });
								} catch {
									resolve$({ response: { status: 0 } });
									console.log(e);
								}
							}
						});
					});
				}

				if (req.url!.includes('jsonp')) {
					const key = req.url!.split('/').pop();
					res.end(`window['${key}']({})`);
					return;
				}

				let { 
					delay = 0.1, 
					response = JSON.stringify({ 
						method: req.method, 
						url: req.url,
						reuqest: body
					})
				} = { ...query, ...body };

				response = typeof response === 'string' ? response : JSON.stringify(response);
				setTimeout(() => res.end(response), delay * 1000);
			});

		server.listen({ port, host }, () => {
			resolve(server);
		});
	});
};
export const impl = async () => {
	const { port, host, baseUrl } = await Server.available();

	let server: any;
	beforeAll(async () => {
		server = await createServer(port as number, host);
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			if (!server) {
				resolve();
				return;
			}
			server.close(() => {
				setTimeout(resolve, 100);
			});
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