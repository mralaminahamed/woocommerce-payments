/**
 * Internal dependencies
 */
import { upeRestrictedProperties } from './upe-styles';
import {
	generateHoverRules,
	generateOutlineStyle,
	dashedToCamelCase,
	isColorLight,
	getBackgroundColor,
	maybeConvertRGBAtoRGB,
	handleAppearanceForFloatingLabel,
} from './utils.js';

export const appearanceSelectors = {
	default: {
		hiddenContainer: '#wcpay-hidden-div',
		hiddenInput: '#wcpay-hidden-input',
		hiddenInvalidInput: '#wcpay-hidden-invalid-input',
		hiddenValidActiveLabel: '#wcpay-hidden-valid-active-label',
	},
	classicCheckout: {
		appendTarget: '.woocommerce-billing-fields__field-wrapper',
		upeThemeInputSelector: '#billing_first_name',
		upeThemeLabelSelector: '.woocommerce-checkout .form-row label',
		upeThemeTextSelector: '.woocommerce-checkout .form-row',
		rowElement: 'p',
		validClasses: [ 'form-row' ],
		invalidClasses: [
			'form-row',
			'woocommerce-invalid',
			'woocommerce-invalid-required-field',
		],
		backgroundSelectors: [
			'li.wc_payment_method .wc-payment-form',
			'li.wc_payment_method .payment_box',
			'#payment',
			'#order_review',
			'form.checkout',
			'body',
		],
		headingSelectors: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
		buttonSelectors: [ '#place_order' ],
		linkSelectors: [ 'a' ],
	},
	blocksCheckout: {
		appendTarget: '#contact-fields',
		upeThemeInputSelector: '.wc-block-components-text-input #email',
		upeThemeLabelSelector: '.wc-block-components-text-input label',
		upeThemeTextSelector: '.wc-block-components-text-input',
		rowElement: 'div',
		validClasses: [ 'wc-block-components-text-input', 'is-active' ],
		invalidClasses: [ 'wc-block-components-text-input', 'has-error' ],
		alternateSelectors: {
			appendTarget: '#billing.wc-block-components-address-form',
			upeThemeInputSelector: '#billing-first_name',
			upeThemeLabelSelector:
				'.wc-block-components-checkout-step__description',
		},
		backgroundSelectors: [
			'#payment-method .wc-block-components-radio-control-accordion-option',
			'#payment-method',
			'form.wc-block-checkout__form',
			'.wc-block-checkout',
			'body',
		],
		headingSelectors: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
		buttonSelectors: [ '.wc-block-components-checkout-place-order-button' ],
		linkSelectors: [ 'a' ],
		containerSelectors: [
			'.wp-block-woocommerce-checkout-order-summary-block',
		],
	},
	bnplProductPage: {
		appendTarget: '.product .cart .quantity',
		upeThemeInputSelector: '.product .cart .quantity .qty',
		upeThemeLabelSelector: '.product .cart .quantity label',
		upeThemeTextSelector: '.product .cart .quantity',
		rowElement: 'div',
		validClasses: [ 'input-text' ],
		invalidClasses: [ 'input-text', 'has-error' ],
		backgroundSelectors: [
			'#payment-method-message',
			'#main > .product > div.summary.entry-summary',
			'#main > .product',
			'#main',
			'body',
		],
		headingSelectors: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
		buttonSelectors: [ '.single_add_to_cart_button' ],
		linkSelectors: [ 'a' ],
	},
	bnplClassicCart: {
		appendTarget: '.cart .quantity',
		upeThemeInputSelector: '.cart .quantity .qty',
		upeThemeLabelSelector: '.cart .quantity label',
		upeThemeTextSelector: '.cart .quantity',
		rowElement: 'div',
		validClasses: [ 'input-text' ],
		invalidClasses: [ 'input-text', 'has-error' ],
		backgroundSelectors: [
			'#payment-method-message',
			'#main .entry-content .cart_totals',
			'#main .entry-content',
			'#main',
			'body',
		],
		headingSelectors: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
		buttonSelectors: [ '.checkout-button' ],
		linkSelectors: [ 'a' ],
		containerSelectors: [ '.shop_table' ],
	},
	bnplCartBlock: {
		appendTarget: '.wc-block-cart .wc-block-components-quantity-selector',
		upeThemeInputSelector:
			'.wc-block-cart .wc-block-components-quantity-selector .wc-block-components-quantity-selector__input',
		upeThemeLabelSelector: '.wc-block-components-text-input',
		upeThemeTextSelector: '.wc-block-components-text-input',
		rowElement: 'div',
		validClasses: [ 'wc-block-components-text-input' ],
		invalidClasses: [ 'wc-block-components-text-input', 'has-error' ],
		backgroundSelectors: [
			'.wc-block-components-bnpl-wrapper',
			'.wc-block-components-order-meta',
			'.wc-block-components-totals-wrapper',
			'.wp-block-woocommerce-cart-order-summary-block',
			'.wp-block-woocommerce-cart-totals-block',
			'.wp-block-woocommerce-cart .wc-block-cart',
			'.wp-block-woocommerce-cart',
			'body',
		],
		headingSelectors: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
		buttonSelectors: [ '.wc-block-cart__submit-button' ],
		linkSelectors: [ 'a' ],
		containerSelectors: [ '.wp-block-woocommerce-cart-line-items-block' ],
	},
	wooPayClassicCheckout: {
		appendTarget: '.woocommerce-billing-fields__field-wrapper',
		upeThemeInputSelector: '#billing_first_name',
		upeThemeLabelSelector: '.woocommerce-checkout .form-row label',
		upeThemeTextSelector: '.woocommerce-checkout .form-row',
		rowElement: 'p',
		validClasses: [ 'form-row' ],
		invalidClasses: [
			'form-row',
			'woocommerce-invalid',
			'woocommerce-invalid-required-field',
		],
		backgroundSelectors: [
			'#customer_details',
			'#order_review',
			'form.checkout',
			'body',
		],
		headingSelectors: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
		buttonSelectors: [ '#place_order' ],
		linkSelectors: [ 'a' ],
		containerSelectors: [ '.woocommerce-checkout-review-order-table' ],
	},

	/**
	 * Update selectors to use alternate if not present on DOM.
	 *
	 * @param {Object} selectors Object of selectors for updation.
	 *
	 * @return {Object} Updated selectors.
	 */
	updateSelectors: function ( selectors ) {
		if ( selectors.hasOwnProperty( 'alternateSelectors' ) ) {
			Object.entries( selectors.alternateSelectors ).forEach(
				( altSelector ) => {
					const [ key, value ] = altSelector;

					if ( ! document.querySelector( selectors[ key ] ) ) {
						selectors[ key ] = value;
					}
				}
			);

			delete selectors.alternateSelectors;
		}

		return selectors;
	},

	/**
	 * Returns selectors based on checkout type.
	 *
	 * @param {boolean} elementsLocation The location of the elements.
	 *
	 * @return {Object} Selectors for checkout type specified.
	 */
	getSelectors: function ( elementsLocation ) {
		let appearanceSelector = this.blocksCheckout;

		switch ( elementsLocation ) {
			case 'blocks_checkout':
				appearanceSelector = this.blocksCheckout;
				break;
			case 'shortcode_checkout':
				appearanceSelector = this.classicCheckout;
				break;
			case 'bnpl_product_page':
				appearanceSelector = this.bnplProductPage;
				break;
			case 'bnpl_classic_cart':
				appearanceSelector = this.bnplClassicCart;
				break;
			case 'bnpl_cart_block':
				appearanceSelector = this.bnplCartBlock;
				break;
			case 'woopay_shortcode_checkout':
				appearanceSelector = this.wooPayClassicCheckout;
				break;
		}

		return {
			...this.default,
			...this.updateSelectors( appearanceSelector ),
		};
	},
};

