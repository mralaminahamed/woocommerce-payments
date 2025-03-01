/** @format **/

/**
 * External dependencies
 */
import { flatMap } from 'lodash';
import { __, sprintf } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { addQueryArgs } from '@wordpress/url';
import moment from 'moment';
import { createInterpolateElement } from '@wordpress/element';
import { Link } from '@woocommerce/components';
import SyncIcon from 'gridicons/dist/sync';
import PlusIcon from 'gridicons/dist/plus';
import MinusIcon from 'gridicons/dist/minus';
import InfoOutlineIcon from 'gridicons/dist/info-outline';
import CheckmarkIcon from 'gridicons/dist/checkmark';
import CrossIcon from 'gridicons/dist/cross';
import NoticeOutlineIcon from 'gridicons/dist/notice-outline';

/**
 * Internal dependencies
 */
import { reasons as disputeReasons } from 'disputes/strings';
import {
	formatCurrency,
	formatFX,
	formatExplicitCurrency,
} from 'multi-currency/interface/functions';
import { formatFee } from 'utils/fees';
import { getAdminUrl } from 'wcpay/utils';
import { ShieldIcon } from 'wcpay/icons';
import { fraudOutcomeRulesetMapping } from './mappings';

/**
 * Creates a timeline item about a payment status change
 *
 * @param {Object} event An event triggering the status change
 * @param {string} status Localized status description
 *
 * @return {Object} Formatted status change timeline item
 */
const getStatusChangeTimelineItem = ( event, status ) => {
	return {
		date: new Date( event.datetime * 1000 ),
		icon: <SyncIcon />,
		headline: sprintf(
			// translators: %s new status, for example Authorized, Refunded, etc
			__( 'Payment status changed to %s.', 'woocommerce-payments' ),
			status
		),
		body: [],
	};
};

/**
 * Creates a timeline item about a payout
 *
 * @param {Object} event An event affecting the payout
 * @param {string} formattedAmount Formatted amount string
 * @param {boolean} isPositive Whether the amount will be added or deducted
 * @param {Array} body Any extra subitems that should be included as item body
 *
 * @return {Object} Payout timeline item
 */
const getDepositTimelineItem = (
	event,
	formattedAmount,
	isPositive,
	body = []
) => {
	let headline = '';
	if ( event.deposit ) {
		headline = sprintf(
			isPositive
				? // translators: %1$s - formatted amount, %2$s - payout arrival date, <a> - link to the payout
				  __(
						'%1$s was added to your <a>%2$s payout</a>.',
						'woocommerce-payments'
				  )
				: // translators: %1$s - formatted amount, %2$s - payout arrival date, <a> - link to the payout
				  __(
						'%1$s was deducted from your <a>%2$s payout</a>.',
						'woocommerce-payments'
				  ),
			formattedAmount,
			dateI18n(
				'M j, Y',
				moment( event.deposit.arrival_date * 1000 ).toISOString()
			)
		);
		const depositUrl = getAdminUrl( {
			page: 'wc-admin',
			path: '/payments/payouts/details',
			id: event.deposit.id,
		} );

		headline = createInterpolateElement( headline, {
			// eslint-disable-next-line jsx-a11y/anchor-has-content
			a: <Link href={ depositUrl } />,
		} );
	} else {
		headline = sprintf(
			isPositive
				? // translators: %s - formatted amount
				  __(
						'%s will be added to a future payout.',
						'woocommerce-payments'
				  )
				: // translators: %s - formatted amount
				  __(
						'%s will be deducted from a future payout.',
						'woocommerce-payments'
				  ),
			formattedAmount
		);
	}

	return {
		date: new Date( event.datetime * 1000 ),
		icon: isPositive ? <PlusIcon /> : <MinusIcon />,
		headline,
		body,
	};
};

/**
 * Creates a timeline item about a financing paydown
 *
 * @param {Object} event An event affecting the payout
 * @param {string} formattedAmount Formatted amount string
 * @param {Array} body Any extra subitems that should be included as item body
 *
 * @return {Object} Payout timeline item
 */
