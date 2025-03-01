/* global jQuery, wc_address_i18n_params */

/**
 * Internal dependencies
 */
import './style.scss';
import { getUPEConfig } from 'wcpay/utils/checkout';
import {
	generateCheckoutEventNames,
	getSelectedUPEGatewayPaymentMethod,
	isLinkEnabled,
	hasPaymentMethodCountryRestrictions,
	isUsingSavedPaymentMethod,
	togglePaymentMethodForCountry,
} from '../utils/upe';
import {
	processPayment,
	mountStripePaymentElement,
	mountStripePaymentMethodMessagingElement,
	renderTerms,
	createAndConfirmSetupIntent,
	maybeEnableStripeLink,
	blockUI,
	unblockUI,
} from './payment-processing';
import enqueueFraudScripts from 'fraud-scripts';
import { showAuthenticationModalIfRequired } from './3ds-flow-handling';
import WCPayAPI from 'wcpay/checkout/api';
import apiRequest from '../utils/request';
import { handleWooPayEmailInput } from 'wcpay/checkout/woopay/email-input-iframe';
import { isPreviewing } from 'wcpay/checkout/preview';
import { recordUserEvent } from 'tracks';
import { SHORTCODE_BILLING_ADDRESS_FIELDS } from 'wcpay/checkout/constants';
import '../utils/copy-test-number';