const hiddenElementsForUPE = {
	/**
	 * Create hidden container for generating UPE styles.
	 *
	 * @param {string} elementID ID of element to create.
	 *
	 * @return {Object} Object of the created hidden container element.
	 */
	getHiddenContainer: function ( elementID ) {
		const hiddenDiv = document.createElement( 'div' );
		hiddenDiv.setAttribute( 'id', this.getIDFromSelector( elementID ) );
		hiddenDiv.style.border = 0;
		hiddenDiv.style.clip = 'rect(0 0 0 0)';
		hiddenDiv.style.height = '1px';
		hiddenDiv.style.margin = '-1px';
		hiddenDiv.style.overflow = 'hidden';
		hiddenDiv.style.padding = '0';
		hiddenDiv.style.position = 'absolute';
		hiddenDiv.style.width = '1px';
		return hiddenDiv;
	},

	/**
	 * Create invalid element row for generating UPE styles.
	 *
	 * @param {string} elementType Type of element to create.
	 * @param {Array} classes Array of classes to be added to the element. Default: empty array.
	 *
	 * @return {Object} Object of the created invalid row element.
	 */
	createRow: function ( elementType, classes = [] ) {
		const newRow = document.createElement( elementType );
		if ( classes.length ) {
			newRow.classList.add( ...classes );
		}
		return newRow;
	},

	/**
	 * Append elements to target container.
	 *
	 * @param {Object} appendTarget Element object where clone should be appended.
	 * @param {string} elementToClone Selector of the element to be cloned.
	 * @param {string} newElementID Selector for the cloned element.
	 */
	appendClone: function ( appendTarget, elementToClone, newElementID ) {
		const cloneTarget = document.querySelector( elementToClone );
		if ( cloneTarget ) {
			const clone = cloneTarget.cloneNode( true );
			clone.id = this.getIDFromSelector( newElementID );
			clone.value = '';
			appendTarget.appendChild( clone );
		}
	},

	/**
	 * Retrieve ID/Class from selector.
	 *
	 * @param {string} selector Element selector.
	 *
	 * @return {string} Extracted ID/Class from selector.
	 */
	getIDFromSelector: function ( selector ) {
		if ( selector.startsWith( '#' ) || selector.startsWith( '.' ) ) {
			return selector.slice( 1 );
		}

		return selector;
	},

	/**
	 * Initialize hidden fields to generate UPE styles.
	 *
	 * @param {boolean} elementsLocation The location of the elements.
	 */
	init: function ( elementsLocation ) {
		const selectors = appearanceSelectors.getSelectors( elementsLocation ),
			appendTarget = document.querySelector( selectors.appendTarget ),
			elementToClone = document.querySelector(
				selectors.upeThemeInputSelector
			);

		// Exit early if elements are not present.
		if ( ! appendTarget || ! elementToClone ) {
			return;
		}

		// Remove hidden container is already present on DOM.
		if ( document.querySelector( selectors.hiddenContainer ) ) {
			this.cleanup();
		}

		// Create hidden container & append to target.
		const hiddenContainer = this.getHiddenContainer(
			selectors.hiddenContainer
		);
		appendTarget.appendChild( hiddenContainer );

		// Create hidden valid row & append to hidden container.
		const hiddenValidRow = this.createRow(
			selectors.rowElement,
			selectors.validClasses
		);
		hiddenContainer.appendChild( hiddenValidRow );

		// Create hidden invalid row & append to hidden container.
		const hiddenInvalidRow = this.createRow(
			selectors.rowElement,
			selectors.invalidClasses
		);
		hiddenContainer.appendChild( hiddenInvalidRow );

		// Clone & append target input  to hidden valid row.
		this.appendClone(
			hiddenValidRow,
			selectors.upeThemeInputSelector,
			selectors.hiddenInput
		);

		// Clone & append target label to hidden valid row.
		this.appendClone(
			hiddenValidRow,
			selectors.upeThemeLabelSelector,
			selectors.hiddenValidActiveLabel
		);

		// Clone & append target input  to hidden invalid row.
		this.appendClone(
			hiddenInvalidRow,
			selectors.upeThemeInputSelector,
			selectors.hiddenInvalidInput
		);

		// Clone & append target label to hidden invalid row.
		this.appendClone(
			hiddenInvalidRow,
			selectors.upeThemeLabelSelector,
			selectors.hiddenInvalidInput
		);

		// Remove transitions & focus on hidden element.
		const wcpayHiddenInput = document.querySelector(
			selectors.hiddenInput
		);
		wcpayHiddenInput.style.transition = 'none';
	},

	/**
	 * Remove hidden container from DROM.
	 */
	cleanup: function () {
		const element = document.querySelector(
			appearanceSelectors.default.hiddenContainer
		);
		if ( element ) {
			element.remove();
		}
	},
};

