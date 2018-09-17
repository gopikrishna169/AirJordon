/* global d3 */
import * as flubber from 'flubber';
import tracker from './utils/tracker';

const TIMEOUT_DURATION = 5000;

// selections
const $nav = d3.select('nav');
const $navUl = $nav.select('nav ul');
const $navLi = $navUl.selectAll('li');
const $autoplayBtn = $nav.select('.autoplay');

// for nav
let dragPosX = 0;
const navCount = $navLi.size();
const navSize = $navLi.node().offsetWidth;
const totalW = navCount * navSize;
const dragMax = totalW - navSize;
const dragOffset = 0;

// data
let jordanData = [];

let currentShoe = 0;
const dataSrc = ['assets/data/jordans.json'];

// colors
const fallbackColor = '#000';
const fillMatches = {
	st0: 'url(#gradientWhite)', // FIX GRADIENTS
	st1: '#D81F28',
	st2: '#58595B',
	st3: '#414042',
	st4: '#BCBEC0',
	st5: '#E6E7E8',
	st6: '#E31E26',
	st7: '#282829',
	st8: '#0D0D0D',
	st9: '#E6E6E6',
	st10: '#FFFFFF',
	st11: '#939598',
	st12: '#D1D3D4',
	st13: '#1A1A1A',
	st14: '#B42C30',
	st15: '#F3B81E',
	st16: '#C7E9F1',
	st17: '#F26C4B',
	st18: '#EF412C',
	st18: 'url(#gradientCosmos)',
	st18: 'url(#gradientRedBlack)'
};

let timer = null;

function resize() {}

function pathsToJSON() {
	const output = [];
	d3.selectAll('.jordan svg > g').each(function() {
		output.push(getPaths(this));
	});

	window.output = JSON.stringify(output);
}

function getPaths(g) {
	const $g = d3.select(g);
	const shoeID = $g.at('id');

	const output = [];
	$g.selectAll('path')
		// d = path, i = index, n = node
		.each((d, i, n) => {
			const $path = d3.select(n[i]);
			// get the svg path coordinates
			const coordinates = $path.at('d');
			// assigns class to color
			const color = $path.at('class');
			// add the svg path coordinates to the output array
			output.push({ coordinates, color, shoeID });
		});
	return output;
}

function flubberAnimateAll({ prev, next }) {
	// update nav
	$navLi.classed('is-active', (d, i) => i === next);

	const j1 = jordanData[prev].map(d => d.coordinates).reverse();
	const j2 = jordanData[next].map(d => d.coordinates).reverse();
	const j2colors = jordanData[next].map(d => d.color).reverse();

	let terpMatch = null;
	const terpLeftover = null;

	const smallestLength = Math.min(j1.length, j2.length);
	const j1Match = j1.slice(0, smallestLength);
	const j2Match = j2.slice(0, smallestLength);

	terpMatch = flubber.interpolateAll(j1Match, j2Match, {
		match: true,
		single: false
	});
	const combinedShoes = j2colors.map((color, i) => ({
		color,
		interpolatorFunc: i < smallestLength ? terpMatch[i] : null,
		coordinates: j2[i]
	}));

	const $path = d3
		.select('#jordan1')
		.selectAll('path')
		.data(combinedShoes);

	$path
		.transition()
		.duration(1000)
		.st('fill', d => fillMatches[d.color] || fallbackColor)
		.st('stroke', d => fillMatches[d.color] || fallbackColor)
		.attrTween('d', d => d.interpolatorFunc);

	$path
		.enter()
		.append('path')
		.at('d', d => d.coordinates)
		.st('fill', d => fillMatches[d.color] || fallbackColor)
		.st('stroke', d => fillMatches[d.color] || fallbackColor);

	$path.exit().remove();

	currentShoe = next;

	hideImage(prev);
	revealImage(next);
	updateText(next);
}

function loadData() {
	return new Promise((resolve, reject) => {
		d3.loadData(...dataSrc, (err, response) => {
			if (err) reject('error loading data');
			else resolve(response);
		});
	});
}

function removePaths() {
	// Remove all the paths except the first
	d3.selectAll('g')
		.filter((d, i) => i)
		.remove();
}

