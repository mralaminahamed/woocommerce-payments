/** @format **/

/**
 * External dependencies
 */
import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Search, TableCard } from '@woocommerce/components';
import {
	onQueryChange,
	getQuery,
	updateQueryString,
} from '@woocommerce/navigation';
import { uniq } from 'lodash';
import apiFetch from '@wordpress/api-fetch';
import {
	downloadCSVFile,
	generateCSVDataFromTable,
	generateCSVFileName,
} from '@woocommerce/csv-export';
import { useDispatch } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	FraudOutcomeTransaction,
	useFraudOutcomeTransactions,
	useFraudOutcomeTransactionsSummary,
} from 'data/index';
import Page from '../../components/page';
import { recordEvent } from 'tracks';
import {
	getRiskReviewListColumns,
	getRiskReviewListColumnsStructure,
} from './columns';
import './style.scss';
import { formatExplicitCurrency } from 'multi-currency/interface/functions';
import autocompleter from '../fraud-protection/autocompleter';
import DownloadButton from '../../components/download-button';
import { getFraudOutcomeTransactionsExport } from '../../data/transactions/resolvers';

export const RiskReviewList = (): JSX.Element => {
	const [ isDownloading, setIsDownloading ] = useState( false );
	const { createNotice } = useDispatch( 'core/notices' );
	const query = getQuery();
	const columnsToDisplay = getRiskReviewListColumns();

	const { transactions, isLoading } = useFraudOutcomeTransactions(
		'review',
		query
	);

	const {
		transactionsSummary,
		isLoading: isSummaryLoading,
	} = useFraudOutcomeTransactionsSummary( 'review', query );

	const rows = transactions.map( ( transaction ) =>
		getRiskReviewListColumnsStructure( transaction, columnsToDisplay )
	);

	let summary;

	const title = __( 'Flagged transactions', 'woocommerce-payments' );

	const isTransactionsSummaryLoaded =
		transactionsSummary.count !== undefined &&
		transactionsSummary.total !== undefined &&
		false === isSummaryLoading;
	const totalRows = transactionsSummary.count || 0;

	if ( isTransactionsSummaryLoaded ) {
		summary = [
			{
				label: __( 'transactions(s)', 'woocommerce-payments' ),
				value: String( totalRows ),
			},
		];

		if ( totalRows > 0 && transactionsSummary.currencies?.length === 1 ) {
			// Only show the total if there is one currency available
			summary.push( {
				label: __( 'pending', 'woocommerce-payments' ),
				value: `${ formatExplicitCurrency(
					transactionsSummary.total as number,
					transactionsSummary.currencies[ 0 ]
				) }`,
			} );
		}
	}

	const searchedLabels =
		getQuery().search &&
		getQuery().search?.map( ( v ) => ( {
			key: v,
			label: v,
		} ) );

	const onSearchChange = ( values: { key: string; label: string }[] ) => {
		updateQueryString( {
			search: values.length
				? uniq( values.map( ( v ) => v.key || v.label ) )
				: undefined,
		} );
	};

	const searchPlaceholder = __(
		'Search by order number or customer name',
		'woocommerce-payments'
	);

	const downloadable = !! rows.length;

	const onDownload = async () => {
		setIsDownloading( true );

		// We destructure page and path to get the right params.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { page, path, ...params } = getQuery();

		try {
			const { data } = await apiFetch< {
				data: FraudOutcomeTransaction[];
			} >( {
				path: getFraudOutcomeTransactionsExport( 'review', params ),
				method: 'GET',
			} );

			const populatedRows = data.map( ( transaction ) =>
				getRiskReviewListColumnsStructure(
					transaction,
					columnsToDisplay
				)
			);

			downloadCSVFile(
				generateCSVFileName( title, params ),
				generateCSVDataFromTable( columnsToDisplay, populatedRows )
			);

			recordEvent( 'wcpay_fraud_outcome_transactions_download', {
				exported_transactions: rows.length,
				total_transactions: transactionsSummary.count,
			} );
		} catch ( e ) {
			createNotice(
				'error',
				__(
					'There was a problem generating your export.',
					'woocommerce-payments'
				)
			);
		}

		setIsDownloading( false );
	};

	useEffect( () => {
		recordEvent( 'page_view', {
			path: 'payments_transactions_risk_review',
		} );
	}, [] );

	return (
		<Page>
			<TableCard
				className="risk-review-transactions-list woocommerce-report-table has-search"
				title={ title }
				isLoading={ isLoading }
				rowsPerPage={ parseInt( query.per_page ?? '', 10 ) || 25 }
				totalRows={ totalRows }
				headers={ columnsToDisplay }
				rows={ rows }
				summary={ summary }
				query={ query }
				onQueryChange={ onQueryChange }
				actions={ [
					<Search
						inlineTags
						key="search"
						onChange={ onSearchChange }
						placeholder={ searchPlaceholder }
						selected={ searchedLabels }
						showClearButton={ true }
						type={
							wcpaySettings.featureFlags.customSearch
								? 'custom'
								: 'customers'
						}
						autocompleter={ autocompleter( 'review' ) }
					/>,
					downloadable && (
						<DownloadButton
							key="download"
							isDisabled={ isLoading || isDownloading }
							onClick={ onDownload }
						/>
					),
				] }
			/>
		</Page>
	);
};

export default RiskReviewList;
