import fetch from 'node-fetch';
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
		const firstPage = await this.doWebRequest<IListRecordsResponse>({ url: this.conjureUrl({}) });

		let lastOffset = firstPage.data.offset ?? false;
		// records are always an array, so this will have no problem
		let recordsIter = firstPage.data.records[Symbol.iterator]();

		while (true) {
			const { done, value } = recordsIter.next();

			if (done) {
				// if there's no other page, we're done, gtfo
				if (!lastOffset) break;

				// TODO: Add error handling.
				const nextPage = (await this.doWebRequest<IListRecordsResponse>({
					url: this.conjureUrl({})
				})) as ResponseResult<IListRecordsResponse>;

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

	protected async doWebRequest<JsonResultType = Record<string, unknown>>(options: {
		url: string;
		method?: DoRequestAs;
		body?: string;
		bodyType?: 'application/json' | 'application/x-www-form-urlencoded';
	}) {
		const req = await fetch(options.url, {
			headers: { ...this.headers, 'Content-Type': options.bodyType ?? '' },
			method: options.method ?? DoRequestAs.Get
		});
		const json = (await req.json()) as JsonResultType;
		return { status: req.status, data: json } as ResponseResult<JsonResultType>;
	}

	protected conjureUrl({ fields, filterByFormula, maxRecords, pageSize, sort, view, offset }: IAirtableRequestOptions<IFields>) {
		const reqUrl = new URL(`https://api.airtable.com/v0/${this.baseId}/${this.tableName}`);

		for (const field of fields ?? []) {
			const value = typeof field === 'string' ? field : field.toString();
			reqUrl.searchParams.append('fields[]', value);
		}

		// PS: Dear Airtable engineers... please stop discriminating at URL parsing
		// Currently, if a character inside a field name inside a formula is URLencoded, it won't be recognized.
		// Just... why?
		if (filterByFormula) reqUrl.searchParams.append('filterByFormula', filterByFormula.trim());
		if (view) reqUrl.searchParams.append('view', view.trim());
		if (offset) reqUrl.searchParams.append('offset', offset.trim());
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

const enum ReturnRequestAs {
	Text,
	JSON
}

const enum DoRequestAs {
	Get = 'GET',
	Post = 'POST',
	Put = 'PUT',
	Delete = 'DELETE'
}

type ResponseResult<JsonType> = { status: number; data: JsonType };

interface IListRecordsResponse<IFields = Record<string, string | number>> {
	records: IAirtableRecord<IFields>[];
	offset?: string;
}

interface IAirtableRecord<IFields> {
	id: string;
	fields: IFields;
	createdTime: string;
}

interface IAirtableRequestOptions<IFields> {
	fields?: Array<keyof IFields>;
	filterByFormula?: string;
	maxRecords?: number;
	pageSize?: number;
	sort?: { field: keyof IFields; direction: 'asc' | 'desc' }[];
	view?: string;
	offset?: string;
}
