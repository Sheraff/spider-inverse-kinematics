const SPIDER_WIDTH = 60
const SPIDER_LEG_LERP_DURATION = 400


const canvas = document.querySelector('canvas')
if(!canvas)
	throw new Error('No canvas found')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const ctx = canvas.getContext('2d')
if(!ctx)
	throw new Error('No context found')

const form = document.querySelector('form')
if(!form)
	throw new Error('No form found')

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLFormElement} form
 */
void function (ctx, form) {
	const formData = getFormData(form)

	/** @type {Spider} */
	const spider = {
		x: ctx.canvas.width / 2,
		y: ctx.canvas.height - formData.elevation,
		speed: 0,
		legs: [
			{ x: ctx.canvas.width / 2 - 40, y: ctx.canvas.height, direction: -1, lerp: null },
			{ x: ctx.canvas.width / 2 + 40, y: ctx.canvas.height, direction: 1, lerp: null },
			{ x: ctx.canvas.width / 2 - 80, y: ctx.canvas.height, direction: -1, lerp: null },
			{ x: ctx.canvas.width / 2 + 80, y: ctx.canvas.height, direction: 1, lerp: null },
			{ x: ctx.canvas.width / 2 - 120, y: ctx.canvas.height, direction: -1, lerp: null },
			{ x: ctx.canvas.width / 2 + 120, y: ctx.canvas.height, direction: 1, lerp: null },
			{ x: ctx.canvas.width / 2 - 160, y: ctx.canvas.height, direction: -1, lerp: null },
			{ x: ctx.canvas.width / 2 + 160, y: ctx.canvas.height, direction: 1, lerp: null },
		],
	}
	/** @type {MousePos} */
	const mousePos = {
		x: spider.x,
		y: spider.y,
	}

	ui(form, formData)
	update(ctx, mousePos, spider)
	draw(ctx, mousePos, formData, spider)
}(ctx, form)


/**
 * @param {HTMLFormElement} form
 * @param {UiFormData} formData
 */
function ui(form, formData) {
	form.addEventListener('input', () => {
		Object.assign(formData, getFormData(form))
	})
}

/**
 * @param {HTMLFormElement} form
 * @returns {UiFormData}
 */
