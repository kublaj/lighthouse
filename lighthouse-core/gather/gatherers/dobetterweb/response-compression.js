/**
 * @license
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

 /**
  * @fileoverview Determines optimized gzip/br/deflate filesizes for all responses by
  *   checking the content-encoding header.
  */
'use strict';

const Gatherer = require('../gatherer');
const URL = require('../../../lib/url-shim');

const compressionTypes = ['gzip', 'br', 'deflate'];

class ResponseCompression extends Gatherer {
  /**
   * @param {!NetworkRecords} networkRecords
   * @return {!Array<{url: string, isBase64DataUri: boolean, mimeType: string, resourceSize: number}>}
   */
  static filterUnoptimizedResponses(networkRecords) {
    return networkRecords.reduce((prev, record) => {
      const isTextBasedResource = record._resourceType && record._resourceType._isTextType;
      const isContentEncoded = isTextBasedResource &&
        record.resourceSize &&
        !record._responseHeaders.find(header =>
          header.name.toLowerCase() === 'content-encoding' &&
          compressionTypes.includes(header.value)
        );

      if (isTextBasedResource && isContentEncoded) {
        prev.push({
          url: record._url,
          mimeType: record._mimeType,
          resourceSize: record._resourceSize,
        });
      }

      return prev;
    }, []);
  }

  afterPass(options, traceData) {
    const networkRecords = traceData.networkRecords;
    const textRecords = ResponseCompression.filterUnoptimizedResponses(networkRecords);

    return textRecords.map(record => {
      // GZIP saving is predictable (@see https://cs.chromium.org/chromium/src/third_party/WebKit/Source/devtools/front_end/audits/AuditRules.js?q=f:AuditRules+gzip&sq=package:chromium&l=97)
      const gzipSize = record.resourceSize * 2 / 3;

      return Object.assign({}, {
        gzipSize,
      }, record);
    })
  }
}

module.exports = ResponseCompression;
