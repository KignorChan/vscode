/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs');
const path = require('path');
const product = require('../product.json');
const cp = require('child_process');
const vm = require('vm');

const PREFIX = [
	'vs/loader.js',
	'vs/css.js',
	'vs/nls.js',
];

const CONTENTS = [
	'vs/base/browser/iframe',
	'vs/base/browser/ui/list/rangeMap',
	'vs/base/browser/ui/scrollbar/scrollbarState',
	'vs/base/common/assert',
	'vs/base/common/collections',
	'vs/base/common/color',
	'vs/base/common/date',
	'vs/base/common/decorators',
	'vs/base/common/diff/diffChange',
	'vs/base/common/diff/diff',
	'vs/base/common/functional',
	'vs/base/common/hash',
	'vs/base/common/idGenerator',
	'vs/base/common/iterator',
	'vs/base/common/history',
	'vs/base/common/json',
	'vs/base/common/jsonFormatter',
	'vs/base/common/jsonEdit',
	'vs/base/common/keyCodes',
	'vs/base/common/lifecycle',
	'vs/base/common/linkedList',
	'vs/base/common/marked/raw.marked',
	'vs/base/common/marked/marked',
	'vs/base/common/network',
	'vs/base/common/numbers',
	'vs/base/common/performance',
	'vs/base/common/platform',
	'vs/base/common/diagnostics',
	'vs/base/common/processes',
	'vs/base/common/stopwatch',
	'vs/base/common/types',
	'vs/base/common/graph',
	'vs/base/common/objects',
	'vs/base/common/parsers',
	'vs/base/common/uri',
	'vs/base/common/map',
	'vs/base/common/marshalling',
	'vs/base/common/strings',
	'vs/base/common/filters',
	'vs/base/common/paths',
	'vs/base/common/comparers',
	'vs/base/common/labels',
	'vs/base/common/resources',
	'vs/base/common/uuid',
	'vs/base/common/winjs.base.raw',
	'vs/base/common/winjs.base',
	'vs/base/common/arrays',
	'vs/base/common/cache',
	'vs/base/common/errors',
	'vs/base/common/event',
	'vs/base/browser/browser',
	'vs/base/browser/event',
	'vs/base/browser/keyboardEvent',
	'vs/base/browser/mouseEvent',
	'vs/base/common/actions',
	'vs/base/common/cancellation',
	'vs/base/common/async',
	'vs/base/browser/dom',
	'vs/base/browser/fastDomNode',
	'vs/base/browser/globalMouseMoveMonitor',
	'vs/base/browser/touch',
	'vs/base/browser/ui/list/rowCache',
	'vs/base/browser/ui/widget',
	'vs/base/browser/ui/scrollbar/scrollbarArrow',
	'vs/base/common/glob',
	'vs/base/common/htmlContent',
];

let results = [];

function getFileContents(file) {
	const filePath = path.join(__dirname, '../out', file);
	const fileContents = fs.readFileSync(filePath);
	return fileContents.toString('utf8');
}

PREFIX.forEach((file) => {
	const fileContents = getFileContents(file);
	results.push(fileContents);
});

CONTENTS.forEach((file) => {
	let fileContents = getFileContents(file + '.js');
	fileContents = fileContents.replace(/define\(\[/g, `define("${file}", [`);
	results.push(fileContents);
});

const file = results.join('\n;\n');

const startupFileContents = `
var Monaco_Loader_Init;
var Monaco_LOG = [];
(function() {
	var doNotInitLoader = true;
	var MonacoSnapshotPlatform = '${process.platform}';
	var MonacoSnapshotGlobal = this;
	var navigator = {
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) code-oss-dev/1.21.0 Chrome/58.0.3029.110 Electron/1.7.9 Safari/537.36'
	};
	${file.toString()};
	Monaco_Loader_Init = function() {
		AMDLoader.init();
		return { define, require };
	};
})();
`;

const startupFile = path.join(__dirname, 'start.js');
fs.writeFileSync(startupFile, startupFileContents);

const startupBlobFilepath = path.join(__dirname, `../.build/electron/${product.nameLong}.app/Contents/Frameworks/Electron Framework.framework/Resources/snapshot_blob.bin`);
// startupBlobFilepath = `VSCode-${process.platform}-${arch}/snapshot_blob.bin`;

// Restore original
try { fs.unlinkSync(startupBlobFilepath); } catch (err) { /**/ }
fs.copyFileSync(startupBlobFilepath + '.original', startupBlobFilepath);

// Check that the file works!
vm.runInNewContext(startupFileContents, undefined, { filename: startupFile, displayErrors: true });

const mksnapshot = path.join(__dirname, `../node_modules/.bin/${process.platform === 'win32' ? 'mksnapshot.cmd' : 'mksnapshot'}`);
cp.execFileSync(mksnapshot, [startupFile, `--startup_blob`, startupBlobFilepath]);
