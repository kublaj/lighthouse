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

const UsesResponseCompressionAudit =
  require('../../../audits/dobetterweb/uses-response-compression.js');
const assert = require('assert');

function generateResponse(filename, type, originalSize, gzipSize) {
  return {
    url: `http://google.com/${filename}`,
    mimeType: `${type}`,
    originalSize,
    gzipSize,
  };
}

/* eslint-env mocha */

describe('Page uses optimized responses', () => {
  it('fails when images are collectively unoptimized', () => {
    const auditResult = UsesResponseCompressionAudit.audit_({
      ResponseCompression: [
        generateResponse('index.js', 'text/javascript', 10000, 9000),
        generateResponse('index.css', 'text/css', 5000, 3000),
        generateResponse('index.json', 'application/json', 1500, 50),
      ],
    });

    assert.equal(auditResult.rawValue, false);
  });

  it('passes when all reponses are sufficiently optimized', () => {
    const auditResult = UsesResponseCompressionAudit.audit_({
      ResponseCompression: [
        generateResponse('index.js', 'text/javascript', 100000, 91000),
        generateResponse('index.css', 'text/css', 5000, 4000),
        generateResponse('index.json', 'application/json', 1000, 500),
      ],
    });

    assert.equal(auditResult.rawValue, true);
  });
});
