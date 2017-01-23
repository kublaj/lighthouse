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
/*
 * @fileoverview This audit determines if the images used are sufficiently larger
 * than Lighthouse optimized versions of the images (as determined by the gatherer).
 * Audit will fail if one of the conditions are met:
 *   * There is at least one JPEG or bitmap image that was larger than canvas encoded JPEG.
 *   * There is at least one image that would have saved more than 50KB by using WebP.
 *   * The savings of moving all images to WebP is greater than 100KB.
 */
'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class UsesRequestCompression extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-request-compression',
      description: 'Site uses GZIP/BROTLI compression',
      helpText: 'Requests should be optimized to save network bytes.',
      requiredArtifacts: ['networkRecords']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];

    // Filter requests that are on the same host as the page and not over h2.
    const resources = networkRecords.filter(record => {
      return record._resourceType && record._resourceType._isTextType &&
        !record._responseHeaders.find(header =>
          header.name.toLowerCase() === 'content-encoding' &&
          (header.value === 'gzip' || header.value === 'br')
        );
    }).map(record => {
      return {
        label: record.protocol,
        url: record.url // .url is a getter and not copied over for the assign.
      };
    });


    let displayValue = '';
    if (resources.length > 1) {
      displayValue = `${resources.length} requests were not handled with gzip/brottli compression`;
    } else if (resources.length === 1) {
      displayValue = `${resources.length} request was not handled with gzip/brottli compression`;
    }

    return UsesRequestCompression.generateAuditResult({
      rawValue: resources.length === 0,
      displayValue: displayValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: resources
      }
    });
  }
}

module.exports = UsesRequestCompression;
