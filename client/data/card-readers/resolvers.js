/** @format */

/**
 * External dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { NAMESPACE } from '../constants';
import {
	updateErrorForCardReaderStats,
	updateCardReaderStats,
	updateCardReaders,
	updateErrorForCardReaders,
} from './actions';

export function* getCardReaderStats( id, transactionId ) {
	try {
		const results = yield apiFetch( {
			path: `${ NAMESPACE }/readers/charges/${ transactionId }`,
		} );
		yield updateCardReaderStats( id, results );
	} catch ( e ) {
		yield updateErrorForCardReaderStats( id, null, e );
	}
}

/**
 * Retrieves readers from the disputes list API.
 *
 * @param {string} query Data on which to parameterize the selection.
 */
export function* getCardReaders( query ) {
	const path = addQueryArgs( `${ NAMESPACE }/readers`, {
		limit: query.limit,
	} );

	try {
		const results = yield apiFetch( { path } ) || {};

		yield updateCardReaders( query, results );
	} catch ( e ) {
		console.debug( 'DEU ERRO', e );
		yield updateErrorForCardReaders( null, e );
	}
}