const getFinancingPaydownTimelineItem = ( event, formattedAmount, body ) => {
	let headline = '';
	if ( event.deposit ) {
		headline = sprintf(
			// translators: %1$s - formatted amount, %2$s - payout arrival date, <a> - link to the payout
			__(
				'%1$s was subtracted from your <a>%2$s payout</a>.',
				'woocommerce-payments'
			),
			formattedAmount,
			dateI18n(
				'M j, Y',
				moment( event.deposit.arrival_date * 1000 ).toISOString()
			)
		);

		const depositUrl = getAdminUrl( {
			page: 'wc-admin',
			path: '/payments/payouts/details',
			id: event.deposit.id,
		} );

		headline = createInterpolateElement( headline, {
			// eslint-disable-next-line jsx-a11y/anchor-has-content
			a: <Link href={ depositUrl } />,
		} );
	} else {
		headline = sprintf(
			__(
				'%s will be subtracted from a future payout.',
				'woocommerce-payments'
			),
			formattedAmount
		);
	}

	return {
		date: new Date( event.datetime * 1000 ),
		icon: <MinusIcon />,
		headline,
		body,
	};
};

/**
 * Formats the main item for the event
 *
 * @param {Object} event Event object
 * @param {string | Object} headline Headline describing the event
 * @param {JSX.Element} icon Icon component to render for this event
 * @param {Array} body Body to include in this item, defaults to empty
 *
 * @return {Object} Formatted main item
 */
const getMainTimelineItem = ( event, headline, icon, body = [] ) => ( {
	date: new Date( event.datetime * 1000 ),
	headline,
	icon,
	body,
} );

const isFXEvent = ( event = {} ) => {
	const { transaction_details: transactionDetails = {} } = event;
	const {
		customer_currency: customerCurrency,
		store_currency: storeCurrency,
	} = transactionDetails;
	return (
		customerCurrency && storeCurrency && customerCurrency !== storeCurrency
	);
};

/**
 * Returns a boolean indicating whether only fee applied is the base fee
 *
 * @param {Object} event Event object
 *
 * @return {boolean} true if the only applied fee is the base fee
 */
const isBaseFeeOnly = ( event ) => {
	if ( ! event.fee_rates ) return false;

	const history = event.fee_rates.history;
	return history?.length === 1 && history[ 0 ].type === 'base';
};

const formatNetString = ( event ) => {
	const {
		amount_captured: amountCaptured,
		fee,
		currency,
		transaction_details: {
			store_amount_captured: storeAmountCaptured,
			store_fee: storeFee,
			store_currency: storeCurrency,
		},
	} = event;

	if ( ! isFXEvent( event ) ) {
		return formatExplicitCurrency( amountCaptured - fee, currency );
	}

	// We need to use the store amount and currency for the net amount calculation in the case of a FX event.
	return formatExplicitCurrency(
		storeAmountCaptured - storeFee,
		storeCurrency
	);
};

export const composeNetString = ( event ) => {
	return sprintf(
		/* translators: %s is a monetary amount */
		__( 'Net payout: %s', 'woocommerce-payments' ),
		formatNetString( event )
	);
};

export const composeFeeString = ( event ) => {
	if ( ! event.fee_rates ) {
		return sprintf(
			/* translators: %s is a monetary amount */
			__( 'Fee: %s', 'woocommerce-payments' ),
			formatCurrency( event.fee, event.currency )
		);
	}

	const {
		percentage,
		fixed,
		fixed_currency: fixedCurrency,
		history,
	} = event.fee_rates;
	let feeAmount = event.fee;
	let feeCurrency = event.currency;

	if ( isFXEvent( event ) ) {
		feeAmount = event.transaction_details.store_fee;
		feeCurrency = event.transaction_details.store_currency;
	}

	const baseFeeLabel = isBaseFeeOnly( event )
		? __( 'Base fee', 'woocommerce-payments' )
		: __( 'Fee', 'woocommerce-payments' );

	if ( isBaseFeeOnly( event ) && history[ 0 ]?.capped ) {
		return sprintf(
			'%1$s (capped at %2$s): %3$s',
			baseFeeLabel,
			formatCurrency( fixed, fixedCurrency ),
			formatCurrency( -feeAmount, feeCurrency )
		);
	}

	return sprintf(
		'%1$s (%2$f%% + %3$s): %4$s',
		baseFeeLabel,
		formatFee( percentage ),
		formatCurrency( fixed, fixedCurrency ),
		formatCurrency( -feeAmount, feeCurrency )
	);
};

export const composeFXString = ( event ) => {
	if ( ! isFXEvent( event ) ) {
		return;
	}
	const {
		transaction_details: {
			customer_currency: customerCurrency,
			customer_amount: customerAmount,
			customer_amount_captured: customerAmountCaptured,
			store_currency: storeCurrency,
			store_amount: storeAmount,
			store_amount_captured: storeAmountCaptured,
		},
	} = event;
	return formatFX(
		{
			currency: customerCurrency,
			amount: customerAmountCaptured ?? customerAmount,
		},
		{
			currency: storeCurrency,
			amount: storeAmountCaptured ?? storeAmount,
		}
	);
};

