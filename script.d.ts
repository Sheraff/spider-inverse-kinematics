type Spider = {
	x: number
	y: number
	speed: number
	legs: Leg[]
}

type Leg = {
	x: number,
	y: number,
	direction: 1 | -1
}

type MousePos = {
	x: number
	y: number
}