function getFormData(form) {
	return {
		geometry: form.elements.geometry.checked,
		elevation: Number(form.elements.elevation.value),
		upper: Number(form.elements.upper.value),
		lower: Number(form.elements.lower.value),
		ground: 4 - Number(form.elements.ground.value),
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {MousePos} mousePos
 * @param {Spider} spider
 */
function update(ctx, mousePos, spider) {
	window.addEventListener('pointermove', event => {
		mousePos.x = event.clientX
		mousePos.y = event.clientY
	})
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {MousePos} mousePos
 * @param {UiFormData} formData
 * @param {Spider} spider
 */
function draw(ctx, mousePos, formData, spider) {
	/**
	 * @param {number} lastTime
	 */
	function loop(lastTime) {
		requestAnimationFrame((time) => {
			const delta = lastTime ? time - lastTime : 0
			const speed = (mousePos.x - spider.x) * delta / 1000
			spider.x += speed
			spider.y = ctx.canvas.height - formData.elevation - Math.sin(time / 400) * 3 + Math.sin(spider.x / 30) * 4
			updateSpiderLegs(ctx, mousePos, spider, formData, time, speed)
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
			drawSpider(ctx, spider, formData)
			loop(time)
		})
	}
	loop(0)
}

/**
 * @param {Spider} spider
 * @param {number} i
 */
function getLegShoulderX(spider, i) {
	const sideIndex = i >> 1
	const shoulderSpacing = SPIDER_WIDTH / (spider.legs.length + 1)
	const x = spider.x + spider.legs[i].direction * (shoulderSpacing / 2 + shoulderSpacing * sideIndex)
	return x
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {MousePos} mousePos
 * @param {Spider} spider
 * @param {UiFormData} formData
 * @param {number} time
 * @param {number} speed
 */
function updateSpiderLegs(ctx, mousePos, spider, formData, time, speed) {
	const currentDirection = mousePos.x > spider.x ? 1 : -1
	const maxDistance = formData.lower + formData.upper
	const speedWeight = formData.ground === 1 ? 1.9 : 0.675 // magic numbers
	const speedCoefficient = 1 / (1 + Math.abs(speed * speedWeight))
	const lerpDuration = SPIDER_LEG_LERP_DURATION * Math.min(1, speedCoefficient)
	spider.legs.forEach((leg, i) => {
		if (leg.lerp) {
			const delta = time - leg.lerp.start
			const t = delta / lerpDuration
			leg.x = lerp(leg.lerp.from, leg.lerp.to, t)
			leg.y = ctx.canvas.height - lerp(0, 6, t, easeSin)
			if (t >= 1) {
				leg.lerp = null
				leg.y = ctx.canvas.height
			}
			return
		}

		const direction = leg.direction
		const currentLerpsOnSide = spider.legs.reduce((sum, leg) => {
			if(direction === leg.direction && leg.lerp)
				sum += 1
			return sum
		}, 0)
		if (currentLerpsOnSide >= formData.ground) {
			return
		}

		const shoulderX = getLegShoulderX(spider, i)
		const sameDirection = currentDirection === leg.direction
		const sideIndex = i >> 1

		const distanceToShoulder = Math.hypot(leg.x - shoulderX, leg.y - spider.y)
		if (distanceToShoulder > maxDistance * 0.75 && !sameDirection) {
			const repositionBy = maxDistance * (-0.1 + sideIndex * 0.15)
			leg.lerp = {
				start: time,
				from: leg.x,
				to: shoulderX + leg.direction * repositionBy
			}
			return
		}

		const distanceToVertical = (leg.x - shoulderX) * leg.direction
		if (distanceToVertical < -0.05 && sameDirection) {
			const repositionBy = maxDistance * (0.7 + sideIndex * 0.085)
			leg.lerp = {
				start: time,
				from: leg.x,
				to: shoulderX + leg.direction * repositionBy
			}
			return
		}
	})
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Spider} spider
 * @param {UiFormData} formData
 */
function drawSpider(ctx, spider, formData) {
	ctx.fillStyle = '#000'
	ctx.save()
	ctx.translate(spider.x, spider.y)
	ctx.beginPath()
	ctx.arc(0, 0, SPIDER_WIDTH / 2, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()
	ctx.lineJoin = 'round'
	spider.legs.forEach((leg, i) => {
		ctx.strokeStyle = '#000'
		ctx.lineWidth = 2
		const shoulderX = getLegShoulderX(spider, i)
		const shoulderY = spider.y
		const legX = leg.x
		const legY = leg.y
		const elbow = inverseKinematicsWithTwoJoints(
			shoulderX,
			shoulderY,
			legX,
			legY,
			formData.upper,
			formData.lower,
			leg.direction
		)
		ctx.beginPath()
		ctx.moveTo(shoulderX, shoulderY)
		ctx.lineTo(elbow[0], elbow[1])
		ctx.lineTo(legX, legY)
		ctx.stroke()

		if(formData.geometry) {
			ctx.lineWidth = 1
			ctx.strokeStyle = leg.direction === 1 ? '#0907' : '#9007'
			ctx.beginPath()
			ctx.arc(shoulderX, shoulderY, formData.upper, 0, Math.PI * 2)
			ctx.stroke()

			ctx.strokeStyle = leg.direction === 1 ? '#0f07' : '#f007'
			ctx.beginPath()
			ctx.arc(legX, legY, formData.lower, 0, Math.PI * 2)
			ctx.stroke()
		}
	})
}

/**
 * @param {number} from
 * @param {number} to
 * @param {number} t [0 - 1]
 * @param {(t: number) => number} easing ([0-1]) -> [0-1]
 */
function lerp(from, to, t, easing = a => a) {
	return from + (to - from) * Math.min(1, easing(t))
}

function easeSin(t) {
	return Math.sin(t * Math.PI)
}

/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {number} upperJointLength
 * @param {number} lowerJointLength
 * @param {1 | -1} direction
 * @returns {[number, number]}
 */
 function inverseKinematicsWithTwoJoints(startX, startY, endX, endY, upperJointLength, lowerJointLength, direction) {
	const d = Math.hypot(endY - startY, endX - startX)
	
	const startToHalfChord = (d**2 - lowerJointLength**2 + upperJointLength**2) / (2 * d)
	const angleFromStartToElbow = Math.acos(startToHalfChord / upperJointLength)
	const baseAngle = ((startX >= endX) === (direction === 1))
		? Math.acos((endY - startY) / d)
		: -Math.acos((endY - startY) / d)
	const angle = - baseAngle + angleFromStartToElbow + Math.PI / 2
	const elbowX = startX - upperJointLength * Math.cos(angle) * direction
	const elbowY = startY + upperJointLength * Math.sin(angle)
	return [elbowX, elbowY]
}