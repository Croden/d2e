'use strict';

const repoBaseUrl = 'https://raw.githubusercontent.com/any2cards/d2e/master';
const imgUrl = `${repoBaseUrl}/images/`;
const dataUrl = `${repoBaseUrl}/data/`;
const iconUrl = chrome.extension.getURL('icon-32.png');
const ignoredNodes = ['TEXTAREA', 'INPUT'];

const xwcRed = '#e81e25';
const offset = 5;
const cardWidth = 768;
const cardHeight = 492;
const imagePadding = 4;
let amountOfMatches = 1;
const classname = '__xwc-container';

const fetchDataFile = (fileName) => fetch(dataUrl + fileName).then(res => res.json());

const loadAllData = Promise
    .all([
         fetchDataFile('advanced-quests.js'),
         fetchDataFile('agendas.js'),
         fetchDataFile('agents.js'),
         fetchDataFile('allies.js'),
         fetchDataFile('ally-skills.js'),
         fetchDataFile('city-event-decks.js'),
         fetchDataFile('class-familiars.js'),
         fetchDataFile('class-items.js'),
         fetchDataFile('class-skills.js'),
         fetchDataFile('conditions.js'),
         fetchDataFile('corrupt-citizens.js'),
         fetchDataFile('familiars.js'),
         fetchDataFile('heroes.js'),
         fetchDataFile('hybrid-class-skills.js'),
         fetchDataFile('lieutenants.js'),
         fetchDataFile('monster-activations.js'),
         fetchDataFile('monsters.js'),
         fetchDataFile('overlord-decks.js'),
         fetchDataFile('perils.js'),
         fetchDataFile('plot-decks.js'),
         fetchDataFile('relics.js'),
         fetchDataFile('round-summary.js'),
         fetchDataFile('rumors.js'),
         fetchDataFile('search-deck.js'),
         fetchDataFile('secret-rooms.js'),
         fetchDataFile('shop-items.js'),
         fetchDataFile('statuses.js'),
         fetchDataFile('tainted.js'),
         fetchDataFile('traps.js'),
         fetchDataFile('travel-event-decks.js')
    ])
    .then(values => [].concat.apply([], values))
    .then(processData);

const tooltip = document.createElement('div');

let cardsData = {};
let allMatches = {};

// Put longer names first, so "Barghest Activation" matches before "Barghest"
function sortData(a, b) {
    return a.length > b.length ? -1 : 1;
}

function hideTooltip() {
    tooltip.classList.add('__xwc-tooltip-hidden');
}
function showTooltip() {
    tooltip.classList.remove('__xwc-tooltip-hidden');
}
function hide(el) {
    el.classList.add('__xwc-hidden');
}
function show(el) {
    el.classList.remove('__xwc-hidden');
}

let tooltipImgContainer;

const tooltipLoader = document.createElement('div');
tooltipLoader.classList.add('__xwc-loading-cube-grid');
hide(tooltipLoader);
tooltipLoader.innerHTML = `
  <div class="__xwc-loading-cube __xwc-loading-cube1"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube2"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube3"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube4"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube5"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube6"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube7"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube8"></div>
  <div class="__xwc-loading-cube __xwc-loading-cube9"></div>
`;

function createTooltip() {
    tooltip.classList.add('__xwc-tooltip');
    hideTooltip();

    tooltip.appendChild(tooltipLoader);

    tooltipImgContainer = document.createElement('div');
    tooltipImgContainer.classList.add('__xwc-image-container');
    
    const tooltipLine = document.createElement('span');
    tooltipLine.innerHTML = `
        <p class="__xwc-powered-by">
            <img src="${iconUrl}" />
            Powered by D2e Card Viewer
        </p>
    `;

    tooltip.appendChild(tooltipImgContainer);
    tooltip.appendChild(tooltipLine);

    document.body.appendChild(tooltip);
}

