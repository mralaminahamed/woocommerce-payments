/** @format **/

/**
 * External dependencies
 */
import React from 'react';
import { dateI18n } from '@wordpress/date';
import { __, sprintf } from '@wordpress/i18n';
import moment from 'moment';
import {
	Card,
	CardBody,
	CardHeader,
	ExternalLink,
	// @ts-expect-error: Suppressing Module '"@wordpress/components"' has no exported member '__experimentalText'.
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis -- used by TableCard component which we replicate here.
	__experimentalText as Text,
} from '@wordpress/components';
import {
	SummaryListPlaceholder,
	SummaryList,
	OrderStatus,
} from '@woocommerce/components';
import interpolateComponents from '@automattic/interpolate-components';
import classNames from 'classnames';

/**
 * Internal dependencies.
 */
import type { CachedDeposit } from 'types/deposits';
import { useDeposit } from 'data';
import TransactionsList from 'transactions/list';
import Page from 'components/page';
import ErrorBoundary from 'components/error-boundary';
import { TestModeNotice } from 'components/test-mode-notice';
import InlineNotice from 'components/inline-notice';
import {
	formatCurrency,
	formatExplicitCurrency,
} from 'multi-currency/interface/functions';
import { depositStatusLabels } from '../strings';
import './style.scss';
import { PayoutsRenameNotice } from '../rename-notice';

/**
 * Renders the deposit status indicator UI, re-purposing the OrderStatus component from @woocommerce/components.
 */
const DepositStatusIndicator: React.FC< {
	deposit: Pick< CachedDeposit, 'status' | 'type' >;
} > = ( { deposit } ) => {
	let displayStatusMap = depositStatusLabels;

	// Withdrawals are displayed as 'Deducted' instead of 'Paid' when the status is 'paid'.
	if ( deposit.type === 'withdrawal' ) {
		displayStatusMap = {
			...displayStatusMap,
			paid: displayStatusMap.deducted,
		};
	}

	return (
		<OrderStatus
			order={ { status: deposit.status } }
			orderStatusMap={ displayStatusMap }
		/>
	);
};

interface SummaryItemProps {
	label: string;
	value: string | JSX.Element;
	valueClass?: string | false;
	detail?: string;
}

/**
 * A custom SummaryNumber with custom value className, reusing @woocommerce/components styles.
 */
const SummaryItem: React.FC< SummaryItemProps > = ( {
	label,
	value,
	valueClass,
	detail,
} ) => (
	<li className="woocommerce-summary__item-container">
		<div className="woocommerce-summary__item">
			<div className="woocommerce-summary__item-label">{ label }</div>
			<div className="woocommerce-summary__item-data">
				<div
					className={ classNames(
						'woocommerce-summary__item-value',
						valueClass
					) }
				>
					{ value }
				</div>
			</div>
			{ detail && (
				<div className="wcpay-summary__item-detail">{ detail }</div>
			) }
		</div>
	</li>
);

interface DepositOverviewProps {
	deposit: CachedDeposit | undefined;
}

