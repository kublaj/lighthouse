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
 * @fileoverview Audit a page to ensure that resources loaded with
 * gzip/br/deflate compression.
 */
'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

const KB_IN_BYTES = 1024;
const compressionTypes = ['gzip', 'br', 'deflate']

class CompressesResponses extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-request-compression',
      description: 'Server responses are compressed using GZIP or BROTLI.',
      helpText: 'Requests should be optimized to save network bytes.' +
        ' [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer).',
      requiredArtifacts: ['networkRecords']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];

    // Filter requests that are text based and have gzip/br encoding.
    const resources = networkRecords.filter(record => {
      return record._resourceType && record._resourceType._isTextType &&
          record._resourceSize > 1000 &&
          !record._responseHeaders.find(header =>
             header.name.toLowerCase() === 'content-encoding' &&
             compressionTypes.includes(header.value)
          );
    }).map(record => {
      const originalKb = record._resourceSize / KB_IN_BYTES;
      const savings = originalKb * 2 / 3;
      const percent = Math.round(savings / originalKb * 100);

      const label = `${Math.round(originalKb)} KB total, GZIP savings: ${percent}%`;

      return {
        label: label,
        url: record.url // .url is a getter and not copied over for the assign.
      };
    });


    let displayValue = '';
    if (resources.length > 1) {
      displayValue = `${resources.length} requests were not handled with GZIP/BROTTLI compression`;
    } else if (resources.length === 1) {
      displayValue = `${resources.length} request was not handled with GZIP/brottli compression`;
    }

    return CompressesResponses.generateAuditResult({
      rawValue: resources.length === 0,
      displayValue: displayValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: resources
      }
    });
  }
}

module.exports = CompressesResponses;
