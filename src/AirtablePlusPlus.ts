import Airtable from 'airtable';
import type { QueryParams } from 'airtable/lib/query_params';
import type AirtableRecord from 'airtable/lib/record';
import type Table from 'airtable/lib/table';

/**
 * Module configuration object
 */
export interface AirtablePlusPlusOptions {
	/**
	 * API key from https://airtable.com/account
	 */
	apiKey: string;
	/**
	 * Your Airtable base ID. You can get that from https://airtable.com/api, and selecting the base you want to work with
	 */
	baseId: string;
	/**
	 * The name fo the table you want to interact with. **Not the ID, the name**
	 */
	tableName: string;
	/**
	 * The API endpoint to hit. You might want to override it if you are using an API proxy (e.g. runscope.net) to debug your API calls.
	 */
	endpointUrl?: string;
	/**
	 * The timeout in milliseconds for requests. The default is 5 minutes
	 */
	requestTimeout?: number;
	/**
	 * Option to drop requests that get ratelimited instead of trying again after the ratelimit passes
	 */
	noRetryIfRateLimited?: boolean;
}

export interface AirtablePlusPlusRecord<FieldType> {
	/**
	 * The record's internal ID
	 */
	id: string;
	/**
	 * The record's data
	 */
	fields: FieldType;
	/**
	 * The time this record was created
	 */
	createdTime: string;
}
/**
 * An AirtablePlusPlus instance. Y'know, the thing you're here for.
 * @typeParam IFields - An interface to describe how your data is formatted.
 */
class AirtablePlusPlus<IFields extends Record<string, unknown>> {
	public table: Table;
	/**
	 * Creates an AirtablePlusPlus instance, representing a table.
	 * The configuration options you provide here may be overriden later
	 *
	 * @example
	 * const inst = new AirtablePlus({
	 *  apiKey: 'key001zdhiyfvg553
	 *  baseID: 'xxx',
	 *  tableName: 'Table 1'
	 * });
	 *
	 *
	 * @param config - Configuration object
	 */
	public constructor(config: AirtablePlusPlusOptions) {
		this.table = new Airtable({ apiKey: config.apiKey }).base(config.baseId)(config.tableName);
	}

	/**
	 * Creates a new row using the supplied data object as row values.
	 * The object must contain valid keys that correspond to the name and
	 * data type of the Airtable table schema being written into, else it will
	 * throw an error.
	 *
	 * @example
	 * const res = await inst.create({ firstName: 'foo' });
	 *
	 * @param data - Create data object
	 * @returns Created Record Object
	 */
	public async create(data: Partial<IFields>): Promise<AirtablePlusPlusRecord<IFields>>;

	/**
	 * Creates a new row using the supplied data object as row values.
	 * The object must contain valid keys that correspond to the name and
	 * data type of the Airtable table schema being written into, else it will
	 * throw an error.
	 *
	 * @example
	 * const res = await inst.create({ firstName: 'foo' });
	 *
	 * @param data - Array of data objects
	 * @returns an array of created records
	 */
	public async create(data: Partial<IFields>[]): Promise<AirtablePlusPlusRecord<IFields>[]>;
	public async create(data: Partial<IFields> | Partial<IFields>[]) {
		if (!data) throw new Error('No data provided');
		if (Array.isArray(data)) {
			if (data.length < 1) throw new Error('No data provided');
			const record = await this.table.create(data.map((e) => ({ fields: e })));
			return record.map((rec) => rec._rawJson) as AirtablePlusPlusRecord<IFields>[];
		}
		const record = await this.table.create(data);
		return (record._rawJson as unknown) as AirtablePlusPlusRecord<IFields>;
	}

	/**
	 * Read all data from a table. Can be passed api options
	 * for filtering and sorting (see Airtable API docs).
	 * An optional transform function can be passed in to manipulate
	 * the rows as they are being read in.
	 *
	 * @example const res = await inst.read();
	 *
	 * @example const res = await inst.read({ maxRecords: 1 });
	 *
	 * @param params Airtable api parameters
	 * @returns Array of record objects
	 */
	public async read(params?: QueryParams) {
		let data: AirtablePlusPlusRecord<IFields>[] = [];
		await this.table
			.select(params)
			.eachPage((records, next) => {
				data = data.concat(records.map((el) => el._rawJson));
				next();
			})
			.catch((err) => {
				throw err;
			});
		return data;
	}

