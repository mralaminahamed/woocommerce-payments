declare module '@wordpress/data-controls' {
	const dispatch: (
		storeKey: string,
		actionName: string,
		...args: unknown[]
	) => unknown;
}