function escapeRegExp(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function processData(data) {
    return data.reduce((a, c) => {
        if (c.image) {
            const keys = [
                `${c.name} (${c.points})`,
                c.name
            ];

            if (c.name.indexOf('"') > -1) {
                keys.push(c.name.replace(/"/g, ''))
            }

            keys.forEach((k) => {
                const key = k.toLowerCase();
                a[key] = a[key] || [];
                a[key].push(c);
            });
        }
        return a;
    }, {});
}

function getTextNodes(fn) {
    const elements = Array.from(document.getElementsByTagName('*'));
    elements.forEach(function (e) {
        if (ignoredNodes.indexOf(e.nodeName) === -1) {
            Array.from(e.childNodes).forEach(function (c) {
                if (c.nodeType === Node.TEXT_NODE) {
                    fn(e, c);
                }
            });
        }
    });
}

function replaceMatchesInNode(node, regExp) {
    let matches;

    while ((matches = regExp.exec(node.nodeValue)) !== null) {
        const match = matches[0];
        const lastIndex = regExp.lastIndex;

        const container = document.createElement('span');
        container.classList.add(classname);
        container.appendChild(document.createTextNode(match));

        const after = node.splitText(lastIndex - match.length);
        after.nodeValue = after.nodeValue.substring(match.length);
        node.parentNode.insertBefore(container, after);

        // Set up for next iteration
        node = after;
        regExp.lastIndex = 0;
    }
}

function throttle(fn, threshhold = 250) {
    let last;
    let deferTimer;

    return function (...args) {
        const context = this;
        const now = Date.now();

        if (last && now < last + threshhold) {
            // hold on to it
            clearTimeout(deferTimer);
            deferTimer = setTimeout(function () {
                last = now;
                fn.apply(context, args);
            }, threshhold);
        } else {
            last = now;
            fn.apply(context, args);
        }
    };
}

function moveTooltip(e) {
    const windowRightBound = window.scrollX + window.innerWidth;
    let x = window.scrollX + e.clientX + offset;
    let y = window.scrollY + e.clientY + offset;
    const right = x + (amountOfMatches * (cardWidth + imagePadding)) + 20;

    if (right > windowRightBound) {
      x = 0;
    }

    if (x < 0) {
	  x = 0;
	}

	if (y + cardHeight > window.scrollY + window.innerHeight) {
      y = y - ( (y + cardHeight) - (window.scrollY + window.innerHeight) ) - 20;
    }

	if (y < 0) {
	  y = 0;
	}
		
    tooltip.style.top = y + 'px';
    tooltip.style.left = x + 'px';
}

function generateRegExpString(data) {
  const start = '(?=^|\\s|\\b)(';
  const end = ')(?=s?(\\s|\\b|$))';
  const delimiter = '----';
  const r = start + escapeRegExp(Object.keys(data).sort(sortData).join(delimiter)).replace(new RegExp(delimiter, 'g'), '|') + end;
  return r;
}

loadAllData.then(function (data) {
    cardsData = data;
    const regExp = new RegExp(generateRegExpString(data), 'ig');
    getTextNodes((parent, node) => replaceMatchesInNode(node, regExp));
    createTooltip();
});

// Listeners for tooltip behaviour
document.body.addEventListener('mouseover', function (e) {
    const target = e.target;
    if (target && target != document && target.matches('.' + classname)) {
        const match = target.textContent;

        // Set to 1 because we'll have at least 1 match, so it gets taken into account when
        // positioning the tooltip -- see moveTooltip()
        amountOfMatches = 1;

        show(tooltipLoader);
        tooltipImgContainer.innerHTML = '';

        // Update tooltip position
        moveTooltip(e);

        // Update tooltip image source
        let promises = [];
        let images = [];
        cardsData[match.toLowerCase()].forEach((c) => {
            const promise = new Promise(function (resolve, reject) {
                const image = new Image();
                image.onload = resolve;
                image.onerror = reject;
                image.src = imgUrl + c.image;
                hide(image);

                images.push(image);
                tooltipImgContainer.appendChild(image);
            });

            promises.push(promise);
        });

        // Reveal tooltip!
        showTooltip();

        // When all images are loaded; Hide loader and show images
        Promise.all(promises).then(() => {
            amountOfMatches = images.length;

            images.forEach((image) => {
                // image.height = 'auto';
                // image.width = 'auto';
                show(image);
            });
            hide(tooltipLoader);
        });
    }
}, false);

document.body.addEventListener('mouseleave', function (e) {
    const target = e.target;
    if (target && target != document && target.matches('.' + classname)) {
        // Hide tooltip
        hideTooltip();
    }
}, true);

document.body.addEventListener('mousemove', throttle(function (e) {
    const target = e.target;
    if (target && target != document && target.matches('.' + classname)) {
        // Move tooltip
        if (!tooltip.classList.contains('__xwc-tooltip-hidden')) {
            moveTooltip(e);
        }
    }
}, 200), true);