	/**
	 * Get data for a specific row on Airtable
	 *
	 * @example
	 * const res = await inst.get('rec1234');
	 *
	 * @param rowID - the internal Airtable Row ID to query data from
	 * @returns Record object
	 */
	public async get(rowID: string) {
		const record = await this.table.find(rowID);
		return (record._rawJson as unknown) as AirtablePlusPlusRecord<IFields>;
	}

	/**
	 * Updates multiple rows in Airtable. Unlike the replace method anything
	 * not passed into the update data object still will be retained.
	 * You must send in an object with the keys in the same casing
	 * as the Airtable table columns.
	 *
	 * @example
	 * const res = await inst.update('1234', { "First Name": 'foobar' });
	 *
	 * @param data - Bulk update data. recordId is the internal Airtable Row Id. Fields is the row data with keys that you'd like to update
	 * @returns Array of record objects
	 */
	public async update(data: { id: string; fields: Partial<IFields> }[]): Promise<AirtablePlusPlusRecord<IFields>[]>;
	/**
	 * Updates a row in Airtable. Unlike the replace method anything
	 * not passed into the update data object still will be retained.
	 * You must send in an object with the keys in the same casing
	 * as the Airtable table columns.
	 *
	 * @example
	 * const res = await inst.update('1234', { "First Name": "Zfogg" });
	 *
	 * @param rowID - Airtable Row ID to update
	 * @param data - row data with keys that you'd like to update
	 * @returns Array of record objects
	 */
	public async update(rowID: string, data: Partial<IFields>): Promise<AirtablePlusPlusRecord<IFields>>;
	public async update(rowOrbulkData: string | { id: string; fields: Partial<IFields> }[], data?: Partial<IFields>) {
		if (Array.isArray(rowOrbulkData)) {
			const record = await this.table.update(rowOrbulkData);
			return record.map((record) => record._rawJson);
		}
		const record = await this.table.update(rowOrbulkData, data);
		return record._rawJson;
	}

	/**
	 * Performs a bulk update based on a search criteria. The criteria must
	 * be formatted in the valid Airtable formula syntax (see Airtable API docs)
	 *
	 * @example
	 * const res = await inst.updateWhere('firstName = "foo"', { firstName: 'fooBar' });
	 *
	 * @param  where - filterByFormula string to filter table data by
	 * @param  data - Data to update if where condition is met
	 * @returns Array of record objects
	 */
	public async updateWhere(where: string, data: Partial<IFields>) {
		const rows = await this.read({ filterByFormula: where });
		const bulkData = rows.map((row) => {
			return { id: row.id, fields: data };
		});
		return this.update(bulkData);
	}

	/**
	 * Bulk replaces given rows in airtable. Similar to the update function,
	 * the only difference is this will completely overwrite the rows.
	 * Any cells not passed in will be deleted from source row.
	 *
	 * @example
	 * const res = await inst.replace([{ recordId: 'rec001',
	 *    data: {"First Name": "Zfogg"}
	 *  }]);
	 *
	 * @param rowID - Airtable Row ID to replace
	 * @param data - row data with keys that you'd like to replace
	 * @returns Record object
	 */
	public async replace(data: { id: string; fields: IFields }[]): Promise<AirtablePlusPlusRecord<IFields>[]>;
	/**
	 * Replaces a given row in airtable. Similar to the update function,
	 * the only difference is this will completely overwrite the row.
	 * Any cells not passed in will be deleted from source row.
	 *
	 * @example
	 * const res = await inst.replace('rec001', { "First Name": "Zfogg" });
	 *
	 * @param rowID - Airtable Row ID to replace
	 * @param data - row data with keys that you'd like to replace
	 * @returns Record object
	 */
	public async replace(rowID: string, data: IFields): Promise<AirtablePlusPlusRecord<IFields>>;
	public async replace(rowOrbulkData: string | { id: string; fields: IFields }[], data?: IFields) {
		if (Array.isArray(rowOrbulkData)) {
			const record = await this.table.replace(rowOrbulkData);
			return record.map((record) => record._rawJson);
		}
		const record = await this.table.replace(rowOrbulkData, data);
		return record._rawJson;
	}

	/**
	 * Performs a bulk replace based on a given search criteria. The criteria must
	 * be formatted in the valid Airtable formula syntax (see Airtable API docs)
	 *
	 * @example
	 * const res = await inst.replaceWhere('firstName = "foo"', { firstName: 'fooBar' });
	 *
	 * @param where - filterByFormula string to filter table data by
	 * @param data - Data to replace if where condition is met
	 * @returns Array of record objects
	 */
	public async replaceWhere(where: string, data: IFields) {
		const rows = await this.read({ filterByFormula: where });
		return rows.map((row) => this.replace(row.id, data));
	}

