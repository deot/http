export const stringifySafely = (rawValue: string, parser, encoder) => {
	if (typeof rawValue === 'string') {
		try {
			(parser || JSON.parse)(rawValue);
			return rawValue.trim();
		} catch (e: any) {
			if (e.name !== 'SyntaxError') {
				throw e;
			}
		}
	}

	return (encoder || JSON.stringify)(rawValue);
};