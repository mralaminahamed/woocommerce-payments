/**
 * External dependencies
 */
import React, { useContext } from 'react';
import { select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Card, SelectControl, ExternalLink } from '@wordpress/components';
import interpolateComponents from '@automattic/interpolate-components';

/**
 * Internal dependencies
 */
import { STORE_NAME } from 'wcpay/data/constants';
import { getDepositMonthlyAnchorLabel } from 'wcpay/deposits/utils';
import WCPaySettingsContext from '../wcpay-settings-context';
import CardBody from '../card-body';
import {
	useDepositScheduleInterval,
	useDepositScheduleWeeklyAnchor,
	useDepositScheduleMonthlyAnchor,
	useDepositStatus,
	useCompletedWaitingPeriod,
	useDepositRestrictions,
	useAllDepositsOverviews,
} from '../../data';
import './style.scss';
import { recordEvent } from 'tracks';
import InlineNotice from 'components/inline-notice';
import { DepositFailureNotice } from 'components/deposits-overview/deposit-notices';

const daysOfWeek = [
	{ label: __( 'Monday', 'woocommerce-payments' ), value: 'monday' },
	{ label: __( 'Tuesday', 'woocommerce-payments' ), value: 'tuesday' },
	{
		label: __( 'Wednesday', 'woocommerce-payments' ),
		value: 'wednesday',
	},
	{ label: __( 'Thursday', 'woocommerce-payments' ), value: 'thursday' },
	{ label: __( 'Friday', 'woocommerce-payments' ), value: 'friday' },
];

// Monthly deposit schedule anchors: 1-28 labelled with ordinal suffix and 31 labelled as "Last day of the month".
const monthlyAnchors = [
	...Array.from( { length: 28 }, ( _, i ) => i + 1 ),
	31,
].map( ( anchor ) => ( {
	value: anchor,
	label: getDepositMonthlyAnchorLabel( { monthlyAnchor: anchor } ),
} ) );

