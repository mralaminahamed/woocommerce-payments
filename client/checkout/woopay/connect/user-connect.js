/**
 * Internal dependencies
 */
import WoopayConnect from 'wcpay/checkout/woopay/connect/woopay-connect';

class WooPayUserConnect extends WoopayConnect {
	constructor() {
		super();

		// The initial state of these listeners serve as a placeholder.
		this.listeners = {
			...this.listeners,
			getIsUserLoggedInCallback: () => {},
			getEncryptedDataCallback: () => {},
		};
	}

	/**
	 * Checks if the user is logged in.
	 *
	 * @return {Promise<bool>} Resolves to true if the user is logged in.
	 */
	async isUserLoggedIn() {
		return await this.sendMessageAndListenWith(
			{ action: 'getIsUserLoggedIn' },
			'getIsUserLoggedInCallback'
		);
	}

	/**
	 * Retrieves encrypted data from WooPay.
	 *
	 * @return {Promise<Object>} Resolves to an object with encrypted data.
	 */
	async getEncryptedData() {
		return await this.sendMessageAndListenWith(
			{ action: 'getEncryptedData' },
			'getEncryptedDataCallback'
		);
	}

	/**
	 * Handles the callback from the WooPayConnectIframe.
	 *
	 * @param {Object} data The data from the WooPayConnectIframe.
	 */
	callbackFn( data ) {
		super.callbackFn( data );

		switch ( data.action ) {
			case 'get_is_user_logged_in_success':
				this.listeners.getIsUserLoggedInCallback( data.value );
				break;
			case 'get_encrypted_data_success':
				this.listeners.getEncryptedDataCallback( data.value );
				break;
		}
	}
}

export default WooPayUserConnect;
