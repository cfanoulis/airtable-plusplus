import Airtable from 'airtable';
import type Base from 'airtable/lib/base';
import type { QueryParams } from 'airtable/lib/query_params';
import type AirtableRecord from 'airtable/lib/record';

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
	baseID: string;
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
	public base: Base;
	private config: AirtablePlusPlusOptions;
	/**
	 * Creates an AirtablePlusPlus instance, representing a table.
	 * The configuration options you provide here may be overriden later
	 *
	 * @example
	 * const inst = new AirtablePlus({
	 *  baseID: 'xxx',
	 *  tableName: 'Table 1'
	 * });
	 *
	 *
	 * @param config - Configuration object
	 */
	public constructor(config: AirtablePlusPlusOptions) {
		this.config = config;
		this.base = new Airtable({ apiKey: config.apiKey }).base(config.baseID)._base;
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
	public async create(data: Partial<Omit<IFields, 'id'>>, config?: string | Partial<AirtablePlusPlusOptions>) {
		if (!data) throw new Error('No data provided');
		const { tableName } = this._mergeConfig(config ?? {});

		const record = await this.base.table(tableName).create(data);
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
	 * @param params - If string: sets Airtable table name, If object: Airtable api parameters
	 * @param config - Optional configuration override
	 * @returns Array of record objects
	 */
	public async read(params?: QueryParams | string, config?: AirtablePlusPlusOptions | string) {
		let { tableName } = this._mergeConfig(config ?? {});
		if (typeof params === 'string') {
			tableName = params;
			params = {};
		}

		let data: AirtablePlusPlusRecord<IFields>[] = [];
		await this.base
			.table(tableName)
			.select(params)
			.eachPage(
				(records, next) => {
					data = data.concat(records.map((el) => el._rawJson));
					next();
				},
				(err) => {
					if (err) throw err;
					data = data.filter((rows) => Boolean(rows));
				}
			);
		return data;
	}

	/**
	 * Get data for a specific row on Airtable
	 *
	 * @example
	 * const res = await inst.find('1234');
	 *
	 * @param rowID - Airtable Row ID to query data from
	 * @param config - Optional config override
	 * @returns Record object
	 */
	public async find(rowID: string, config?: Partial<AirtablePlusPlusOptions>) {
		const { tableName } = this._mergeConfig(config ?? {});

		const record = await this.base.table(tableName).find(rowID);
		return (record._rawJson as unknown) as AirtablePlusPlusRecord<IFields>;
	}

	/**
	 * Updates a row in Airtable. Unlike the replace method anything
	 * not passed into the update data object still will be retained.
	 * You must send in an object with the keys in the same casing
	 * as the Airtable table columns (even when using camelCase=true in config)
	 *
	 * @example
	 * const res = await inst.update('1234', { firstName: 'foobar' });
	 *
	 * @param rowID - Airtable Row ID to update
	 * @param data - row data with keys that you'd like to update
	 * @param config - Optional config override
	 * @returns Array of record objects
	 */
	public async update(rowID: string, data: Partial<IFields>, config?: Partial<AirtablePlusPlusOptions>) {
		const { tableName } = this._mergeConfig(config ?? {});

		const record = await this.base.table(tableName).update(rowID, data);
		return (record._rawJson as unknown) as AirtablePlusPlusRecord<IFields>;
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
	 * @param config - Optional configuration override
	 * @returns Array of record objects
	 */
	public async updateWhere(where: string, data: Partial<IFields>, config: Partial<AirtablePlusPlusOptions>) {
		const cfg = this._mergeConfig(config ?? {});
		const rows = await this.read({ filterByFormula: where }, cfg);

		return rows.map((row) => this.update(row.id, data, cfg));
	}

	/**
	 * Replaces a given row in airtable. Similar to the update function,
	 * the only difference is this will completely overwrite the row.
	 * Any cells not passed in will be deleted from source row.
	 *
	 * @example
	 * const res = await inst.replace('1234', { firstName: 'foobar' });
	 *
	 * @param rowID - Airtable Row ID to replace
	 * @param data - row data with keys that you'd like to replace
	 * @param config - Optional config override
	 * @returns Record object
	 */
	public async replace(rowID: string, data: IFields, config?: Partial<AirtablePlusPlusOptions>) {
		const { tableName } = this._mergeConfig(config ?? {});

		const record = await this.base.table(tableName).replace(rowID, data);
		return (record._rawJson as unknown) as AirtablePlusPlusRecord<IFields>;
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
	 * @param config - Optional configuration override
	 * @returns Array of record objects
	 */
	public async replaceWhere(where: string, data: IFields, config: Partial<AirtablePlusPlusOptions>) {
		const cfg = this._mergeConfig(config);
		const rows = await this.read({ filterByFormula: where }, cfg);

		return rows.map((row) => this.replace(row.id, data, cfg));
	}

	/**
	 * Deletes a row in the provided table
	 *
	 * @example
	 * const res = await inst.delete('1234');
	 *
	 * @param rowID - Airtable Row ID to delete
	 * @param {Object} data - row data with keys that you'd like to delete
	 * @param {Object} [config] - Optional config override
	 * @param {string} [config.tableName] - Airtable table name
	 * @param {boolean} [config.complex] - Flag to return full Airtable record object with helper methods attached
	 * @param {function} [config.base] - Airtable sdk base instance
	 * @returns {Promise} Record object
	 */
	public async delete(rowID: string | string[], config?: Partial<AirtablePlusPlusOptions>) {
		const { tableName } = this._mergeConfig(config ?? {});

		// even if its a single string, it will be fine.
		const record: AirtableRecord | AirtableRecord[] = await this.base.table(tableName).destroy(rowID as string[]);

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
	 * @param {string} where - filterByFormula string to filter table data by
	 * @param {Object} data - Data to delete if where condition is met
	 * @param {Object} [config] - Optional configuration override
	 * @param {string} [config.baseID] - Airtable base ID
	 * @param {string} [config.tableName] - Airtable table name
	 * @param {string} [config.camelCase] - Converts column name object keys to camel case in JSON response
	 * @param {string} [config.concurrency] - Sets concurrency for async iteration functions
	 * @param {boolean} [config.complex] - Flag to return full Airtable record object with helper methods attached
	 * @param {function} [config.transform] - Optional global transform function for reads
	 * @returns {Promise} Array of record objects
	 */
	public async deleteWhere(where: string, config?: Partial<AirtablePlusPlusOptions>) {
		const cfg = this._mergeConfig(config ?? {});
		const rows = (await this.read({ filterByFormula: where }, cfg)) as AirtablePlusPlusRecord<IFields>[];

		return rows.map((row) => {
			return this.delete(row.id, cfg);
		});
	}

	/**
	 * Attempts to upsert based on passed in primary key.
	 * Inserts if a new entry or updates if entry is already found
	 *
	 * @example
	 * const res = await inst.upsert('primarKeyID', data);
	 *
	 * @param {string} key - Primary key to compare value in passed in data object with dest row
	 * @param {Object} data - Updated data
	 * @param {Object} [config] - Optional config override
	 * @param {string} [config.tableName] - Airtable table name
	 * @param {boolean} [config.complex] - Flag to return full Airtable record object with helper methods attached
	 * @param {string} [config.baseID] - Airtable base id
	 * @returns {Promise} Array of record objects
	 */
	public async upsert(key: string, data: Partial<IFields>, config?: Partial<AirtablePlusPlusOptions>) {
		if (!key || !data) throw new Error('Key and data are required, but not provided');
		const cfg = this._mergeConfig(config ?? {});

		const rows = (await this.read(
			{ filterByFormula: `${this._formatColumnFilter(key)} = ${data[key]}` },
			cfg
		)) as AirtablePlusPlusRecord<IFields>[];

		return rows.length === 0 ? this.create(data, cfg) : rows.map((row) => this.update(row.id, data, cfg));
	}

	/**
	 * Performs validations on object for current function run
	 * Allows the package user to pass in an override config
	 * object to change table name, apiKey, etc. at any time
	 *
	 * @ignore
	 * @param {Object} config - override config object
	 * @returns {Object} - local configuration object
	 */
	protected _mergeConfig(config: string | Partial<AirtablePlusPlusOptions>) {
		if (!config) return this.config;
		let override = {} as Partial<AirtablePlusPlusOptions>;
		if (typeof config === 'string') override.tableName = config;
		if (typeof config === 'object') {
			override = config;
		}

		const cfg = { ...this.config, ...override };
		return cfg;
	}

	/**
	 * Determines if a Column name is multiple words, which results in being
	 * wrapped in curly braces. Useful for Airtable filterByFormula queries.
	 *
	 * Ex. 'Column ID' => '{Column ID}'
	 *
	 * @ignore
	 * @param {string} columnName - Airtable Column name being used in a filter
	 * @returns {string} - formatted column name
	 */
	protected _formatColumnFilter(columnName = '') {
		columnName = `${columnName}`;
		return columnName.split(' ').length > 1 ? `{${columnName}}` : columnName;
	}
}

export { AirtablePlusPlus };
