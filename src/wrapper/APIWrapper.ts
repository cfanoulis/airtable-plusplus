export class APIWrapper {
	protected headers: {
		Authorization: string;
		'User-Agent': 'AirtablePlusPlus/v2;';
	};
	public constructor(public baseId: string, public tableName: string, private apiKey: string) {
		this.headers = {
			Authorization: this.apiKey,
			'User-Agent': 'AirtablePlusPlus/v2;'
		};
	}

	public *getRecordsIterator() {
		let lastOffset = '';
		let recordsIter = [1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 3, 4, 5, 7, 8][Symbol.iterator]();
		while (true) {
			// here, the arr should consist of actual records :P

			const { done, value } = recordsIter.next();

			// Here, we should trigger getting a new page;
			if (done) break;

			yield value;
		}
	}

	private doMeARequest(url: string) {}
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