function revealImage(next) {
	const currentImg = `#j${next + 1}-image`;
	d3.selectAll(currentImg)
		.transition()
		.duration(1500)
		.delay(1000)
		.style('opacity', '1');
}

function hideImage(prev) {
	const currentImg = `#j${prev + 1}-image`;
	d3.selectAll(currentImg)
		.transition()
		.duration(0)
		.style('opacity', '0');
}

function updateText(next) {
	d3.selectAll('.details-text').classed('is-visible', (d, i) => i === next);
	d3.selectAll('.big-num').text(() => {
		if (next.toString().length > 1) {
			return next + 1;
		}
		return `0${(next + 1).toString()}`;
	});
}

function handleShoeClick() {
	const item = d3.select(this);
	const activeState = item.classed('is-active');

	$navLi.classed('is-active', false);
	item.classed('is-active', !activeState);

	// d3.selectAll('li:not(.is-active)').classed('not-selected', !notActive);
	// const name = item.at('data-type');
	// const id = item.at('data-id');
	const next = +item.at('data-index');

	if (timer) {
		timer.stop();
		$autoplayBtn.html('<p>Play</p><div class="play-pause"><img src="assets/images/play.svg"></div>');
		timer = null;
	}

	flubberAnimateAll({ prev: currentShoe, next });
}

function prefix(prop) {
	return [prop, `webkit-${prop}`, `ms-${prop}`];
}

function handleDrag() {
	const { x } = d3.event;
	const diff = dragPosX - x;
	dragPosX = x;

	const prev = +$navUl.at('data-x');
	const cur = Math.max(0, Math.min(prev + diff, dragMax));

	const index = Math.min(
		Math.max(0, Math.floor((cur / dragMax) * navCount)),
		navCount - 1
	);
	const trans = (cur - dragOffset) * -1;

	$navLi.classed('is-current', (d, i) => i === index);
	$navUl.at('data-x', cur);

	const prefixes = prefix('transform');
	prefixes.forEach(pre => {
		const transform = `translateX(${trans}px)`;
		$navUl.node().style[pre] = transform;
	});
}

function handleDragStart() {
	const { x } = d3.event;
	dragPosX = x;
	$navUl.classed('is-dragend', false);
	$nav.classed('is-drag', true);
}

function handleDragEnd() {
	const cur = +$navUl.at('data-x');
	const index = Math.min(
		Math.max(0, Math.floor((cur / dragMax) * navCount)),
		navCount - 1
	);
	const x = index * navSize;
	const trans = (x - dragOffset) * -1;

	$navUl.at('data-x', x);

	const prefixes = prefix('transform');
	prefixes.forEach(pre => {
		const transform = `translateX(${trans}px)`;
		$navUl.node().style[pre] = transform;
	});

	$navUl.classed('is-dragend', true);
	$nav.classed('is-drag', false);
}

function advanceShoe() {
	flubberAnimateAll({ prev: currentShoe, next: currentShoe + 1 });
	timer = d3.timeout(advanceShoe, TIMEOUT_DURATION);
}

function handleAutoplayClick() {
	const shouldPlay = $autoplayBtn.text() === 'Play';
	if (shouldPlay) {
		$autoplayBtn.html('<p>Pause</p><div class="play-pause"><img src="assets/images/pause.svg"></div>');
		advanceShoe();
	} else if (!shouldPlay && timer) {
		$autoplayBtn.html('<p>Play</p><div class="play-pause"><img src="assets/images/play.svg"></div>');
		timer.stop();
		timer = null;
	}
}

function setUpFirstShoe() {
	$navLi.classed('is-active', (d, i) => i === 0);
	revealImage(0)
	updateText(0)
}

function setupNav() {

	$navUl.call(
		d3
			.drag()
			.on('drag', handleDrag)
			.on('start', handleDragStart)
			.on('end', handleDragEnd)
	);
	$navLi.on('click', handleShoeClick);

	$autoplayBtn.on('click', handleAutoplayClick);
}

function init() {
	// pathsToJSON();
	// TODO delete this before production
	removePaths();
	loadData()
		.then(data => {
			jordanData = data[0];
			setupNav();
			setUpFirstShoe();
			timer = d3.timeout(advanceShoe, TIMEOUT_DURATION);
		})
		.catch(console.log);
}

export default { init, resize };
