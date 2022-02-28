import type { ReturnRequestAs } from './APIWrapper';

export type ResponseResult<DataTypeReq, JsonType> = DataTypeReq extends ReturnRequestAs.JSON
	? { status: number; data: JsonType }
	: DataTypeReq extends ReturnRequestAs.Text
	? { status: number; data: string }
	: never;

export interface IListRecordsResponse {
	records: Record[];
	offset?: string;
}

export interface Record<IFields = Record<string, unknown>> {
	id: string;
	fields: IFields;
	createdTime: string;
}
