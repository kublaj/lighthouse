/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const fs = require('fs');
const log = require('../../lighthouse-core/lib/log.js');
const stringifySafe = require('json-stringify-safe');
const URL = require('./url-shim');
const Metrics = require('./traces/pwmetrics-events');

/**
 * Generate a filenamePrefix of hostname_YYYY-MM-DD_HH-MM-SS
 * Date/time uses the local timezone, however Node has unreliable ICU
 * support, so we must construct a YYYY-MM-DD date format manually. :/
 * @param {!Object} results
 * @returns string
 */
function getFilenamePrefix(results) {
  const hostname = new URL(results.url).hostname;
  const date = (results.generatedTime && new Date(results.generatedTime)) || new Date();

  const timeStr = date.toLocaleTimeString('en-US', {hour12: false});
  const dateParts = date.toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/');
  dateParts.unshift(dateParts.pop());
  const dateStr = dateParts.join('-');

  const filenamePrefix = `${hostname}_${dateStr}_${timeStr}`;
  // replace characters that are unfriendly to filenames
  return filenamePrefix.replace(/[\/\?<>\\:\*\|":]/g, '-');
}

/**
 * Generate basic HTML page of screenshot filmstrip
 * @param {!Array<{timestamp: number, datauri: string}>} screenshots
 * @return {!string}
 */
function screenshotDump(screenshots) {
  return `
  <!doctype html>
  <title>screenshots</title>
  <style>
html {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 100%;
    background: linear-gradient(to left, #4CA1AF , #C4E0E5);
    background-attachment: fixed;
    padding: 10px;
}
body {
    white-space: nowrap;
    background: linear-gradient(to left, #4CA1AF , #C4E0E5);
    width: 100%;
    margin: 0;
}
img {
    margin: 4px;
}
</style>
  <body>
    <script>
      var shots = ${JSON.stringify(screenshots)};

  shots.forEach(s => {
    var i = document.createElement('img');
    i.src = s.datauri;
    i.title = s.timestamp;
    document.body.appendChild(i);
  });
  </script>
  `;
}

/**
 * Save entire artifacts object to a single stringified file located at
 * pathWithBasename + .artifacts.log
 * @param {!Artifacts} artifacts
 * @param {string} pathWithBasename
 */
// Set to ignore because testing it would imply testing fs, which isn't strictly necessary.
/* istanbul ignore next */
function saveArtifacts(artifacts, pathWithBasename) {
  const fullPath = `${pathWithBasename}.artifacts.log`;
  // The networkRecords artifacts have circular references
  fs.writeFileSync(fullPath, stringifySafe(artifacts));
  log.log('artifacts file saved to disk', fullPath);
}

/**
 * Filter traces and extract screenshots to prepare for saving.
 * @param {!Artifacts} artifacts
 * @param {!Audits} audits
 * @return {!Promise<!Array<{traceData: !Object, html: string}>>}
 */
function prepareAssets(artifacts, audits) {
  const passNames = Object.keys(artifacts.traces);
  const assets = [];

  return passNames.reduce((chain, passName) => {
    const trace = artifacts.traces[passName];

    return chain.then(_ => artifacts.requestScreenshots(trace))
      .then(screenshots => {
        const traceData = Object.assign({}, trace);
        const html = screenshotDump(screenshots);

        if (audits) {
          const evts = new Metrics(traceData.traceEvents, audits).generateFakeEvents();
          traceData.traceEvents.push(...evts);
        }
        assets.push({
          traceData,
          html
        });
      });
  }, Promise.resolve())
    .then(_ => assets);
}

/**
 * Writes trace(s) and associated screenshot(s) to disk.
 * @param {!Artifacts} artifacts
 * @param {!Audits} audits
 * @param {string} pathWithBasename
 * @return {!Promise}
 */
function saveAssets(artifacts, audits, pathWithBasename) {
  return prepareAssets(artifacts, audits).then(assets => {
    assets.forEach((data, index) => {
      const traceData = data.traceData;
      const traceFilename = `${pathWithBasename}-${index}.trace.json`;
      fs.writeFileSync(traceFilename, JSON.stringify(traceData, null, 2));
      log.log('trace file saved to disk', traceFilename);

      const screenshotsFilename = `${pathWithBasename}-${index}.screenshots.html`;
      fs.writeFileSync(screenshotsFilename, data.html);
      log.log('screenshots saved to disk', screenshotsFilename);
    });
  });
}

module.exports = {
  saveArtifacts,
  saveAssets,
  getFilenamePrefix,
  prepareAssets
};