// Conditionally adds the ARN details to the timeline in case they're available.
const getRefundTrackingDetails = ( event ) => {
	return event.acquirer_reference_number_status === 'available'
		? sprintf(
				/* translators: %s is a trcking reference number */
				__(
					'Acquirer Reference Number (ARN) %s',
					'woocommerce-payments'
				),
				event.acquirer_reference_number
		  )
		: '';
};

// Converts the failure reason enums to error messages.
const getRefundFailureReason = ( event ) => {
	switch ( event.failure_reason ) {
		case 'expired_or_canceled_card':
			return __(
				'the card being expired or canceled.',
				'woocommerce-payments'
			);
		case 'lost_or_stolen_card':
			return __(
				'the card being lost or stolen.',
				'woocommerce-payments'
			);
		case 'unknown':
			return __(
				'the card being lost or stolen.',
				'woocommerce-payments'
			);
	}
};

/**
 * Returns an object containing fee breakdown.
 * Keys are fee types such as base, additional-fx, etc, except for "discount" that is an object including more discount details.
 *
 * @param {Object} event Event object
 *
 * @return {{ labelType: label, discount: {label, variable, fixed} }} Object containing formatted fee strings.
 */
export const feeBreakdown = ( event ) => {
	if ( ! event?.fee_rates?.history ) {
		return;
	}

	// hide breakdown when there's only a base fee
	if ( isBaseFeeOnly( event ) ) {
		return;
	}

	const {
		fee_rates: { history },
	} = event;

	const feeLabelMapping = ( fixedRate, isCapped ) => ( {
		base: ( () => {
			if ( isCapped ) {
				/* translators: %2$s is the capped fee */
				return __( 'Base fee: capped at %2$s', 'woocommerce-payments' );
			}

			if ( fixedRate !== 0 ) {
				/* translators: %1$s% is the fee percentage and %2$s is the fixed rate */
				return __( 'Base fee: %1$s%% + %2$s', 'woocommerce-payments' );
			}

			/* translators: %1$s% is the fee percentage */
			return __( 'Base fee: %1$s%%', 'woocommerce-payments' );
		} )(),

		'additional-international':
			fixedRate !== 0
				? __(
						/* translators: %1$s% is the fee percentage and %2$s is the fixed rate */
						'International card fee: %1$s%% + %2$s',
						'woocommerce-payments'
				  )
				: __(
						/* translators: %1$s% is the fee percentage */
						'International card fee: %1$s%%',
						'woocommerce-payments'
				  ),
		'additional-fx':
			fixedRate !== 0
				? __(
						/* translators: %1$s% is the fee percentage and %2$s is the fixed rate */
						'Foreign exchange fee: %1$s%% + %2$s',
						'woocommerce-payments'
				  )
				: __(
						/* translators: %1$s% is the fee percentage */
						'Foreign exchange fee: %1$s%%',
						'woocommerce-payments'
				  ),
		'additional-wcpay-subscription':
			fixedRate !== 0
				? __(
						/* translators: %1$s% is the fee amount and %2$s is the fixed rate */
						'Subscription transaction fee: %1$s%% + %2$s',
						'woocommerce-payments'
				  )
				: __(
						/* translators: %1$s% is the fee amount */
						'Subscription transaction fee: %1$s%%',
						'woocommerce-payments'
				  ),
		'additional-device':
			fixedRate !== 0
				? __(
						/* translators: %1$s% is the fee amount and %2$s is the fixed rate */
						'Tap to pay transaction fee: %1$s%% + %2$s',
						'woocommerce-payments'
				  )
				: __(
						/* translators: %1$s% is the fee amount */
						'Tap to pay transaction fee: %1$s%%',
						'woocommerce-payments'
				  ),
		discount: __( 'Discount', 'woocommerce-payments' ),
	} );

	const feeHistoryStrings = {};
	history.forEach( ( fee ) => {
		let labelType = fee.type;
		if ( fee.additional_type ) {
			labelType += `-${ fee.additional_type }`;
		}

		const {
			percentage_rate: percentageRate,
			fixed_rate: fixedRate,
			currency,
			capped: isCapped,
		} = fee;

		const percentageRateFormatted = formatFee( percentageRate );
		const fixedRateFormatted = formatCurrency( fixedRate, currency );

		const label = sprintf(
			feeLabelMapping( fixedRate, isCapped )[ labelType ],
			percentageRateFormatted,
			fixedRateFormatted
		);

		if ( labelType === 'discount' ) {
			feeHistoryStrings[ labelType ] = {
				label,
				variable:
					sprintf(
						/* translators: %s is a percentage number */
						__( 'Variable fee: %s', 'woocommerce-payments' ),
						percentageRateFormatted
					) + '%',
				fixed: sprintf(
					/* translators: %s is a monetary amount */
					__( 'Fixed fee: %s', 'woocommerce-payments' ),
					fixedRateFormatted
				),
			};
		} else {
			feeHistoryStrings[ labelType ] = label;
		}
	} );

	return feeHistoryStrings;
};

