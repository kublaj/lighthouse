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
const URL = require('../../lib/url-shim');
const Formatter = require('../../formatters/formatter');

const KB_IN_BYTES = 1024;
const TOTAL_WASTED_BYTES_THRESHOLD = 100 * KB_IN_BYTES;

class CompressesResponses extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-request-compression',
      description: 'Server responses are compressed using GZIP, BROTLI or DEFLATE.',
      helpText: 'Requests should be optimized to save network bytes.' +
        ' [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer).',
      requiredArtifacts: ['ResponseCompression', 'networkRecords']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];

    return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput => {
      return CompressesResponses.audit_(artifacts, networkThroughput);
    });
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {number} networkThroughput
   * @return {!AuditResult}
   */
  static audit_(artifacts, networkThroughput) {
    const uncompressedResponses = artifacts.ResponseCompression;

    let totalWastedBytes = 0;
    const results = uncompressedResponses.reduce((results, record) => {
      const originalSize = record.resourceSize;
      const gzipSize = record.gzipSize;
      const gzipSavings = originalSize - gzipSize;

      // allow a pass if we don't get 10% savings or less than 1400 bytes
      if (gzipSize / originalSize > 0.9 || gzipSavings < 1400) {
        return results;
      }

      totalWastedBytes += gzipSavings;
      const url = URL.getDisplayName(record.url);
      results.push({
        url,
        total: `${originalSize} KB`,
        gzipSavings: `${Math.round(100 * gzipSize / originalSize)}%`,
      });

      return results;
    }, []);

    let displayValue = '';
    if (totalWastedBytes > 1000) {
      const totalWastedKb = Math.round(totalWastedBytes / KB_IN_BYTES);
      // Only round to nearest 10ms since we're relatively hand-wavy
      const totalWastedMs = Math.round(totalWastedBytes / networkThroughput * 100) * 10;
      displayValue = `${totalWastedKb}KB (~${totalWastedMs}ms) potential savings`;
    }

    return CompressesResponses.generateAuditResult({
      displayValue,
      rawValue: totalWastedBytes < TOTAL_WASTED_BYTES_THRESHOLD,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results,
          tableHeadings: {
            url: 'URL',
            total: 'Original (KB)',
            gzipSavings: 'GZIP Savings (%)',
          }
        }
      }
    });
  }
}

module.exports = CompressesResponses;
