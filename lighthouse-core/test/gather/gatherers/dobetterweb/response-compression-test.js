/**
 * Copyright 2017 Google Inc. All rights reserved.
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

/* eslint-env mocha */

const ResponseCompression =
    require('../../../../gather/gatherers/dobetterweb/response-compression');
const assert = require('assert');

let options;
let optimizedResponses;
const traceData = {
  networkRecords: [
    {
      _url: 'http://google.com/index.js',
      _mimeType: 'text/javascript',
      _resourceSize: 10,
      _resourceType: {
        _isTextType: true,
      },
      _responseHeaders: [{
        name: 'Content-Encoding',
        value: 'gzip',
      }],
    },
    {
      _url: 'http://google.com/index.css',
      _mimeType: 'text/css',
      _resourceSize: 9,
      _resourceType: {
        _isTextType: true,
      },
      _responseHeaders: [],
    },
    {
      _url: 'http://google.com/index.json',
      _mimeType: 'application/json',
      _resourceSize: 12,
      _resourceType: {
        _isTextType: true,
      },
      _responseHeaders: [],
    },
    {
      _url: 'http://google.com/index.jpg',
      _mimeType: 'images/jpg',
      _resourceSize: 13,
      _resourceType: {
        _isTextType: false,
      },
      _responseHeaders: [],
    }
  ]
};

describe('Optimized responses', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    optimizedResponses = new ResponseCompression();
    options = {
      url: 'http://google.com/',
    };
  });

  it('returns only text and non encoded responses', () => {
    const artifact = optimizedResponses.afterPass(options, traceData);
    assert.equal(artifact.length, 2);
    assert.ok(/index\.css/.test(artifact[0].url));
    assert.ok(/index\.json/.test(artifact[1].url));
  });

  it('computes sizes', () => {
    const checkSizes = (stat, original, gzip) => {
      assert.equal(stat.resourceSize, original);
      assert.equal(stat.gzipSize, gzip);
    };

    const artifact = optimizedResponses.afterPass(options, traceData);
    assert.equal(artifact.length, 2);
    checkSizes(artifact[0], 9, 6);
    checkSizes(artifact[1], 12, 8);
  });
});
