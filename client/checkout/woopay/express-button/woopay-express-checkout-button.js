/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import classNames from 'classnames';

/**
 * Internal dependencies
 */
import WoopayIcon from './woopay-icon';
import WoopayIconLight from './woopay-icon-light';
import { expressCheckoutIframe } from './express-checkout-iframe';
import useExpressCheckoutProductHandler from './use-express-checkout-product-handler';
import wcpayTracks from 'tracks';
import { getConfig } from 'wcpay/utils/checkout';
import interpolateComponents from '@automattic/interpolate-components';

const BUTTON_WIDTH_THRESHOLD = 140;

const ButtonTypeTextMap = {
	default: __( 'WooPay', 'woocommerce-payments' ),
	buy: __( 'Buy with WooPay', 'woocommerce-payments' ),
	donate: __( 'Donate with WooPay', 'woocommerce-payments' ),
	book: __( 'Book with WooPay', 'woocommerce-payments' ),
};

export const WoopayExpressCheckoutButton = ( {
	isPreview = false,
	buttonSettings,
	api,
	isProductPage = false,
	emailSelector = '#email',
} ) => {
	const buttonWidthTypes = {
		narrow: 'narrow',
		wide: 'wide',
	};
	const initWoopayRef = useRef( null );
	const buttonRef = useRef( null );
	const isLoadingRef = useRef( false );
	const { type: buttonType, height, size, theme, context } = buttonSettings;
	const [ isLoading, setIsLoading ] = useState( false );
	const [ buttonWidthType, setButtonWidthType ] = useState(
		buttonWidthTypes.wide
	);

	const buttonText =
		ButtonTypeTextMap[ buttonType || 'default' ] ??
		ButtonTypeTextMap.default;

	const ThemedWooPayIcon = theme === 'dark' ? WoopayIcon : WoopayIconLight;

	const {
		addToCart,
		getProductData,
		isAddToCartDisabled,
	} = useExpressCheckoutProductHandler( api, isProductPage );
	const getProductDataRef = useRef( getProductData );
	const addToCartRef = useRef( addToCart );

	useEffect( () => {
		if ( ! buttonRef.current ) {
			return;
		}

		const buttonWidth = buttonRef.current.getBoundingClientRect().width;
		const isButtonWide = buttonWidth > BUTTON_WIDTH_THRESHOLD;
		setButtonWidthType(
			isButtonWide ? buttonWidthTypes.wide : buttonWidthTypes.narrow
		);
	}, [ buttonWidthTypes.narrow, buttonWidthTypes.wide ] );

	useEffect( () => {
		if ( ! isPreview ) {
			wcpayTracks.recordUserEvent(
				wcpayTracks.events.WOOPAY_BUTTON_LOAD,
				{
					source: context,
				}
			);
		}
	}, [ isPreview, context ] );

	const onClickFallback = useCallback(
		// OTP flow
		( e ) => {
			e?.preventDefault();

			if ( isPreview ) {
				return; // eslint-disable-line no-useless-return
			}

			wcpayTracks.recordUserEvent(
				wcpayTracks.events.WOOPAY_BUTTON_CLICK,
				{
					source: context,
				}
			);

			if ( isProductPage ) {
				if ( isAddToCartDisabled ) {
					alert(
						window.wc_add_to_cart_variation_params
							?.i18n_make_a_selection_text ||
							__(
								'Please select all required options to continue.',
								'woocommerce-payments'
							)
					);
					return;
				}

				const productData = getProductDataRef.current();
				if ( ! productData ) {
					return;
				}

				addToCartRef.current( productData ).then( ( res ) => {
					if ( res.error ) {
						if ( res.submit ) {
							// Some extensions needs to submit the form
							// to show error messages.
							document.querySelector( 'form.cart' ).submit();
						}
						return;
					}

					expressCheckoutIframe( api, context, emailSelector );
				} );
			} else {
				expressCheckoutIframe( api, context, emailSelector );
			}
		},
		[
			api,
			context,
			emailSelector,
			isAddToCartDisabled,
			isPreview,
			isProductPage,
		]
	);

	const newIframe = useCallback( () => {
		if ( ! getConfig( 'isWoopayFirstPartyAuthEnabled' ) ) {
			return;
		}

		const getWoopayOtpUrl = () => {
			const tracksUserId = JSON.stringify(
				getConfig( 'tracksUserIdentity' )
			);

			const urlParams = new URLSearchParams();
			urlParams.append( 'testMode', getConfig( 'testMode' ) );
			urlParams.append( 'source_url', window.location.href );
			urlParams.append( 'tracksUserIdentity', tracksUserId );

			return (
				getConfig( 'woopayHost' ) + '/connect/?' + urlParams.toString()
			);
		};

		const iframe = document.createElement( 'iframe' );
		iframe.src = getWoopayOtpUrl();
		iframe.height = 0;
		iframe.style.visibility = 'hidden';
		iframe.style.position = 'absolute';
		iframe.style.top = '0';

		iframe.addEventListener( 'error', () => {
			initWoopayRef.current = onClickFallback;
		} );

		return iframe;
	}, [ onClickFallback ] );

	useEffect( () => {
		if ( isPreview || ! getConfig( 'isWoopayFirstPartyAuthEnabled' ) ) {
			return;
		}

		buttonRef.current.parentElement.style.position = 'relative';
		buttonRef.current.parentElement.appendChild( newIframe() );

		const onMessage = ( event ) => {
			const isFromWoopayHost = getConfig( 'woopayHost' ).startsWith(
				event.origin
			);
			const isSessionDataSuccess =
				event.data.action === 'set_preemptive_session_data_success';
			const isSessionDataError =
				event.data.action === 'set_preemptive_session_data_error';
			const isSessionDataResponse =
				isSessionDataSuccess || isSessionDataError;
			if ( ! isFromWoopayHost || ! isSessionDataResponse ) {
				return;
			}

			if ( isSessionDataSuccess ) {
				window.location.href = event.data.value.redirect_url;
			} else if ( isSessionDataError ) {
				onClickFallback( null );

				// Set button's default onClick handle to use modal checkout flow.
				initWoopayRef.current = onClickFallback;
				isLoadingRef.current = false;
				setIsLoading( false );
			}
		};

		window.addEventListener( 'message', onMessage );

		return () => {
			window.removeEventListener( 'message', onMessage );
		};
		// Note: Any changes to this dependency array may cause a duplicate iframe to be appended.
	}, [ context, onClickFallback, isPreview, isProductPage, newIframe ] );

	useEffect( () => {
		initWoopayRef.current = onClickFallback;
	}, [ onClickFallback ] );

	useEffect( () => {
		const handlePageShow = ( event ) => {
			// Re-enable the button after navigating back/forward to the page if bfcache is used.
			if ( event?.persisted ) {
				isLoadingRef.current = false;
				setIsLoading( false );
			}
		};

		window.addEventListener( 'pageshow', handlePageShow );

		return () => {
			window.removeEventListener( 'pageshow', handlePageShow );
		};
	}, [] );

	return (
		<button
			ref={ buttonRef }
			key={ `${ buttonType }-${ theme }-${ size }` }
			aria-label={ buttonText }
			onClick={ ( e ) => initWoopayRef.current( e ) }
			className={ classNames( 'woopay-express-button', {
				'is-loading': isLoading,
			} ) }
			data-type={ buttonType }
			data-size={ size }
			data-theme={ theme }
			data-width-type={ buttonWidthType }
			style={ { height: `${ height }px` } }
			disabled={ isLoading }
		>
			{ isLoading ? (
				<span className="wc-block-components-spinner" />
			) : (
				<>
					{ interpolateComponents( {
						mixedString: buttonText.replace(
							ButtonTypeTextMap.default,
							'{{wooPayLogo /}}'
						),
						components: {
							wooPayLogo: <ThemedWooPayIcon />,
						},
					} ) }
				</>
			) }
		</button>
	);
};
