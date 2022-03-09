import fetch from 'node-fetch';
import { AirtableAPIError, AirtableErrorResponse } from './AirtableAPIError.js';
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
		const firstPage = await this.doWebRequest<ListRecordsResponse>({ url: this.conjureUrl({}) });

		// If, for *some* reason we have no records, stop
		if (firstPage.data.records.length === 0) return;

		let lastOffset = firstPage.data.offset ?? false;
		// records are always an array, so this will have no problem
		let recordsIter = firstPage.data.records[Symbol.iterator]();

		while (true) {
			const { done, value } = recordsIter.next();

			if (done) {
				// if there's no other page, we're done, gtfo
				if (!lastOffset) break;

				const nextPage = (await this.doWebRequest<ListRecordsResponse>({
					url: this.conjureUrl({})
				})) as ResponseResult<ListRecordsResponse>;

				// Validate nothing wen't wrong
				if (typeof nextPage.data === 'undefined') throw new Error(`Did not receive any data from Airtable`);
				if (nextPage.status !== 200) throw new Error(`Unexpected status code ${firstPage.status} when getting records`);

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

	public async createRecord(recordData: Partial<IFields> | Partial<IFields>[], typecast = true) {
		const records = Array.isArray(recordData) ? recordData.map((fields) => ({ fields })) : [{ fields: recordData }];

		const { data } = await this.doWebRequest<AirtableRecord<IFields>>({
			url: this.conjureUrl({}),
			method: DoRequestAs.Post,
			body: JSON.stringify({ records, typecast }),
			bodyType: 'application/json'
		});
		return data;
	}

	public updateRecord(updateData: { id: string; fields: Partial<IFields> }[], typecast?: boolean): Promise<AirtableRecord<IFields>[]>;
	public updateRecord(recordId: string, fields: Partial<IFields>, typecast?: boolean): Promise<AirtableRecord<IFields>>;
	public async updateRecord(
		updateDataOrSingleId: { id: string; fields: Partial<IFields> }[] | string, // TODO: Need to truncate this to 10 records max
		singleUpdateFieldDataOrTypecast: Partial<IFields> | boolean = true, // the boolean won't be used here, but it's needed for the overload signature above
		typecast = true // needed for the 3rd overload default
	) {
		const records =
			typeof updateDataOrSingleId === 'string'
				? [{ id: updateDataOrSingleId, fields: singleUpdateFieldDataOrTypecast as Partial<IFields> }] // we have a single record to update
				: updateDataOrSingleId; // multiple records here

		const { data } = await this.doWebRequest<ModifyRecordsResponse<IFields>>({
			url: this.conjureUrl({}),
			method: DoRequestAs.Patch,
			body: JSON.stringify({
				records,
				typecast: typeof singleUpdateFieldDataOrTypecast === 'boolean' ? singleUpdateFieldDataOrTypecast : typecast
			}),
			bodyType: 'application/json'
		});

		// Currently the check does nothing, but this is in place for a. proper types & b. for chunking down the line
		return Array.isArray(data) ? (data as AirtableRecord<IFields>[]) : (data as AirtableRecord<IFields>);
	}

	public replaceRecord(updateData: { id: string; fields: Partial<IFields> }[], typecast?: boolean): Promise<AirtableRecord<IFields>[]>;
	public replaceRecord(recordId: string, fields: Partial<IFields>, typecast?: boolean): Promise<AirtableRecord<IFields>>;
	public async replaceRecord(
		replaceDataOrSingleId: { id: string; fields: Partial<IFields> }[] | string, // TODO: Need to truncate this to 10 records max
		singleReplaceFieldDataOrTypecast: Partial<IFields> | boolean = true, // the boolean won't be used here, but it's needed for the overload signature above
		typecast = true // needed for the 3rd overload default
	) {
		const records =
			typeof replaceDataOrSingleId === 'string'
				? [{ id: replaceDataOrSingleId, fields: singleReplaceFieldDataOrTypecast as Partial<IFields> }] // we have a single record to update
				: replaceDataOrSingleId; // multiple records here

		const { data } = await this.doWebRequest<ModifyRecordsResponse<IFields>>({
			url: this.conjureUrl({}),
			method: DoRequestAs.Put,
			body: JSON.stringify({
				records,
				typecast: typeof singleReplaceFieldDataOrTypecast === 'boolean' ? singleReplaceFieldDataOrTypecast : typecast
			}),
			bodyType: 'application/json'
		});

		// Currently the check does nothing, but this is in place for a. proper types & b. for chunking down the line
		return Array.isArray(data) ? (data as AirtableRecord<IFields>[]) : (data as AirtableRecord<IFields>);
	}

	protected async doWebRequest<JsonResultType extends Record<string, any> = Record<string, unknown>>(options: {
		url: string;
		method?: DoRequestAs;
		body?: string;
		bodyType?: 'application/json' | 'application/x-www-form-urlencoded';
	}) {
		const req = await fetch(options.url, {
			headers: { ...this.headers, 'Content-Type': options.bodyType ?? '' },
			method: options.method ?? DoRequestAs.Get
		});

		const json = (await req.json()) as JsonResultType | AirtableErrorResponse;

		if (req.status !== 200) throw new AirtableAPIError(req.status, json as AirtableErrorResponse);
		return { status: req.status, data: json } as ResponseResult<JsonResultType>;
	}

	protected conjureUrl({ fields, filterByFormula, maxRecords, pageSize, sort, view, offset }: AirtableRequestOptions<IFields>) {
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

const enum DoRequestAs {
	Get = 'GET',
	Post = 'POST',
	Put = 'PUT',
	Patch = 'PATCH',
	Delete = 'DELETE'
}

interface ResponseResult<JsonType> {
	status: number;
	data: JsonType;
}

interface ListRecordsResponse<IFields = Record<string, string | number>> {
	records: AirtableRecord<IFields>[];
	offset?: string;
}

type ModifyRecordsResponse<IFields> = AirtableRecord<IFields> | { records: AirtableRecord<IFields>[] };

interface AirtableRecord<IFields> {
	id: string;
	fields: IFields;
	createdTime: string;
}

interface AirtableRequestOptions<IFields> {
	fields?: Array<keyof IFields>;
	filterByFormula?: string;
	maxRecords?: number;
	pageSize?: number;
	sort?: { field: keyof IFields; direction: 'asc' | 'desc' }[];
	view?: string;
	offset?: string;
}
