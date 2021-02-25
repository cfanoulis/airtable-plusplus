export interface AirtablePlusPlusOptions extends Airtable.AirtableOptions {
	apiKey: string;
	baseID: string;
	tableName: string;
	camelCase: boolean;
	complex: boolean;
	concurrency: number;
} 