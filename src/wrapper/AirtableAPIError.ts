export class AirtableAPIError extends Error {
	public constructor(public errorCode: number, public errorResponse: AirtableErrorResponse) {
		super(`Airtable returned error code ${errorCode}: [${errorResponse.code}] ${errorResponse.message}`);
	}
}

export interface AirtableErrorResponse {
	message: string;
	code: number;
}
