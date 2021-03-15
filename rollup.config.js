/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import path from 'path';
import filesize from 'rollup-plugin-filesize';
import {terser} from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import license from 'rollup-plugin-license';

const escapeNullByte = {
  name: 'escapeNullByte',
  transform(code) {
    code = code.replaceAll('\0', '\\0');
    return {
      code,
    };
  },
};

export default {
  input: 'index.js',
  output: {
    file: 'bundled/chessboard-element.bundled.js',
    format: 'esm',
  },
  onwarn(warning) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      console.error(`(!) ${warning.message}`);
    }
  },
  plugins: [
    resolve(),
    license({
      sourcemap: true,
      thirdParty: {
        output: {
          file: path.join(__dirname, 'bundled', 'dependencies.txt'),
        },
      },
    }),
    minifyHTML({
      // Don't minify SVG because it messes up the pieces
      options: {
        shouldMinify(template) {
          const tag = template.tag && template.tag.toLowerCase();
          return !!tag && (tag.includes('html'));
        },
      },
    }),
    terser({
      warnings: true,
      ecma: 2020,
      compress: {
        unsafe: true,
      },
      mangle: {
        module: true,
        properties: {
          regex: /^__/,
        },
      },
      output: {
        comments: false,
      },
    }),
    escapeNullByte,
    filesize({
      showBrotliSize: true,
    })
  ]
}
