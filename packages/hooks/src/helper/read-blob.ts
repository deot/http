const { asyncIterator } = Symbol;

export const readBlob = async function* (blob: any) {
	/* istanbul ignore next -- @preserve */
	if (blob.stream) {
		yield* blob.stream();
	} else if (blob.arrayBuffer) {
		yield await blob.arrayBuffer();
	} else if (blob[asyncIterator]) {
		yield* blob[asyncIterator]();
	} else {
		yield blob;
	}
};