import fetch from 'node-fetch';
import type { IAirtableRequestOptions, IListRecordsResponse, ResponseResult } from './wrapper';

export class APIWrapper<IFields = Record<string, unknown>> {
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

	protected async doMeARequest<T extends ReturnRequestAs, RequestResult = Record<string, unknown>>(
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

	protected conjureUrl({ fields, filterByFormula, maxRecords, pageSize, sort, view }: IAirtableRequestOptions<IFields>) {
		const reqUrl = new URL(`https://api.airtable.com/v0/${this.baseId}/${this.tableName}`);

		for (const field of fields) {
			const value = typeof field === 'string' ? field : field.toString();
			reqUrl.searchParams.append('fields[]', value);
		}

		// PS: Dear Airtable engineers... please stop discriminating at URL parsing
		// Currently, if a character inside a field name inside a formula is URLencoded, it won't be recognized.
		// Just... why?
		if (filterByFormula) reqUrl.searchParams.append('filterByFormula', filterByFormula.trim());
		if (view) reqUrl.searchParams.append('view', view.trim());
		if (maxRecords) reqUrl.searchParams.append('maxRecords', maxRecords.toString(10));
		if (pageSize) reqUrl.searchParams.append('pageSize', pageSize.toString(10));

		if (Array.isArray(sort) && sort.length > 0)
			sort.forEach((obj, idx) => {
				reqUrl.searchParams.append(`sort[${idx}][field]`, typeof obj.field === 'string' ? obj.field : obj.field.toString());
				reqUrl.searchParams.append(`sort[${idx}][direction]`, obj.direction);
			});

		return reqUrl.toString();
	}
}

export const enum ReturnRequestAs {
	Text,
	JSON
}
