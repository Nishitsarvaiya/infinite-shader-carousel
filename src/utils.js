export function lerp(p1, p2, t) {
	return p1 + (p2 - p1) * t;
}

export function debounce(fn, delay) {
	let timer;
	return function (...args) {
		const context = this;
		clearTimeout(timer);
		timer = setTimeout(() => fn.apply(context, args), delay);
	};
}

export function map(num, min1, max1, min2, max2, round = false) {
	const num1 = (num - min1) / (max1 - min1);
	const num2 = num1 * (max2 - min2) + min2;

	if (round) return Math.round(num2);

	return num2;
}

export function random(min, max) {
	return Math.random() * (max - min) + min;
}
