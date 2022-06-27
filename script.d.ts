type Spider = {
	x: number
	y: number
	speed: number
	legs: Leg[]
}

type Leg = {
	x: number,
	y: number,
	direction: 1 | -1,
	lerp: null | {
		start: number,
		from: number,
		to: number,
	}
}

type MousePos = {
	x: number
	y: number
}

type UiFormData = {
	geometry: boolean,
	elevation: number,
	upper: number,
	lower: number,
	ground: number,
}