export class AirtableAPIError extends Error {
	public constructor(public errorCode: number, public errorResponse: AirtableErrorResponse) {
		super(`Airtable returned error code ${errorCode}: [${errorResponse.type}] ${errorResponse.message}`);
	}
}

export interface AirtableErrorResponse {
	message: string;
	type: number;
}
