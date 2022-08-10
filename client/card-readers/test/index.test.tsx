/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * Internal dependencies
 */
import ConnectedReaders from '..';
import apiFetch from '@wordpress/api-fetch';

jest.mock( '@wordpress/api-fetch', () => jest.fn() );

const mockApiFetch = apiFetch as jest.MockedFunction< typeof apiFetch >;
const mockOnCompleted = jest.fn();

describe( 'CardReadersSettings', () => {
	it( 'Card Readers tabs renders', () => {
		mockApiFetch.mockResolvedValue( 'test' );
		render( <ConnectedReaders /> );

		expect( screen.queryByText( 'Connected readers' ) ).toBeInTheDocument();

		expect( screen.queryByText( 'Receipt details' ) ).toBeInTheDocument();
	} );
} );