export const composeFeeBreakdown = ( event ) => {
	const feeHistoryStrings = feeBreakdown( event );

	if ( typeof feeHistoryStrings !== 'object' ) {
		return;
	}

	const renderDiscountSplit = ( discount ) => {
		return (
			<ul className="discount-split-list">
				<li key="variable">{ discount.variable }</li>
				<li key="fixed">{ discount.fixed }</li>
			</ul>
		);
	};

	const list = Object.keys( feeHistoryStrings ).map( ( labelType ) => {
		const fee = feeHistoryStrings[ labelType ];
		return (
			<li key={ labelType }>
				{ labelType === 'discount' ? fee.label : fee }

				{ labelType === 'discount' && renderDiscountSplit( fee ) }
			</li>
		);
	} );

	return <ul className="fee-breakdown-list"> { list } </ul>;
};

const getManualFraudOutcomeTimelineItem = ( event, status ) => {
	const isBlock = status === 'block';

	const headline = isBlock
		? // translators: %s: the username that approved the payment, <a> - link to the user
		  __( 'Payment was blocked by <a>%s</a>', 'woocommerce-payments' )
		: // translators: %s: the username that approved the payment, <a> - link to the user
		  __( 'Payment was approved by <a>%s</a>', 'woocommerce-payments' );

	const icon = isBlock ? (
		<CrossIcon className="is-error" />
	) : (
		<CheckmarkIcon className="is-success" />
	);

	return [
		getMainTimelineItem(
			event,
			createInterpolateElement(
				sprintf( headline, event.user.username ),
				{
					a: (
						// eslint-disable-next-line jsx-a11y/anchor-has-content
						<a
							href={ addQueryArgs( 'user-edit.php', {
								user_id: event.user.id,
							} ) }
							tabIndex={ -1 }
						/>
					),
				}
			),
			icon
		),
	];
};

const buildAutomaticFraudOutcomeRuleset = ( event ) => {
	const rulesetResults = Object.entries( event.ruleset_results || {} );

	return rulesetResults
		.filter( ( [ , status ] ) => status !== 'allow' )
		.map( ( [ rule, status ] ) => (
			<p key={ rule } className="fraud-outcome-ruleset-item">
				{ fraudOutcomeRulesetMapping[ status ][ rule ] }
			</p>
		) );
};

const getAutomaticFraudOutcomeTimelineItem = ( event, status ) => {
	const isBlock = status === 'block';

	const headline = isBlock
		? __(
				'Payment was screened by your fraud filters and blocked.',
				'woocommerce-payments'
		  )
		: __(
				'Payment was screened by your fraud filters and placed in review.',
				'woocommerce-payments'
		  );

	const icon = isBlock ? (
		<CrossIcon className="is-error" />
	) : (
		<ShieldIcon className="is-fraud-outcome-review" />
	);

	return [
		getMainTimelineItem(
			event,
			headline,
			icon,
			buildAutomaticFraudOutcomeRuleset( event )
		),
	];
};

/**
 * Formats an event into one or more payment timeline items
 *
 * @param {Object} event An event data
 *
 * @return {Array} Payment timeline items
 */
