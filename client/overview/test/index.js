/** @format */

/**
 * External dependencies
 */
import { render, screen, waitFor } from '@testing-library/react';
import { select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import OverviewPage from '../';
import { getTasks } from '../task-list/tasks';
import { getQuery } from '@woocommerce/navigation';
import userEvent from '@testing-library/user-event';

const settingsMock = {
	enabled_payment_method_ids: [ 'foo', 'bar' ],
	is_wcpay_enabled: true,
};

jest.mock( '../task-list/tasks', () => ( { getTasks: jest.fn() } ) );
jest.mock( '../inbox-notifications', () =>
	jest.fn().mockImplementation( () => '[inbox-notifications]' )
);
jest.mock( '@woocommerce/experimental', () => {
	return {
		CollapsibleList: () => (
			<div className="woocommerce-experimental-list"></div>
		),
		Text: () => <div>text</div>,
	};
} );
jest.mock( '@woocommerce/navigation', () => ( {
	getQuery: jest.fn(),
	addHistoryListener: jest.fn(),
} ) );

jest.mock( '@wordpress/data', () => ( {
	registerStore: jest.fn(),
	combineReducers: jest.fn(),
	useDispatch: jest.fn( () => ( { updateOptions: jest.fn() } ) ),
	dispatch: jest.fn( () => ( {
		setIsMatching: jest.fn(),
		onLoad: jest.fn(),
	} ) ),
	withDispatch: jest.fn( () => jest.fn() ),
	createRegistryControl: jest.fn(),
	select: jest.fn(),
	withSelect: jest.fn( () => jest.fn() ),
	useSelect: jest.fn( () => ( { getNotices: jest.fn() } ) ),
} ) );
jest.mock( '@wordpress/data-controls' );
jest.mock( 'wcpay/data', () => ( {
	useGetSettings: jest
		.fn()
		.mockReturnValue( { enabled_payment_method_ids: [ 'foo', 'bar' ] } ),
	useSettings: jest.fn().mockReturnValue( {} ),
	useDisputes: jest
		.fn()
		.mockReturnValue( { disputes: [], isLoading: false } ),
	useDeposits: jest
		.fn()
		.mockReturnValue( { deposits: [], isLoading: false } ),
	useAllDepositsOverviews: jest
		.fn()
		.mockReturnValue( { overviews: { currencies: [] } } ),
	useActiveLoanSummary: jest.fn().mockReturnValue( { isLoading: true } ),
} ) );

select.mockReturnValue( {
	getSettings: () => settingsMock,
} );

const loanOfferErrorText =
	'There was a problem redirecting you to the loan offer. Please check that it is not expired and try again.';

const serverLinkErrorText =
	'There was a problem redirecting you to the requested link. Please check that it is valid and try again.';

describe( 'Overview page', () => {
	beforeEach( () => {
		global.wcpaySettings = {
			zeroDecimalCurrencies: [],
			accountStatus: {
				status: 'complete',
				paymentsEnabled: 1,
				deposits: {
					status: 'enabled',
					interval: 'weekly',
				},
				progressiveOnboarding: {
					isComplete: false,
					isEnabled: false,
				},
			},
			accountFees: {
				base: {
					currency: 'EUR',
					percentage_rate: 0.029,
					fixed_rate: 0.3,
				},
				discount: [],
			},
			featureFlags: {
				accountOverviewTaskList: true,
			},
			accountLoans: {},
			frtDiscoverBannerSettings: JSON.stringify( {
				remindMeCount: 0,
				remindMeAt: null,
				dontShowAgain: false,
			} ),
		};
		getQuery.mockReturnValue( {} );
		getTasks.mockReturnValue( [] );
	} );

	it( 'Skips rendering task list when there are no tasks', () => {
		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector( '.woocommerce-experimental-list' )
		).toBeNull();
	} );

	it( 'Skips rendering task list when accountOverviewTaskList feature flag is off', () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			featureFlags: {},
		};

		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector( '.woocommerce-experimental-list' )
		).toBeNull();
	} );

	it( 'Displays the login error for query param wcpay-login-error=1', () => {
		getQuery.mockReturnValue( { 'wcpay-login-error': '1' } );

		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector(
				'.wcpay-banner-notice.is-error.wcpay-login-error'
			)
		).toBeVisible();
	} );

	it( 'Displays the success message for query param wcpay-connection-success=1', () => {
		getQuery.mockReturnValue( { 'wcpay-connection-success': '1' } );

		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector( '.wcpay-connection-success' )
		).toBeVisible();
	} );

	it( 'Displays the notice for Jetpack Identity Crisis', () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			isJetpackIdcActive: 1,
		};

		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector( '.wcpay-jetpack-idc-notice' )
		).toBeVisible();
	} );

	it( 'Displays the server link redirection error message for query param wcpay-server-link-error=1', () => {
		getQuery.mockReturnValue( { 'wcpay-server-link-error': '1' } );
		getTasks.mockReturnValue( [] );

		render( <OverviewPage /> );

		expect(
			screen.queryByText( ( content, element ) => {
				return (
					serverLinkErrorText === content &&
					! element.classList.contains( 'a11y-speak-region' )
				);
			} )
		).toBeVisible();
	} );

	it( 'Does not display the server link redirection error message when there the query parameter is not present', () => {
		getTasks.mockReturnValue( [] );

		render( <OverviewPage /> );

		expect(
			screen.queryByText( ( content, element ) => {
				return (
					serverLinkErrorText === content &&
					! element.classList.contains( 'a11y-speak-region' )
				);
			} )
		).toBeNull();
	} );

	it( 'Displays the view loan error message for query param wcpay-loan-offer-error=1', () => {
		getQuery.mockReturnValue( { 'wcpay-loan-offer-error': '1' } );
		getTasks.mockReturnValue( [] );

		render( <OverviewPage /> );

		expect(
			screen.queryByText( ( content, element ) => {
				return (
					loanOfferErrorText === content &&
					! element.classList.contains( 'a11y-speak-region' )
				);
			} )
		).toBeVisible();
	} );

	it( 'Does not display the view loan error message when there the query parameter is not present', () => {
		getTasks.mockReturnValue( [] );

		render( <OverviewPage /> );

		expect(
			screen.queryByText( ( content, element ) => {
				return (
					loanOfferErrorText === content &&
					! element.classList.contains( 'a11y-speak-region' )
				);
			} )
		).toBeNull();
	} );

	it( 'Does not display loan summary when there is no loan', () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			accountLoans: {
				has_active_loan: false,
			},
		};

		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector( '.wcpay-loan-summary-header' )
		).toBeNull();
	} );

	it( 'Displays loan summary when there is a loan', () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			accountLoans: {
				has_active_loan: true,
			},
		};

		const { container } = render( <OverviewPage /> );

		expect(
			container.querySelector( '.wcpay-loan-summary-header' )
		).toBeVisible();
	} );

	it( 'renders FRTDiscoverabilityBanner if store has transacted', () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			frtDiscoverBannerSettings: JSON.stringify( {
				dontShowAgain: false,
			} ),
			lifetimeTPV: 100,
		};
		render( <OverviewPage /> );

		expect(
			screen.queryByText( 'Enhanced fraud protection for your store' )
		).toBeInTheDocument();
	} );

	it( 'does not render FRTDiscoverabilityBanner if store has not transacted', () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			frtDiscoverBannerSettings: JSON.stringify( {
				dontShowAgain: false,
			} ),
			lifetimeTPV: 0,
		};
		render( <OverviewPage /> );

		expect(
			screen.queryByText( 'Enhanced fraud protection for your store' )
		).not.toBeInTheDocument();
	} );

	it( 'dismisses the FRTDiscoverabilityBanner when dismiss button is clicked', async () => {
		global.wcpaySettings = {
			...global.wcpaySettings,
			frtDiscoverBannerSettings: JSON.stringify( {
				dontShowAgain: false,
			} ),
			lifetimeTPV: 100,
		};

		render( <OverviewPage /> );

		const bannerHeader = screen.getByText(
			'Enhanced fraud protection for your store'
		);

		expect( bannerHeader ).toBeInTheDocument();

		userEvent.click( screen.getByText( 'Dismiss' ) );

		await waitFor( () => {
			expect( bannerHeader ).not.toBeInTheDocument();
		} );
	} );

	it( 'displays ProgressiveOnboardingEligibilityModal if showProgressiveOnboardingEligibilityModal is true', () => {
		getQuery.mockReturnValue( { 'wcpay-connection-success': '1' } );

		global.wcpaySettings.accountStatus.progressiveOnboarding.isEnabled = true;

		render( <OverviewPage /> );

		expect(
			screen.getByText( 'You’re ready to sell.' )
		).toBeInTheDocument();
	} );

	it( 'does not displays ProgressiveOnboardingEligibilityModal if showProgressiveOnboardingEligibilityModal is false', () => {
		const query = () => screen.queryByText( 'You’re ready to sell.' );

		render( <OverviewPage /> );

		expect( query() ).not.toBeInTheDocument();

		getQuery.mockReturnValue( { 'wcpay-connection-success': '1' } );

		render( <OverviewPage /> );

		expect( query() ).not.toBeInTheDocument();

		global.wcpaySettings.accountStatus.progressiveOnboarding = {
			isEnabled: true,
			isComplete: true,
		};

		render( <OverviewPage /> );

		expect( query() ).not.toBeInTheDocument();
	} );

	it( 'shows payout rename notice if not yet dismissed', () => {
		global.wcpaySettings.isPayoutsRenameNoticeDismissed = false;

		render( <OverviewPage /> );

		expect(
			screen.queryByText( 'Deposits are now known as Payouts!' )
		).toBeInTheDocument();
	} );

	it( 'does not display payout rename notice if already dismissed', () => {
		global.wcpaySettings.isPayoutsRenameNoticeDismissed = true;

		render( <OverviewPage /> );

		expect(
			screen.queryByText( 'Deposits are now known as Payouts!' )
		).not.toBeInTheDocument();
	} );
} );
