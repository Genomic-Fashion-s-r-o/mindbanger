export function validCents(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>0&&value<=10000000;}
export function priceCents(value:unknown){const n=Number(value),c=Math.round(n*100);if(!Number.isFinite(n)||Math.abs(n*100-c)>.00001||!validCents(c))throw Error('invalid_price');return c;}
