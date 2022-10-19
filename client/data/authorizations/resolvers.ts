/** @format */

/**
 * External dependencies
 */
import { apiFetch, dispatch } from '@wordpress/data-controls';
import { addQueryArgs } from '@wordpress/url';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { NAMESPACE } from '../constants';
import {
	updateAuthorizations,
	updateAuthorizationsSummary,
	updateErrorForAuthorizations,
	updateErrorForAuthorizationsSummary,
} from './actions';
import { Query } from '@woocommerce/navigation';

export function* getAuthorizations( query: Query ): any {
	const path = addQueryArgs( `${ NAMESPACE }/authorizations`, {
		pagesize: query.per_page,
		sort: query.orderby,
		direction: query.order,
		page: query.paged,
	} );

	try {
		const results = yield apiFetch( { path } );
		yield updateAuthorizations( query, results.data || [] );
	} catch ( e ) {
		yield dispatch(
			'core/notices',
			'createErrorNotice',
			__(
				'Error retrieving uncaptured transactions.',
				'woocommerce-payments'
			)
		);
		yield updateErrorForAuthorizations( query, [], e );
	}
}

export function* getAuthorizationsSummary( query: Query ): any {
	const path = addQueryArgs( `${ NAMESPACE }/authorizations/summary`, {
		pagesize: query.per_page,
		sort: query.orderby,
		direction: query.order,
		page: query.paged,
	} );

	try {
		const results = yield apiFetch( { path } );
		yield updateAuthorizationsSummary( query, results || [] );
	} catch ( e ) {
		yield dispatch(
			'core/notices',
			'createErrorNotice',
			__(
				'Error retrieving uncaptured transactions.',
				'woocommerce-payments'
			)
		);
		yield updateErrorForAuthorizationsSummary( query, {}, e );
	}
}
