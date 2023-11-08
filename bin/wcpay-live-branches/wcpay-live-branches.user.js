// ==UserScript==
// @name         WCPay Live Branches
// @namespace    https://wordpress.com/
// @version      1.2
// @description  Adds links to PRs pointing to Jurassic Ninja sites for live-testing a changeset
// @grant        GM_xmlhttpRequest
// @connect      jurassic.ninja
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @match        https://github.com/Automattic/woocommerce-payments/pull/*
// ==/UserScript==

// Need to declare "jQuery" for linting within TamperMonkey, but in the monorepo it's already declared.
// eslint-disable-next-line no-redeclare
/* global jQuery */

( function () {
	const $ = jQuery.noConflict();
	const markdownBodySelector = '.pull-discussion-timeline .markdown-body';
	let pluginsList = null;

	// Watch for relevant DOM changes that indicate we need to re-run `doit()`:
	// - Adding a new `.markdown-body`.
	// - Removing `#wcpay-live-branches`.
	const observer = new MutationObserver( list => {
		for ( const m of list ) {
			for ( const n of m.addedNodes ) {
				if (
					( n.matches && n.matches( markdownBodySelector ) ) ||
					( n.querySelector && n.querySelector( markdownBodySelector ) )
				) {
					doit();
					return;
				}
			}
			for ( const n of m.removedNodes ) {
				if (
					n.id === 'wcpay-live-branches' ||
					( n.querySelector && n.querySelector( '#wcpay-live-branches' ) )
				) {
					doit();
					return;
				}
			}
		}
	} );
	observer.observe( document, { subtree: true, childList: true } );

	// Run it on load too.
	doit();

	/**
	 * Determine the current repo.
	 *
	 * Currently looks at the URL, expecting it to match a `@match` pattern from the script header.
	 *
	 * @returns {string|null} Repo name.
	 */
	function determineRepo() {
		const m = location.pathname.match( /^\/([^/]+\/[^/]+)\/pull\// );
		return m && m[ 1 ] ? decodeURIComponent( m[ 1 ] ) : null;
	}

	/** Function. */
	function doit() {
		const markdownBody = document.querySelectorAll( markdownBodySelector )[ 0 ];
		if ( ! markdownBody || markdownBody.querySelector( '#wcpay-live-branches' ) ) {
			// No body or Live Branches is already there, no need to do it again.
			return;
		}

		const host = 'https://jurassic.ninja';
		const currentBranch = jQuery( '.head-ref:first' ).text();
		const branchIsForked = currentBranch.includes( ':' );
		const branchStatus = $( '.gh-header-meta .State' ).text().trim();
		const repo = determineRepo();

		if ( branchStatus === 'Merged' ) {
			const contents = `
				<p><strong>This branch is already merged.</strong></p>
				<p>
					Test with <code>trunk/develop</code> branch instead.
				</p>
			`;
			appendHtml( markdownBody, contents );
		} else if ( branchStatus === 'Draft' ) {
			appendHtml(
				markdownBody,
				'<p><strong>This branch is a draft. You can open live branches only from open pull requests.</strong></p>'
			);
		} else if ( branchIsForked ) {
			appendHtml(
				markdownBody,
				"<p><strong>This branch can't be tested live because it comes from a forked version of this repo.</strong></p>"
			);
		} else if ( ! repo ) {
			appendHtml(
				markdownBody,
				'<p><strong>Cannot determine the repository for this PR.</strong></p>'
			);
		} else {
			if ( ! pluginsList ) {
				pluginsList = dofetch( `${ host }/wp-json/jurassic.ninja/jetpack-beta/plugins` );
			}
			pluginsList
				.then( body => {
					const plugins = [];

					if ( body.status === 'ok' ) {
						const labels = new Set(
							$.map( $( '.js-issue-labels a.IssueLabel' ), e => $( e ).data( 'name' ) )
						);
						Object.keys( body.data ).forEach( k => {
							const data = body.data[ k ];
							if ( data.repo === repo ) {
								plugins.push( {
									name: `branches.${ k }`,
									value: currentBranch,
									label: encodeHtmlEntities( data.name ),
									checked: k === 'woocommerce-payments',
									disabled: k === 'woocommerce-payments',
								} );
							}
						} );
						if ( ! plugins.length ) {
							throw new Error( `No plugins are configured for ${ repo }` );
						}
						plugins.sort( ( a, b ) => a.label.localeCompare( b.label ) );
					} else if ( body.code === 'rest_no_route' ) {
						plugins.push( {
							name: 'branch',
							value: currentBranch,
							label: 'Jetpack',
							checked: true,
							disabled: true,
						} );
					} else {
						throw new Error( 'Invalid response from server' );
					}

					const contents = `
					<details>
						<summary>Expand for JN site options:</summary>
						<h4>Test Plugins</h4>
						${ getOptionsList( plugins, 33 ) }

						<h4>Settings</h4>
						${ getOptionsList(
							[
								{
									label: 'A shortlived site',
									name: 'shortlived',
									checked: true,
								},
								{
									checked: true,
									label: '<code>WP_DEBUG</code> and <code>WP_DEBUG_LOG</code> set to true',
									name: 'wp-debug-log',
								},
								{
									label: 'Multisite based on subdomains',
									name: 'subdomain_multisite',
								},
								{
									label: 'Multisite based on subdirectories',
									name: 'subdir_multisite',
								},
								{
									label: 'Pre-generate content',
									name: 'content',
								},
								{
									label: '<code>xmlrpc.php</code> unavailable',
									name: 'blockxmlrpc',
								},
							],
							100
						) }
						<h4>Woo plugins</h4>
						${ getOptionsList(
							[
								{
									label: 'WooCommerce',
									name: 'woocommerce',
									checked: true,
								},
								{
									label: 'WooCommerce Payments Dev Tools',
									name: 'woocommerce-payments-dev-tools',
									checked: true,
								},
								{
									label: 'WooCommerce Smooth Generator',
									name: 'wc-smooth-generator',
								},
								{
									label: 'WooCommerce Beta Tester',
									name: 'woocommerce-beta-tester',
								},
							],
							100
						) }

						<h4>Other plugins</h4>
						${ getOptionsList(
							[
								{
									label: 'Jetpack',
									name: 'nojetpack',
									invert: true,
								},
								{
									label: 'WordPress Beta Tester',
									name: 'wordpress-beta-tester',
								},
								{
									label: 'Gutenberg',
									name: 'gutenberg',
								},
								{
									label: 'Classic Editor',
									name: 'classic-editor',
								},
								{
									label: 'Config Constants',
									name: 'config-constants',
								},
								{
									label: 'Code Snippets',
									name: 'code-snippets',
								},
								{
									label: 'WP Rollback',
									name: 'wp-rollback',
								},
								{
									label: 'WP Downgrade',
									name: 'wp-downgrade',
								},
								{
									label: 'Jetpack Debug Helper',
									name: 'jetpack-debug-helper',
								},
							],
							33
						) }

					</details>
					<p>
						<a id="wcpay-beta-branch-link" target="_blank" rel="nofollow noopener" href="#">…</a>
					</p>
					`;
					appendHtml( markdownBody, contents );
					updateLink();
				} )
				.catch( e => {
					pluginsList = null;
					appendHtml(
						markdownBody,
						// prettier-ignore
						`<p><strong>Error while fetching data for live testing: ${ encodeHtmlEntities( e.message ) }.</strong></p>`
					);
				} );
		}

		/**
		 * Fetch a URL.
		 *
		 * TamperMonkey on Chrome can't use `fetch()` due to CSP.
		 *
		 * @param {string} url - URL.
		 * @returns {Promise} Promise. Resolves with the JSON content from `url`.
		 */
		function dofetch( url ) {
			const do_xmlhttpRequest = window.GM_xmlhttpRequest ?? window.GM?.xmlhttpRequest ?? null;
			if ( do_xmlhttpRequest ) {
				return new Promise( ( resolve, reject ) => {
					do_xmlhttpRequest( {
						method: 'GET',
						url: url,
						onload: r => {
							if ( r.status < 100 || r.status > 599 ) {
								reject( new TypeError( `Network request failed (status ${ r.status })` ) );
								return;
							}
							resolve( JSON.parse( r.responseText ) );
						},
						ontimeout: () => reject( new TypeError( 'Network request timed out' ) ),
						onabort: () => reject( new TypeError( 'Network request aborted' ) ),
						onerror: () => reject( new TypeError( 'Network request failed' ) ),
					} );
				} );
			}

			// Fall back to fetch.
			return fetch( url ).then( r => r.json() );
		}

		/**
		 * Encode necessary HTML entities in a string.
		 *
		 * @param {string} s - String to encode.
		 * @returns {string} Encoded string.
		 */
		function encodeHtmlEntities( s ) {
			return s.replace( /[&<>"']/g, m => `&#${ m.charCodeAt( 0 ) };` );
		}

		/**
		 * Build the JN create URI.
		 *
		 * @returns {string} URI.
		 */
		function getLink() {
			const query = [ 'jetpack-beta' ];
			$(
				'#wcpay-live-branches input[type=checkbox]:checked:not([data-invert]), #wcpay-live-branches input[type=checkbox][data-invert]:not(:checked)'
			).each( ( i, input ) => {
				if ( input.value ) {
					query.push( encodeURIComponent( input.name ) + '=' + encodeURIComponent( input.value ) );
				} else {
					if (
						input.name === 'jpcrm-populate-crm-data' ||
						input.value === 'jpcrm-populate-woo-data'
					) {
						query.push( encodeURIComponent( 'jpcrm' ) );
					}
					query.push( encodeURIComponent( input.name ) );
				}
			} );
			// prettier-ignore
			return [ `${ host }/create?${ query.join( '&' ).replace( /%(2F|5[BD])/g, m => decodeURIComponent( m ) ) }`, query ];
		}

		/**
		 * Build HTML for a single option checkbox.
		 *
		 * @param {object} opts - Options.
		 * @param {string} opts.label - Checkbox label HTML.
		 * @param {string} opts.name - Checkbox name.
		 * @param {string} [opts.value] - Checkbox value, if any.
		 * @param {boolean} [opts.checked] - Whether the checkbox is default checked.
		 * @param {boolean} [opts.disabled] - Whether the checkbox is disabled.
		 * @param {boolean} [opts.invert] - Whether the sense of the checkbox is inverted.
		 * @param {number} columnWidth - Column width.
		 * @returns {string} HTML.
		 */
		function getOption(
			{ disabled = false, checked = false, invert = false, value = '', label, name },
			columnWidth
		) {
			// prettier-ignore
			return `
			<li style="min-width: ${ columnWidth }%">
				<label style="font-weight: inherit; ">
					<input type="checkbox" name="${ encodeHtmlEntities( name ) }" value="${ encodeHtmlEntities( value ) }"${ checked ? ' checked' : '' }${ disabled ? ' disabled' : '' }${ invert ? ' data-invert' : '' }>
					${ label }
				</label>
			</li>
			`;
		}

		/**
		 * Build HTML for a set of option checkboxes.
		 *
		 * @param {object[]} options - Array of options for `getOption()`.
		 * @param {number} columnWidth - Column width.
		 * @returns {string} HTML.
		 */
		function getOptionsList( options, columnWidth ) {
			return `
				<ul style="list-style: none; padding-left: 0; margin-top: 24px; display: flex; flex-wrap: wrap;">
					${ options
						.map( option => {
							return getOption( option, columnWidth );
						} )
						.join( '' ) }
				</ul>
			`;
		}

		/**
		 * Append HTML to the element.
		 *
		 * Also registers `onInputChanged()` as a change handler for all checkboxes in the HTML.
		 *
		 * @param {HTMLElement} el - Element.
		 * @param {string} contents - HTML to append.
		 */
		function appendHtml( el, contents ) {
			const $el = $( el );
			const wooColor = '#7F54B3'; // https://woo.com/brand-and-logo-guidelines/
			const styles = $( '<style>' ).text( `
				#wcpay-live-branches {
					border: 3px dotted ${ wooColor };
					padding: 10px;
				}

				#wcpay-live-branches h2 {
					color: ${ wooColor };
				}
			`);
			const liveBranches = $( '<div id="wcpay-live-branches" />' ).append(
				styles,
				`<h2>🚀 WCPay Live Branches 🚀</h2>${ contents }`
			);
			$( '#wcpay-live-branches' ).remove();
			$el.append( liveBranches );
			liveBranches
				.find( 'input[type=checkbox]' )
				.each( () => this.addEventListener( 'change', onInputChanged ) );
		}

		/**
		 * Change handler. Updates the link.
		 *
		 * @param {Event} e - Event object.
		 */
		function onInputChanged( e ) {
			e.stopPropagation();
			e.preventDefault();
			if ( e.target.checked ) {
				e.target.setAttribute( 'checked', true );
			} else {
				e.target.removeAttribute( 'checked' );
			}
			updateLink();
		}

		/**
		 * Update the link.
		 */
		function updateLink() {
			const $link = $( '#wcpay-beta-branch-link' );
			const [ url, query ] = getLink();

			if ( url.match( /[?&]branch(es\.[^&=]*)?=/ ) ) {
				if (
					query.includes( 'jpcrm-populate-crm-data' ) &&
					! url.match( /[?&]branches\.zero-bs-crm/ )
				) {
					// /jpcrm-populate-crm-data/
					$link
						.attr( 'href', null )
						.text( 'Select the Jetpack CRM plugin in order to populate with CRM data' );
				} else if (
					query.includes( 'jpcrm-populate-woo-data' ) &&
					! query.includes( 'woocommerce' )
				) {
					$link
						.attr( 'href', null )
						.text( 'Select the WooCommerce plugin in order to populate with CRM Woo data' );
				} else {
					$link.attr( 'href', url ).text( url );
				}
			} else {
				$link.attr( 'href', null ).text( 'Select at least one plugin to test' );
			}
		}
	}
} )();