const CustomizeDepositSchedule = () => {
	const [
		depositScheduleInterval,
		setDepositScheduleInterval,
	] = useDepositScheduleInterval();
	const [
		depositScheduleWeeklyAnchor,
		setDepositScheduleWeeklyAnchor,
	] = useDepositScheduleWeeklyAnchor();
	const [
		depositScheduleMonthlyAnchor,
		setDepositScheduleMonthlyAnchor,
	] = useDepositScheduleMonthlyAnchor();

	const settings = select( STORE_NAME ).getSettings();

	const handleIntervalChange = ( newInterval ) => {
		switch ( newInterval ) {
			case 'weekly':
				setDepositScheduleWeeklyAnchor(
					depositScheduleWeeklyAnchor || 'monday'
				);
				break;

			case 'monthly':
				setDepositScheduleMonthlyAnchor(
					depositScheduleMonthlyAnchor || '1'
				);
				break;
		}

		setDepositScheduleInterval( newInterval );
	};

	let depositIntervalsOptions = [
		{
			value: 'daily',
			label: __( 'Daily', 'woocommerce-payments' ),
		},
		{
			value: 'weekly',
			label: __( 'Weekly', 'woocommerce-payments' ),
		},
		{
			value: 'monthly',
			label: __( 'Monthly', 'woocommerce-payments' ),
		},
	];

	if ( settings.account_country === 'JP' ) {
		// Japanese accounts can't have daily payouts.
		depositIntervalsOptions = depositIntervalsOptions.slice( 1 );
	}

	return (
		<>
			<div className="schedule-controls">
				<SelectControl
					label={ __( 'Frequency', 'woocommerce-payments' ) }
					value={ depositScheduleInterval }
					onChange={ handleIntervalChange }
					options={ depositIntervalsOptions }
				/>
				{ depositScheduleInterval === 'monthly' && (
					<SelectControl
						label={ __( 'Date', 'woocommerce-payments' ) }
						value={ depositScheduleMonthlyAnchor }
						onChange={ setDepositScheduleMonthlyAnchor }
						options={ monthlyAnchors }
					/>
				) }
				{ depositScheduleInterval === 'weekly' && (
					<SelectControl
						label={ __( 'Day', 'woocommerce-payments' ) }
						value={ depositScheduleWeeklyAnchor }
						onChange={ setDepositScheduleWeeklyAnchor }
						options={ daysOfWeek }
					/>
				) }
			</div>
			<p className="help-text">
				{ depositScheduleInterval === 'monthly' &&
					__(
						'Payouts scheduled on a weekend will be sent on the next business day.',
						'woocommerce-payments'
					) }
				{ depositScheduleInterval === 'weekly' &&
					__(
						'Payouts that fall on a holiday will initiate on the next business day.',
						'woocommerce-payments'
					) }
				{ depositScheduleInterval === 'daily' &&
					__(
						'Payouts will occur every business day.',
						'woocommerce-payments'
					) }
			</p>
		</>
	);
};
const DepositsSchedule = () => {
	const depositStatus = useDepositStatus();
	const depositRestrictions = useDepositRestrictions();
	const completedWaitingPeriod = useCompletedWaitingPeriod();

	if (
		depositStatus !== 'enabled' ||
		depositRestrictions === 'schedule_restricted'
	) {
		return (
			<InlineNotice status="warning" isDismissible={ false } icon>
				{ interpolateComponents( {
					mixedString: __(
						'Payout scheduling is currently unavailable for your store. {{learnMoreLink}}Learn more{{/learnMoreLink}}',
						'woocommerce-payments'
					),
					components: {
						learnMoreLink: (
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							<a
								href="https://woocommerce.com/document/woopayments/payouts/payout-schedule/"
								target="_blank"
								rel="noreferrer noopener"
							/>
						),
					},
				} ) }
			</InlineNotice>
		);
	}
	if ( completedWaitingPeriod !== true ) {
		return (
			<InlineNotice status="warning" isDismissible={ false } icon>
				{ interpolateComponents( {
					mixedString: __(
						'Your first payout will be held for 7-14 days. ' +
							'Payout scheduling will be available after this period. {{learnMoreLink}}Learn more{{/learnMoreLink}}',
						'woocommerce-payments'
					),
					components: {
						learnMoreLink: (
							// eslint-disable-next-line jsx-a11y/anchor-has-content
							<a
								href="https://woocommerce.com/document/woopayments/payouts/payout-schedule/"
								target="_blank"
								rel="noreferrer noopener"
							/>
						),
					},
				} ) }
			</InlineNotice>
		);
	}

	return <CustomizeDepositSchedule />;
};

const Deposits = () => {
	const {
		accountStatus: { accountLink },
	} = useContext( WCPaySettingsContext );

	const { overviews } = useAllDepositsOverviews();

	const hasErroredExternalAccount =
		overviews.account?.default_external_accounts?.some(
			( externalAccount ) => externalAccount.status === 'errored'
		) ?? false;

	return (
		<Card className="deposits">
			<CardBody>
				<h4>{ __( 'Payout schedule', 'woocommerce-payments' ) }</h4>

				<DepositsSchedule />

				<div className="deposits__bank-information">
					<h4>
						{ __( 'Payout bank account', 'woocommerce-payments' ) }
					</h4>
					{ hasErroredExternalAccount ? (
						<DepositFailureNotice
							updateAccountLink={ accountLink }
						/>
					) : (
						<p className="deposits__bank-information-help">
							{ __(
								'Manage and update your bank account information to receive payouts.',
								'woocommerce-payments'
							) }{ ' ' }
							{ accountLink && (
								<ExternalLink
									href={ accountLink }
									onClick={ () => {
										recordEvent(
											'wcpay_settings_deposits_manage_in_stripe_click'
										);
										recordEvent(
											'wcpay_account_details_link_clicked',
											{ source: 'settings-deposits' }
										);
									} }
								>
									{ __(
										'Manage in Stripe',
										'woocommerce-payments'
									) }
								</ExternalLink>
							) }
						</p>
					) }
				</div>
			</CardBody>
		</Card>
	);
};

export default Deposits;