export const DepositOverview: React.FC< DepositOverviewProps > = ( {
	deposit,
} ) => {
	if ( ! deposit ) {
		return (
			<InlineNotice icon status="error" isDismissible={ false }>
				{ __(
					`The deposit you are looking for cannot be found.`,
					'woocommerce-payments'
				) }
			</InlineNotice>
		);
	}

	const isWithdrawal = deposit.type === 'withdrawal';

	let depositDateLabel = __( 'Payout date', 'woocommerce-payments' );
	if ( ! deposit.automatic ) {
		depositDateLabel = __( 'Instant payout date', 'woocommerce-payments' );
	}
	if ( isWithdrawal ) {
		depositDateLabel = __( 'Withdrawal date', 'woocommerce-payments' );
	}

	const depositDateItem = (
		<SummaryItem
			key="depositDate"
			label={
				`${ depositDateLabel }: ` +
				dateI18n(
					'M j, Y',
					moment.utc( deposit.date ).toISOString(),
					true // TODO Change call to gmdateI18n and remove this deprecated param once WP 5.4 support ends.
				)
			}
			value={ <DepositStatusIndicator deposit={ deposit } /> }
			detail={ deposit.bankAccount }
		/>
	);

	return (
		<div className="wcpay-deposit-overview">
			{ deposit.automatic ? (
				<Card className="wcpay-deposit-automatic">
					<ul>
						{ depositDateItem }
						<li className="wcpay-deposit-amount">
							{ formatExplicitCurrency(
								deposit.amount,
								deposit.currency
							) }
						</li>
					</ul>
				</Card>
			) : (
				<SummaryList
					label={
						isWithdrawal
							? __(
									'Withdrawal overview',
									'woocommerce-payments'
							  )
							: __( 'Payout overview', 'woocommerce-payments' )
					}
				>
					{ () => [
						depositDateItem,
						<SummaryItem
							key="depositAmount"
							label={
								isWithdrawal
									? __(
											'Withdrawal amount',
											'woocommerce-payments'
									  )
									: __(
											'Payout amount',
											'woocommerce-payments'
									  )
							}
							value={ formatExplicitCurrency(
								deposit.amount + deposit.fee,
								deposit.currency
							) }
						/>,
						<SummaryItem
							key="depositFees"
							label={ sprintf(
								/* translators: %s - amount representing the fee percentage */
								__( '%s service fee', 'woocommerce-payments' ),
								`${ deposit.fee_percentage }%`
							) }
							value={ formatCurrency(
								deposit.fee,
								deposit.currency
							) }
							valueClass={
								0 < deposit.fee && 'wcpay-deposit-fee'
							}
						/>,
						<SummaryItem
							key="netDepositAmount"
							label={
								isWithdrawal
									? __(
											'Net withdrawal amount',
											'woocommerce-payments'
									  )
									: __(
											'Net payout amount',
											'woocommerce-payments'
									  )
							}
							value={ formatExplicitCurrency(
								deposit.amount,
								deposit.currency
							) }
							valueClass="wcpay-deposit-net"
						/>,
					] }
				</SummaryList>
			) }
		</div>
	);
};

interface DepositDetailsProps {
	query: {
		id: string;
	};
}

export const DepositDetails: React.FC< DepositDetailsProps > = ( {
	query: { id: depositId },
} ) => {
	const { deposit, isLoading } = useDeposit( depositId );

	const isInstantDeposit = ! isLoading && deposit && ! deposit.automatic;

	return (
		<Page>
			<PayoutsRenameNotice />
			<TestModeNotice currentPage="deposits" isDetailsView={ true } />
			<ErrorBoundary>
				{ isLoading ? (
					<SummaryListPlaceholder numberOfItems={ 2 } />
				) : (
					<DepositOverview deposit={ deposit } />
				) }
			</ErrorBoundary>

			{ deposit && (
				<ErrorBoundary>
					{ isInstantDeposit ? (
						// If instant deposit, show a message instead of the transactions list.
						// Matching the components used in @woocommerce/components TableCard for consistent UI.
						<Card>
							<CardHeader>
								<Text size={ 16 } weight={ 600 } as="h2">
									{ __(
										'Payout transactions',
										'woocommerce-payments'
									) }
								</Text>
							</CardHeader>
							<CardBody className="wcpay-deposit-overview--instant__transactions-list-message">
								{ interpolateComponents( {
									/* Translators: {{learnMoreLink}} is a link element (<a/>). */
									mixedString: __(
										`We're unable to show transaction history on instant payouts. {{learnMoreLink}}Learn more{{/learnMoreLink}}`,
										'woocommerce-payments'
									),
									components: {
										learnMoreLink: (
											<ExternalLink href="https://woocommerce.com/document/woopayments/payouts/instant-payouts/#transactions" />
										),
									},
								} ) }
							</CardBody>
						</Card>
					) : (
						<TransactionsList depositId={ depositId } />
					) }
				</ErrorBoundary>
			) }
		</Page>
	);
};

export default DepositDetails;
