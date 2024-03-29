/**
 * Code adapted from airtable's own airtable.js testing mocks.
 * Any code shared between the two is licensed under the MIT license
 * https://github.com/Airtable/airtable.js/blob/master/LICENSE.txt
 */

import Fastify from 'fastify';
import QueryString, { type ParsedQs } from 'qs';
import { APIWrapper } from '../../../src/index.js';

const state = new Map<'last request' | 'handler override', any>();
const fastify = Fastify({
	logger: false,
	querystringParser: (str) => QueryString.parse(str)
});

const FAKE_CREATED_TIME = '2020-04-20T16:20:00.000Z';

fastify.addHook('preHandler', (request, _reply, done) => {
	state.set('last request', request);
	done();
});

fastify.addHook('preHandler', (request, reply, done) => {
	if (state.has('handler override')) return state.get('handler override')(request, reply);
	done();
});

fastify.post<{ Body: Record<string, any> }>('/v0/:baseId/:tableIdOrName', (req) => {
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

fastify.put<{ Body: Record<string, any>; Params: Record<string, string> }>('/v0/:baseId/:tableIdOrName/:recordId', (req) => {
	const fields = req.body.typecast ? { typecasted: true } : req.body.fields;

	return {
		id: req.params.recordId,
		createdTime: FAKE_CREATED_TIME,
		fields
	};
});

fastify.patch<{ Body: Record<string, any> }>('/v0/:baseId/:tableIdOrName', (req) => {
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

fastify.put<{ Body: Record<string, any> }>('/v0/:baseId/:tableIdOrName', (req) => {
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

fastify.delete<{ Body: Record<string, any>; Querystring: ParsedQs }>('/v0/:baseId/:tableIdOrName', (req) => {
	if (!req.query.records || !Array.isArray(req.query.records)) throw new Error('No IDs were sent for delete');
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
	await fastify.listen({ port: 55443 });
	return {
		apiWrapper: new APIWrapper('base123', 'table123', 'apikeyer', 'http://localhost:55443'),
		teardownAsync: async () => {
			await fastify.close();
			state.clear();
		},
		testServer: fastify,
		state
	};
};

export default getMockServer;
