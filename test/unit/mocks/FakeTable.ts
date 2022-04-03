/**
 * Code adapted from airtable's own airtable.js testing mocks.
 * Any code shared between the two is licensed under the MIT license
 * https://github.com/Airtable/airtable.js/blob/master/LICENSE.txt
 */

import Fastify from 'fastify';
import QueryString, { type ParsedQs } from 'qs';
import { APIWrapper } from '../../../src/index.js';

const fastify = Fastify({
	logger: false,
	querystringParser: (str) => QueryString.parse(str)
});

const FAKE_CREATED_TIME = '2020-04-20T16:20:00.000Z';

// fastify.use(function (req, reply, next) {
// 	req.fastify.set('most recent request', req);
// 	next();
// });

// eslint-disable-next-line @typescript-eslint/require-await
fastify.post<{ Body: Record<string, any> }>('/v0/:baseId/:tableIdOrName', async (req) => {
	const isCreatingJustOneRecord = Boolean(req.body.fields);
	const recordsInBody: any[] = isCreatingJustOneRecord ? [req.body] : req.body.records;

	const records = recordsInBody.map((record, index) => {
		const fields = req.body.typecast ? { typecasted: true } : record.fields;
		return {
			id: `rec${index}`,
			createdTime: FAKE_CREATED_TIME,
			fields
		};
	});

	return isCreatingJustOneRecord ? records[0] : { records };
});

// eslint-disable-next-line @typescript-eslint/require-await
fastify.patch<{ Body: Record<string, any>; Params: Record<string, string> }>('/v0/:baseId/:tableIdOrName/:recordId', async (req) => {
	const fields = req.body.typecast ? { typecasted: true } : req.body.fields;

	return {
		id: req.params.recordId,
		createdTime: FAKE_CREATED_TIME,
		fields
	};
});
// eslint-disable-next-line @typescript-eslint/require-await
fastify.put<{ Body: Record<string, any>; Params: Record<string, string> }>('/v0/:baseId/:tableIdOrName/:recordId', async (req) => {
	const fields = req.body.typecast ? { typecasted: true } : req.body.fields;

	return {
		id: req.params.recordId,
		createdTime: FAKE_CREATED_TIME,
		fields
	};
});

// eslint-disable-next-line @typescript-eslint/require-await
fastify.patch<{ Body: Record<string, any> }>('/v0/:baseId/:tableIdOrName', async (req) => {
	return {
		records: req.body.records.map((record: { id: string; fields: string }) => {
			const fields = req.body.typecast ? { typecasted: true } : record.fields;
			return {
				id: record.id,
				createdTime: FAKE_CREATED_TIME,
				fields
			};
		})
	};
});

// eslint-disable-next-line @typescript-eslint/require-await
fastify.put<{ Body: Record<string, any> }>('/v0/:baseId/:tableIdOrName', async (req) => {
	return {
		records: req.body.records.map((record: { id: string; fields: string }) => {
			const fields = req.body.typecast ? { typecasted: true } : record.fields;
			return {
				id: record.id,
				createdTime: FAKE_CREATED_TIME,
				fields
			};
		})
	};
});

// eslint-disable-next-line @typescript-eslint/require-await
fastify.delete<{ Body: Record<string, any>; Querystring: ParsedQs }>('/v0/:baseId/:tableIdOrName', async (req) => {
	// eslint-disable-next-line @typescript-eslint/no-throw-literal
	if (!req.query.records || !Array.isArray(req.query.records)) throw `No IDs were sent for delete`;
	return {
		records: (req.query['records[]'] as string[]).map((recordId: string) => {
			return {
				id: recordId,
				deleted: true
			};
		})
	};
});

fastify.setNotFoundHandler(async (req, reply) => {
	await reply.status(404);
	return { type: 'NOT_FOUND' };
});

// istanbul ignore next
fastify.addHook('onError', async (request, reply, error) => {
	console.error(error);
	await reply.status(500);
	return {
		error: {
			type: 'TEST_ERROR',
			message: error.message
		}
	};
});

const getMockServer = async () => {
	await fastify.listen(55443);
	return {
		apiWrapper: new APIWrapper('base123', 'table123', 'apikeyer', 'http://localhost:55443'),
		teardownAsync: fastify.close.bind(fastify),
		testServer: fastify
	};
};

export default getMockServer;