export const getFieldStyles = (
	selector,
	upeElement,
	backgroundColor = null
) => {
	if ( ! document.querySelector( selector ) ) {
		return {};
	}

	const validProperties = upeRestrictedProperties[ upeElement ];

	const elem = document.querySelector( selector );

	const styles = window.getComputedStyle( elem );

	const filteredStyles = {};
	for ( let i = 0; i < styles.length; i++ ) {
		const camelCase = dashedToCamelCase( styles[ i ] );
		if ( validProperties.includes( camelCase ) ) {
			let propertyValue = styles.getPropertyValue( styles[ i ] );
			if ( camelCase === 'color' ) {
				propertyValue = maybeConvertRGBAtoRGB( propertyValue );
			}
			filteredStyles[ camelCase ] = propertyValue;
		}
	}

	if ( upeElement === '.Input' || upeElement === '.Tab--selected' ) {
		const outline = generateOutlineStyle(
			filteredStyles.outlineWidth,
			filteredStyles.outlineStyle,
			filteredStyles.outlineColor
		);
		if ( outline !== '' ) {
			filteredStyles.outline = outline;
		}
		delete filteredStyles.outlineWidth;
		delete filteredStyles.outlineColor;
		delete filteredStyles.outlineStyle;
	}

	// Workaround for rewriting text-indents to padding-left & padding-right
	//since Stripe doesn't support text-indents.
	const textIndent = styles.getPropertyValue( 'text-indent' );
	if (
		textIndent !== '0px' &&
		filteredStyles.paddingLeft === '0px' &&
		filteredStyles.paddingRight === '0px'
	) {
		filteredStyles.paddingLeft = textIndent;
		filteredStyles.paddingRight = textIndent;
	}

	if ( upeElement === '.Block' ) {
		filteredStyles.backgroundColor = backgroundColor;
	}

	return filteredStyles;
};

