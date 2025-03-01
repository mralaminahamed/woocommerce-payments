/**
 * External dependencies
 */
import config from 'config';

const { shopper } = require( '@woocommerce/e2e-utils' );

/**
 * Internal dependencies
 */
import { shopperWCP } from '../../../utils/flows';

import {
	fillCardDetails,
	confirmCardAuthentication,
	setupProductCheckout,
} from '../../../utils/payments';

const cards = [
	[ 'basic', config.get( 'cards.basic' ) ],
	[ '3DS', config.get( 'cards.3ds' ) ],
];

describe( 'Saved cards ', () => {
	describe.each( cards )(
		'when using a %s card added on checkout',
		( cardType, card ) => {
			beforeAll( async () => {
				await shopper.login();
			} );

			afterAll( async () => {
				await shopperWCP.logout( true );
			} );

			it( 'should save the card', async () => {
				await setupProductCheckout(
					config.get( 'addresses.customer.billing' )
				);
				await shopperWCP.selectNewPaymentMethod();
				await fillCardDetails( page, card );
				await shopperWCP.toggleSavePaymentMethod();

				if ( cardType === 'basic' ) {
					await shopper.placeOrder();
				} else {
					await expect( page ).toClick( '#place_order' );
					await confirmCardAuthentication( page );
					await page.waitForNavigation( {
						waitUntil: 'networkidle0',
					} );
				}

				await expect( page ).toMatchTextContent( 'Order received' );

				// validate that the payment method has been added to the customer.
				await shopperWCP.goToPaymentMethods();
				await expect( page ).toMatchTextContent( card.label );
				await expect( page ).toMatchTextContent(
					`${ card.expires.month }/${ card.expires.year }`
				);
			} );

			it( 'should process a payment with the saved card', async () => {
				await setupProductCheckout(
					config.get( 'addresses.customer.billing' )
				);
				await shopperWCP.selectSavedPaymentMethod(
					`${ card.label } (expires ${ card.expires.month }/${ card.expires.year })`
				);

				if ( cardType === 'basic' ) {
					await shopper.placeOrder();
				} else {
					await expect( page ).toClick( '#place_order' );
					await confirmCardAuthentication( page );
					await page.waitForNavigation( {
						waitUntil: 'networkidle0',
					} );
				}

				await expect( page ).toMatchTextContent( 'Order received' );
			} );

			it( 'should delete the card', async () => {
				await shopperWCP.goToPaymentMethods();
				await shopperWCP.deleteSavedPaymentMethod( card.label );
				await expect( page ).toMatchTextContent(
					'Payment method deleted'
				);
			} );

			it( 'should not allow guest user to save the card', async () => {
				await shopperWCP.logout();
				await setupProductCheckout(
					config.get( 'addresses.customer.billing' )
				);

				await expect( page ).not.toMatchElement(
					'input#wc-woocommerce_payments-new-payment-method'
				);
			} );
		}
	);
} );