const mapEventToTimelineItems = ( event ) => {
	const { type } = event;

	const stringWithAmount = ( headline, amount, explicit = false ) =>
		sprintf(
			headline,
			explicit
				? formatExplicitCurrency( amount, event.currency )
				: formatCurrency( amount, event.currency )
		);

	switch ( type ) {
		case 'started':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Started', 'woocommerce-payments' )
				),
			];
		case 'authorized':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Authorized', 'woocommerce-payments' )
				),
				getMainTimelineItem(
					event,
					stringWithAmount(
						/* translators: %s is a monetary amount */
						__(
							'A payment of %s was successfully authorized.',
							'woocommerce-payments'
						),
						event.amount,
						true
					),
					<CheckmarkIcon className="is-warning" />
				),
			];
		case 'authorization_voided':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Authorization voided', 'woocommerce-payments' )
				),
				getMainTimelineItem(
					event,
					stringWithAmount(
						__(
							/* translators: %s is a monetary amount */
							'Authorization for %s was voided.',
							'woocommerce-payments'
						),
						event.amount,
						true
					),
					<CheckmarkIcon className="is-warning" />
				),
			];
		case 'authorization_expired':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Authorization expired', 'woocommerce-payments' )
				),
				getMainTimelineItem(
					event,
					stringWithAmount(
						__(
							/* translators: %s is a monetary amount */
							'Authorization for %s expired.',
							'woocommerce-payments'
						),
						event.amount,
						true
					),
					<CrossIcon className="is-error" />
				),
			];
		case 'captured':
			const formattedNet = formatNetString( event );
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Paid', 'woocommerce-payments' )
				),
				getDepositTimelineItem( event, formattedNet, true ),
				getMainTimelineItem(
					event,
					stringWithAmount(
						__(
							/* translators: %s is a monetary amount */
							'A payment of %s was successfully charged.',
							'woocommerce-payments'
						),
						event.amount_captured,
						true
					),
					<CheckmarkIcon className="is-success" />,
					[
						composeFXString( event ),
						composeFeeString( event ),
						composeFeeBreakdown( event ),
						composeNetString( event ),
					]
				),
			];
		case 'partial_refund':
		case 'full_refund':
			const formattedAmount = formatExplicitCurrency(
				event.amount_refunded,
				event.currency
			);
			const depositAmount = isFXEvent( event )
				? formatExplicitCurrency(
						event.transaction_details.store_amount,
						event.transaction_details.store_currency
				  )
				: formattedAmount;
			return [
				getStatusChangeTimelineItem(
					event,
					type === 'full_refund'
						? __( 'Refunded', 'woocommerce-payments' )
						: __( 'Partial refund', 'woocommerce-payments' )
				),
				getDepositTimelineItem( event, depositAmount, false ),
				getMainTimelineItem(
					event,
					sprintf(
						__(
							/* translators: %s is a monetary amount */
							'A payment of %s was successfully refunded.',
							'woocommerce-payments'
						),
						formattedAmount
					),
					<CheckmarkIcon className="is-success" />,
					[
						composeFXString( event ),
						getRefundTrackingDetails( event ),
					]
				),
			];
		case 'refund_failed':
			const formattedRefundFailureAmount = formatExplicitCurrency(
				event.amount_refunded,
				event.currency
			);
			return [
				getMainTimelineItem(
					event,
					sprintf(
						__(
							/* translators: %s is a monetary amount */
							'%s refund was attempted but failed due to %s',
							'woocommerce-payments'
						),
						formattedRefundFailureAmount,
						getRefundFailureReason( event )
					),
					<NoticeOutlineIcon className="is-error" />,
					[ getRefundTrackingDetails( event ) ]
				),
			];
		case 'failed':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Failed', 'woocommerce-payments' )
				),
				getMainTimelineItem(
					event,
					stringWithAmount(
						/* translators: %s is a monetary amount */
						__( 'A payment of %s failed.', 'woocommerce-payments' ),
						event.amount,
						true
					),
					<CrossIcon className="is-error" />
				),
			];
		case 'dispute_needs_response':
			let reasonHeadline = __(
				'Payment disputed',
				'woocommerce-payments'
			);
			if ( disputeReasons[ event.reason ] ) {
				reasonHeadline = sprintf(
					/* translators: %s is a monetary amount */
					__( 'Payment disputed as %s.', 'woocommerce-payments' ),
					disputeReasons[ event.reason ].display
				);
			}

			let depositTimelineItem;
			if ( event.amount === null ) {
				depositTimelineItem = {
					date: new Date( event.datetime * 1000 ),
					icon: <InfoOutlineIcon />,
					headline: __(
						'No funds have been withdrawn yet.',
						'woocommerce-payments'
					),
					body: [
						__(
							// eslint-disable-next-line max-len
							"The cardholder's bank is requesting more information to decide whether to return these funds to the cardholder.",
							'woocommerce-payments'
						),
					],
				};
			} else {
				const formattedExplicitTotal = formatExplicitCurrency(
					Math.abs( event.amount ) + Math.abs( event.fee ),
					event.currency
				);
				const disputedAmount = isFXEvent( event )
					? formatCurrency(
							event.transaction_details.customer_amount,
							event.transaction_details.customer_currency
					  )
					: formatCurrency( event.amount, event.currency );
				depositTimelineItem = getDepositTimelineItem(
					event,
					formattedExplicitTotal,
					false,
					[
						sprintf(
							/* translators: %s is a monetary amount */
							__( 'Disputed amount: %s', 'woocommerce-payments' ),
							disputedAmount
						),
						composeFXString( event ),
						sprintf(
							/* translators: %s is a monetary amount */
							__( 'Fee: %s', 'woocommerce-payments' ),
							formatCurrency( event.fee, event.currency )
						),
					]
				);
			}

			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Disputed: Needs response', 'woocommerce-payments' )
				),
				depositTimelineItem,
				getMainTimelineItem(
					event,
					reasonHeadline,
					<CrossIcon className="is-error" />
				),
			];
		case 'dispute_in_review':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Disputed: In review', 'woocommerce-payments' )
				),
				getMainTimelineItem(
					event,
					__(
						'Challenge evidence submitted.',
						'woocommerce-payments'
					),
					<CheckmarkIcon className="is-success" />
				),
			];
		case 'dispute_won':
			const formattedExplicitTotal = formatExplicitCurrency(
				Math.abs( event.amount ) + Math.abs( event.fee ),
				event.currency
			);
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Disputed: Won', 'woocommerce-payments' )
				),
				getDepositTimelineItem( event, formattedExplicitTotal, true, [
					sprintf(
						/* translators: %s is a monetary amount */
						__( 'Dispute reversal: %s', 'woocommerce-payments' ),
						formatCurrency( event.amount, event.currency )
					),
					sprintf(
						/* translators: %s is a monetary amount */
						__( 'Fee refund: %s', 'woocommerce-payments' ),
						formatCurrency( Math.abs( event.fee ), event.currency )
					),
				] ),
				getMainTimelineItem(
					event,
					__(
						'Dispute won! The bank ruled in your favor.',
						'woocommerce-payments'
					),
					<NoticeOutlineIcon className="is-success" />
				),
			];
		case 'dispute_lost':
			return [
				getStatusChangeTimelineItem(
					event,
					__( 'Disputed: Lost', 'woocommerce-payments' )
				),
				getMainTimelineItem(
					event,
					__(
						'Dispute lost. The bank ruled in favor of your customer.',
						'woocommerce-payments'
					),
					<CrossIcon className="is-error" />
				),
			];
		case 'dispute_warning_closed':
			return [
				getMainTimelineItem(
					event,
					__(
						'Dispute inquiry closed. The bank chose not to pursue this dispute.',
						'woocommerce-payments'
					),
					<NoticeOutlineIcon className="is-success" />
				),
			];
		case 'dispute_charge_refunded':
			return [
				getMainTimelineItem(
					event,
					__(
						'The disputed charge has been refunded.',
						'woocommerce-payments'
					),
					<NoticeOutlineIcon className="is-success" />
				),
			];
		case 'financing_paydown':
			return [
				getFinancingPaydownTimelineItem(
					event,
					formatCurrency( Math.abs( event.amount ) ),
					[
						createInterpolateElement(
							sprintf(
								__(
									'Loan repayment: <a>Loan %s</a>',
									'woocommerce-payments'
								),
								event.loan_id
							),
							{
								a: (
									<Link
										href={ getAdminUrl( {
											page: 'wc-admin',
											path: '/payments/transactions',
											type: 'charge',
											filter: 'advanced',
											loan_id_is: event.loan_id,
										} ) }
									/>
								),
							}
						),
					]
				),
			];
		case 'fraud_outcome_manual_approve':
			return getManualFraudOutcomeTimelineItem( event, 'allow' );
		case 'fraud_outcome_manual_block':
			return getManualFraudOutcomeTimelineItem( event, 'block' );
		case 'fraud_outcome_review':
			return getAutomaticFraudOutcomeTimelineItem( event, 'review' );
		case 'fraud_outcome_block':
			return getAutomaticFraudOutcomeTimelineItem( event, 'block' );
		default:
			return [];
	}
};

/**
 * Maps the timeline events coming from the server to items that can be used in Timeline component
 *
 * @param {Array} timelineEvents array of events
 *
 * @return {Array} Array of view items
 */
export default ( timelineEvents ) => {
	if ( ! timelineEvents ) {
		return [];
	}

	return flatMap( timelineEvents, mapEventToTimelineItems );
};