export const getFontRulesFromPage = () => {
	const fontRules = [],
		sheets = document.styleSheets,
		fontDomains = [
			'fonts.googleapis.com',
			'fonts.gstatic.com',
			'fast.fonts.com',
			'use.typekit.net',
		];
	for ( let i = 0; i < sheets.length; i++ ) {
		if ( ! sheets[ i ].href ) {
			continue;
		}
		const url = new URL( sheets[ i ].href );
		if ( fontDomains.indexOf( url.hostname ) !== -1 ) {
			fontRules.push( {
				cssSrc: sheets[ i ].href,
			} );
		}
	}

	return fontRules;
};

export const getAppearance = ( elementsLocation, forWooPay = false ) => {
	const selectors = appearanceSelectors.getSelectors( elementsLocation );

	// Add hidden fields to DOM for generating styles.
	hiddenElementsForUPE.init( elementsLocation );

	const inputRules = getFieldStyles( selectors.hiddenInput, '.Input' );
	const inputInvalidRules = getFieldStyles(
		selectors.hiddenInvalidInput,
		'.Input'
	);

	const labelRules = getFieldStyles(
		selectors.upeThemeLabelSelector,
		'.Label'
	);

	const paragraphRules = getFieldStyles(
		selectors.upeThemeTextSelector,
		'.Text'
	);

	const tabRules = getFieldStyles( selectors.upeThemeInputSelector, '.Tab' );
	const selectedTabRules = getFieldStyles(
		selectors.hiddenInput,
		'.Tab--selected'
	);
	const tabHoverRules = generateHoverRules( tabRules );

	const tabIconHoverRules = {
		color: tabHoverRules.color,
	};
	const selectedTabIconRules = {
		color: selectedTabRules.color,
	};

	const backgroundColor = getBackgroundColor( selectors.backgroundSelectors );
	const headingRules = getFieldStyles( selectors.headingSelectors, '.Label' );
	const blockRules = getFieldStyles(
		selectors.upeThemeLabelSelector,
		'.Block',
		backgroundColor
	);
	const buttonRules = getFieldStyles( selectors.buttonSelectors, '.Input' );
	const linkRules = getFieldStyles( selectors.linkSelectors, '.Label' );
	const containerRules = getFieldStyles(
		selectors.containerSelectors,
		'.Container'
	);
	const globalRules = {
		colorBackground: backgroundColor,
		colorText: paragraphRules.color,
		fontFamily: paragraphRules.fontFamily,
		fontSizeBase: paragraphRules.fontSize,
	};

	const isFloatingLabel = elementsLocation === 'blocks_checkout';

	let appearance = {
		variables: globalRules,
		theme: isColorLight( backgroundColor ) ? 'stripe' : 'night',
		labels: isFloatingLabel ? 'floating' : 'above',
		// We need to clone the object to avoid modifying other rules when updating the appearance for floating labels.
		rules: JSON.parse(
			JSON.stringify( {
				'.Input': inputRules,
				'.Input--invalid': inputInvalidRules,
				'.Label': labelRules,
				'.Block': blockRules,
				'.Tab': tabRules,
				'.Tab:hover': tabHoverRules,
				'.Tab--selected': selectedTabRules,
				'.TabIcon:hover': tabIconHoverRules,
				'.TabIcon--selected': selectedTabIconRules,
				'.Text': paragraphRules,
				'.Text--redirect': paragraphRules,
			} )
		),
	};

	if ( isFloatingLabel ) {
		appearance = handleAppearanceForFloatingLabel(
			appearance,
			getFieldStyles(
				selectors.hiddenValidActiveLabel,
				'.Label--floating'
			)
		);
	}

	if ( forWooPay ) {
		appearance.rules = {
			...appearance.rules,
			'.Heading': headingRules,
			'.Button': buttonRules,
			'.Link': linkRules,
			'.Container': containerRules,
		};
	}

	// Remove hidden fields from DOM.
	hiddenElementsForUPE.cleanup();
	return appearance;
};