function getParsedLocale() {
	try {
		return JSON.parse(
			wc_address_i18n_params.locale.replace( /&quot;/g, '"' )
		);
	} catch ( e ) {
		return null;
	}
}
jQuery( function ( $ ) {
	const locale = getParsedLocale();
	enqueueFraudScripts( getUPEConfig( 'fraudServices' ) );
	const publishableKey = getUPEConfig( 'publishableKey' );

	if ( ! publishableKey ) {
		// If no configuration is present, probably this is not the checkout page.
		return;
	}

	const $checkoutForm = $( 'form.checkout' );
	const $addPaymentMethodForm = $( 'form#add_payment_method' );
	const $payForOrderForm = $( 'form#order_review' );

	// creating a new jQuery object containing all the forms that need to be updated on submit, failure, or other events.
	const $forms = jQuery( $checkoutForm )
		.add( $addPaymentMethodForm )
		.add( $payForOrderForm );

	const api = new WCPayAPI(
		{
			publishableKey: publishableKey,
			accountId: getUPEConfig( 'accountId' ),
			forceNetworkSavedCards: getUPEConfig( 'forceNetworkSavedCards' ),
			locale: getUPEConfig( 'locale' ),
			isStripeLinkEnabled: isLinkEnabled(
				getUPEConfig( 'paymentMethodsConfig' )
			),
		},
		apiRequest
	);

	blockUI( $forms );
	showAuthenticationModalIfRequired( api ).finally( () => {
		unblockUI( $forms );
	} );

	$( document.body ).on( 'updated_checkout', () => {
		maybeMountStripePaymentElement( 'shortcode_checkout' );
		injectStripePMMEContainers();
	} );

	$checkoutForm.on( generateCheckoutEventNames(), function () {
		if ( isBillingInformationMissing() ) {
			return;
		}

		return processPaymentIfNotUsingSavedMethod( $( this ) );
	} );

	$checkoutForm.on( 'click', '#place_order', function () {
		const isWCPay = document.getElementById(
			'payment_method_woocommerce_payments'
		)?.checked;

		if ( ! isWCPay ) {
			return;
		}

		recordUserEvent( 'checkout_place_order_button_click' );
	} );

	window.addEventListener( 'hashchange', () => {
		if ( window.location.hash.startsWith( '#wcpay-confirm-' ) ) {
			blockUI( $forms );
			showAuthenticationModalIfRequired( api, $forms ).finally( () => {
				unblockUI( $forms );
			} );
		}
	} );

	document.addEventListener( 'change', function ( event ) {
		if (
			event.target &&
			event.target.id === 'wc-woocommerce_payments-new-payment-method'
		) {
			renderTerms( event );
		}
	} );

	if ( $addPaymentMethodForm.length ) {
		maybeMountStripePaymentElement( 'add_payment_method' );
	}

	if ( $payForOrderForm.length ) {
		maybeMountStripePaymentElement( 'shortcode_checkout' );
	}

	$addPaymentMethodForm.on( 'submit', function () {
		if (
			$addPaymentMethodForm
				.find( "input:checked[name='payment_method']" )
				.val() !== 'woocommerce_payments'
		) {
			return;
		}

		// WC core calls block() when add_payment_method form is submitted, so we need to enable the ignore flag here to avoid
		// the overlay blink when the form is blocked twice.
		$.blockUI.defaults.ignoreIfBlocked = true;

		return processPayment(
			api,
			$addPaymentMethodForm,
			getSelectedUPEGatewayPaymentMethod(),
			createAndConfirmSetupIntent
		);
	} );

	$payForOrderForm.on( 'submit', function () {
		if ( getSelectedUPEGatewayPaymentMethod() === null ) {
			return;
		}

		return processPaymentIfNotUsingSavedMethod( $payForOrderForm );
	} );

	if (
		getUPEConfig( 'isWooPayEnabled' ) &&
		getUPEConfig( 'isWooPayEmailInputEnabled' ) &&
		! isPreviewing()
	) {
		handleWooPayEmailInput( '#billing_email', api );
	}

	async function injectStripePMMEContainers() {
		const bnplMethods = [ 'affirm', 'afterpay_clearpay', 'klarna' ];
		const labelBase = 'payment_method_woocommerce_payments_';
		const paymentMethods = getUPEConfig( 'paymentMethodsConfig' );
		const paymentMethodsKeys = Object.keys( paymentMethods );
		const cartData = await api.pmmeGetCartData();

		for ( const method of paymentMethodsKeys ) {
			if ( bnplMethods.includes( method ) ) {
				const targetLabel = document.querySelector(
					`label[for="${ labelBase }${ method }"]`
				);
				const containerID = `stripe-pmme-container-${ method }`;

				if ( document.getElementById( containerID ) ) {
					document.getElementById( containerID ).innerHTML = '';
				}

				if ( targetLabel ) {
					let container = document.getElementById( containerID );
					if ( ! container ) {
						container = document.createElement( 'span' );
						container.id = containerID;
						container.dataset.paymentMethodType = method;
						container.classList.add( 'stripe-pmme-container' );
						targetLabel.appendChild( container );
					}

					const currentCountry =
						cartData?.billing_address?.country ||
						getUPEConfig( 'storeCountry' );

					if (
						paymentMethods[ method ]?.countries.length === 0 ||
						paymentMethods[ method ]?.countries?.includes(
							currentCountry
						)
					) {
						await mountStripePaymentMethodMessagingElement(
							api,
							container,
							{
								amount: cartData?.totals?.total_price,
								currency: cartData?.totals?.currency_code,
								decimalPlaces:
									cartData?.totals?.currency_minor_unit,
								country: currentCountry,
							},
							'shortcode_checkout'
						);
					}
				}
			}
		}
	}

	function processPaymentIfNotUsingSavedMethod( $form ) {
		const paymentMethodType = getSelectedUPEGatewayPaymentMethod();
		if ( ! isUsingSavedPaymentMethod( paymentMethodType ) ) {
			return processPayment( api, $form, paymentMethodType );
		}
	}

	async function maybeMountStripePaymentElement( elementsLocation ) {
		if (
			$( '.wcpay-upe-element' ).length &&
			! $( '.wcpay-upe-element' ).children().length
		) {
			for ( const upeElement of $( '.wcpay-upe-element' ).toArray() ) {
				await mountStripePaymentElement(
					api,
					upeElement,
					elementsLocation
				);
				restrictPaymentMethodToLocation( upeElement );
			}
			maybeEnableStripeLink( api );
		}
	}

	function restrictPaymentMethodToLocation( upeElement ) {
		if ( hasPaymentMethodCountryRestrictions( upeElement ) ) {
			togglePaymentMethodForCountry( upeElement );

			// this event only applies to the checkout form, but not "place order" or "add payment method" pages.
			$( '#billing_country' ).on( 'change', function () {
				togglePaymentMethodForCountry( upeElement );
			} );
		}
	}

	function isBillingInformationMissing() {
		const enabledBillingFields = getUPEConfig( 'enabledBillingFields' );

		// first name and last name are kinda special - we just need one of them to be at checkout
		const name = `${
			document.querySelector(
				`#${ SHORTCODE_BILLING_ADDRESS_FIELDS.first_name }`
			)?.value || ''
		} ${
			document.querySelector(
				`#${ SHORTCODE_BILLING_ADDRESS_FIELDS.last_name }`
			)?.value || ''
		}`.trim();
		if (
			! name &&
			( enabledBillingFields[
				SHORTCODE_BILLING_ADDRESS_FIELDS.first_name
			] ||
				enabledBillingFields[
					SHORTCODE_BILLING_ADDRESS_FIELDS.last_name
				] )
		) {
			return true;
		}

		const billingFieldsToValidate = [
			'billing_email',
			SHORTCODE_BILLING_ADDRESS_FIELDS.country,
			SHORTCODE_BILLING_ADDRESS_FIELDS.address_1,
			SHORTCODE_BILLING_ADDRESS_FIELDS.city,
			SHORTCODE_BILLING_ADDRESS_FIELDS.postcode,
		].filter( ( field ) => enabledBillingFields[ field ] );

		const country = billingFieldsToValidate.includes(
			SHORTCODE_BILLING_ADDRESS_FIELDS.country
		)
			? document.querySelector(
					`#${ SHORTCODE_BILLING_ADDRESS_FIELDS.country }`
			  )?.value
			: null;

		// We need to just find one field with missing information. If even only one is missing, just return early.
		return Boolean(
			billingFieldsToValidate.find( ( fieldName ) => {
				const $field = document.querySelector( `#${ fieldName }` );
				let isRequired = enabledBillingFields[ fieldName ]?.required;

				if ( country && locale && fieldName !== 'billing_email' ) {
					const key = fieldName.replace( 'billing_', '' );
					isRequired =
						locale[ country ][ key ]?.required ??
						locale.default[ key ]?.required;
				}

				const hasValue = $field?.value;

				return isRequired && ! hasValue;
			} )
		);
	}
} );
