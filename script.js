const SPIDER_WIDTH = 60
const SPIDER_DISTANCE_TO_GROUND = 65
const SPIDER_UPPER_JOINT_LENGTH = 60
const SPIDER_LOWER_JOINT_LENGTH = 110


const canvas = document.querySelector('canvas')
if(!canvas)
	throw new Error('No canvas found')

const side = Math.min(window.innerWidth, window.innerHeight)// * devicePixelRatio
canvas.width = side
canvas.height = side

const ctx = canvas.getContext('2d')
if(!ctx)
	throw new Error('No context found')

/**
 * @param {CanvasRenderingContext2D} ctx
 */
void function (ctx) {
	/** @type {Spider} */
	const spider = {
		x: ctx.canvas.width / 2,
		y: ctx.canvas.height - SPIDER_DISTANCE_TO_GROUND,
		speed: 0,
		legs: [
			{ x: ctx.canvas.width / 2 - 40, y: ctx.canvas.height, direction: -1 },
			{ x: ctx.canvas.width / 2 + 40, y: ctx.canvas.height, direction: 1 },
			{ x: ctx.canvas.width / 2 - 80, y: ctx.canvas.height, direction: -1 },
			{ x: ctx.canvas.width / 2 + 80, y: ctx.canvas.height, direction: 1 },
			{ x: ctx.canvas.width / 2 - 120, y: ctx.canvas.height, direction: -1 },
			{ x: ctx.canvas.width / 2 + 120, y: ctx.canvas.height, direction: 1 },
			{ x: ctx.canvas.width / 2 - 160, y: ctx.canvas.height, direction: -1 },
			{ x: ctx.canvas.width / 2 + 160, y: ctx.canvas.height, direction: 1 },
		],
	}
	/** @type {MousePos} */
	const mousePos = {
		x: spider.x,
		y: spider.y,
	}

	update(ctx, mousePos, spider)
	draw(ctx, mousePos, spider)
}(ctx)


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
 * @param {Spider} spider
 */
function draw(ctx, mousePos, spider) {
	/**
	 * @param {number} lastTime
	 */
	function loop(lastTime) {
		requestAnimationFrame((time) => {
			const delta = lastTime ? time - lastTime : 0
			spider.x += (mousePos.x - spider.x) * delta / 1000
			spider.y = ctx.canvas.height - SPIDER_DISTANCE_TO_GROUND - Math.sin(spider.x / 20 - ctx.canvas.width / 2) * 5
			updateSpiderLegs(mousePos, spider)
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
			drawSpider(ctx, spider)
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
 * @param {MousePos} mousePos
 * @param {Spider} spider
 */
function updateSpiderLegs(mousePos, spider) {
	const currentDirection = mousePos.x > spider.x ? 1 : -1
	const maxDistance = SPIDER_LOWER_JOINT_LENGTH + SPIDER_UPPER_JOINT_LENGTH
	spider.legs.forEach((leg, i) => {
		const shoulderX = getLegShoulderX(spider, i)
		const sameDirection = currentDirection === leg.direction
		const sideIndex = i >> 1

		const distanceToShoulder = Math.hypot(leg.x - shoulderX, leg.y - spider.y)
		if (distanceToShoulder > maxDistance * 0.85 && !sameDirection) {
			const repositionBy = maxDistance * (0.05 + sideIndex * 0.02)
			leg.x = shoulderX + leg.direction * repositionBy
			return
		}

		const distanceToVertical = (leg.x - shoulderX) * leg.direction
		if (distanceToVertical < 0.05 && sameDirection) {
			const repositionBy = maxDistance * (0.85 + sideIndex * 0.02)
			leg.x = shoulderX + leg.direction * repositionBy
			return
		}
	})
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Spider} spider
 */
function drawSpider(ctx, spider) {
	ctx.fillStyle = '#000'
	ctx.strokeStyle = '#000'
	ctx.save()
	ctx.translate(spider.x, spider.y)
	ctx.beginPath()
	ctx.arc(0, 0, SPIDER_WIDTH / 2, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()
	spider.legs.forEach((leg, i) => {
		const shoulderX = getLegShoulderX(spider, i)
		const elbow = inverseKinematicsWithTwoJoints(
			shoulderX,
			spider.y,
			leg.x,
			leg.y,
			SPIDER_UPPER_JOINT_LENGTH,
			SPIDER_LOWER_JOINT_LENGTH,
			leg.direction
		)
		// ctx.strokeStyle = leg.direction === 1 ? '#0f0' : '#f00'
		ctx.beginPath()
		ctx.moveTo(shoulderX, spider.y)
		ctx.lineTo(elbow[0], elbow[1])
		ctx.lineTo(leg.x, leg.y)
		ctx.stroke()

		// ctx.beginPath()
		// ctx.arc(x, spider.y, SPIDER_UPPER_JOINT_LENGTH, 0, Math.PI * 2)
		// ctx.stroke()

		// ctx.beginPath()
		// ctx.arc(leg.x, y, SPIDER_LOWER_JOINT_LENGTH, 0, Math.PI * 2)
		// ctx.stroke()
	})
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