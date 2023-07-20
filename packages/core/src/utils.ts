const timestamp = +(new Date());
let index = 0;

export const getUid = (prefix?: string) => {
	return `${prefix ? `${prefix}-` : ''}${timestamp}-${++index}`;
};
