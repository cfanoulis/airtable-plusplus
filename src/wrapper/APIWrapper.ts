import fetch from 'node-fetch';
import type { IListRecordsResponse, ResponseResult } from './wrapper';
export class APIWrapper {
	protected headers: {
		Authorization: string;
		'User-Agent': 'AirtablePlusPlus/v2;';
	};

	public constructor(public baseId: string, public tableName: string, private apiKey: string) {
		this.headers = {
			Authorization: `Bearer ${this.apiKey}`,
			'User-Agent': 'AirtablePlusPlus/v2;'
		};
	}

	public async *getRecordsIterator() {
		// TODO: Add error handling.
		const firstPage = await this.doMeARequest<ReturnRequestAs.JSON, IListRecordsResponse>(
			'https://api.airtable.com/v0/app8PMCs1qe4ALMxU/Companies',
			ReturnRequestAs.JSON
		);

		let lastOffset = firstPage.data.offset ?? false;
		// records are always an array, so this will have no problem
		let recordsIter = firstPage.data.records[Symbol.iterator]();

		while (true) {
			const { done, value } = recordsIter.next();

			// Here, we should trigger getting a new page;
			if (done) {
				// if there's no other page, we're done, gtfo
				if (!lastOffset) break;

				// TODO: Add error handling.
				const nextPage = (await this.doMeARequest<ReturnRequestAs.JSON, IListRecordsResponse>(
					`https://api.airtable.com/v0/app8PMCs1qe4ALMxU/Companies?offset=${lastOffset}`,
					ReturnRequestAs.JSON
				)) as ResponseResult<ReturnRequestAs.JSON, IListRecordsResponse>;

				// if this *is* the last page, then there will be no offset property.
				lastOffset = nextPage.data.offset ?? false;

				// If, for *some* reason we have no records, gtfo
				if (nextPage.data.records.length === 0) break;
				recordsIter = nextPage.data.records[Symbol.iterator]();

				continue;
			}

			yield value;
		}
	}

	private async doMeARequest<T extends ReturnRequestAs, RequestResult = Record<string, unknown>>(
		url: string,
		returnAs: T
	): Promise<ResponseResult<T, RequestResult>> {
		const req = await fetch(url, { headers: this.headers });
		switch (returnAs) {
			case ReturnRequestAs.JSON:
				const json = (await req.json()) as RequestResult;
				return { status: req.status, data: json } as ResponseResult<T, RequestResult>;
			case ReturnRequestAs.Text:
				const txt = await req.text();
				return { status: req.status, data: txt } as ResponseResult<T, RequestResult>;
			default:
				return { status: -1, data: "This shouldn't have happened" } as ResponseResult<T, RequestResult>;
		}
	}

	// private getAllRecords({ fields, filterFormula, maxRecords }: ListRecordsParams) {
	// 	const requestURL = new URL(`https://airtable.com/v0/${this.baseId}/${this.tableName}`);

	// 	if (typeof fields !== 'undefined') {
	// 		if (typeof fields === 'string') requestURL.searchParams.set('fields[]', fields);
	// 		else {
	// 			for (const field of fields) {
	// 				requestURL.searchParams.append('fields[]', field);
	// 			}
	// 		}
	// 	}

	// 	if (typeof filterFormula !== 'undefined') requestURL.searchParams.set('filterByFormula', filterFormula);
	// 	if (typeof maxRecords !== 'undefined') requestURL.searchParams.set('maxRecords', maxRecords.toString(10));

	// 	const;
	// }
}

export const enum ReturnRequestAs {
	Text,
	JSON
}
