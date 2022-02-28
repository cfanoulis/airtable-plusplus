import type { ReturnRequestAs } from './APIWrapper';

export type ResponseResult<DataTypeReq, JsonType> = DataTypeReq extends ReturnRequestAs.JSON
	? { status: number; data: JsonType }
	: DataTypeReq extends ReturnRequestAs.Text
	? { status: number; data: string }
	: never;

export interface IListRecordsResponse {
	records: IAirtableRecord[];
	offset?: string;
}

export interface IAirtableRecord<IFields> {
	id: string;
	fields: IFields;
	createdTime: string;
}

export interface IAirtableRequestOptions<IFields> {
	fields: Array<keyof IFields>;
	filterByFormula: string;
	maxRecords: number;
	pageSize: number;
	sort: { field: keyof FieldInterface; direction: 'asc' | 'desc' }[];
	view: string;
}