	/**
	 * Deletes a row in the provided table
	 *
	 * @example
	 * const res = await inst.delete('1234');
	 *
	 * @param rowID - Either an arroar of or a single Airtable Row ID to delete
	 * @returns Record object
	 */
	public async delete(rowID: string | string[]) {
		// even if its a single string, it will be fine.
		const record: AirtableRecord | AirtableRecord[] = await this.table.destroy(rowID as string[]);

		return Array.isArray(record)
			? record.map((rec) => ({ id: rec.id, fields: {}, createdTime: null }))
			: { id: (record as AirtableRecord).id, fields: {}, createdTime: null };
	}

	/**
	 * Performs a bulk delete based on a search criteria. The criteria must
	 * be formatted in the valid Airtable formula syntax (see Airtable API docs)
	 *
	 * @example
	 * const res = await inst.deleteWhere('firstName = "foo"');
	 *
	 * @param where - filterByFormula string to filter table data by
	 * @param data - Data to delete if where condition is met
	 * @returns {Promise} Array of record objects
	 */
	public async deleteWhere(where: string) {
		const rows = await this.read({ filterByFormula: where });

		return rows.map((row) => {
			return this.delete(row.id);
		});
	}

	/**
	 * Attempts to upsert based on passed in primary key.
	 * Inserts if a new entry or updates if entry is already found
	 *
	 * @example
	 * const res = await inst.upsert('primarKeyID', data);
	 *
	 * @param key - The column you want to use as a unique ID.
	 * @param data - Updated data. Make sure to include the key you specified above alongside a value that will be used as the primary key
	 * If multiple entries are found with the same primary key, **all of them** will be updated
	 * @returns Array of record objects
	 */
	public async upsert(key: string, data: Partial<IFields>): Promise<AirtablePlusPlusRecord<IFields>>;
	public async upsert(key: string, data: Partial<IFields>[]): Promise<AirtablePlusPlusRecord<IFields>[]>;
	public async upsert(key: string, data: Partial<IFields> | Partial<IFields>[]) {
		if (!key || !data) throw new Error('Key and data are required, but not provided');

		// Bulk data handling
		if (Array.isArray(data)) {
			/*
			 * Hi, I need help making this better. Please PR a better solution if you can think one!
			 */
			console.log('Filtering data');
			// Clear out invalid data objects, just to prevent wonkiness down the road
			const filteredData = data.filter(Boolean) as Partial<IFields>[];
			if (filteredData.length < 1) throw new Error('No valid data provided in the data array');
			console.log('Get row data');
			// Fetch all rows that may match any of our primary keys
			const filter = filteredData.map((e) => `${this._formatColumnFilter(key)} = "${e[key]}"`).join(', ');
			const rows = await this.read({ filterByFormula: `OR(${filter})` });
			console.log(rows);
			console.log('Creating data');
			// Create a list of keys that already exist
			const pKeysExist = rows.map((e) => e.fields[key]);

			// Prepare update data
			const updateData = rows.map((e) => {
				// Find the new data object based on the primary key specified
				const newDataIndex = filteredData.findIndex((i) => e.fields[key] === i[key]);
				const [newData] = filteredData.splice(newDataIndex, 1);

				return { id: e.id, fields: newData };
			});
			console.log('Update data:');
			console.log(updateData);
			// Now we're left only with data objects that need to be created
			const createData = data.filter((d) => !pKeysExist.includes(d[key]));
			console.log('Create data:');
			console.log(createData);

			return [...(await this.update(updateData)), ...(await this.create(createData))];
		}

		// Handling a single piece of data. Data? whatever, I don't care how you pronounce it
		const rows = await this.read({
			filterByFormula: `${this._formatColumnFilter(key)} = "${data[key]}"`
		});

		// If read doesn't return any results, then create the object. Else, update ***everything****
		return rows.length === 0 ? this.create(data) : rows.map((row) => this.update(row.id, data));
	}

	/**
	 * Determines if a Column name is multiple words, which results in being
	 * wrapped in curly braces. Useful for Airtable filterByFormula queries.
	 *
	 * Ex. 'Column ID' => '{Column ID}'
	 *
	 * @ignore
	 * @param columnName - Airtable Column name being used in a filter
	 * @returns formatted column name
	 */
	protected _formatColumnFilter(columnName: string) {
		columnName = `${columnName}`;
		return columnName.split(' ').length > 1 ? `{${columnName}}` : columnName;
	}
}

export { AirtablePlusPlus };
