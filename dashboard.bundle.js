(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

module.exports = _arrayLikeToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],6:[function(require,module,exports){
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

module.exports = _arrayWithHoles;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],7:[function(require,module,exports){
var arrayLikeToArray = require("./arrayLikeToArray.js");

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return arrayLikeToArray(arr);
}

module.exports = _arrayWithoutHoles;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{"./arrayLikeToArray.js":5}],8:[function(require,module,exports){
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

module.exports = _asyncToGenerator;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],9:[function(require,module,exports){
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

module.exports = _classCallCheck;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],10:[function(require,module,exports){
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

module.exports = _createClass;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],11:[function(require,module,exports){
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

module.exports = _defineProperty;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],12:[function(require,module,exports){
function _extends() {
  module.exports = _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  module.exports["default"] = module.exports, module.exports.__esModule = true;
  return _extends.apply(this, arguments);
}

module.exports = _extends;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],13:[function(require,module,exports){
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}

module.exports = _iterableToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],14:[function(require,module,exports){
function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

module.exports = _iterableToArrayLimit;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],15:[function(require,module,exports){
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

module.exports = _nonIterableRest;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],16:[function(require,module,exports){
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

module.exports = _nonIterableSpread;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],17:[function(require,module,exports){
var objectWithoutPropertiesLoose = require("./objectWithoutPropertiesLoose.js");

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = objectWithoutPropertiesLoose(source, excluded);
  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

module.exports = _objectWithoutProperties;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{"./objectWithoutPropertiesLoose.js":18}],18:[function(require,module,exports){
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

module.exports = _objectWithoutPropertiesLoose;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],19:[function(require,module,exports){
var arrayWithHoles = require("./arrayWithHoles.js");

var iterableToArrayLimit = require("./iterableToArrayLimit.js");

var unsupportedIterableToArray = require("./unsupportedIterableToArray.js");

var nonIterableRest = require("./nonIterableRest.js");

function _slicedToArray(arr, i) {
  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
}

module.exports = _slicedToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{"./arrayWithHoles.js":6,"./iterableToArrayLimit.js":14,"./nonIterableRest.js":15,"./unsupportedIterableToArray.js":22}],20:[function(require,module,exports){
var arrayWithoutHoles = require("./arrayWithoutHoles.js");

var iterableToArray = require("./iterableToArray.js");

var unsupportedIterableToArray = require("./unsupportedIterableToArray.js");

var nonIterableSpread = require("./nonIterableSpread.js");

function _toConsumableArray(arr) {
  return arrayWithoutHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableSpread();
}

module.exports = _toConsumableArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{"./arrayWithoutHoles.js":7,"./iterableToArray.js":13,"./nonIterableSpread.js":16,"./unsupportedIterableToArray.js":22}],21:[function(require,module,exports){
function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    module.exports = _typeof = function _typeof(obj) {
      return typeof obj;
    };

    module.exports["default"] = module.exports, module.exports.__esModule = true;
  } else {
    module.exports = _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };

    module.exports["default"] = module.exports, module.exports.__esModule = true;
  }

  return _typeof(obj);
}

module.exports = _typeof;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{}],22:[function(require,module,exports){
var arrayLikeToArray = require("./arrayLikeToArray.js");

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
}

module.exports = _unsupportedIterableToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;
},{"./arrayLikeToArray.js":5}],23:[function(require,module,exports){
module.exports = require("regenerator-runtime");

},{"regenerator-runtime":89}],24:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":26}],25:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var cookies = require('./../helpers/cookies');
var buildURL = require('./../helpers/buildURL');
var buildFullPath = require('../core/buildFullPath');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        config.transitional && config.transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (!requestData) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

},{"../core/buildFullPath":32,"../core/createError":33,"./../core/settle":37,"./../helpers/buildURL":41,"./../helpers/cookies":43,"./../helpers/isURLSameOrigin":46,"./../helpers/parseHeaders":48,"./../utils":51}],26:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":27,"./cancel/CancelToken":28,"./cancel/isCancel":29,"./core/Axios":30,"./core/mergeConfig":36,"./defaults":39,"./helpers/bind":40,"./helpers/isAxiosError":45,"./helpers/spread":49,"./utils":51}],27:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],28:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":27}],29:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],30:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');
var validator = require('../helpers/validator');

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
      forcedJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
      clarifyTimeoutError: validators.transitional(validators.boolean, '1.0.0')
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"../helpers/buildURL":41,"../helpers/validator":50,"./../utils":51,"./InterceptorManager":31,"./dispatchRequest":34,"./mergeConfig":36}],31:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":51}],32:[function(require,module,exports){
'use strict';

var isAbsoluteURL = require('../helpers/isAbsoluteURL');
var combineURLs = require('../helpers/combineURLs');

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

},{"../helpers/combineURLs":42,"../helpers/isAbsoluteURL":44}],33:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":35}],34:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":29,"../defaults":39,"./../utils":51,"./transformData":38}],35:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code
    };
  };
  return error;
};

},{}],36:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  var valueFromConfig2Keys = ['url', 'method', 'data'];
  var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
  var defaultToConfig2Keys = [
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
    'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
    'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
  ];
  var directMergeKeys = ['validateStatus'];

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  }

  utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(undefined, config2[prop]);
    }
  });

  utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

  utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  });

  utils.forEach(directMergeKeys, function merge(prop) {
    if (prop in config2) {
      config[prop] = getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  });

  var axiosKeys = valueFromConfig2Keys
    .concat(mergeDeepPropertiesKeys)
    .concat(defaultToConfig2Keys)
    .concat(directMergeKeys);

  var otherKeys = Object
    .keys(config1)
    .concat(Object.keys(config2))
    .filter(function filterAxiosKeys(key) {
      return axiosKeys.indexOf(key) === -1;
    });

  utils.forEach(otherKeys, mergeDeepProperties);

  return config;
};

},{"../utils":51}],37:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":33}],38:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var defaults = require('./../defaults');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

},{"./../defaults":39,"./../utils":51}],39:[function(require,module,exports){
(function (process){(function (){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');
var enhanceError = require('./core/enhanceError');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false
  },

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw enhanceError(e, this, 'E_JSON_PARSE');
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this)}).call(this,require('_process'))
},{"./adapters/http":25,"./adapters/xhr":25,"./core/enhanceError":35,"./helpers/normalizeHeaderName":47,"./utils":51,"_process":4}],40:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],41:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":51}],42:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],43:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

},{"./../utils":51}],44:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],45:[function(require,module,exports){
'use strict';

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
module.exports = function isAxiosError(payload) {
  return (typeof payload === 'object') && (payload.isAxiosError === true);
};

},{}],46:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

},{"./../utils":51}],47:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":51}],48:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":51}],49:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],50:[function(require,module,exports){
'use strict';

var pkg = require('./../../package.json');

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};
var currentVerArr = pkg.version.split('.');

/**
 * Compare package versions
 * @param {string} version
 * @param {string?} thanVersion
 * @returns {boolean}
 */
function isOlderVersion(version, thanVersion) {
  var pkgVersionArr = thanVersion ? thanVersion.split('.') : currentVerArr;
  var destVer = version.split('.');
  for (var i = 0; i < 3; i++) {
    if (pkgVersionArr[i] > destVer[i]) {
      return true;
    } else if (pkgVersionArr[i] < destVer[i]) {
      return false;
    }
  }
  return false;
}

/**
 * Transitional option validator
 * @param {function|boolean?} validator
 * @param {string?} version
 * @param {string} message
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  var isDeprecated = version && isOlderVersion(version);

  function formatMessage(opt, desc) {
    return '[Axios v' + pkg.version + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed in ' + version));
    }

    if (isDeprecated && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt);
    }
  }
}

module.exports = {
  isOlderVersion: isOlderVersion,
  assertOptions: assertOptions,
  validators: validators
};

},{"./../../package.json":52}],51:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (toString.call(val) !== '[object Object]') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
};

},{"./helpers/bind":40}],52:[function(require,module,exports){
module.exports={
  "_from": "axios",
  "_id": "axios@0.21.4",
  "_inBundle": false,
  "_integrity": "sha512-ut5vewkiu8jjGBdqpM44XxjuCjq9LAKeHVmoVfHVzy8eHgxxq8SbAVQNovDA8mVi05kP0Ea/n/UzcSHcTJQfNg==",
  "_location": "/axios",
  "_phantomChildren": {},
  "_requested": {
    "type": "tag",
    "registry": true,
    "raw": "axios",
    "name": "axios",
    "escapedName": "axios",
    "rawSpec": "",
    "saveSpec": null,
    "fetchSpec": "latest"
  },
  "_requiredBy": [
    "#USER",
    "/",
    "/quickchart-js",
    "/stream-chat"
  ],
  "_resolved": "https://registry.npmjs.org/axios/-/axios-0.21.4.tgz",
  "_shasum": "c67b90dc0568e5c1cf2b0b858c43ba28e2eda575",
  "_spec": "axios",
  "_where": "/Users/nick/Documents/flextrack/term3/hackathon/hackathonJS",
  "author": {
    "name": "Matt Zabriskie"
  },
  "browser": {
    "./lib/adapters/http.js": "./lib/adapters/xhr.js"
  },
  "bugs": {
    "url": "https://github.com/axios/axios/issues"
  },
  "bundleDependencies": false,
  "bundlesize": [
    {
      "path": "./dist/axios.min.js",
      "threshold": "5kB"
    }
  ],
  "dependencies": {
    "follow-redirects": "^1.14.0"
  },
  "deprecated": false,
  "description": "Promise based HTTP client for the browser and node.js",
  "devDependencies": {
    "coveralls": "^3.0.0",
    "es6-promise": "^4.2.4",
    "grunt": "^1.3.0",
    "grunt-banner": "^0.6.0",
    "grunt-cli": "^1.2.0",
    "grunt-contrib-clean": "^1.1.0",
    "grunt-contrib-watch": "^1.0.0",
    "grunt-eslint": "^23.0.0",
    "grunt-karma": "^4.0.0",
    "grunt-mocha-test": "^0.13.3",
    "grunt-ts": "^6.0.0-beta.19",
    "grunt-webpack": "^4.0.2",
    "istanbul-instrumenter-loader": "^1.0.0",
    "jasmine-core": "^2.4.1",
    "karma": "^6.3.2",
    "karma-chrome-launcher": "^3.1.0",
    "karma-firefox-launcher": "^2.1.0",
    "karma-jasmine": "^1.1.1",
    "karma-jasmine-ajax": "^0.1.13",
    "karma-safari-launcher": "^1.0.0",
    "karma-sauce-launcher": "^4.3.6",
    "karma-sinon": "^1.0.5",
    "karma-sourcemap-loader": "^0.3.8",
    "karma-webpack": "^4.0.2",
    "load-grunt-tasks": "^3.5.2",
    "minimist": "^1.2.0",
    "mocha": "^8.2.1",
    "sinon": "^4.5.0",
    "terser-webpack-plugin": "^4.2.3",
    "typescript": "^4.0.5",
    "url-search-params": "^0.10.0",
    "webpack": "^4.44.2",
    "webpack-dev-server": "^3.11.0"
  },
  "homepage": "https://axios-http.com",
  "jsdelivr": "dist/axios.min.js",
  "keywords": [
    "xhr",
    "http",
    "ajax",
    "promise",
    "node"
  ],
  "license": "MIT",
  "main": "index.js",
  "name": "axios",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/axios/axios.git"
  },
  "scripts": {
    "build": "NODE_ENV=production grunt build",
    "coveralls": "cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js",
    "examples": "node ./examples/server.js",
    "fix": "eslint --fix lib/**/*.js",
    "postversion": "git push && git push --tags",
    "preversion": "npm test",
    "start": "node ./sandbox/server.js",
    "test": "grunt test",
    "version": "npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json"
  },
  "typings": "./index.d.ts",
  "unpkg": "dist/axios.min.js",
  "version": "0.21.4"
}

},{}],53:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"dup":1}],54:[function(require,module,exports){
/* eslint-env browser */
module.exports = typeof self == 'object' ? self.FormData : window.FormData;

},{}],55:[function(require,module,exports){
(function (global){(function (){
// https://github.com/maxogden/websocket-stream/blob/48dc3ddf943e5ada668c31ccd94e9186f02fafbd/ws-fallback.js

var ws = null

if (typeof WebSocket !== 'undefined') {
  ws = WebSocket
} else if (typeof MozWebSocket !== 'undefined') {
  ws = MozWebSocket
} else if (typeof global !== 'undefined') {
  ws = global.WebSocket || global.MozWebSocket
} else if (typeof window !== 'undefined') {
  ws = window.WebSocket || window.MozWebSocket
} else if (typeof self !== 'undefined') {
  ws = self.WebSocket || self.MozWebSocket
}

module.exports = ws

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLocaleData = getLocaleData;
exports.addLocaleData = addLocaleData;
// For all locales added
// their relative time formatter messages will be stored here.
var localesData = {};

function getLocaleData(locale) {
  return localesData[locale];
}

function addLocaleData(localeData) {
  if (!localeData) {
    throw new Error('[javascript-time-ago] No locale data passed.');
  } // This locale data is stored in a global variable
  // and later used when calling `.format(time)`.


  localesData[localeData.locale] = localeData;
}

},{}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isStyleObject = isStyleObject;
exports.default = void 0;

var _relativeTimeFormat = _interopRequireDefault(require("relative-time-format"));

var _cache = _interopRequireDefault(require("./cache"));

var _locale = _interopRequireDefault(require("./locale"));

var _getStep3 = _interopRequireDefault(require("./steps/getStep"));

var _getStepDenominator = _interopRequireDefault(require("./steps/getStepDenominator"));

var _getTimeToNextUpdate = _interopRequireDefault(require("./steps/getTimeToNextUpdate"));

var _LocaleDataStore = require("./LocaleDataStore");

var _roundMinute = _interopRequireDefault(require("./style/roundMinute"));

var _getStyleByName = _interopRequireDefault(require("./style/getStyleByName"));

var _round = require("./round");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// Valid time units.
var UNITS = ['now', // The rest are the same as in `Intl.RelativeTimeFormat`.
'second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'];

var TimeAgo =
/*#__PURE__*/
function () {
  /**
   * @param {(string|string[])} locales=[] - Preferred locales (or locale).
   * @param {boolean} [polyfill] — Pass `false` to use native `Intl.RelativeTimeFormat` and `Intl.PluralRules` instead of the polyfills.
   */
  function TimeAgo() {
    var locales = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        polyfill = _ref.polyfill;

    _classCallCheck(this, TimeAgo);

    // Convert `locales` to an array.
    if (typeof locales === 'string') {
      locales = [locales];
    } // Choose the most appropriate locale
    // from the list of `locales` added by the user.
    // For example, new TimeAgo("en-US") -> "en".


    this.locale = (0, _locale.default)(locales.concat(TimeAgo.getDefaultLocale()), _LocaleDataStore.getLocaleData);

    if (typeof Intl !== 'undefined') {
      // Use `Intl.NumberFormat` for formatting numbers (when available).
      if (Intl.NumberFormat) {
        this.numberFormat = new Intl.NumberFormat(this.locale);
      }
    } // Some people have requested the ability to use native
    // `Intl.RelativeTimeFormat` and `Intl.PluralRules`
    // instead of the polyfills.
    // https://github.com/catamphetamine/javascript-time-ago/issues/21


    if (polyfill === false) {
      this.IntlRelativeTimeFormat = Intl.RelativeTimeFormat;
      this.IntlPluralRules = Intl.PluralRules;
    } else {
      this.IntlRelativeTimeFormat = _relativeTimeFormat.default;
      this.IntlPluralRules = _relativeTimeFormat.default.PluralRules;
    } // Cache `Intl.RelativeTimeFormat` instance.


    this.relativeTimeFormatCache = new _cache.default(); // Cache `Intl.PluralRules` instance.

    this.pluralRulesCache = new _cache.default();
  }
  /**
   * Formats relative date/time.
   *
   * @param {number} [options.now] - Sets the current date timestamp.
   *
   * @param  {boolean} [options.future] — Tells how to format value `0`:
   *         as "future" (`true`) or "past" (`false`).
   *         Is `false` by default, but should have been `true` actually,
   *         in order to correspond to `Intl.RelativeTimeFormat`
   *         that uses `future` formatting for `0` unless `-0` is passed.
   *
   * @param {string} [options.round] — Rounding method. Overrides the style's one.
   *
   * @param {boolean} [options.getTimeToNextUpdate] — Pass `true` to return `[formattedDate, timeToNextUpdate]` instead of just `formattedDate`.
   *
   * @return {string} The formatted relative date/time. If no eligible `step` is found, then an empty string is returned.
   */


  _createClass(TimeAgo, [{
    key: "format",
    value: function format(input, style, options) {
      if (!options) {
        if (style && !isStyle(style)) {
          options = style;
          style = undefined;
        } else {
          options = {};
        }
      }

      if (!style) {
        style = _roundMinute.default;
      }

      if (typeof style === 'string') {
        style = (0, _getStyleByName.default)(style);
      }

      var timestamp = getTimestamp(input); // Get locale messages for this type of labels.
      // "flavour" is a legacy name for "labels".

      var _this$getLabels = this.getLabels(style.flavour || style.labels),
          labels = _this$getLabels.labels,
          labelsType = _this$getLabels.labelsType;

      var now; // Can pass a custom `now`, e.g. for testing purposes.
      //
      // Legacy way was passing `now` in `style`.
      // That way is deprecated.

      if (style.now !== undefined) {
        now = style.now;
      } // The new way is passing `now` option to `.format()`.


      if (now === undefined && options.now !== undefined) {
        now = options.now;
      }

      if (now === undefined) {
        now = Date.now();
      } // how much time has passed (in seconds)


      var secondsPassed = (now - timestamp) / 1000; // in seconds

      var future = options.future || secondsPassed < 0;
      var nowLabel = getNowLabel(labels, (0, _LocaleDataStore.getLocaleData)(this.locale).now, (0, _LocaleDataStore.getLocaleData)(this.locale).long, future); // `custom` – A function of `{ elapsed, time, date, now, locale }`.
      //
      // Looks like `custom` function is deprecated and will be removed
      // in the next major version.
      //
      // If this function returns a value, then the `.format()` call will return that value.
      // Otherwise the relative date/time is formatted as usual.
      // This feature is currently not used anywhere and is here
      // just for providing the ultimate customization point
      // in case anyone would ever need that. Prefer using
      // `steps[step].format(value, locale)` instead.
      //

      if (style.custom) {
        var custom = style.custom({
          now: now,
          date: new Date(timestamp),
          time: timestamp,
          elapsed: secondsPassed,
          locale: this.locale
        });

        if (custom !== undefined) {
          // Won't return `timeToNextUpdate` here
          // because `custom()` seems deprecated.
          return custom;
        }
      } // Get the list of available time interval units.


      var units = getTimeIntervalMeasurementUnits( // Controlling `style.steps` through `style.units` seems to be deprecated:
      // create a new custom `style` instead.
      style.units, labels, nowLabel); // // If no available time unit is suitable, just output an empty string.
      // if (units.length === 0) {
      // 	console.error(`None of the "${units.join(', ')}" time units have been found in "${labelsType}" labels for "${this.locale}" locale.`)
      // 	return ''
      // }

      var round = options.round || style.round; // Choose the appropriate time measurement unit
      // and get the corresponding rounded time amount.

      var _getStep = (0, _getStep3.default)( // "gradation" is a legacy name for "steps".
      // For historical reasons, "approximate" steps are used by default.
      // In the next major version, there'll be no default for `steps`.
      style.gradation || style.steps || _roundMinute.default.steps, secondsPassed, {
        now: now,
        units: units,
        round: round,
        future: future,
        getNextStep: true
      }),
          _getStep2 = _slicedToArray(_getStep, 3),
          prevStep = _getStep2[0],
          step = _getStep2[1],
          nextStep = _getStep2[2];

      var formattedDate = this.formatDateForStep(timestamp, step, secondsPassed, {
        labels: labels,
        labelsType: labelsType,
        nowLabel: nowLabel,
        now: now,
        future: future,
        round: round
      }) || '';

      if (options.getTimeToNextUpdate) {
        var timeToNextUpdate = (0, _getTimeToNextUpdate.default)(timestamp, step, {
          nextStep: nextStep,
          prevStep: prevStep,
          now: now,
          future: future,
          round: round
        });
        return [formattedDate, timeToNextUpdate];
      }

      return formattedDate;
    }
  }, {
    key: "formatDateForStep",
    value: function formatDateForStep(timestamp, step, secondsPassed, _ref2) {
      var _this = this;

      var labels = _ref2.labels,
          labelsType = _ref2.labelsType,
          nowLabel = _ref2.nowLabel,
          now = _ref2.now,
          future = _ref2.future,
          round = _ref2.round;

      // If no step matches, then output an empty string.
      if (!step) {
        return;
      }

      if (step.format) {
        return step.format(timestamp, this.locale, {
          formatAs: function formatAs(unit, value) {
            // Mimicks `Intl.RelativeTimeFormat.format()`.
            return _this.formatValue(value, unit, {
              labels: labels,
              future: future
            });
          },
          now: now,
          future: future
        });
      } // "unit" is now called "formatAs".


      var unit = step.unit || step.formatAs;

      if (!unit) {
        throw new Error("[javascript-time-ago] Each step must define either `formatAs` or `format()`. Step: ".concat(JSON.stringify(step)));
      } // `Intl.RelativeTimeFormat` doesn't operate in "now" units.
      // Therefore, threat "now" as a special case.


      if (unit === 'now') {
        return nowLabel;
      } // Amount in units.


      var amount = Math.abs(secondsPassed) / (0, _getStepDenominator.default)(step); // Apply granularity to the time amount
      // (and fallback to the previous step
      //  if the first level of granularity
      //  isn't met by this amount)
      //
      // `granularity` — (advanced) Time interval value "granularity".
      // For example, it could be set to `5` for minutes to allow only 5-minute increments
      // when formatting time intervals: `0 minutes`, `5 minutes`, `10 minutes`, etc.
      // Perhaps this feature will be removed because there seem to be no use cases
      // of it in the real world.
      //

      if (step.granularity) {
        // Recalculate the amount of seconds passed based on granularity
        amount = (0, _round.getRoundFunction)(round)(amount / step.granularity) * step.granularity;
      }

      var valueForFormatting = -1 * Math.sign(secondsPassed) * (0, _round.getRoundFunction)(round)(amount); // By default, this library formats a `0` in "past" mode,
      // unless `future: true` option is passed.
      // This is different to `relative-time-format`'s behavior
      // which formats a `0` in "future" mode by default, unless it's a `-0`.
      // So, convert `0` to `-0` if `future: true` option wasn't passed.
      // `=== 0` matches both `0` and `-0`.

      if (valueForFormatting === 0) {
        if (future) {
          valueForFormatting = 0;
        } else {
          valueForFormatting = -0;
        }
      }

      switch (labelsType) {
        case 'long':
        case 'short':
        case 'narrow':
          // Format the amount using `Intl.RelativeTimeFormat`.
          return this.getFormatter(labelsType).format(valueForFormatting, unit);

        default:
          // Format the amount.
          // (mimicks `Intl.RelativeTimeFormat` behavior for other time label styles)
          return this.formatValue(valueForFormatting, unit, {
            labels: labels,
            future: future
          });
      }
    }
    /**
     * Mimicks what `Intl.RelativeTimeFormat` does for additional locale styles.
     * @param  {number} value
     * @param  {string} unit
     * @param  {object} options.labels — Relative time labels.
     * @param  {boolean} [options.future] — Tells how to format value `0`: as "future" (`true`) or "past" (`false`). Is `false` by default, but should have been `true` actually.
     * @return {string}
     */

  }, {
    key: "formatValue",
    value: function formatValue(value, unit, _ref3) {
      var labels = _ref3.labels,
          future = _ref3.future;
      return this.getFormattingRule(labels, unit, value, {
        future: future
      }).replace('{0}', this.formatNumber(Math.abs(value)));
    }
    /**
     * Returns formatting rule for `value` in `units` (either in past or in future).
     * @param {object} formattingRules — Relative time labels for different units.
     * @param {string} unit - Time interval measurement unit.
     * @param {number} value - Time interval value.
     * @param  {boolean} [options.future] — Tells how to format value `0`: as "future" (`true`) or "past" (`false`). Is `false` by default.
     * @return {string}
     * @example
     * // Returns "{0} days ago"
     * getFormattingRule(en.long, "day", -2, 'en')
     */

  }, {
    key: "getFormattingRule",
    value: function getFormattingRule(formattingRules, unit, value, _ref4) {
      var future = _ref4.future;
      // Passing the language is required in order to
      // be able to correctly classify the `value` as a number.
      var locale = this.locale;
      formattingRules = formattingRules[unit]; // Check for a special "compacted" rules case:
      // if formatting rules are the same for "past" and "future",
      // and also for all possible `value`s, then those rules are
      // stored as a single string.

      if (typeof formattingRules === 'string') {
        return formattingRules;
      } // Choose either "past" or "future" based on time `value` sign.
      // If "past" is same as "future" then they're stored as "other".
      // If there's only "other" then it's being collapsed.


      var pastOrFuture = value === 0 ? future ? 'future' : 'past' : value < 0 ? 'past' : 'future';
      var quantifierRules = formattingRules[pastOrFuture] || formattingRules; // Bundle size optimization technique.

      if (typeof quantifierRules === 'string') {
        return quantifierRules;
      } // Quantify `value`.


      var quantifier = this.getPluralRules().select(Math.abs(value)); // "other" rule is supposed to always be present.
      // If only "other" rule is present then "rules" is not an object and is a string.

      return quantifierRules[quantifier] || quantifierRules.other;
    }
    /**
     * Formats a number into a string.
     * Uses `Intl.NumberFormat` when available.
     * @param  {number} number
     * @return {string}
     */

  }, {
    key: "formatNumber",
    value: function formatNumber(number) {
      return this.numberFormat ? this.numberFormat.format(number) : String(number);
    }
    /**
     * Returns an `Intl.RelativeTimeFormat` for a given `labelsType`.
     * @param {string} labelsType
     * @return {object} `Intl.RelativeTimeFormat` instance
     */

  }, {
    key: "getFormatter",
    value: function getFormatter(labelsType) {
      // `Intl.RelativeTimeFormat` instance creation is (hypothetically) assumed
      // a lengthy operation so the instances are cached and reused.
      return this.relativeTimeFormatCache.get(this.locale, labelsType) || this.relativeTimeFormatCache.put(this.locale, labelsType, new this.IntlRelativeTimeFormat(this.locale, {
        style: labelsType
      }));
    }
    /**
     * Returns an `Intl.PluralRules` instance.
     * @return {object} `Intl.PluralRules` instance
     */

  }, {
    key: "getPluralRules",
    value: function getPluralRules() {
      // `Intl.PluralRules` instance creation is (hypothetically) assumed
      // a lengthy operation so the instances are cached and reused.
      return this.pluralRulesCache.get(this.locale) || this.pluralRulesCache.put(this.locale, new this.IntlPluralRules(this.locale));
    }
    /**
     * Gets localized labels for this type of labels.
     *
     * @param {(string|string[])} labelsType - Relative date/time labels type.
     *                                     If it's an array then all label types are tried
     *                                     until a suitable one is found.
     *
     * @returns {Object} Returns an object of shape { labelsType, labels }
     */

  }, {
    key: "getLabels",
    value: function getLabels() {
      var labelsType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      // Convert `labels` to an array.
      if (typeof labelsType === 'string') {
        labelsType = [labelsType];
      } // Supports legacy "tiny" and "mini-time" label styles.


      labelsType = labelsType.map(function (labelsType) {
        switch (labelsType) {
          case 'tiny':
          case 'mini-time':
            return 'mini';

          default:
            return labelsType;
        }
      }); // "long" labels type is the default one.
      // (it's always present for all languages)

      labelsType = labelsType.concat('long'); // Find a suitable labels type.

      var localeData = (0, _LocaleDataStore.getLocaleData)(this.locale);

      for (var _iterator = labelsType, _isArray = Array.isArray(_iterator), _i2 = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref5;

        if (_isArray) {
          if (_i2 >= _iterator.length) break;
          _ref5 = _iterator[_i2++];
        } else {
          _i2 = _iterator.next();
          if (_i2.done) break;
          _ref5 = _i2.value;
        }

        var _labelsType = _ref5;

        if (localeData[_labelsType]) {
          return {
            labelsType: _labelsType,
            labels: localeData[_labelsType]
          };
        }
      }
    }
  }]);

  return TimeAgo;
}();
/**
 * Default locale global variable.
 */


exports.default = TimeAgo;
var defaultLocale = 'en';
/**
 * Gets default locale.
 * @return  {string} locale
 */

TimeAgo.getDefaultLocale = function () {
  return defaultLocale;
};
/**
 * Sets default locale.
 * @param  {string} locale
 */


TimeAgo.setDefaultLocale = function (locale) {
  return defaultLocale = locale;
};
/**
 * Adds locale data for a specific locale.
 * @param {Object} localeData
 */


TimeAgo.addDefaultLocale = function (localeData) {
  if (defaultLocaleHasBeenSpecified) {
    return console.error('[javascript-time-ago] `TimeAgo.addDefaultLocale()` can only be called once. To add other locales, use `TimeAgo.addLocale()`.');
  }

  defaultLocaleHasBeenSpecified = true;
  TimeAgo.setDefaultLocale(localeData.locale);
  TimeAgo.addLocale(localeData);
};

var defaultLocaleHasBeenSpecified;
/**
 * Adds locale data for a specific locale.
 * @param {Object} localeData
 */

TimeAgo.addLocale = function (localeData) {
  (0, _LocaleDataStore.addLocaleData)(localeData);

  _relativeTimeFormat.default.addLocale(localeData);
};
/**
 * (legacy alias)
 * Adds locale data for a specific locale.
 * @param {Object} localeData
 * @deprecated
 */


TimeAgo.locale = TimeAgo.addLocale;
/**
 * Adds custom labels to locale data.
 * @param {string} locale
 * @param {string} name
 * @param {object} labels
 */

TimeAgo.addLabels = function (locale, name, labels) {
  var localeData = (0, _LocaleDataStore.getLocaleData)(locale);

  if (!localeData) {
    (0, _LocaleDataStore.addLocaleData)({
      locale: locale
    });
    localeData = (0, _LocaleDataStore.getLocaleData)(locale); // throw new Error(`[javascript-time-ago] No data for locale "${locale}"`)
  }

  localeData[name] = labels;
}; // Normalizes `.format()` `time` argument.


function getTimestamp(input) {
  if (input.constructor === Date || isMockedDate(input)) {
    return input.getTime();
  }

  if (typeof input === 'number') {
    return input;
  } // For some weird reason istanbul doesn't see this `throw` covered.

  /* istanbul ignore next */


  throw new Error("Unsupported relative time formatter input: ".concat(_typeof(input), ", ").concat(input));
} // During testing via some testing libraries `Date`s aren't actually `Date`s.
// https://github.com/catamphetamine/javascript-time-ago/issues/22


function isMockedDate(object) {
  return _typeof(object) === 'object' && typeof object.getTime === 'function';
} // Get available time interval measurement units.


function getTimeIntervalMeasurementUnits(allowedUnits, labels, nowLabel) {
  // Get all time interval measurement units that're available
  // in locale data for a given time labels style.
  var units = Object.keys(labels); // `now` unit is handled separately and is shipped in its own `now.json` file.
  // `now.json` isn't present for all locales, so it could be substituted with
  // ".second.current".
  // Add `now` unit if it's available in locale data.

  if (nowLabel) {
    units.push('now');
  } // If only a specific set of available time measurement units can be used
  // then only those units are allowed (if they're present in locale data).


  if (allowedUnits) {
    units = allowedUnits.filter(function (unit) {
      return unit === 'now' || units.indexOf(unit) >= 0;
    });
  }

  return units;
}

function getNowLabel(labels, nowLabels, longLabels, future) {
  var nowLabel = labels.now || nowLabels && nowLabels.now; // Specific "now" message form extended locale data (if present).

  if (nowLabel) {
    // Bundle size optimization technique.
    if (typeof nowLabel === 'string') {
      return nowLabel;
    } // Not handling `value === 0` as `localeData.now.current` here
    // because it wouldn't make sense: "now" is a moment,
    // so one can't possibly differentiate between a
    // "previous" moment, a "current" moment and a "next moment".
    // It can only be differentiated between "past" and "future".


    if (future) {
      return nowLabel.future;
    } else {
      return nowLabel.past;
    }
  } // Use ".second.current" as "now" message.


  if (longLabels && longLabels.second && longLabels.second.current) {
    return longLabels.second.current;
  }
}

var OBJECT_CONSTRUCTOR = {}.constructor;

function isObject(object) {
  return _typeof(object) !== undefined && object !== null && object.constructor === OBJECT_CONSTRUCTOR;
}

function isStyle(variable) {
  return typeof variable === 'string' || isStyleObject(variable);
}

function isStyleObject(object) {
  return isObject(object) && (Array.isArray(object.steps) || // `gradation` property is deprecated: it has been renamed to `steps`.
  Array.isArray(object.gradation) || // `flavour` property is deprecated: it has been renamed to `labels`.
  Array.isArray(object.flavour) || typeof object.flavour === 'string' || Array.isArray(object.labels) || typeof object.labels === 'string' || // `units` property is deprecated.
  Array.isArray(object.units) || // `custom` property is deprecated.
  typeof object.custom === 'function');
}

},{"./LocaleDataStore":56,"./cache":58,"./locale":59,"./round":60,"./steps/getStep":62,"./steps/getStepDenominator":63,"./steps/getTimeToNextUpdate":65,"./style/getStyleByName":74,"./style/roundMinute":81,"relative-time-format":96}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * A basic in-memory cache.
 *
 * import Cache from 'javascript-time-ago/Cache'
 * const cache = new Cache()
 * const object = cache.get('key1', 'key2', ...) || cache.put('key1', 'key2', ..., createObject())
 */
var Cache =
/*#__PURE__*/
function () {
  function Cache() {
    _classCallCheck(this, Cache);

    _defineProperty(this, "cache", {});
  }

  _createClass(Cache, [{
    key: "get",
    value: function get() {
      var cache = this.cache;

      for (var _len = arguments.length, keys = new Array(_len), _key = 0; _key < _len; _key++) {
        keys[_key] = arguments[_key];
      }

      for (var _i = 0; _i < keys.length; _i++) {
        var key = keys[_i];

        if (_typeof(cache) !== 'object') {
          return;
        }

        cache = cache[key];
      }

      return cache;
    }
  }, {
    key: "put",
    value: function put() {
      for (var _len2 = arguments.length, keys = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        keys[_key2] = arguments[_key2];
      }

      var value = keys.pop();
      var lastKey = keys.pop();
      var cache = this.cache;

      for (var _i2 = 0; _i2 < keys.length; _i2++) {
        var key = keys[_i2];

        if (_typeof(cache[key]) !== 'object') {
          cache[key] = {};
        }

        cache = cache[key];
      }

      return cache[lastKey] = value;
    }
  }]);

  return Cache;
}();

exports.default = Cache;

},{}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = chooseLocale;
exports.intlDateTimeFormatSupportedLocale = intlDateTimeFormatSupportedLocale;
exports.intlDateTimeFormatSupported = intlDateTimeFormatSupported;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * Chooses the most appropriate locale
 * (one of the registered ones)
 * based on the list of preferred `locales` supplied by the user.
 *
 * @param {string[]} locales - the list of preferable locales (in [IETF format](https://en.wikipedia.org/wiki/IETF_language_tag)).
 * @param {Function} isLocaleDataAvailable - tests if a locale is available.
 *
 * @returns {string} The most suitable locale.
 *
 * @example
 * // Returns 'en'
 * chooseLocale(['en-US'], undefined, (locale) => locale === 'ru' || locale === 'en')
 */
function chooseLocale(locales, isLocaleDataAvailable) {
  // This is not an intelligent algorithm,
  // but it will do for this library's case.
  // `sr-Cyrl-BA` -> `sr-Cyrl` -> `sr`.
  for (var _iterator = locales, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    var _ref;

    if (_isArray) {
      if (_i >= _iterator.length) break;
      _ref = _iterator[_i++];
    } else {
      _i = _iterator.next();
      if (_i.done) break;
      _ref = _i.value;
    }

    var locale = _ref;

    if (isLocaleDataAvailable(locale)) {
      return locale;
    }

    var parts = locale.split('-');

    while (parts.length > 1) {
      parts.pop();
      locale = parts.join('-');

      if (isLocaleDataAvailable(locale)) {
        return locale;
      }
    }
  }

  throw new Error("No locale data has been registered for any of the locales: ".concat(locales.join(', ')));
}
/**
 * Whether can use `Intl.DateTimeFormat` for these `locales`.
 * Returns the first suitable one.
 * @param  {(string|string[])} locales
 * @return {?string} The first locale that can be used.
 */


function intlDateTimeFormatSupportedLocale(locales) {
  /* istanbul ignore else */
  if (intlDateTimeFormatSupported()) {
    return Intl.DateTimeFormat.supportedLocalesOf(locales)[0];
  }
}
/**
 * Whether can use `Intl.DateTimeFormat`.
 * @return {boolean}
 */


function intlDateTimeFormatSupported() {
  // Babel transforms `typeof` into some "branches"
  // so istanbul will show this as "branch not covered".

  /* istanbul ignore next */
  var isIntlAvailable = (typeof Intl === "undefined" ? "undefined" : _typeof(Intl)) === 'object';
  return isIntlAvailable && typeof Intl.DateTimeFormat === 'function';
}

},{}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRoundFunction = getRoundFunction;
exports.getDiffRatioToNextRoundedNumber = getDiffRatioToNextRoundedNumber;

function getRoundFunction(round) {
  switch (round) {
    case 'floor':
      return Math.floor;

    default:
      return Math.round;
  }
} // For non-negative numbers.


function getDiffRatioToNextRoundedNumber(round) {
  switch (round) {
    case 'floor':
      // Math.floor(x) = x
      // Math.floor(x + 1) = x + 1
      return 1;

    default:
      // Math.round(x) = x
      // Math.round(x + 0.5) = x + 1
      return 0.5;
  }
}

},{}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _units = require("./units");

// "factor" is a legacy property.
// Developers shouldn't need to use it in their custom steps.
// "threshold" is a legacy name of "min".
// Developers should use "min" property name instead of "threshold".
// "threshold_for_idOrUnit: value" is a legacy way of specifying "min: { id: value }".
// Developers should use "min" property instead of "threshold".
// just now
// 1 minute ago
// 2 minutes ago
// 5 minutes ago
// 10 minutes ago
// 15 minutes ago
// 20 minutes ago
// …
// 50 minutes ago
// an hour ago
// 2 hours ago
// …
// 20 hours ago
// a day ago
// 2 days ago
// 5 days ago
// a week ago
// 2 weeks ago
// 3 weeks ago
// a month ago
// 2 months ago
// 4 months ago
// a year ago
// 2 years ago
// …
var _default = [{
  // This step returns the amount of seconds
  // by dividing the amount of seconds by `1`.
  factor: 1,
  // "now" labels are used for formatting the output.
  unit: 'now'
}, {
  // When the language doesn't support `now` unit,
  // the first step is ignored, and it uses this `second` unit.
  threshold: 1,
  // `threshold_for_now` should be the same as `threshold` on minutes.
  threshold_for_now: 45.5,
  // This step returns the amount of seconds
  // by dividing the amount of seconds by `1`.
  factor: 1,
  // "second" labels are used for formatting the output.
  unit: 'second'
}, {
  // `threshold` should be the same as `threshold_for_now` on seconds.
  threshold: 45.5,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in a minute.
  factor: _units.minute,
  // "minute" labels are used for formatting the output.
  unit: 'minute'
}, {
  // This step is effective starting from 2.5 minutes.
  threshold: 2.5 * _units.minute,
  // Allow only 5-minute increments of minutes starting from 2.5 minutes.
  // `granularity` — (advanced) Time interval value "granularity".
  // For example, it could be set to `5` for minutes to allow only 5-minute increments
  // when formatting time intervals: `0 minutes`, `5 minutes`, `10 minutes`, etc.
  // Perhaps this feature will be removed because there seem to be no use cases
  // of it in the real world.
  granularity: 5,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in a minute.
  factor: _units.minute,
  // "minute" labels are used for formatting the output.
  unit: 'minute'
}, {
  // This step is effective starting from 22.5 minutes.
  threshold: 22.5 * _units.minute,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in  half-an-hour.
  factor: 0.5 * _units.hour,
  // "half-hour" labels are used for formatting the output.
  // (if available, which is no longer the case)
  unit: 'half-hour'
}, {
  // This step is effective starting from 42.5 minutes.
  threshold: 42.5 * _units.minute,
  threshold_for_minute: 52.5 * _units.minute,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in an hour.
  factor: _units.hour,
  // "hour" labels are used for formatting the output.
  unit: 'hour'
}, {
  // This step is effective starting from 20.5 hours.
  threshold: 20.5 / 24 * _units.day,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in a day.
  factor: _units.day,
  // "day" labels are used for formatting the output.
  unit: 'day'
}, {
  // This step is effective starting from 5.5 days.
  threshold: 5.5 * _units.day,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in a week.
  factor: _units.week,
  // "week" labels are used for formatting the output.
  unit: 'week'
}, {
  // This step is effective starting from 3.5 weeks.
  threshold: 3.5 * _units.week,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in a month.
  factor: _units.month,
  // "month" labels are used for formatting the output.
  unit: 'month'
}, {
  // This step is effective starting from 10.5 months.
  threshold: 10.5 * _units.month,
  // Return the amount of minutes by dividing the amount
  // of seconds by the amount of seconds in a year.
  factor: _units.year,
  // "year" labels are used for formatting the output.
  unit: 'year'
}];
exports.default = _default;

},{"./units":71}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getStep;

var _getStepDenominator = _interopRequireDefault(require("./getStepDenominator"));

var _getStepMinTime = _interopRequireDefault(require("./getStepMinTime"));

var _round = require("../round");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Finds an appropriate `step` of `steps` for the time interval (in seconds).
 *
 * @param {Object[]} steps - Time formatting steps.
 *
 * @param {number} secondsPassed - Time interval (in seconds).
 *                                 `< 0` for past dates and `> 0` for future dates.
 *
 * @param {number} options.now - Current timestamp.
 *
 * @param {boolean} [options.future] - Whether the date should be formatted as a future one
 *                                     instead of a past one.
 *
 * @param {string} [options.round] - (undocumented) Rounding mechanism.
 *
 * @param {string[]} [options.units] - A list of allowed time units.
 *                                     (Example: ['second', 'minute', 'hour', …])
 *
 * @param {boolean} [options.getNextStep] - Pass true to return `[step, nextStep]` instead of just `step`.
 *
 * @return {Object|Object[]} [step] — Either a `step` or `[prevStep, step, nextStep]`.
 */
function getStep(steps, secondsPassed, _ref) {
  var now = _ref.now,
      future = _ref.future,
      round = _ref.round,
      units = _ref.units,
      getNextStep = _ref.getNextStep;
  // Ignore steps having not-supported time units in `formatAs`.
  steps = filterStepsByUnits(steps, units);

  var step = _getStep(steps, secondsPassed, {
    now: now,
    future: future,
    round: round
  });

  if (getNextStep) {
    if (step) {
      var prevStep = steps[steps.indexOf(step) - 1];
      var nextStep = steps[steps.indexOf(step) + 1];
      return [prevStep, step, nextStep];
    }

    return [undefined, undefined, steps[0]];
  }

  return step;
}

function _getStep(steps, secondsPassed, _ref2) {
  var now = _ref2.now,
      future = _ref2.future,
      round = _ref2.round;

  // If no steps fit the conditions then return nothing.
  if (steps.length === 0) {
    return;
  } // Find the most appropriate step.


  var i = getStepIndex(steps, secondsPassed, {
    now: now,
    future: future || secondsPassed < 0,
    round: round
  }); // If no step is applicable the return nothing.

  if (i === -1) {
    return;
  }

  var step = steps[i]; // Apply granularity to the time amount
  // (and fall back to the previous step
  //  if the first level of granularity
  //  isn't met by this amount)

  if (step.granularity) {
    // Recalculate the amount of seconds passed based on `granularity`.
    var secondsPassedGranular = (0, _round.getRoundFunction)(round)(Math.abs(secondsPassed) / (0, _getStepDenominator.default)(step) / step.granularity) * step.granularity; // If the granularity for this step is too high,
    // then fall back to the previous step.
    // (if there is any previous step)

    if (secondsPassedGranular === 0 && i > 0) {
      return steps[i - 1];
    }
  }

  return step;
}
/**
 * Iterates through steps until it finds the maximum one satisfying the `minTime` threshold.
 * @param  {Object} steps - Steps.
 * @param  {number} secondsPassed - How much seconds have passed since the date till `now`.
 * @param  {number} options.now - Current timestamp.
 * @param  {boolean} options.future - Whether the time interval should be formatted as a future one.
 * @param  {number} [i] - Gradation step currently being tested.
 * @return {number} Gradation step index.
 */


function getStepIndex(steps, secondsPassed, options) {
  var i = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var minTime = (0, _getStepMinTime.default)(steps[i], _objectSpread({
    prevStep: steps[i - 1],
    timestamp: options.now - secondsPassed * 1000
  }, options)); // If `minTime` isn't defined or deduceable for this step, then stop.

  if (minTime === undefined) {
    return i - 1;
  } // If the `minTime` threshold for moving from previous step
  // to this step is too high then return the previous step.


  if (Math.abs(secondsPassed) < minTime) {
    return i - 1;
  } // If it's the last step then return it.


  if (i === steps.length - 1) {
    return i;
  } // Move to the next step.


  return getStepIndex(steps, secondsPassed, options, i + 1);
}
/**
 * Leaves only allowed steps.
 * @param  {Object[]} steps
 * @param  {string[]} units - Allowed time units.
 * @return {Object[]}
 */


function filterStepsByUnits(steps, units) {
  return steps.filter(function (_ref3) {
    var unit = _ref3.unit,
        formatAs = _ref3.formatAs;
    // "unit" is now called "formatAs".
    unit = unit || formatAs; // If this step has a `unit` defined
    // then this `unit` must be in the list of allowed `units`.

    if (unit) {
      return units.indexOf(unit) >= 0;
    } // A step is not required to specify a `unit`:
    // alternatively, it could specify `format()`.
    // (see "twitter" style for an example)


    return true;
  });
}

},{"../round":60,"./getStepDenominator":63,"./getStepMinTime":64}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getStepDenominator;

var _units = require("./units");

function getStepDenominator(step) {
  // `factor` is a legacy property.
  if (step.factor !== undefined) {
    return step.factor;
  } // "unit" is now called "formatAs".


  return (0, _units.getSecondsInUnit)(step.unit || step.formatAs) || 1;
}

},{"./units":71}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getStepMinTime;

var _units = require("./units");

var _round = require("../round");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function getStepMinTime(step, _ref) {
  var prevStep = _ref.prevStep,
      timestamp = _ref.timestamp,
      now = _ref.now,
      future = _ref.future,
      round = _ref.round;
  var minTime; // "threshold_for_xxx" is a legacy property.

  if (prevStep) {
    if (prevStep.id || prevStep.unit) {
      minTime = step["threshold_for_".concat(prevStep.id || prevStep.unit)];
    }
  }

  if (minTime === undefined) {
    // "threshold" is a legacy property.
    if (step.threshold !== undefined) {
      // "threshold" is a legacy name for "minTime".
      minTime = step.threshold; // "threshold" function is deprecated.

      if (typeof minTime === 'function') {
        minTime = minTime(now, future);
      }
    }
  }

  if (minTime === undefined) {
    minTime = step.minTime;
  } // A deprecated way of specifying a different threshold
  // depending on the previous step's unit.


  if (_typeof(minTime) === 'object') {
    if (prevStep && prevStep.id && minTime[prevStep.id] !== undefined) {
      minTime = minTime[prevStep.id];
    } else {
      minTime = minTime.default;
    }
  }

  if (typeof minTime === 'function') {
    minTime = minTime(timestamp, {
      future: future,
      getMinTimeForUnit: function getMinTimeForUnit(toUnit, fromUnit) {
        return _getMinTimeForUnit(toUnit, fromUnit || prevStep && prevStep.formatAs, {
          round: round
        });
      }
    });
  } // Evaluate the `test()` function.
  // `test()` function is deprecated.


  if (minTime === undefined) {
    if (step.test) {
      if (step.test(timestamp, {
        now: now,
        future: future
      })) {
        // `0` threshold always passes.
        minTime = 0;
      } else {
        // `MAX_SAFE_INTEGER` threshold won't ever pass in real life.
        minTime = 9007199254740991; // Number.MAX_SAFE_INTEGER
      }
    }
  }

  if (minTime === undefined) {
    if (prevStep) {
      if (step.formatAs && prevStep.formatAs) {
        minTime = _getMinTimeForUnit(step.formatAs, prevStep.formatAs, {
          round: round
        });
      }
    } else {
      // The first step's `minTime` is `0` by default.
      minTime = 0;
    }
  } // Warn if no `minTime` was defined or could be deduced.


  if (minTime === undefined) {
    console.warn('[javascript-time-ago] A step should specify `minTime`:\n' + JSON.stringify(step, null, 2));
  }

  return minTime;
}

function _getMinTimeForUnit(toUnit, fromUnit, _ref2) {
  var round = _ref2.round;
  var toUnitAmount = (0, _units.getSecondsInUnit)(toUnit); // if (!fromUnit) {
  // 	return toUnitAmount;
  // }
  // if (!fromUnit) {
  // 	fromUnit = getPreviousUnitFor(toUnit)
  // }

  var fromUnitAmount;

  if (fromUnit === 'now') {
    fromUnitAmount = (0, _units.getSecondsInUnit)(toUnit);
  } else {
    fromUnitAmount = (0, _units.getSecondsInUnit)(fromUnit);
  }

  if (toUnitAmount !== undefined && fromUnitAmount !== undefined) {
    return toUnitAmount - fromUnitAmount * (1 - (0, _round.getDiffRatioToNextRoundedNumber)(round));
  }
}

},{"../round":60,"./units":71}],65:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getTimeToNextUpdate;
exports.getStepChangesAt = getStepChangesAt;
exports.getTimeToStepChange = getTimeToStepChange;
exports.INFINITY = void 0;

var _getTimeToNextUpdateForUnit2 = _interopRequireDefault(require("./getTimeToNextUpdateForUnit"));

var _getStepMinTime = _interopRequireDefault(require("./getStepMinTime"));

var _round = require("../round");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// A thousand years is practically a metaphor for "infinity".
var YEAR = 365 * 24 * 60 * 60 * 1000;
var INFINITY = 1000 * YEAR;
/**
 * Gets the time to next update for a date and a step.
 * @param  {number} date — The date passed to `.format()`, converted to a timestamp.
 * @param  {object} step
 * @param  {object} [options.previousStep]
 * @param  {object} [options.nextStep]
 * @param  {number} options.now
 * @param  {boolean} options.future
 * @param  {string} [options.round] - (undocumented) Rounding mechanism.
 * @return {number} [timeToNextUpdate]
 */

exports.INFINITY = INFINITY;

function getTimeToNextUpdate(date, step, _ref) {
  var prevStep = _ref.prevStep,
      nextStep = _ref.nextStep,
      now = _ref.now,
      future = _ref.future,
      round = _ref.round;
  var timestamp = date.getTime ? date.getTime() : date;

  var getTimeToNextUpdateForUnit = function getTimeToNextUpdateForUnit(unit) {
    return (0, _getTimeToNextUpdateForUnit2.default)(unit, timestamp, {
      now: now,
      round: round
    });
  }; // For future dates, steps move from the last one to the first one,
  // while for past dates, steps move from the first one to the last one,
  // due to the fact that time flows in one direction,
  // and future dates' interval naturally becomes smaller
  // while past dates' interval naturally grows larger.
  //
  // For future dates, it's the transition
  // from the current step to the previous step,
  // therefore check the `minTime` of the current step.
  //
  // For past dates, it's the transition
  // from the current step to the next step,
  // therefore check the `minTime` of the next step.
  //


  var timeToStepChange = getTimeToStepChange(future ? step : nextStep, timestamp, {
    future: future,
    now: now,
    round: round,
    prevStep: future ? prevStep : step // isFirstStep: future && isFirstStep

  });

  if (timeToStepChange === undefined) {
    // Can't reliably determine "time to next update"
    // if not all of the steps provide `minTime`.
    return;
  }

  var timeToNextUpdate;

  if (step) {
    if (step.getTimeToNextUpdate) {
      timeToNextUpdate = step.getTimeToNextUpdate(timestamp, {
        getTimeToNextUpdateForUnit: getTimeToNextUpdateForUnit,
        getRoundFunction: _round.getRoundFunction,
        now: now,
        future: future,
        round: round
      });
    }

    if (timeToNextUpdate === undefined) {
      // "unit" is now called "formatAs".
      var unit = step.unit || step.formatAs;

      if (unit) {
        // For some units, like "now", there's no defined amount of seconds in them.
        // In such cases, `getTimeToNextUpdateForUnit()` returns `undefined`,
        // and the next step's `minTime` could be used to calculate the update interval:
        // it will just assume that the label never changes for this step.
        timeToNextUpdate = getTimeToNextUpdateForUnit(unit);
      }
    }
  }

  if (timeToNextUpdate === undefined) {
    return timeToStepChange;
  }

  return Math.min(timeToNextUpdate, timeToStepChange);
}

function getStepChangesAt(currentOrNextStep, timestamp, _ref2) {
  var now = _ref2.now,
      future = _ref2.future,
      round = _ref2.round,
      prevStep = _ref2.prevStep;
  // The first step's `minTime` is `0` by default.
  // It doesn't "change" steps at zero point
  // but it does change the wording when switching
  // from "future" to "past": "in ..." -> "... ago".
  // Therefore, the label should be updated at zero-point too.
  var minTime = (0, _getStepMinTime.default)(currentOrNextStep, {
    timestamp: timestamp,
    now: now,
    future: future,
    round: round,
    prevStep: prevStep
  });

  if (minTime === undefined) {
    return;
  }

  if (future) {
    // The step changes to the previous step
    // as soon as `timestamp - now` becomes
    // less than the `minTime` of the current step:
    // `timestamp - now === minTime - 1`
    // => `now === timestamp - minTime + 1`.
    return timestamp - minTime * 1000 + 1;
  } else {
    // The step changes to the next step
    // as soon as `now - timestamp` becomes
    // equal to `minTime` of the next step:
    // `now - timestamp === minTime`
    // => `now === timestamp + minTime`.
    // This is a special case when double-update could be skipped.
    if (minTime === 0 && timestamp === now) {
      return INFINITY;
    }

    return timestamp + minTime * 1000;
  }
}

function getTimeToStepChange(step, timestamp, _ref3) {
  var now = _ref3.now,
      future = _ref3.future,
      round = _ref3.round,
      prevStep = _ref3.prevStep;

  if (step) {
    var stepChangesAt = getStepChangesAt(step, timestamp, {
      now: now,
      future: future,
      round: round,
      prevStep: prevStep
    });

    if (stepChangesAt === undefined) {
      return;
    }

    return stepChangesAt - now;
  } else {
    if (future) {
      // No step.
      // Update right after zero point, when it changes from "future" to "past".
      return timestamp - now + 1;
    } else {
      // The last step doesn't ever change when `date` is in the past.
      return INFINITY;
    }
  }
}

},{"../round":60,"./getStepMinTime":64,"./getTimeToNextUpdateForUnit":66}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getTimeToNextUpdateForUnit;

var _units = require("./units");

var _round = require("../round");

/**
 * Gets the time to next update for a step with a time unit defined.
 * @param  {string} unit
 * @param  {number} date — The date passed to `.format()`, converted to a timestamp.
 * @param  {number} options.now
 * @param  {string} [options.round] — (undocumented) Rounding mechanism.
 * @return {number} [timeToNextUpdate]
 */
function getTimeToNextUpdateForUnit(unit, timestamp, _ref) {
  var now = _ref.now,
      round = _ref.round;

  // For some units, like "now", there's no defined amount of seconds in them.
  if (!(0, _units.getSecondsInUnit)(unit)) {
    // If there's no amount of seconds defined for this unit
    // then the update interval can't be determined reliably.
    return;
  }

  var unitDenominator = (0, _units.getSecondsInUnit)(unit) * 1000;
  var future = timestamp > now;
  var preciseAmount = Math.abs(timestamp - now);
  var roundedAmount = (0, _round.getRoundFunction)(round)(preciseAmount / unitDenominator) * unitDenominator;

  if (future) {
    if (roundedAmount > 0) {
      // Amount decreases with time.
      return preciseAmount - roundedAmount + getDiffToPreviousRoundedNumber(round, unitDenominator);
    } else {
      // Refresh right after the zero point,
      // when "future" changes to "past".
      return preciseAmount - roundedAmount + 1;
    }
  } // Amount increases with time.


  return -(preciseAmount - roundedAmount) + getDiffToNextRoundedNumber(round, unitDenominator);
}

function getDiffToNextRoundedNumber(round, unitDenominator) {
  return (0, _round.getDiffRatioToNextRoundedNumber)(round) * unitDenominator;
}

function getDiffToPreviousRoundedNumber(round, unitDenominator) {
  return (1 - (0, _round.getDiffRatioToNextRoundedNumber)(round)) * unitDenominator + 1;
}

},{"../round":60,"./units":71}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDate = getDate;

// Looks like this one's deprecated.
// /**
//  * Returns a step corresponding to the unit.
//  * @param  {Object[]} steps
//  * @param  {string} unit
//  * @return {?Object}
//  */
// export function getStepForUnit(steps, unit) {
// 	for (const step of steps) {
// 		if (step.unit === unit) {
// 			return step
// 		}
// 	}
// }
// Looks like this one won't be used in the next major version.

/**
 * Converts value to a `Date`
 * @param {(number|Date)} value
 * @return {Date}
 */
function getDate(value) {
  return value instanceof Date ? value : new Date(value);
}

},{}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "approximate", {
  enumerable: true,
  get: function get() {
    return _approximate.default;
  }
});
Object.defineProperty(exports, "convenient", {
  enumerable: true,
  get: function get() {
    return _approximate.default;
  }
});
Object.defineProperty(exports, "round", {
  enumerable: true,
  get: function get() {
    return _round.default;
  }
});
Object.defineProperty(exports, "canonical", {
  enumerable: true,
  get: function get() {
    return _round.default;
  }
});
Object.defineProperty(exports, "minute", {
  enumerable: true,
  get: function get() {
    return _units.minute;
  }
});
Object.defineProperty(exports, "hour", {
  enumerable: true,
  get: function get() {
    return _units.hour;
  }
});
Object.defineProperty(exports, "day", {
  enumerable: true,
  get: function get() {
    return _units.day;
  }
});
Object.defineProperty(exports, "week", {
  enumerable: true,
  get: function get() {
    return _units.week;
  }
});
Object.defineProperty(exports, "month", {
  enumerable: true,
  get: function get() {
    return _units.month;
  }
});
Object.defineProperty(exports, "year", {
  enumerable: true,
  get: function get() {
    return _units.year;
  }
});
Object.defineProperty(exports, "getDate", {
  enumerable: true,
  get: function get() {
    return _helpers.getDate;
  }
});

var _approximate = _interopRequireDefault(require("./approximate"));

var _round = _interopRequireDefault(require("./round"));

var _units = require("./units");

var _helpers = require("./helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

},{"./approximate":61,"./helpers":67,"./round":70,"./units":71}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// This function is only used for backwards compatibility
// with legacy code that uses the older versions of this library.
function _default(step_) {
  var step = _objectSpread({}, step_);

  if (step.minTime !== undefined) {
    if (_typeof(step.minTime) === 'object') {
      var _arr = Object.keys(step.minTime);

      for (var _i = 0; _i < _arr.length; _i++) {
        var key = _arr[_i];

        if (key === 'default') {
          step.threshold = step.minTime.default;
        } else {
          step["threshold_for_".concat(key)] = step.minTime[key];
        }
      }
    } else {
      step.threshold = step.minTime;
    }

    delete step.minTime;
  }

  if (step.formatAs) {
    step.unit = step.formatAs;
    delete step.formatAs;
  }

  return step;
}

},{}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
// just now
// 1 second ago
// 2 seconds ago
// …
// 59 seconds ago
// 1 minute ago
// 2 minutes ago
// …
// 59 minutes ago
// 1 hour ago
// 2 hours ago
// …
// 24 hours ago
// 1 day ago
// 2 days ago
// …
// 6 days ago
// 1 week ago
// 2 weeks ago
// …
// 3 weeks ago
// 1 month ago
// 2 months ago
// …
// 11 months ago
// 1 year ago
// 2 years ago
// …
var _default = [{
  formatAs: 'now'
}, {
  formatAs: 'second'
}, {
  formatAs: 'minute'
}, {
  formatAs: 'hour'
}, {
  formatAs: 'day'
}, {
  formatAs: 'week'
}, {
  formatAs: 'month'
}, {
  formatAs: 'year'
}];
exports.default = _default;

},{}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSecondsInUnit = getSecondsInUnit;
exports.year = exports.month = exports.week = exports.day = exports.hour = exports.minute = void 0;
var minute = 60; // in seconds

exports.minute = minute;
var hour = 60 * minute; // in seconds

exports.hour = hour;
var day = 24 * hour; // in seconds

exports.day = day;
var week = 7 * day; // in seconds
// https://www.quora.com/What-is-the-average-number-of-days-in-a-month

exports.week = week;
var month = 30.44 * day; // in seconds
// "400 years have 146097 days (taking into account leap year rules)"

exports.month = month;
var year = 146097 / 400 * day; // in seconds

exports.year = year;

function getSecondsInUnit(unit) {
  switch (unit) {
    case 'second':
      return 1;

    case 'minute':
      return minute;

    case 'hour':
      return hour;

    case 'day':
      return day;

    case 'week':
      return week;

    case 'month':
      return month;

    case 'year':
      return year;
  }
} // export function getPreviousUnitFor(unit) {
// 	switch (unit) {
// 		case 'second':
// 			return 'now'
// 		case 'minute':
// 			return 'second'
// 		case 'hour':
// 			return 'minute'
// 		case 'day':
// 			return 'hour'
// 		case 'week':
// 			return 'day'
// 		case 'month':
// 			return 'week'
// 		case 'year':
// 			return 'month'
// 	}
// }

},{}],72:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _approximate = _interopRequireDefault(require("../steps/approximate"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// "gradation" is a legacy name for "steps".
// It's here just for legacy compatibility.
// Use "steps" name instead.
// "flavour" is a legacy name for "labels".
// It's here just for legacy compatibility.
// Use "labels" name instead.
// "units" is a legacy property.
// It's here just for legacy compatibility.
// Developers shouldn't need to use it in their custom styles.
var _default = {
  gradation: _approximate.default,
  flavour: 'long',
  units: ['now', 'minute', 'hour', 'day', 'week', 'month', 'year']
};
exports.default = _default;

},{"../steps/approximate":61}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _approximate = _interopRequireDefault(require("../steps/approximate"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// "gradation" is a legacy name for "steps".
// It's here just for legacy compatibility.
// Use "steps" name instead.
// "flavour" is a legacy name for "labels".
// It's here just for legacy compatibility.
// Use "labels" name instead.
// "units" is a legacy property.
// It's here just for legacy compatibility.
// Developers shouldn't need to use it in their custom styles.
// Similar to the default style but with "ago" omitted.
//
// just now
// 5 minutes
// 10 minutes
// 15 minutes
// 20 minutes
// an hour
// 2 hours
// …
// 20 hours
// 1 day
// 2 days
// a week
// 2 weeks
// 3 weeks
// a month
// 2 months
// 3 months
// 4 months
// a year
// 2 years
//
var _default = {
  gradation: _approximate.default,
  flavour: 'long-time',
  units: ['now', 'minute', 'hour', 'day', 'week', 'month', 'year']
};
exports.default = _default;

},{"../steps/approximate":61}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getStyleByName;

var _round = _interopRequireDefault(require("./round"));

var _roundMinute = _interopRequireDefault(require("./roundMinute"));

var _approximate = _interopRequireDefault(require("./approximate"));

var _approximateTime = _interopRequireDefault(require("./approximateTime"));

var _twitter = _interopRequireDefault(require("./twitter"));

var _twitterNow = _interopRequireDefault(require("./twitterNow"));

var _twitterMinute = _interopRequireDefault(require("./twitterMinute"));

var _twitterMinuteNow = _interopRequireDefault(require("./twitterMinuteNow"));

var _twitterFirstMinute = _interopRequireDefault(require("./twitterFirstMinute"));

var _mini = _interopRequireDefault(require("./mini"));

var _miniNow = _interopRequireDefault(require("./miniNow"));

var _miniMinute = _interopRequireDefault(require("./miniMinute"));

var _miniMinuteNow = _interopRequireDefault(require("./miniMinuteNow"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// `approximate` style is deprecated.
// `approximateTime` style is deprecated.
function getStyleByName(style) {
  switch (style) {
    // "default" style name is deprecated.
    case 'default':
    case 'round':
      return _round.default;

    case 'round-minute':
      return _roundMinute.default;

    case 'approximate':
      return _approximate.default;
    // "time" style name is deprecated.

    case 'time':
    case 'approximate-time':
      return _approximateTime.default;

    case 'mini':
      return _mini.default;

    case 'mini-now':
      return _miniNow.default;

    case 'mini-minute':
      return _miniMinute.default;

    case 'mini-minute-now':
      return _miniMinuteNow.default;

    case 'twitter':
      return _twitter.default;

    case 'twitter-now':
      return _twitterNow.default;

    case 'twitter-minute':
      return _twitterMinute.default;

    case 'twitter-minute-now':
      return _twitterMinuteNow.default;

    case 'twitter-first-minute':
      return _twitterFirstMinute.default;

    default:
      // For historical reasons, the default style is "approximate".
      return _approximate.default;
  }
}

},{"./approximate":72,"./approximateTime":73,"./mini":75,"./miniMinute":76,"./miniMinuteNow":77,"./miniNow":78,"./round":80,"./roundMinute":81,"./twitter":82,"./twitterFirstMinute":83,"./twitterMinute":84,"./twitterMinuteNow":85,"./twitterNow":86}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = {
  steps: [{
    formatAs: 'second'
  }, {
    formatAs: 'minute'
  }, {
    formatAs: 'hour'
  }, {
    formatAs: 'day'
  }, {
    formatAs: 'month'
  }, {
    formatAs: 'year'
  }],
  labels: [// "mini" labels are only defined for a few languages.
  'mini', // "short-time" labels are only defined for a few languages.
  'short-time', // "narrow" and "short" labels are defined for all languages.
  // "narrow" labels can sometimes be weird (like "+5d."),
  // but "short" labels have the " ago" part, so "narrow" seem
  // more appropriate.
  // "short" labels would have been more appropriate if they
  // didn't have the " ago" part, hence the "short-time" above.
  'narrow', // Since "narrow" labels are always present, "short" element
  // of this array can be removed.
  'short']
};
exports.default = _default;

},{}],76:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _mini = _interopRequireDefault(require("./mini"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _mini.default, {
  // Skip "seconds".
  steps: _mini.default.steps.filter(function (step) {
    return step.formatAs !== 'second';
  })
});

exports.default = _default;

},{"./mini":75}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _miniMinute = _interopRequireDefault(require("./miniMinute"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _miniMinute.default, {
  // Add "now".
  steps: [{
    formatAs: 'now'
  }].concat(_miniMinute.default.steps)
});

exports.default = _default;

},{"./miniMinute":76}],78:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _mini = _interopRequireDefault(require("./mini"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _mini.default, {
  // Add "now".
  steps: [{
    formatAs: 'now'
  }].concat(_mini.default.steps)
});

exports.default = _default;

},{"./mini":75}],79:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _renameLegacyProperties = _interopRequireDefault(require("../steps/renameLegacyProperties"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// This function is only used for backwards compatibility
// with legacy code that uses the older versions of this library.
function _default(style_) {
  var style = _objectSpread({}, style_);

  if (style.steps) {
    style.gradation = style.steps.map(_renameLegacyProperties.default);
    delete style.steps;
  }

  if (style.labels) {
    style.flavour = style.labels;
    delete style.labels;
  }

  return style;
}

},{"../steps/renameLegacyProperties":69}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _round = _interopRequireDefault(require("../steps/round"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// just now
// 1 second ago
// 2 seconds ago
// …
// 59 seconds ago
// 1 minute ago
// 2 minutes ago
// …
// 59 minutes ago
// 1 minute ago
// 2 minutes ago
// …
// 59 minutes ago
// 1 hour ago
// 2 hours ago
// …
// 24 hours ago
// 1 day ago
// 2 days ago
// …
// 6 days ago
// 1 week ago
// 2 weeks ago
// 3 weeks ago
// 4 weeks ago
// 1 month ago
// 2 months ago
// …
// 11 months ago
// 1 year ago
// 2 years ago
// …
//
var _default = {
  steps: _round.default,
  labels: 'long'
};
exports.default = _default;

},{"../steps/round":70}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _round = _interopRequireDefault(require("./round"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// just now
// 1 minute ago
// 2 minutes ago
// …
// 59 minutes ago
// 1 minute ago
// 2 minutes ago
// …
// 59 minutes ago
// 1 hour ago
// 2 hours ago
// …
// 24 hours ago
// 1 day ago
// 2 days ago
// …
// 6 days ago
// 1 week ago
// 2 weeks ago
// 3 weeks ago
// 4 weeks ago
// 1 month ago
// 2 months ago
// …
// 11 months ago
// 1 year ago
// 2 years ago
// …
//
var _default = _objectSpread({}, _round.default, {
  // Skip "seconds".
  steps: _round.default.steps.filter(function (step) {
    return step.formatAs !== 'second';
  })
});

exports.default = _default;

},{"./round":80}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _steps = require("../steps");

var _locale = require("../locale");

var _renameLegacyProperties = _interopRequireDefault(require("./renameLegacyProperties"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// For compatibility with the old versions of this library.
// Twitter-style relative date/time formatting.
// ("1m", "2h", "Mar 3", "Apr 4, 2012").
//
// Seconds, minutes or hours are shown for shorter intervals,
// and longer intervals are formatted using full date format.
var steps = [{
  formatAs: 'second'
}, {
  formatAs: 'minute'
}, {
  formatAs: 'hour'
}]; // A cache for `Intl.DateTimeFormat` formatters
// for various locales (is a global variable).

var formatters = {}; // Starting from day intervals, output month and day.

var monthAndDay = {
  minTime: function minTime(timestamp, _ref) {
    var future = _ref.future,
        getMinTimeForUnit = _ref.getMinTimeForUnit;
    // Returns `23.5 * 60 * 60` when `round` is "round",
    // and `24 * 60 * 60` when `round` is "floor".
    return getMinTimeForUnit('day');
  },
  format: function format(value, locale) {
    /* istanbul ignore else */
    if (!formatters[locale]) {
      formatters[locale] = {};
    }
    /* istanbul ignore else */


    if (!formatters[locale].dayMonth) {
      // "Apr 11" (MMMd)
      formatters[locale].dayMonth = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric'
      });
    } // Output month and day.


    return formatters[locale].dayMonth.format((0, _steps.getDate)(value));
  }
}; // If the `date` happened/happens outside of current year,
// then output day, month and year.
// The interval should be such that the `date` lies outside of the current year.

var yearMonthAndDay = {
  minTime: function minTime(timestamp, _ref2) {
    var future = _ref2.future;

    if (future) {
      // January 1, 00:00, of the `date`'s year is right after
      // the maximum `now` for formatting a future date:
      // When `now` is before that date, the `date` is formatted as "day/month/year" (this step),
      // When `now` is equal to or after that date, the `date` is formatted as "day/month" (another step).
      // After that, it's hours, minutes, seconds, and after that it's no longer `future`.
      // The date is right after the maximum `now` for formatting a future date,
      // so subtract 1 millisecond from it.
      var maxFittingNow = new Date(new Date(timestamp).getFullYear(), 0).getTime() - 1; // Return `minTime` (in seconds).

      return (timestamp - maxFittingNow) / 1000;
    } else {
      // January 1, 00:00, of the year following the `date`'s year
      // is the minimum `now` for formatting a past date:
      // When `now` is before that date, the `date` is formatted as "day/month" (another step),
      // When `now` is equal to or after that date, the `date` is formatted as "day/month/year" (this step).
      // After that, it's hours, minutes, seconds, and after that it's no longer `future`.
      var minFittingNow = new Date(new Date(timestamp).getFullYear() + 1, 0).getTime(); // Return `minTime` (in seconds).

      return (minFittingNow - timestamp) / 1000;
    }
  },
  format: function format(value, locale) {
    /* istanbul ignore if */
    if (!formatters[locale]) {
      formatters[locale] = {};
    }
    /* istanbul ignore else */


    if (!formatters[locale].dayMonthYear) {
      // "Apr 11, 2017" (yMMMd)
      formatters[locale].dayMonthYear = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } // Output day, month and year.


    return formatters[locale].dayMonthYear.format((0, _steps.getDate)(value));
  }
}; // If `Intl.DateTimeFormat` is supported,
// then longer time intervals will be formatted as dates.

/* istanbul ignore else */

if ((0, _locale.intlDateTimeFormatSupported)()) {
  steps.push(monthAndDay, yearMonthAndDay);
} // Otherwise, if `Intl.DateTimeFormat` is not supported,
// which could be the case when using Internet Explorer,
// then simply mimick "round" steps.
else {
    steps.push({
      formatAs: 'day'
    }, {
      formatAs: 'week'
    }, {
      formatAs: 'month'
    }, {
      formatAs: 'year'
    });
  }

var _default = {
  steps: steps,
  labels: [// "mini" labels are only defined for a few languages.
  'mini', // "short-time" labels are only defined for a few languages.
  'short-time', // "narrow" and "short" labels are defined for all languages.
  // "narrow" labels can sometimes be weird (like "+5d."),
  // but "short" labels have the " ago" part, so "narrow" seem
  // more appropriate.
  // "short" labels would have been more appropriate if they
  // didn't have the " ago" part, hence the "short-time" above.
  'narrow', // Since "narrow" labels are always present, "short" element
  // of this array can be removed.
  'short']
};
exports.default = _default;

},{"../locale":59,"../steps":68,"./renameLegacyProperties":79}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _units = require("../steps/units");

var _twitter = _interopRequireDefault(require("./twitter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _twitter.default, {
  // Skip "seconds".
  steps: _twitter.default.steps.filter(function (step) {
    return step.formatAs !== 'second';
  }) // Start showing `1m` from the first minute.
  .map(function (step) {
    return step.formatAs === 'minute' ? _objectSpread({}, step, {
      minTime: _units.minute
    }) : step;
  })
});

exports.default = _default;

},{"../steps/units":71,"./twitter":82}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _twitter = _interopRequireDefault(require("./twitter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _twitter.default, {
  // Skip "seconds".
  steps: _twitter.default.steps.filter(function (step) {
    return step.formatAs !== 'second';
  })
});

exports.default = _default;

},{"./twitter":82}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _twitterMinute = _interopRequireDefault(require("./twitterMinute"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _twitterMinute.default, {
  // Add "now".
  steps: [{
    formatAs: 'now'
  }].concat(_twitterMinute.default.steps)
});

exports.default = _default;

},{"./twitterMinute":84}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _twitter = _interopRequireDefault(require("./twitter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = _objectSpread({}, _twitter.default, {
  // Add "now".
  steps: [{
    formatAs: 'now'
  }].concat(_twitter.default.steps)
});

exports.default = _default;

},{"./twitter":82}],87:[function(require,module,exports){
'use strict'

exports = module.exports = require('./commonjs/TimeAgo').default
exports['default'] = require('./commonjs/TimeAgo').default

var locale = require('./commonjs/locale')

exports.intlDateTimeFormatSupported = locale.intlDateTimeFormatSupported
exports.intlDateTimeFormatSupportedLocale = locale.intlDateTimeFormatSupportedLocale
},{"./commonjs/TimeAgo":57,"./commonjs/locale":59}],88:[function(require,module,exports){
module.exports={
	"locale": "en",
	"long": {
		"year": {
			"previous": "last year",
			"current": "this year",
			"next": "next year",
			"past": {
				"one": "{0} year ago",
				"other": "{0} years ago"
			},
			"future": {
				"one": "in {0} year",
				"other": "in {0} years"
			}
		},
		"quarter": {
			"previous": "last quarter",
			"current": "this quarter",
			"next": "next quarter",
			"past": {
				"one": "{0} quarter ago",
				"other": "{0} quarters ago"
			},
			"future": {
				"one": "in {0} quarter",
				"other": "in {0} quarters"
			}
		},
		"month": {
			"previous": "last month",
			"current": "this month",
			"next": "next month",
			"past": {
				"one": "{0} month ago",
				"other": "{0} months ago"
			},
			"future": {
				"one": "in {0} month",
				"other": "in {0} months"
			}
		},
		"week": {
			"previous": "last week",
			"current": "this week",
			"next": "next week",
			"past": {
				"one": "{0} week ago",
				"other": "{0} weeks ago"
			},
			"future": {
				"one": "in {0} week",
				"other": "in {0} weeks"
			}
		},
		"day": {
			"previous": "yesterday",
			"current": "today",
			"next": "tomorrow",
			"past": {
				"one": "{0} day ago",
				"other": "{0} days ago"
			},
			"future": {
				"one": "in {0} day",
				"other": "in {0} days"
			}
		},
		"hour": {
			"current": "this hour",
			"past": {
				"one": "{0} hour ago",
				"other": "{0} hours ago"
			},
			"future": {
				"one": "in {0} hour",
				"other": "in {0} hours"
			}
		},
		"minute": {
			"current": "this minute",
			"past": {
				"one": "{0} minute ago",
				"other": "{0} minutes ago"
			},
			"future": {
				"one": "in {0} minute",
				"other": "in {0} minutes"
			}
		},
		"second": {
			"current": "now",
			"past": {
				"one": "{0} second ago",
				"other": "{0} seconds ago"
			},
			"future": {
				"one": "in {0} second",
				"other": "in {0} seconds"
			}
		}
	},
	"short": {
		"year": {
			"previous": "last yr.",
			"current": "this yr.",
			"next": "next yr.",
			"past": "{0} yr. ago",
			"future": "in {0} yr."
		},
		"quarter": {
			"previous": "last qtr.",
			"current": "this qtr.",
			"next": "next qtr.",
			"past": {
				"one": "{0} qtr. ago",
				"other": "{0} qtrs. ago"
			},
			"future": {
				"one": "in {0} qtr.",
				"other": "in {0} qtrs."
			}
		},
		"month": {
			"previous": "last mo.",
			"current": "this mo.",
			"next": "next mo.",
			"past": "{0} mo. ago",
			"future": "in {0} mo."
		},
		"week": {
			"previous": "last wk.",
			"current": "this wk.",
			"next": "next wk.",
			"past": "{0} wk. ago",
			"future": "in {0} wk."
		},
		"day": {
			"previous": "yesterday",
			"current": "today",
			"next": "tomorrow",
			"past": {
				"one": "{0} day ago",
				"other": "{0} days ago"
			},
			"future": {
				"one": "in {0} day",
				"other": "in {0} days"
			}
		},
		"hour": {
			"current": "this hour",
			"past": "{0} hr. ago",
			"future": "in {0} hr."
		},
		"minute": {
			"current": "this minute",
			"past": "{0} min. ago",
			"future": "in {0} min."
		},
		"second": {
			"current": "now",
			"past": "{0} sec. ago",
			"future": "in {0} sec."
		}
	},
	"narrow": {
		"year": {
			"previous": "last yr.",
			"current": "this yr.",
			"next": "next yr.",
			"past": "{0} yr. ago",
			"future": "in {0} yr."
		},
		"quarter": {
			"previous": "last qtr.",
			"current": "this qtr.",
			"next": "next qtr.",
			"past": {
				"one": "{0} qtr. ago",
				"other": "{0} qtrs. ago"
			},
			"future": {
				"one": "in {0} qtr.",
				"other": "in {0} qtrs."
			}
		},
		"month": {
			"previous": "last mo.",
			"current": "this mo.",
			"next": "next mo.",
			"past": "{0} mo. ago",
			"future": "in {0} mo."
		},
		"week": {
			"previous": "last wk.",
			"current": "this wk.",
			"next": "next wk.",
			"past": "{0} wk. ago",
			"future": "in {0} wk."
		},
		"day": {
			"previous": "yesterday",
			"current": "today",
			"next": "tomorrow",
			"past": {
				"one": "{0} day ago",
				"other": "{0} days ago"
			},
			"future": {
				"one": "in {0} day",
				"other": "in {0} days"
			}
		},
		"hour": {
			"current": "this hour",
			"past": "{0} hr. ago",
			"future": "in {0} hr."
		},
		"minute": {
			"current": "this minute",
			"past": "{0} min. ago",
			"future": "in {0} min."
		},
		"second": {
			"current": "now",
			"past": "{0} sec. ago",
			"future": "in {0} sec."
		}
	},
	"now": {
		"now": {
			"current": "now",
			"future": "in a moment",
			"past": "just now"
		}
	},
	"mini": {
		"year": "{0}yr",
		"month": "{0}mo",
		"week": "{0}wk",
		"day": "{0}d",
		"hour": "{0}h",
		"minute": "{0}m",
		"second": "{0}s",
		"now": "now"
	},
	"short-time": {
		"year": "{0} yr.",
		"month": "{0} mo.",
		"week": "{0} wk.",
		"day": {
			"one": "{0} day",
			"other": "{0} days"
		},
		"hour": "{0} hr.",
		"minute": "{0} min.",
		"second": "{0} sec."
	},
	"long-time": {
		"year": {
			"one": "{0} year",
			"other": "{0} years"
		},
		"month": {
			"one": "{0} month",
			"other": "{0} months"
		},
		"week": {
			"one": "{0} week",
			"other": "{0} weeks"
		},
		"day": {
			"one": "{0} day",
			"other": "{0} days"
		},
		"hour": {
			"one": "{0} hour",
			"other": "{0} hours"
		},
		"minute": {
			"one": "{0} minute",
			"other": "{0} minutes"
		},
		"second": {
			"one": "{0} second",
			"other": "{0} seconds"
		}
	}
}
},{}],89:[function(require,module,exports){
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  define(Gp, "constructor", GeneratorFunctionPrototype);
  define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  });
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  define(Gp, iteratorSymbol, function() {
    return this;
  });

  define(Gp, "toString", function() {
    return "[object Generator]";
  });

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
  typeof module === "object" ? module.exports : {}
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, in modern engines
  // we can explicitly access globalThis. In older engines we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  if (typeof globalThis === "object") {
    globalThis.regeneratorRuntime = runtime;
  } else {
    Function("r", "regeneratorRuntime = r")(runtime);
  }
}

},{}],90:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDefaultLocale = getDefaultLocale;
exports.setDefaultLocale = setDefaultLocale;
exports.getLocaleData = getLocaleData;
exports.addLocaleData = addLocaleData;
exports.resolveLocale = resolveLocale;
// Fallback locale.
// (when not a single one of the supplied "preferred" locales is available)
var defaultLocale = 'en'; // For all locales added
// their relative time formatter messages will be stored here.

var localesData = {}; // According to the spec BCP 47 language tags are case-insensitive.
// https://tools.ietf.org/html/rfc5646

var lowercaseLocaleLookup = {};

function getDefaultLocale() {
  return defaultLocale;
}

function setDefaultLocale(locale) {
  defaultLocale = locale;
}
/**
 * Gets locale data previously added by `addLocaleData()`.
 * @return  {object} [localeData]
 */


function getLocaleData(locale) {
  return localesData[locale];
}
/**
 * Adds locale data.
 * Is called by `RelativeTimeFormat.addLocale(...)`.
 * @param  {object} localeData
 */


function addLocaleData(localeData) {
  if (!localeData) {
    throw new Error('No locale data passed');
  } // This locale data is stored in a global variable
  // and later used when calling `.format(time)`.


  localesData[localeData.locale] = localeData;
  lowercaseLocaleLookup[localeData.locale.toLowerCase()] = localeData.locale;
}
/**
 * Returns a locale for which locale data has been added
 * via `RelativeTimeFormat.addLocale(...)`.
 * @param  {string} locale
 * @return {string} [locale]
 */


function resolveLocale(locale) {
  if (localesData[locale]) {
    return locale;
  }

  if (lowercaseLocaleLookup[locale.toLowerCase()]) {
    return lowercaseLocaleLookup[locale.toLowerCase()];
  }
}

},{}],91:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
// (this file was autogenerated by `generate-locales`)
// "plural rules" functions are not stored in locale JSON files because they're not strings.
// This file isn't big — it's about 5 kilobytes in size (minified).
// Alternatively, the pluralization rules for each locale could be stored
// in their JSON files in a non-parsed form and later parsed via `make-plural` library.
// But `make-plural` library itself is relatively big in size:
// `make-plural.min.js` is about 6 kilobytes (https://unpkg.com/make-plural/).
// So, it's more practical to bypass runtime `make-plural` pluralization rules compilation
// and just include the already compiled pluarlization rules for all locales in the library code.
var $ = {
  af: function classify(n) {
    return n == 1 ? 'one' : 'other';
  },
  am: function classify(n) {
    return n >= 0 && n <= 1 ? 'one' : 'other';
  },
  ar: function classify(n) {
    var s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
    return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 99 ? 'many' : 'other';
  },
  ast: function classify(n) {
    var s = String(n).split('.'),
        v0 = !s[1];
    return n == 1 && v0 ? 'one' : 'other';
  },
  be: function classify(n) {
    var s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
    return n10 == 1 && n100 != 11 ? 'one' : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 'few' : t0 && n10 == 0 || n10 >= 5 && n10 <= 9 || n100 >= 11 && n100 <= 14 ? 'many' : 'other';
  },
  br: function classify(n) {
    var s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        n1000000 = t0 && s[0].slice(-6);
    return n10 == 1 && n100 != 11 && n100 != 71 && n100 != 91 ? 'one' : n10 == 2 && n100 != 12 && n100 != 72 && n100 != 92 ? 'two' : (n10 == 3 || n10 == 4 || n10 == 9) && (n100 < 10 || n100 > 19) && (n100 < 70 || n100 > 79) && (n100 < 90 || n100 > 99) ? 'few' : n != 0 && t0 && n1000000 == 0 ? 'many' : 'other';
  },
  bs: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
    return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
  },
  cs: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
    return n == 1 && v0 ? 'one' : i >= 2 && i <= 4 && v0 ? 'few' : !v0 ? 'many' : 'other';
  },
  cy: function classify(n) {
    return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n == 3 ? 'few' : n == 6 ? 'many' : 'other';
  },
  da: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        t0 = Number(s[0]) == n;
    return n == 1 || !t0 && (i == 0 || i == 1) ? 'one' : 'other';
  },
  dsb: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i100 = i.slice(-2),
        f100 = f.slice(-2);
    return v0 && i100 == 1 || f100 == 1 ? 'one' : v0 && i100 == 2 || f100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || f100 == 3 || f100 == 4 ? 'few' : 'other';
  },
  dz: function classify(n) {
    return 'other';
  },
  fil: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
    return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
  },
  fr: function classify(n) {
    return n >= 0 && n < 2 ? 'one' : 'other';
  },
  ga: function classify(n) {
    var s = String(n).split('.'),
        t0 = Number(s[0]) == n;
    return n == 1 ? 'one' : n == 2 ? 'two' : t0 && n >= 3 && n <= 6 ? 'few' : t0 && n >= 7 && n <= 10 ? 'many' : 'other';
  },
  gd: function classify(n) {
    var s = String(n).split('.'),
        t0 = Number(s[0]) == n;
    return n == 1 || n == 11 ? 'one' : n == 2 || n == 12 ? 'two' : t0 && n >= 3 && n <= 10 || t0 && n >= 13 && n <= 19 ? 'few' : 'other';
  },
  he: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1);
    return n == 1 && v0 ? 'one' : i == 2 && v0 ? 'two' : v0 && (n < 0 || n > 10) && t0 && n10 == 0 ? 'many' : 'other';
  },
  is: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        t0 = Number(s[0]) == n,
        i10 = i.slice(-1),
        i100 = i.slice(-2);
    return t0 && i10 == 1 && i100 != 11 || !t0 ? 'one' : 'other';
  },
  ksh: function classify(n) {
    return n == 0 ? 'zero' : n == 1 ? 'one' : 'other';
  },
  lt: function classify(n) {
    var s = String(n).split('.'),
        f = s[1] || '',
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
    return n10 == 1 && (n100 < 11 || n100 > 19) ? 'one' : n10 >= 2 && n10 <= 9 && (n100 < 11 || n100 > 19) ? 'few' : f != 0 ? 'many' : 'other';
  },
  lv: function classify(n) {
    var s = String(n).split('.'),
        f = s[1] || '',
        v = f.length,
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        f100 = f.slice(-2),
        f10 = f.slice(-1);
    return t0 && n10 == 0 || n100 >= 11 && n100 <= 19 || v == 2 && f100 >= 11 && f100 <= 19 ? 'zero' : n10 == 1 && n100 != 11 || v == 2 && f10 == 1 && f100 != 11 || v != 2 && f10 == 1 ? 'one' : 'other';
  },
  mk: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
    return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : 'other';
  },
  mt: function classify(n) {
    var s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
    return n == 1 ? 'one' : n == 0 || n100 >= 2 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 19 ? 'many' : 'other';
  },
  pa: function classify(n) {
    return n == 0 || n == 1 ? 'one' : 'other';
  },
  pl: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
    return n == 1 && v0 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i != 1 && (i10 == 0 || i10 == 1) || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 12 && i100 <= 14 ? 'many' : 'other';
  },
  pt: function classify(n) {
    var s = String(n).split('.'),
        i = s[0];
    return i == 0 || i == 1 ? 'one' : 'other';
  },
  ro: function classify(n) {
    var s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
    return n == 1 && v0 ? 'one' : !v0 || n == 0 || n != 1 && n100 >= 1 && n100 <= 19 ? 'few' : 'other';
  },
  ru: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
    return v0 && i10 == 1 && i100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i10 == 0 || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 11 && i100 <= 14 ? 'many' : 'other';
  },
  se: function classify(n) {
    return n == 1 ? 'one' : n == 2 ? 'two' : 'other';
  },
  si: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        f = s[1] || '';
    return n == 0 || n == 1 || i == 0 && f == 1 ? 'one' : 'other';
  },
  sl: function classify(n) {
    var s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i100 = i.slice(-2);
    return v0 && i100 == 1 ? 'one' : v0 && i100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || !v0 ? 'few' : 'other';
  }
};
$.as = $.am;
$.az = $.af;
$.bg = $.af;
$.bn = $.am;
$.ca = $.ast;
$.ce = $.af;
$.chr = $.af;
$.de = $.ast;
$.ee = $.af;
$.el = $.af;
$.en = $.ast;
$.es = $.af;
$.et = $.ast;
$.eu = $.af;
$.fa = $.am;
$.fi = $.ast;
$.fo = $.af;
$.fur = $.af;
$.fy = $.ast;
$.gl = $.ast;
$.gu = $.am;
$.hi = $.am;
$.hr = $.bs;
$.hsb = $.dsb;
$.hu = $.af;
$.hy = $.fr;
$.ia = $.ast;
$.id = $.dz;
$.it = $.ast;
$.ja = $.dz;
$.jgo = $.af;
$.jv = $.dz;
$.ka = $.af;
$.kea = $.dz;
$.kk = $.af;
$.kl = $.af;
$.km = $.dz;
$.kn = $.am;
$.ko = $.dz;
$.ku = $.af;
$.ky = $.af;
$.lb = $.af;
$.lkt = $.dz;
$.lo = $.dz;
$.ml = $.af;
$.mn = $.af;
$.mr = $.am;
$.ms = $.dz;
$.my = $.dz;
$.nb = $.af;
$.ne = $.af;
$.nl = $.ast;
$.nn = $.af;
$.or = $.af;
$.ps = $.af;
$["pt-PT"] = $.ast;
$.sah = $.dz;
$.sd = $.af;
$.sk = $.cs;
$.so = $.af;
$.sq = $.af;
$.sr = $.bs;
$.sv = $.ast;
$.sw = $.ast;
$.ta = $.af;
$.te = $.af;
$.th = $.dz;
$.ti = $.pa;
$.tk = $.af;
$.to = $.dz;
$.tr = $.af;
$.ug = $.af;
$.uk = $.ru;
$.ur = $.ast;
$.uz = $.af;
$.vi = $.dz;
$.wae = $.af;
$.yi = $.ast;
$.yue = $.dz;
$.zh = $.dz;
$.zu = $.am;
var _default = $;
exports.default = _default;

},{}],92:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _PluralRuleFunctions = _interopRequireDefault(require("./PluralRuleFunctions"));

var _getPluralRulesLocale = _interopRequireDefault(require("./getPluralRulesLocale"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * `Intl.PluralRules` polyfill.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/PluralRules
 */
var PluralRules =
/*#__PURE__*/
function () {
  function PluralRules(locale, options) {
    _classCallCheck(this, PluralRules);

    var locales = PluralRules.supportedLocalesOf(locale);

    if (locales.length === 0) {
      throw new RangeError("Unsupported locale: " + locale);
    }

    if (options && options.type !== "cardinal") {
      throw new RangeError("Only \"cardinal\" \"type\" is supported");
    }

    this.$ = _PluralRuleFunctions.default[(0, _getPluralRulesLocale.default)(locales[0])];
  }

  _createClass(PluralRules, [{
    key: "select",
    value: function select(number) {
      return this.$(number);
    }
  }], [{
    key: "supportedLocalesOf",
    value: function supportedLocalesOf(locales) {
      if (typeof locales === "string") {
        locales = [locales];
      }

      return locales.filter(function (locale) {
        return _PluralRuleFunctions.default[(0, _getPluralRulesLocale.default)(locale)];
      });
    }
  }]);

  return PluralRules;
}();

exports.default = PluralRules;

},{"./PluralRuleFunctions":91,"./getPluralRulesLocale":94}],93:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.UNITS = void 0;

var _LocaleDataStore = require("./LocaleDataStore");

var _resolveLocale = _interopRequireDefault(require("./resolveLocale"));

var _PluralRules = _interopRequireDefault(require("./PluralRules"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Importing `PluralRule` polyfill from a separate package
// results in a bundle that is larger by 1kB for some reason.
// import PluralRules from 'intl-plural-rules-polyfill/cardinal'
// Valid time units.
var UNITS = ["second", "minute", "hour", "day", "week", "month", "quarter", "year"]; // Valid values for the `numeric` option.

exports.UNITS = UNITS;
var NUMERIC_VALUES = ["auto", "always"]; // Valid values for the `style` option.

var STYLE_VALUES = ["long", "short", "narrow"]; // Valid values for the `localeMatcher` option.

var LOCALE_MATCHER_VALUES = ["lookup", "best fit"];
/**
 * Polyfill for `Intl.RelativeTimeFormat` proposal.
 * https://github.com/tc39/proposal-intl-relative-time
 * https://github.com/tc39/proposal-intl-relative-time/issues/55
 */

var RelativeTimeFormat =
/*#__PURE__*/
function () {
  /**
   * @param {(string|string[])} [locales] - Preferred locales (or locale).
   * @param {Object} [options] - Formatting options.
   * @param {string} [options.style="long"] - One of: "long", "short", "narrow".
   * @param {string} [options.numeric="always"] - (Version >= 2) One of: "always", "auto".
   * @param {string} [options.localeMatcher="lookup"] - One of: "lookup", "best fit". Currently only "lookup" is supported.
   */
  function RelativeTimeFormat() {
    var locales = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, RelativeTimeFormat);

    _defineProperty(this, "numeric", "always");

    _defineProperty(this, "style", "long");

    _defineProperty(this, "localeMatcher", "lookup");

    var numeric = options.numeric,
        style = options.style,
        localeMatcher = options.localeMatcher; // Set `numeric` option.

    if (numeric !== undefined) {
      if (NUMERIC_VALUES.indexOf(numeric) < 0) {
        throw new RangeError("Invalid \"numeric\" option: ".concat(numeric));
      }

      this.numeric = numeric;
    } // Set `style` option.


    if (style !== undefined) {
      if (STYLE_VALUES.indexOf(style) < 0) {
        throw new RangeError("Invalid \"style\" option: ".concat(style));
      }

      this.style = style;
    } // Set `localeMatcher` option.


    if (localeMatcher !== undefined) {
      if (LOCALE_MATCHER_VALUES.indexOf(localeMatcher) < 0) {
        throw new RangeError("Invalid \"localeMatcher\" option: ".concat(localeMatcher));
      }

      this.localeMatcher = localeMatcher;
    } // Set `locale`.
    // Convert `locales` to an array.


    if (typeof locales === 'string') {
      locales = [locales];
    } // Add default locale.


    locales.push((0, _LocaleDataStore.getDefaultLocale)()); // Choose the most appropriate locale.

    this.locale = RelativeTimeFormat.supportedLocalesOf(locales, {
      localeMatcher: this.localeMatcher
    })[0];

    if (!this.locale) {
      throw new Error("No supported locale was found");
    } // Construct an `Intl.PluralRules` instance (polyfill).


    if (_PluralRules.default.supportedLocalesOf(this.locale).length > 0) {
      this.pluralRules = new _PluralRules.default(this.locale);
    } else {
      console.warn("\"".concat(this.locale, "\" locale is not supported"));
    } // Use `Intl.NumberFormat` for formatting numbers (when available).


    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      this.numberFormat = new Intl.NumberFormat(this.locale);
      this.numberingSystem = this.numberFormat.resolvedOptions().numberingSystem;
    } else {
      this.numberingSystem = 'latn';
    }

    this.locale = (0, _resolveLocale.default)(this.locale, {
      localeMatcher: this.localeMatcher
    });
  }
  /**
   * Formats time `number` in `units` (either in past or in future).
   * @param {number} number - Time interval value.
   * @param {string} unit - Time interval measurement unit.
   * @return {string}
   * @throws {RangeError} If unit is not one of "second", "minute", "hour", "day", "week", "month", "quarter".
   * @example
   * // Returns "2 days ago"
   * rtf.format(-2, "day")
   * // Returns "in 5 minutes"
   * rtf.format(5, "minute")
   */


  _createClass(RelativeTimeFormat, [{
    key: "format",
    value: function format() {
      var _parseFormatArgs = parseFormatArgs(arguments),
          _parseFormatArgs2 = _slicedToArray(_parseFormatArgs, 2),
          number = _parseFormatArgs2[0],
          unit = _parseFormatArgs2[1];

      return this.getRule(number, unit).replace('{0}', this.formatNumber(Math.abs(number)));
    }
    /**
     * Formats time `number` in `units` (either in past or in future).
     * @param {number} number - Time interval value.
     * @param {string} unit - Time interval measurement unit.
     * @return {Object[]} The parts (`{ type, value }`).
     * @throws {RangeError} If unit is not one of "second", "minute", "hour", "day", "week", "month", "quarter".
     * @example
     * // Version 1.
     * // Returns [
     * //   { type: "literal", value: "in " },
     * //   { type: "day", value: "100" },
     * //   { type: "literal", value: " days" }
     * // ]
     * rtf.formatToParts(100, "day")
     * //
     * // Version 2.
     * // Returns [
     * //   { type: "literal", value: "in " },
     * //   { type: "integer", value: "100", unit: "day" },
     * //   { type: "literal", value: " days" }
     * // ]
     * rtf.formatToParts(100, "day")
     */

  }, {
    key: "formatToParts",
    value: function formatToParts() {
      var _parseFormatArgs3 = parseFormatArgs(arguments),
          _parseFormatArgs4 = _slicedToArray(_parseFormatArgs3, 2),
          number = _parseFormatArgs4[0],
          unit = _parseFormatArgs4[1];

      var rule = this.getRule(number, unit);
      var valueIndex = rule.indexOf("{0}"); // "yesterday"/"today"/"tomorrow".

      if (valueIndex < 0) {
        return [{
          type: "literal",
          value: rule
        }];
      }

      var parts = [];

      if (valueIndex > 0) {
        parts.push({
          type: "literal",
          value: rule.slice(0, valueIndex)
        });
      }

      parts = parts.concat(this.formatNumberToParts(Math.abs(number)).map(function (part) {
        return _objectSpread({}, part, {
          unit: unit
        });
      }));

      if (valueIndex + "{0}".length < rule.length - 1) {
        parts.push({
          type: "literal",
          value: rule.slice(valueIndex + "{0}".length)
        });
      }

      return parts;
    }
    /**
     * Returns formatting rule for `value` in `units` (either in past or in future).
     * @param {number} value - Time interval value.
     * @param {string} unit - Time interval measurement unit.
     * @return {string}
     * @throws {RangeError} If unit is not one of "second", "minute", "hour", "day", "week", "month", "quarter".
     * @example
     * // Returns "{0} days ago"
     * getRule(-2, "day")
     */

  }, {
    key: "getRule",
    value: function getRule(value, unit) {
      // Get locale-specific time interval formatting rules
      // of a given `style` for the given value of measurement `unit`.
      //
      // E.g.:
      //
      // ```json
      // {
      //  "past": {
      //    "one": "a second ago",
      //    "other": "{0} seconds ago"
      //  },
      //  "future": {
      //    "one": "in a second",
      //    "other": "in {0} seconds"
      //  }
      // }
      // ```
      //
      var unitMessages = (0, _LocaleDataStore.getLocaleData)(this.locale)[this.style][unit]; // Special case for "yesterday"/"today"/"tomorrow".

      if (this.numeric === "auto") {
        // "yesterday", "the day before yesterday", etc.
        if (value === -2 || value === -1) {
          var message = unitMessages["previous".concat(value === -1 ? '' : '-' + Math.abs(value))];

          if (message) {
            return message;
          }
        } // "tomorrow", "the day after tomorrow", etc.
        else if (value === 1 || value === 2) {
            var _message = unitMessages["next".concat(value === 1 ? '' : '-' + Math.abs(value))];

            if (_message) {
              return _message;
            }
          } // "today"
          else if (value === 0) {
              if (unitMessages.current) {
                return unitMessages.current;
              }
            }
      } // Choose either "past" or "future" based on time `value` sign.
      // If there's only "other" then it's being collapsed.
      // (the resulting bundle size optimization technique)


      var pluralizedMessages = unitMessages[isNegative(value) ? "past" : "future"]; // Bundle size optimization technique.

      if (typeof pluralizedMessages === "string") {
        return pluralizedMessages;
      } // Quantify `value`.
      // There seems to be no such locale in CLDR
      // for which "plural rules" function is missing.


      var quantifier = this.pluralRules && this.pluralRules.select(Math.abs(value)) || 'other'; // "other" rule is supposed to be always present.
      // If only "other" rule is present then "rules" is not an object and is a string.

      return pluralizedMessages[quantifier] || pluralizedMessages.other;
    }
    /**
     * Formats a number into a string.
     * Uses `Intl.NumberFormat` when available.
     * @param  {number} number
     * @return {string}
     */

  }, {
    key: "formatNumber",
    value: function formatNumber(number) {
      return this.numberFormat ? this.numberFormat.format(number) : String(number);
    }
    /**
     * Formats a number into a list of parts.
     * Uses `Intl.NumberFormat` when available.
     * @param  {number} number
     * @return {object[]}
     */

  }, {
    key: "formatNumberToParts",
    value: function formatNumberToParts(number) {
      // `Intl.NumberFormat.formatToParts()` is not present, for example,
      // in Node.js 8.x while `Intl.NumberFormat` itself is present.
      return this.numberFormat && this.numberFormat.formatToParts ? this.numberFormat.formatToParts(number) : [{
        type: "integer",
        value: this.formatNumber(number)
      }];
    }
    /**
     * Returns a new object with properties reflecting the locale and date and time formatting options computed during initialization of this DateTimeFormat object.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/resolvedOptions
     * @return {Object}
     */

  }, {
    key: "resolvedOptions",
    value: function resolvedOptions() {
      return {
        locale: this.locale,
        style: this.style,
        numeric: this.numeric,
        numberingSystem: this.numberingSystem
      };
    }
  }]);

  return RelativeTimeFormat;
}();
/**
 * Returns an array containing those of the provided locales
 * that are supported in collation without having to fall back
 * to the runtime's default locale.
 * @param {(string|string[])} locale - A string with a BCP 47 language tag, or an array of such strings. For the general form of the locales argument, see the Intl page.
 * @param {Object} [options] - An object that may have the following property:
 * @param {string} [options.localeMatcher="lookup"] - The locale matching algorithm to use. Possible values are "lookup" and "best fit". Currently only "lookup" is supported.
 * @return {string[]} An array of strings representing a subset of the given locale tags that are supported in collation without having to fall back to the runtime's default locale.
 * @example
 * var locales = ['ban', 'id-u-co-pinyin', 'es-PY']
 * var options = { localeMatcher: 'lookup' }
 * // Returns ["id", "es-PY"]
 * Intl.RelativeTimeFormat.supportedLocalesOf(locales, options)
 */


exports.default = RelativeTimeFormat;

RelativeTimeFormat.supportedLocalesOf = function (locales) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  // Convert `locales` to an array.
  if (typeof locales === 'string') {
    locales = [locales];
  } else if (!Array.isArray(locales)) {
    throw new TypeError('Invalid "locales" argument');
  }

  return locales.filter(function (locale) {
    return (0, _resolveLocale.default)(locale, options);
  });
};
/**
 * Adds locale data for a specific locale.
 * @param {Object} localeData
 */


RelativeTimeFormat.addLocale = _LocaleDataStore.addLocaleData;
/**
 * Sets default locale.
 * @param  {string} locale
 */

RelativeTimeFormat.setDefaultLocale = _LocaleDataStore.setDefaultLocale;
/**
 * Gets default locale.
 * @return  {string} locale
 */

RelativeTimeFormat.getDefaultLocale = _LocaleDataStore.getDefaultLocale;
/**
 * Export `Intl.PluralRules` just in case it's used somewhere else.
 */

RelativeTimeFormat.PluralRules = _PluralRules.default; // The specification allows units to be in plural form.
// Convert plural to singular.
// Example: "seconds" -> "second".

var UNIT_ERROR = 'Invalid "unit" argument';

function parseUnit(unit) {
  if (_typeof(unit) === 'symbol') {
    throw new TypeError(UNIT_ERROR);
  }

  if (typeof unit !== 'string') {
    throw new RangeError("".concat(UNIT_ERROR, ": ").concat(unit));
  }

  if (unit[unit.length - 1] === 's') {
    unit = unit.slice(0, unit.length - 1);
  }

  if (UNITS.indexOf(unit) < 0) {
    throw new RangeError("".concat(UNIT_ERROR, ": ").concat(unit));
  }

  return unit;
} // Converts `value` to a `Number`.
// The specification allows value to be a non-number.
// For example, "-0" is supposed to be treated as `-0`.
// Also checks if `value` is a finite number.


var NUMBER_ERROR = 'Invalid "number" argument';

function parseNumber(value) {
  value = Number(value);

  if (Number.isFinite) {
    if (!Number.isFinite(value)) {
      throw new RangeError("".concat(NUMBER_ERROR, ": ").concat(value));
    }
  }

  return value;
}
/**
 * Tells `0` from `-0`.
 * https://stackoverflow.com/questions/7223359/are-0-and-0-the-same
 * @param  {number} number
 * @return {Boolean}
 * @example
 * isNegativeZero(0); // false
 * isNegativeZero(-0); // true
 */


function isNegativeZero(number) {
  return 1 / number === -Infinity;
}

function isNegative(number) {
  return number < 0 || number === 0 && isNegativeZero(number);
}

function parseFormatArgs(args) {
  if (args.length < 2) {
    throw new TypeError("\"unit\" argument is required");
  }

  return [parseNumber(args[0]), parseUnit(args[1])];
}

},{"./LocaleDataStore":90,"./PluralRules":92,"./resolveLocale":95}],94:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getPluralRulesLocale;

/**
 * Returns a `locale` for which a function exists in `./PluralRuleFunctions.js`.
 * @param  {string} locale
 * @return {string}
 * @example
 * getPluralRulesLocale("ru-RU-Cyrl") // Returns "ru".
 */
function getPluralRulesLocale(locale) {
  // "pt" language is the only one having different pluralization rules
  // for the one ("pt") (Portuguese) locale and the other ("pt-PT") (European Portuguese).
  // http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
  // (see the entries for "pt" and "pt_PT" there)
  if (locale === 'pt-PT') {
    return locale;
  }

  return getLanguageFromLanguageTag(locale);
}
/**
 * Extracts language from an IETF BCP 47 language tag.
 * @param {string} languageTag - IETF BCP 47 language tag.
 * @return {string}
 * @example
 * // Returns "he"
 * getLanguageFromLanguageTag("he-IL-u-ca-hebrew-tz-jeruslm")
 * // Returns "ar"
 * getLanguageFromLanguageTag("ar-u-nu-latn")
 */


var LANGUAGE_REG_EXP = /^([a-z0-9]+)/i;

function getLanguageFromLanguageTag(languageTag) {
  var match = languageTag.match(LANGUAGE_REG_EXP);

  if (!match) {
    throw new TypeError("Invalid locale: ".concat(languageTag));
  }

  return match[1];
}

},{}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = resolveLocale;
exports.resolveLocaleLookup = resolveLocaleLookup;

var _LocaleDataStore = require("./LocaleDataStore");

/**
 * Resolves a locale to a supported one (if any).
 * @param  {string} locale
 * @param {Object} [options] - An object that may have the following property:
 * @param {string} [options.localeMatcher="lookup"] - The locale matching algorithm to use. Possible values are "lookup" and "best fit". Currently only "lookup" is supported.
 * @return {string} [locale]
 * @example
 * // Returns "sr"
 * resolveLocale("sr-Cyrl-BA")
 * // Returns `undefined`
 * resolveLocale("xx-Latn")
 */
function resolveLocale(locale) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var localeMatcher = options.localeMatcher || 'lookup';

  switch (localeMatcher) {
    case 'lookup':
      return resolveLocaleLookup(locale);
    // "best fit" locale matching is not supported.
    // https://github.com/catamphetamine/relative-time-format/issues/2

    case 'best fit':
      // return resolveLocaleBestFit(locale)
      return resolveLocaleLookup(locale);

    default:
      throw new RangeError("Invalid \"localeMatcher\" option: ".concat(localeMatcher));
  }
}
/**
 * Resolves a locale to a supported one (if any).
 * Starts from the most specific locale and gradually
 * falls back to less specific ones.
 * This is a basic implementation of the "lookup" algorithm.
 * https://tools.ietf.org/html/rfc4647#section-3.4
 * @param  {string} locale
 * @return {string} [locale]
 * @example
 * // Returns "sr"
 * resolveLocaleLookup("sr-Cyrl-BA")
 * // Returns `undefined`
 * resolveLocaleLookup("xx-Latn")
 */


function resolveLocaleLookup(locale) {
  var resolvedLocale = (0, _LocaleDataStore.resolveLocale)(locale);

  if (resolvedLocale) {
    return resolvedLocale;
  } // `sr-Cyrl-BA` -> `sr-Cyrl` -> `sr`.


  var parts = locale.split('-');

  while (locale.length > 1) {
    parts.pop();
    locale = parts.join('-');

    var _resolvedLocale = (0, _LocaleDataStore.resolveLocale)(locale);

    if (_resolvedLocale) {
      return _resolvedLocale;
    }
  }
}

},{"./LocaleDataStore":90}],96:[function(require,module,exports){
'use strict'

exports = module.exports = require('./commonjs/RelativeTimeFormat').default
exports['default'] = require('./commonjs/RelativeTimeFormat').default
},{"./commonjs/RelativeTimeFormat":93}],97:[function(require,module,exports){
(function (process,Buffer){(function (){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var base64Js = require('base64-js');
var _extends = require('@babel/runtime/helpers/extends');
var _typeof = require('@babel/runtime/helpers/typeof');
var _objectWithoutProperties = require('@babel/runtime/helpers/objectWithoutProperties');
var _toConsumableArray = require('@babel/runtime/helpers/toConsumableArray');
var _asyncToGenerator = require('@babel/runtime/helpers/asyncToGenerator');
var _classCallCheck = require('@babel/runtime/helpers/classCallCheck');
var _createClass = require('@babel/runtime/helpers/createClass');
var _defineProperty = require('@babel/runtime/helpers/defineProperty');
var _regeneratorRuntime = require('@babel/runtime/regenerator');
var axios = require('axios');
var _slicedToArray = require('@babel/runtime/helpers/slicedToArray');
var FormData = require('form-data');
var WebSocket = require('isomorphic-ws');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var _extends__default = /*#__PURE__*/_interopDefaultLegacy(_extends);
var _typeof__default = /*#__PURE__*/_interopDefaultLegacy(_typeof);
var _objectWithoutProperties__default = /*#__PURE__*/_interopDefaultLegacy(_objectWithoutProperties);
var _toConsumableArray__default = /*#__PURE__*/_interopDefaultLegacy(_toConsumableArray);
var _asyncToGenerator__default = /*#__PURE__*/_interopDefaultLegacy(_asyncToGenerator);
var _classCallCheck__default = /*#__PURE__*/_interopDefaultLegacy(_classCallCheck);
var _createClass__default = /*#__PURE__*/_interopDefaultLegacy(_createClass);
var _defineProperty__default = /*#__PURE__*/_interopDefaultLegacy(_defineProperty);
var _regeneratorRuntime__default = /*#__PURE__*/_interopDefaultLegacy(_regeneratorRuntime);
var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);
var _slicedToArray__default = /*#__PURE__*/_interopDefaultLegacy(_slicedToArray);
var FormData__default = /*#__PURE__*/_interopDefaultLegacy(FormData);
var WebSocket__default = /*#__PURE__*/_interopDefaultLegacy(WebSocket);

function isString$1(arrayOrString) {
  return typeof arrayOrString === 'string';
}

function isMapStringCallback(arrayOrString, callback) {
  return !!callback && isString$1(arrayOrString);
} // source - https://github.com/beatgammit/base64-js/blob/master/test/convert.js#L72


function map(arrayOrString, callback) {
  var res = [];

  if (isString$1(arrayOrString) && isMapStringCallback(arrayOrString, callback)) {
    for (var k = 0, len = arrayOrString.length; k < len; k++) {
      if (arrayOrString.charAt(k)) {
        var kValue = arrayOrString.charAt(k);
        var mappedValue = callback(kValue, k, arrayOrString);
        res[k] = mappedValue;
      }
    }
  } else if (!isString$1(arrayOrString) && !isMapStringCallback(arrayOrString, callback)) {
    for (var _k = 0, _len = arrayOrString.length; _k < _len; _k++) {
      if (_k in arrayOrString) {
        var _kValue = arrayOrString[_k];

        var _mappedValue = callback(_kValue, _k, arrayOrString);

        res[_k] = _mappedValue;
      }
    }
  }

  return res;
}

var encodeBase64 = function encodeBase64(data) {
  return base64Js.fromByteArray(new Uint8Array(map(data, function (char) {
    return char.charCodeAt(0);
  })));
}; // base-64 decoder throws exception if encoded string is not padded by '=' to make string length
// in multiples of 4. So gonna use our own method for this purpose to keep backwards compatibility
// https://github.com/beatgammit/base64-js/blob/master/index.js#L26

var decodeBase64 = function decodeBase64(s) {
  var e = {},
      w = String.fromCharCode,
      L = s.length;
  var i,
      b = 0,
      c,
      x,
      l = 0,
      a,
      r = '';
  var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  for (i = 0; i < 64; i++) {
    e[A.charAt(i)] = i;
  }

  for (x = 0; x < L; x++) {
    c = e[s.charAt(x)];
    b = (b << 6) + c;
    l += 6;

    while (l >= 8) {
      ((a = b >>> (l -= 8) & 0xff) || x < L - 2) && (r += w(a));
    }
  }

  return r;
};

var https = null;

function ownKeys$4(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread$4(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$4(Object(source), true).forEach(function (key) { _defineProperty__default['default'](target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$4(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 * ChannelState - A container class for the channel state.
 */
var ChannelState = /*#__PURE__*/function () {
  /**
   * Flag which indicates if channel state contain latest/recent messages or no.
   * This flag should be managed by UI sdks using a setter - setIsUpToDate.
   * When false, any new message (received by websocket event - message.new) will not
   * be pushed on to message list.
   */
  function ChannelState(channel) {
    var _this = this,
        _channel$state;

    _classCallCheck__default['default'](this, ChannelState);

    _defineProperty__default['default'](this, "_channel", void 0);

    _defineProperty__default['default'](this, "watcher_count", void 0);

    _defineProperty__default['default'](this, "typing", void 0);

    _defineProperty__default['default'](this, "read", void 0);

    _defineProperty__default['default'](this, "messages", void 0);

    _defineProperty__default['default'](this, "pinnedMessages", void 0);

    _defineProperty__default['default'](this, "threads", void 0);

    _defineProperty__default['default'](this, "mutedUsers", void 0);

    _defineProperty__default['default'](this, "watchers", void 0);

    _defineProperty__default['default'](this, "members", void 0);

    _defineProperty__default['default'](this, "unreadCount", void 0);

    _defineProperty__default['default'](this, "membership", void 0);

    _defineProperty__default['default'](this, "last_message_at", void 0);

    _defineProperty__default['default'](this, "isUpToDate", void 0);

    _defineProperty__default['default'](this, "setIsUpToDate", function (isUpToDate) {
      _this.isUpToDate = isUpToDate;
    });

    _defineProperty__default['default'](this, "removeMessageFromArray", function (msgArray, msg) {
      var result = msgArray.filter(function (message) {
        return !(!!message.id && !!msg.id && message.id === msg.id);
      });
      return {
        removed: result.length < msgArray.length,
        result: result
      };
    });

    _defineProperty__default['default'](this, "updateUserMessages", function (user) {
      var _updateUserMessages = function _updateUserMessages(messages, user) {
        for (var i = 0; i < messages.length; i++) {
          var _m$user;

          var m = messages[i];

          if (((_m$user = m.user) === null || _m$user === void 0 ? void 0 : _m$user.id) === user.id) {
            messages[i] = _objectSpread$4(_objectSpread$4({}, m), {}, {
              user: user
            });
          }
        }
      };

      _updateUserMessages(_this.messages, user);

      for (var parentId in _this.threads) {
        _updateUserMessages(_this.threads[parentId], user);
      }

      _updateUserMessages(_this.pinnedMessages, user);
    });

    _defineProperty__default['default'](this, "deleteUserMessages", function (user) {
      var hardDelete = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var _deleteUserMessages = function _deleteUserMessages(messages, user) {
        var hardDelete = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        for (var i = 0; i < messages.length; i++) {
          var _m$user2;

          var m = messages[i];

          if (((_m$user2 = m.user) === null || _m$user2 === void 0 ? void 0 : _m$user2.id) !== user.id) {
            continue;
          }

          if (hardDelete) {
            /**
             * In case of hard delete, we need to strip down all text, html,
             * attachments and all the custom properties on message
             */
            messages[i] = {
              cid: m.cid,
              created_at: m.created_at,
              deleted_at: user.deleted_at,
              id: m.id,
              latest_reactions: [],
              mentioned_users: [],
              own_reactions: [],
              parent_id: m.parent_id,
              reply_count: m.reply_count,
              status: m.status,
              thread_participants: m.thread_participants,
              type: 'deleted',
              updated_at: m.updated_at,
              user: m.user
            };
          } else {
            messages[i] = _objectSpread$4(_objectSpread$4({}, m), {}, {
              type: 'deleted',
              deleted_at: user.deleted_at
            });
          }
        }
      };

      _deleteUserMessages(_this.messages, user, hardDelete);

      for (var parentId in _this.threads) {
        _deleteUserMessages(_this.threads[parentId], user, hardDelete);
      }

      _deleteUserMessages(_this.pinnedMessages, user, hardDelete);
    });

    this._channel = channel;
    this.watcher_count = 0;
    this.typing = {};
    this.read = {};
    this.messages = [];
    this.pinnedMessages = [];
    this.threads = {}; // a list of users to hide messages from

    this.mutedUsers = [];
    this.watchers = {};
    this.members = {};
    this.membership = {};
    this.unreadCount = 0;
    /**
     * Flag which indicates if channel state contain latest/recent messages or no.
     * This flag should be managed by UI sdks using a setter - setIsUpToDate.
     * When false, any new message (received by websocket event - message.new) will not
     * be pushed on to message list.
     */

    this.isUpToDate = true;
    this.last_message_at = (channel === null || channel === void 0 ? void 0 : (_channel$state = channel.state) === null || _channel$state === void 0 ? void 0 : _channel$state.last_message_at) != null ? new Date(channel.state.last_message_at) : null;
  }
  /**
   * addMessageSorted - Add a message to the state
   *
   * @param {MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} newMessage A new message
   * @param {boolean} timestampChanged Whether updating a message with changed created_at value.
   * @param {boolean} addIfDoesNotExist Add message if it is not in the list, used to prevent out of order updated messages from being added.
   *
   */


  _createClass__default['default'](ChannelState, [{
    key: "addMessageSorted",
    value: function addMessageSorted(newMessage) {
      var timestampChanged = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var addIfDoesNotExist = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      return this.addMessagesSorted([newMessage], timestampChanged, false, addIfDoesNotExist);
    }
    /**
     * formatMessage - Takes the message object. Parses the dates, sets __html
     * and sets the status to received if missing. Returns a message object
     *
     * @param {MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} message a message object
     *
     */

  }, {
    key: "formatMessage",
    value: function formatMessage(message) {
      return _objectSpread$4(_objectSpread$4({}, message), {}, {
        /**
         * @deprecated please use `html`
         */
        __html: message.html,
        // parse the date..
        pinned_at: message.pinned_at ? new Date(message.pinned_at) : null,
        created_at: message.created_at ? new Date(message.created_at) : new Date(),
        updated_at: message.updated_at ? new Date(message.updated_at) : new Date(),
        status: message.status || 'received'
      });
    }
    /**
     * addMessagesSorted - Add the list of messages to state and resorts the messages
     *
     * @param {Array<MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} newMessages A list of messages
     * @param {boolean} timestampChanged Whether updating messages with changed created_at value.
     * @param {boolean} initializing Whether channel is being initialized.
     * @param {boolean} addIfDoesNotExist Add message if it is not in the list, used to prevent out of order updated messages from being added.
     *
     */

  }, {
    key: "addMessagesSorted",
    value: function addMessagesSorted(newMessages) {
      var timestampChanged = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var initializing = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var addIfDoesNotExist = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

      for (var i = 0; i < newMessages.length; i += 1) {
        var _this$_channel;

        var message = this.formatMessage(newMessages[i]);

        if (message.user && (_this$_channel = this._channel) !== null && _this$_channel !== void 0 && _this$_channel.cid) {
          /**
           * Store the reference to user for this channel, so that when we have to
           * handle updates to user, we can use the reference map, to determine which
           * channels need to be updated with updated user object.
           */
          this._channel.getClient().state.updateUserReference(message.user, this._channel.cid);
        }

        if (initializing && message.id && this.threads[message.id]) {
          // If we are initializing the state of channel (e.g., in case of connection recovery),
          // then in that case we remove thread related to this message from threads object.
          // This way we can ensure that we don't have any stale data in thread object
          // and consumer can refetch the replies.
          delete this.threads[message.id];
        }

        if (!this.last_message_at) {
          this.last_message_at = new Date(message.created_at.getTime());
        }

        if (message.created_at.getTime() > this.last_message_at.getTime()) {
          this.last_message_at = new Date(message.created_at.getTime());
        } // update or append the messages...


        var parentID = message.parent_id; // add to the main message list

        if (!parentID || message.show_in_channel) {
          this.messages = this._addToMessageList(this.messages, message, timestampChanged, 'created_at', addIfDoesNotExist);
        }
        /**
         * Add message to thread if applicable and the message
         * was added when querying for replies, or the thread already exits.
         * This is to prevent the thread state from getting out of sync if
         * a thread message is shown in channel but older than the newest thread
         * message. This situation can result in a thread state where a random
         * message is "oldest" message, and newer messages are therefore not loaded.
         * This can also occur if an old thread message is updated.
         */


        if (parentID && !initializing) {
          var thread = this.threads[parentID] || [];

          var threadMessages = this._addToMessageList(thread, message, timestampChanged, 'created_at', addIfDoesNotExist);

          this.threads[parentID] = threadMessages;
        }
      }
    }
    /**
     * addPinnedMessages - adds messages in pinnedMessages property
     *
     * @param {Array<MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} pinnedMessages A list of pinned messages
     *
     */

  }, {
    key: "addPinnedMessages",
    value: function addPinnedMessages(pinnedMessages) {
      for (var i = 0; i < pinnedMessages.length; i += 1) {
        this.addPinnedMessage(pinnedMessages[i]);
      }
    }
    /**
     * addPinnedMessage - adds message in pinnedMessages
     *
     * @param {MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} pinnedMessage message to update
     *
     */

  }, {
    key: "addPinnedMessage",
    value: function addPinnedMessage(pinnedMessage) {
      this.pinnedMessages = this._addToMessageList(this.pinnedMessages, this.formatMessage(pinnedMessage), false, 'pinned_at');
    }
    /**
     * removePinnedMessage - removes pinned message from pinnedMessages
     *
     * @param {MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} message message to remove
     *
     */

  }, {
    key: "removePinnedMessage",
    value: function removePinnedMessage(message) {
      var _this$removeMessageFr = this.removeMessageFromArray(this.pinnedMessages, message),
          result = _this$removeMessageFr.result;

      this.pinnedMessages = result;
    }
  }, {
    key: "addReaction",
    value: function addReaction(reaction, message, enforce_unique) {
      var _this2 = this;

      if (!message) return;
      var messageWithReaction = message;

      this._updateMessage(message, function (msg) {
        messageWithReaction.own_reactions = _this2._addOwnReactionToMessage(msg.own_reactions, reaction, enforce_unique);
        return _this2.formatMessage(messageWithReaction);
      });

      return messageWithReaction;
    }
  }, {
    key: "_addOwnReactionToMessage",
    value: function _addOwnReactionToMessage(ownReactions, reaction, enforce_unique) {
      if (enforce_unique) {
        ownReactions = [];
      } else {
        ownReactions = this._removeOwnReactionFromMessage(ownReactions, reaction);
      }

      ownReactions = ownReactions || [];

      if (this._channel.getClient().userID === reaction.user_id) {
        ownReactions.push(reaction);
      }

      return ownReactions;
    }
  }, {
    key: "_removeOwnReactionFromMessage",
    value: function _removeOwnReactionFromMessage(ownReactions, reaction) {
      if (ownReactions) {
        return ownReactions.filter(function (item) {
          return item.user_id !== reaction.user_id || item.type !== reaction.type;
        });
      }

      return ownReactions;
    }
  }, {
    key: "removeReaction",
    value: function removeReaction(reaction, message) {
      var _this3 = this;

      if (!message) return;
      var messageWithReaction = message;

      this._updateMessage(message, function (msg) {
        messageWithReaction.own_reactions = _this3._removeOwnReactionFromMessage(msg.own_reactions, reaction);
        return _this3.formatMessage(messageWithReaction);
      });

      return messageWithReaction;
    }
  }, {
    key: "removeQuotedMessageReferences",
    value: function removeQuotedMessageReferences(message) {
      var parseMessage = function parseMessage(m) {
        var _m$pinned_at, _m$updated_at;

        return _objectSpread$4(_objectSpread$4({}, m), {}, {
          created_at: m.created_at.toString(),
          pinned_at: (_m$pinned_at = m.pinned_at) === null || _m$pinned_at === void 0 ? void 0 : _m$pinned_at.toString(),
          updated_at: (_m$updated_at = m.updated_at) === null || _m$updated_at === void 0 ? void 0 : _m$updated_at.toString()
        });
      };

      var updatedMessages = this.messages.filter(function (msg) {
        return msg.quoted_message_id === message.id;
      }).map(parseMessage).map(function (msg) {
        return _objectSpread$4(_objectSpread$4({}, msg), {}, {
          quoted_message: _objectSpread$4(_objectSpread$4({}, message), {}, {
            attachments: []
          })
        });
      });
      this.addMessagesSorted(updatedMessages, true);
    }
    /**
     * Updates all instances of given message in channel state
     * @param message
     * @param updateFunc
     */

  }, {
    key: "_updateMessage",
    value: function _updateMessage(message, updateFunc) {
      var parent_id = message.parent_id,
          show_in_channel = message.show_in_channel,
          pinned = message.pinned;

      if (parent_id && this.threads[parent_id]) {
        var thread = this.threads[parent_id];
        var msgIndex = thread.findIndex(function (msg) {
          return msg.id === message.id;
        });

        if (msgIndex !== -1) {
          thread[msgIndex] = updateFunc(thread[msgIndex]);
          this.threads[parent_id] = thread;
        }
      }

      if (!show_in_channel && !parent_id || show_in_channel) {
        var _msgIndex = this.messages.findIndex(function (msg) {
          return msg.id === message.id;
        });

        if (_msgIndex !== -1) {
          this.messages[_msgIndex] = updateFunc(this.messages[_msgIndex]);
        }
      }

      if (pinned) {
        var _msgIndex2 = this.pinnedMessages.findIndex(function (msg) {
          return msg.id === message.id;
        });

        if (_msgIndex2 !== -1) {
          this.pinnedMessages[_msgIndex2] = updateFunc(this.pinnedMessages[_msgIndex2]);
        }
      }
    }
    /**
     * Setter for isUpToDate.
     *
     * @param isUpToDate  Flag which indicates if channel state contain latest/recent messages or no.
     *                    This flag should be managed by UI sdks using a setter - setIsUpToDate.
     *                    When false, any new message (received by websocket event - message.new) will not
     *                    be pushed on to message list.
     */

  }, {
    key: "_addToMessageList",
    value:
    /**
     * _addToMessageList - Adds a message to a list of messages, tries to update first, appends if message isn't found
     *
     * @param {Array<ReturnType<ChannelState<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>['formatMessage']>>} messages A list of messages
     * @param message
     * @param {boolean} timestampChanged Whether updating a message with changed created_at value.
     * @param {string} sortBy field name to use to sort the messages by
     * @param {boolean} addIfDoesNotExist Add message if it is not in the list, used to prevent out of order updated messages from being added.
     */
    function _addToMessageList(messages, message) {
      var timestampChanged = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var sortBy = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'created_at';
      var addIfDoesNotExist = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;
      var addMessageToList = addIfDoesNotExist || timestampChanged;
      var messageArr = messages; // if created_at has changed, message should be filtered and re-inserted in correct order
      // slow op but usually this only happens for a message inserted to state before actual response with correct timestamp

      if (timestampChanged) {
        messageArr = messageArr.filter(function (msg) {
          return !(msg.id && message.id === msg.id);
        });
      } // Get array length after filtering


      var messageArrayLength = messageArr.length; // for empty list just concat and return unless it's an update or deletion

      if (messageArrayLength === 0 && addMessageToList) {
        return messageArr.concat(message);
      } else if (messageArrayLength === 0) {
        return _toConsumableArray__default['default'](messageArr);
      }

      var messageTime = message[sortBy].getTime();
      var messageIsNewest = messageArr[messageArrayLength - 1][sortBy].getTime() < messageTime; // if message is newer than last item in the list concat and return unless it's an update or deletion

      if (messageIsNewest && addMessageToList) {
        return messageArr.concat(message);
      } else if (messageIsNewest) {
        return _toConsumableArray__default['default'](messageArr);
      } // find the closest index to push the new message


      var left = 0;
      var middle = 0;
      var right = messageArrayLength - 1;

      while (left <= right) {
        middle = Math.floor((right + left) / 2);
        if (messageArr[middle][sortBy].getTime() <= messageTime) left = middle + 1;else right = middle - 1;
      } // message already exists and not filtered due to timestampChanged, update and return


      if (!timestampChanged && message.id) {
        if (messageArr[left] && message.id === messageArr[left].id) {
          messageArr[left] = message;
          return _toConsumableArray__default['default'](messageArr);
        }

        if (messageArr[left - 1] && message.id === messageArr[left - 1].id) {
          messageArr[left - 1] = message;
          return _toConsumableArray__default['default'](messageArr);
        }
      } // Do not add updated or deleted messages to the list if they do not already exist
      // or have a timestamp change.


      if (addMessageToList) {
        messageArr.splice(left, 0, message);
      }

      return _toConsumableArray__default['default'](messageArr);
    }
    /**
     * removeMessage - Description
     *
     * @param {{ id: string; parent_id?: string }} messageToRemove Object of the message to remove. Needs to have at id specified.
     *
     * @return {boolean} Returns if the message was removed
     */

  }, {
    key: "removeMessage",
    value: function removeMessage(messageToRemove) {
      var isRemoved = false;

      if (messageToRemove.parent_id && this.threads[messageToRemove.parent_id]) {
        var _this$removeMessageFr2 = this.removeMessageFromArray(this.threads[messageToRemove.parent_id], messageToRemove),
            removed = _this$removeMessageFr2.removed,
            threadMessages = _this$removeMessageFr2.result;

        this.threads[messageToRemove.parent_id] = threadMessages;
        isRemoved = removed;
      } else {
        var _this$removeMessageFr3 = this.removeMessageFromArray(this.messages, messageToRemove),
            _removed = _this$removeMessageFr3.removed,
            messages = _this$removeMessageFr3.result;

        this.messages = messages;
        isRemoved = _removed;
      }

      return isRemoved;
    }
  }, {
    key: "filterErrorMessages",
    value:
    /**
     * filterErrorMessages - Removes error messages from the channel state.
     *
     */
    function filterErrorMessages() {
      var filteredMessages = this.messages.filter(function (message) {
        return message.type !== 'error';
      });
      this.messages = filteredMessages;
    }
    /**
     * clean - Remove stale data such as users that stayed in typing state for more than 5 seconds
     */

  }, {
    key: "clean",
    value: function clean() {
      var now = new Date(); // prevent old users from showing up as typing

      for (var _i = 0, _Object$entries = Object.entries(this.typing); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = _slicedToArray__default['default'](_Object$entries[_i], 2),
            userID = _Object$entries$_i[0],
            lastEvent = _Object$entries$_i[1];

        var receivedAt = typeof lastEvent.received_at === 'string' ? new Date(lastEvent.received_at) : lastEvent.received_at || new Date();

        if (now.getTime() - receivedAt.getTime() > 7000) {
          delete this.typing[userID];

          this._channel.getClient().dispatchEvent({
            cid: this._channel.cid,
            type: 'typing.stop',
            user: {
              id: userID
            }
          });
        }
      }
    }
  }, {
    key: "clearMessages",
    value: function clearMessages() {
      this.messages = [];
      this.pinnedMessages = [];
    }
  }]);

  return ChannelState;
}();

function ownKeys$3(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread$3(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$3(Object(source), true).forEach(function (key) { _defineProperty__default['default'](target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$3(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var EVENT_MAP = {
  'channel.created': true,
  'channel.deleted': true,
  'channel.hidden': true,
  'channel.muted': true,
  'channel.truncated': true,
  'channel.unmuted': true,
  'channel.updated': true,
  'channel.visible': true,
  'health.check': true,
  'member.added': true,
  'member.removed': true,
  'member.updated': true,
  'message.deleted': true,
  'message.new': true,
  'message.read': true,
  'message.updated': true,
  'notification.added_to_channel': true,
  'notification.channel_deleted': true,
  'notification.channel_mutes_updated': true,
  'notification.channel_truncated': true,
  'notification.invite_accepted': true,
  'notification.invite_rejected': true,
  'notification.invited': true,
  'notification.mark_read': true,
  'notification.message_new': true,
  'notification.mutes_updated': true,
  'notification.removed_from_channel': true,
  'reaction.deleted': true,
  'reaction.new': true,
  'reaction.updated': true,
  'typing.start': true,
  'typing.stop': true,
  'user.banned': true,
  'user.deleted': true,
  'user.presence.changed': true,
  'user.unbanned': true,
  'user.updated': true,
  'user.watching.start': true,
  'user.watching.stop': true,
  // local events
  'connection.changed': true,
  'connection.recovered': true
};

var IS_VALID_EVENT_MAP_TYPE = _objectSpread$3(_objectSpread$3({}, EVENT_MAP), {}, {
  all: true
});

var isValidEventType = function isValidEventType(eventType) {
  return IS_VALID_EVENT_MAP_TYPE[eventType] || false;
};

function _createForOfIteratorHelper$3(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$3(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray$3(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$3(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$3(o, minLen); }

function _arrayLikeToArray$3(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * logChatPromiseExecution - utility function for logging the execution of a promise..
 *  use this when you want to run the promise and handle errors by logging a warning
 *
 * @param {Promise<T>} promise The promise you want to run and log
 * @param {string} name    A descriptive name of what the promise does for log output
 *
 */
function logChatPromiseExecution(promise, name) {
  promise.then().catch(function (error) {
    console.warn("failed to do ".concat(name, ", ran into error: "), error);
  });
}
var sleep = function sleep(m) {
  return new Promise(function (r) {
    return setTimeout(r, m);
  });
};
function isFunction(value) {
  return value && (Object.prototype.toString.call(value) === '[object Function]' || 'function' === typeof value || value instanceof Function);
}
var chatCodes = {
  TOKEN_EXPIRED: 40,
  WS_CLOSED_SUCCESS: 1000
};

function isReadableStream(obj) {
  return obj !== null && _typeof__default['default'](obj) === 'object' && (obj.readable || typeof obj._read === 'function');
}

function isBuffer(obj) {
  return obj != null && obj.constructor != null && // @ts-expect-error
  typeof obj.constructor.isBuffer === 'function' && // @ts-expect-error
  obj.constructor.isBuffer(obj);
}

function isFileWebAPI(uri) {
  return typeof window !== 'undefined' && 'File' in window && uri instanceof File;
}

function isOwnUser(user) {
  return (user === null || user === void 0 ? void 0 : user.total_unread_count) !== undefined;
}
function isOwnUserBaseProperty(property) {
  var ownUserBaseProperties = {
    channel_mutes: true,
    devices: true,
    mutes: true,
    total_unread_count: true,
    unread_channels: true,
    unread_count: true,
    invisible: true,
    roles: true
  };
  return ownUserBaseProperties[property];
}
function addFileToFormData(uri, name, contentType) {
  var data = new FormData__default['default']();

  if (isReadableStream(uri) || isBuffer(uri) || isFileWebAPI(uri)) {
    if (name) data.append('file', uri, name);else data.append('file', uri);
  } else {
    data.append('file', {
      uri: uri,
      name: name || uri.split('/').reverse()[0],
      contentType: contentType || undefined,
      type: contentType || undefined
    });
  }

  return data;
}
function normalizeQuerySort(sort) {
  var sortFields = [];
  var sortArr = Array.isArray(sort) ? sort : [sort];

  var _iterator = _createForOfIteratorHelper$3(sortArr),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var item = _step.value;
      var entries = Object.entries(item);

      if (entries.length > 1) {
        console.warn("client._buildSort() - multiple fields in a single sort object detected. Object's field order is not guaranteed");
      }

      for (var _i = 0, _entries = entries; _i < _entries.length; _i++) {
        var _entries$_i = _slicedToArray__default['default'](_entries[_i], 2),
            field = _entries$_i[0],
            direction = _entries$_i[1];

        sortFields.push({
          field: field,
          direction: direction
        });
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return sortFields;
}
/**
 * retryInterval - A retry interval which increases acc to number of failures
 *
 * @return {number} Duration to wait in milliseconds
 */

function retryInterval(numberOfFailures) {
  // try to reconnect in 0.25-25 seconds (random to spread out the load from failures)
  var max = Math.min(500 + numberOfFailures * 2000, 25000);
  var min = Math.min(Math.max(250, (numberOfFailures - 1) * 2000), 25000);
  return Math.floor(Math.random() * (max - min) + min);
}
/** adopted from https://github.com/ai/nanoid/blob/master/non-secure/index.js */

var alphabet = 'ModuleSymbhasOwnPr0123456789ABCDEFGHNRVfgctiUvzKqYTJkLxpZXIjQW';
function randomId() {
  var id = '';

  for (var i = 0; i < 21; i++) {
    id += alphabet[Math.random() * 64 | 0];
  }

  return id;
}

function _createForOfIteratorHelper$2(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$2(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray$2(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$2(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$2(o, minLen); }

function _arrayLikeToArray$2(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys$2(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread$2(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$2(Object(source), true).forEach(function (key) { _defineProperty__default['default'](target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$2(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 * Channel - The Channel class manages it's own state.
 */
var Channel = /*#__PURE__*/function () {
  /**
   * constructor - Create a channel
   *
   * @param {StreamChat<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>} client the chat client
   * @param {string} type  the type of channel
   * @param {string} [id]  the id of the chat
   * @param {ChannelData<ChannelType>} data any additional custom params
   *
   * @return {Channel<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>} Returns a new uninitialized channel
   */
  function Channel(client, type, id, data) {
    var _this = this;

    _classCallCheck__default['default'](this, Channel);

    _defineProperty__default['default'](this, "_client", void 0);

    _defineProperty__default['default'](this, "type", void 0);

    _defineProperty__default['default'](this, "id", void 0);

    _defineProperty__default['default'](this, "data", void 0);

    _defineProperty__default['default'](this, "_data", void 0);

    _defineProperty__default['default'](this, "cid", void 0);

    _defineProperty__default['default'](this, "listeners", void 0);

    _defineProperty__default['default'](this, "state", void 0);

    _defineProperty__default['default'](this, "initialized", void 0);

    _defineProperty__default['default'](this, "lastKeyStroke", void 0);

    _defineProperty__default['default'](this, "lastTypingEvent", void 0);

    _defineProperty__default['default'](this, "isTyping", void 0);

    _defineProperty__default['default'](this, "disconnected", void 0);

    _defineProperty__default['default'](this, "create", /*#__PURE__*/_asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee() {
      var options;
      return _regeneratorRuntime__default['default'].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              options = {
                watch: false,
                state: false,
                presence: false
              };
              _context.next = 3;
              return _this.query(options);

            case 3:
              return _context.abrupt("return", _context.sent);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));

    _defineProperty__default['default'](this, "_callChannelListeners", function (event) {
      var channel = _this; // gather and call the listeners

      var listeners = [];

      if (channel.listeners.all) {
        listeners.push.apply(listeners, _toConsumableArray__default['default'](channel.listeners.all));
      }

      if (channel.listeners[event.type]) {
        listeners.push.apply(listeners, _toConsumableArray__default['default'](channel.listeners[event.type]));
      } // call the event and send it to the listeners


      for (var _i = 0, _listeners = listeners; _i < _listeners.length; _i++) {
        var listener = _listeners[_i];

        if (typeof listener !== 'string') {
          listener(event);
        }
      }
    });

    _defineProperty__default['default'](this, "_channelURL", function () {
      if (!_this.id) {
        throw new Error('channel id is not defined');
      }

      return "".concat(_this.getClient().baseURL, "/channels/").concat(_this.type, "/").concat(_this.id);
    });

    var validTypeRe = /^[\w_-]+$/;
    var validIDRe = /^[\w!_-]+$/;

    if (!validTypeRe.test(type)) {
      throw new Error("Invalid chat type ".concat(type, ", letters, numbers and \"_-\" are allowed"));
    }

    if (typeof id === 'string' && !validIDRe.test(id)) {
      throw new Error("Invalid chat id ".concat(id, ", letters, numbers and \"!-_\" are allowed"));
    }

    this._client = client;
    this.type = type;
    this.id = id; // used by the frontend, gets updated:

    this.data = data; // this._data is used for the requests...

    this._data = _objectSpread$2({}, data);
    this.cid = "".concat(type, ":").concat(id);
    this.listeners = {}; // perhaps the state variable should be private

    this.state = new ChannelState(this);
    this.initialized = false;
    this.lastTypingEvent = null;
    this.isTyping = false;
    this.disconnected = false;
  }
  /**
   * getClient - Get the chat client for this channel. If client.disconnect() was called, this function will error
   *
   * @return {StreamChat<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>}
   */


  _createClass__default['default'](Channel, [{
    key: "getClient",
    value: function getClient() {
      if (this.disconnected === true) {
        throw Error("You can't use a channel after client.disconnect() was called");
      }

      return this._client;
    }
    /**
     * getConfig - Get the configs for this channel type
     *
     * @return {Record<string, unknown>}
     */

  }, {
    key: "getConfig",
    value: function getConfig() {
      var client = this.getClient();
      return client.configs[this.type];
    }
    /**
     * sendMessage - Send a message to this channel
     *
     * @param {Message<AttachmentType, MessageType, UserType>} message The Message object
     * @param {{ skip_push?: boolean }} [options] Option object, {skip_push: true} to skip sending push notifications
     *
     * @return {Promise<SendMessageAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The Server Response
     */

  }, {
    key: "sendMessage",
    value: function () {
      var _sendMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee2(message, options) {
        var sendMessageResponse;
        return _regeneratorRuntime__default['default'].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.getClient().post(this._channelURL() + '/message', _objectSpread$2({
                  message: message
                }, options));

              case 2:
                sendMessageResponse = _context2.sent;
                // Reset unreadCount to 0.
                this.state.unreadCount = 0;
                return _context2.abrupt("return", sendMessageResponse);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function sendMessage(_x, _x2) {
        return _sendMessage.apply(this, arguments);
      }

      return sendMessage;
    }()
  }, {
    key: "sendFile",
    value: function sendFile(uri, name, contentType, user) {
      return this.getClient().sendFile("".concat(this._channelURL(), "/file"), uri, name, contentType, user);
    }
  }, {
    key: "sendImage",
    value: function sendImage(uri, name, contentType, user) {
      return this.getClient().sendFile("".concat(this._channelURL(), "/image"), uri, name, contentType, user);
    }
  }, {
    key: "deleteFile",
    value: function deleteFile(url) {
      return this.getClient().delete("".concat(this._channelURL(), "/file"), {
        url: url
      });
    }
  }, {
    key: "deleteImage",
    value: function deleteImage(url) {
      return this.getClient().delete("".concat(this._channelURL(), "/image"), {
        url: url
      });
    }
    /**
     * sendEvent - Send an event on this channel
     *
     * @param {Event<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>} event for example {type: 'message.read'}
     *
     * @return {Promise<EventAPIResponse<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>>} The Server Response
     */

  }, {
    key: "sendEvent",
    value: function () {
      var _sendEvent = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee3(event) {
        return _regeneratorRuntime__default['default'].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this._checkInitialized();

                _context3.next = 3;
                return this.getClient().post(this._channelURL() + '/event', {
                  event: event
                });

              case 3:
                return _context3.abrupt("return", _context3.sent);

              case 4:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function sendEvent(_x3) {
        return _sendEvent.apply(this, arguments);
      }

      return sendEvent;
    }()
    /**
     * search - Query messages
     *
     * @param {MessageFilters<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType> | string}  query search query or object MongoDB style filters
     * @param {{client_id?: string; connection_id?: string; query?: string; message_filter_conditions?: MessageFilters<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>}} options Option object, {user_id: 'tommaso'}
     *
     * @return {Promise<SearchAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} search messages response
     */

  }, {
    key: "search",
    value: function () {
      var _search = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee4(query) {
        var options,
            payload,
            _args4 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                options = _args4.length > 1 && _args4[1] !== undefined ? _args4[1] : {};

                if (!(options.offset && (options.sort || options.next))) {
                  _context4.next = 3;
                  break;
                }

                throw Error("Cannot specify offset with sort or next parameters");

              case 3:
                // Return a list of channels
                payload = _objectSpread$2(_objectSpread$2({
                  filter_conditions: {
                    cid: this.cid
                  }
                }, options), {}, {
                  sort: options.sort ? normalizeQuerySort(options.sort) : undefined
                });

                if (!(typeof query === 'string')) {
                  _context4.next = 8;
                  break;
                }

                payload.query = query;
                _context4.next = 13;
                break;

              case 8:
                if (!(_typeof__default['default'](query) === 'object')) {
                  _context4.next = 12;
                  break;
                }

                payload.message_filter_conditions = query;
                _context4.next = 13;
                break;

              case 12:
                throw Error("Invalid type ".concat(_typeof__default['default'](query), " for query parameter"));

              case 13:
                _context4.next = 15;
                return this.getClient().wsPromise;

              case 15:
                _context4.next = 17;
                return this.getClient().get(this.getClient().baseURL + '/search', {
                  payload: payload
                });

              case 17:
                return _context4.abrupt("return", _context4.sent);

              case 18:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function search(_x4) {
        return _search.apply(this, arguments);
      }

      return search;
    }()
    /**
     * queryMembers - Query Members
     *
     * @param {UserFilters<UserType>}  filterConditions object MongoDB style filters
     * @param {UserSort<UserType>} [sort] Sort options, for instance [{created_at: -1}].
     * When using multiple fields, make sure you use array of objects to guarantee field order, for instance [{last_active: -1}, {created_at: 1}]
     * @param {{ limit?: number; offset?: number }} [options] Option object, {limit: 10, offset:10}
     *
     * @return {Promise<ChannelMemberAPIResponse<UserType>>} Query Members response
     */

  }, {
    key: "queryMembers",
    value: function () {
      var _queryMembers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee5(filterConditions) {
        var _this$data;

        var sort,
            options,
            id,
            type,
            members,
            _args5 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                sort = _args5.length > 1 && _args5[1] !== undefined ? _args5[1] : [];
                options = _args5.length > 2 && _args5[2] !== undefined ? _args5[2] : {};
                type = this.type;

                if (this.id) {
                  id = this.id;
                } else if ((_this$data = this.data) !== null && _this$data !== void 0 && _this$data.members && Array.isArray(this.data.members)) {
                  members = this.data.members;
                } // Return a list of members


                _context5.next = 6;
                return this.getClient().get(this.getClient().baseURL + '/members', {
                  payload: _objectSpread$2({
                    type: type,
                    id: id,
                    members: members,
                    sort: normalizeQuerySort(sort),
                    filter_conditions: filterConditions
                  }, options)
                });

              case 6:
                return _context5.abrupt("return", _context5.sent);

              case 7:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function queryMembers(_x5) {
        return _queryMembers.apply(this, arguments);
      }

      return queryMembers;
    }()
    /**
     * sendReaction - Send a reaction about a message
     *
     * @param {string} messageID the message id
     * @param {Reaction<ReactionType, UserType>} reaction the reaction object for instance {type: 'love'}
     * @param {{ enforce_unique?: boolean, skip_push?: boolean }} [options] Option object, {enforce_unique: true, skip_push: true} to override any existing reaction or skip sending push notifications
     *
     * @return {Promise<ReactionAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The Server Response
     */

  }, {
    key: "sendReaction",
    value: function () {
      var _sendReaction = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee6(messageID, reaction, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (messageID) {
                  _context6.next = 2;
                  break;
                }

                throw Error("Message id is missing");

              case 2:
                if (!(!reaction || Object.keys(reaction).length === 0)) {
                  _context6.next = 4;
                  break;
                }

                throw Error("Reaction object is missing");

              case 4:
                _context6.next = 6;
                return this.getClient().post(this.getClient().baseURL + "/messages/".concat(messageID, "/reaction"), _objectSpread$2({
                  reaction: reaction
                }, options));

              case 6:
                return _context6.abrupt("return", _context6.sent);

              case 7:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function sendReaction(_x6, _x7, _x8) {
        return _sendReaction.apply(this, arguments);
      }

      return sendReaction;
    }()
    /**
     * deleteReaction - Delete a reaction by user and type
     *
     * @param {string} messageID the id of the message from which te remove the reaction
     * @param {string} reactionType the type of reaction that should be removed
     * @param {string} [user_id] the id of the user (used only for server side request) default null
     *
     * @return {Promise<ReactionAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The Server Response
     */

  }, {
    key: "deleteReaction",
    value: function deleteReaction(messageID, reactionType, user_id) {
      this._checkInitialized();

      if (!reactionType || !messageID) {
        throw Error('Deleting a reaction requires specifying both the message and reaction type');
      }

      var url = this.getClient().baseURL + "/messages/".concat(messageID, "/reaction/").concat(reactionType); //provided when server side request

      if (user_id) {
        return this.getClient().delete(url, {
          user_id: user_id
        });
      }

      return this.getClient().delete(url, {});
    }
    /**
     * update - Edit the channel's custom properties
     *
     * @param {ChannelData<ChannelType>} channelData The object to update the custom properties of this channel with
     * @param {Message<AttachmentType, MessageType, UserType>} [updateMessage] Optional message object for channel members notification
     * @param {{ skip_push?: boolean }} [options] Option object, {skip_push: true} to skip sending push notifications
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "update",
    value: function () {
      var _update2 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee7() {
        var channelData,
            updateMessage,
            options,
            reserved,
            _args7 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                channelData = _args7.length > 0 && _args7[0] !== undefined ? _args7[0] : {};
                updateMessage = _args7.length > 1 ? _args7[1] : undefined;
                options = _args7.length > 2 ? _args7[2] : undefined;
                // Strip out reserved names that will result in API errors.
                reserved = ['config', 'cid', 'created_by', 'id', 'member_count', 'type', 'created_at', 'updated_at', 'last_message_at', 'own_capabilities'];
                reserved.forEach(function (key) {
                  delete channelData[key];
                });
                _context7.next = 7;
                return this._update(_objectSpread$2({
                  message: updateMessage,
                  data: channelData
                }, options));

              case 7:
                return _context7.abrupt("return", _context7.sent);

              case 8:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function update() {
        return _update2.apply(this, arguments);
      }

      return update;
    }()
    /**
     * updatePartial - partial update channel properties
     *
     * @param {PartialUpdateChannel<ChannelType>} partial update request
     *
     * @return {Promise<PartialUpdateChannelAPIResponse<ChannelType,CommandType, UserType>>}
     */

  }, {
    key: "updatePartial",
    value: function () {
      var _updatePartial = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee8(update) {
        return _regeneratorRuntime__default['default'].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.getClient().patch(this._channelURL(), update);

              case 2:
                return _context8.abrupt("return", _context8.sent);

              case 3:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function updatePartial(_x9) {
        return _updatePartial.apply(this, arguments);
      }

      return updatePartial;
    }()
    /**
     * enableSlowMode - enable slow mode
     *
     * @param {number} coolDownInterval the cooldown interval in seconds
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "enableSlowMode",
    value: function () {
      var _enableSlowMode = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee9(coolDownInterval) {
        var data;
        return _regeneratorRuntime__default['default'].wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return this.getClient().post(this._channelURL(), {
                  cooldown: coolDownInterval
                });

              case 2:
                data = _context9.sent;
                this.data = data.channel;
                return _context9.abrupt("return", data);

              case 5:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function enableSlowMode(_x10) {
        return _enableSlowMode.apply(this, arguments);
      }

      return enableSlowMode;
    }()
    /**
     * disableSlowMode - disable slow mode
     *
     * @return {Promise<UpdateChannelAPIResponse<ChannelType, AttachmentType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "disableSlowMode",
    value: function () {
      var _disableSlowMode = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee10() {
        var data;
        return _regeneratorRuntime__default['default'].wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return this.getClient().post(this._channelURL(), {
                  cooldown: 0
                });

              case 2:
                data = _context10.sent;
                this.data = data.channel;
                return _context10.abrupt("return", data);

              case 5:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function disableSlowMode() {
        return _disableSlowMode.apply(this, arguments);
      }

      return disableSlowMode;
    }()
    /**
     * delete - Delete the channel. Messages are permanently removed.
     *
     * @return {Promise<DeleteChannelAPIResponse<ChannelType, CommandType, UserType>>} The server response
     */

  }, {
    key: "delete",
    value: function () {
      var _delete2 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee11() {
        return _regeneratorRuntime__default['default'].wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _context11.next = 2;
                return this.getClient().delete(this._channelURL(), {});

              case 2:
                return _context11.abrupt("return", _context11.sent);

              case 3:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function _delete() {
        return _delete2.apply(this, arguments);
      }

      return _delete;
    }()
    /**
     * truncate - Removes all messages from the channel
     *
     * @return {Promise<TruncateChannelAPIResponse<ChannelType, CommandType, UserType>>} The server response
     */

  }, {
    key: "truncate",
    value: function () {
      var _truncate = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee12() {
        return _regeneratorRuntime__default['default'].wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return this.getClient().post(this._channelURL() + '/truncate', {});

              case 2:
                return _context12.abrupt("return", _context12.sent);

              case 3:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function truncate() {
        return _truncate.apply(this, arguments);
      }

      return truncate;
    }()
    /**
     * acceptInvite - accept invitation to the channel
     *
     * @param {InviteOptions<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} [options] The object to update the custom properties of this channel with
     *
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "acceptInvite",
    value: function () {
      var _acceptInvite = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee13() {
        var options,
            _args13 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                options = _args13.length > 0 && _args13[0] !== undefined ? _args13[0] : {};
                _context13.next = 3;
                return this._update(_objectSpread$2({
                  accept_invite: true
                }, options));

              case 3:
                return _context13.abrupt("return", _context13.sent);

              case 4:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function acceptInvite() {
        return _acceptInvite.apply(this, arguments);
      }

      return acceptInvite;
    }()
    /**
     * rejectInvite - reject invitation to the channel
     *
     * @param {InviteOptions<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} [options] The object to update the custom properties of this channel with
     *
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "rejectInvite",
    value: function () {
      var _rejectInvite = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee14() {
        var options,
            _args14 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                options = _args14.length > 0 && _args14[0] !== undefined ? _args14[0] : {};
                _context14.next = 3;
                return this._update(_objectSpread$2({
                  reject_invite: true
                }, options));

              case 3:
                return _context14.abrupt("return", _context14.sent);

              case 4:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function rejectInvite() {
        return _rejectInvite.apply(this, arguments);
      }

      return rejectInvite;
    }()
    /**
     * addMembers - add members to the channel
     *
     * @param {{user_id: string, channel_role?: Role}[]} members An array of members to add to the channel
     * @param {Message<AttachmentType, MessageType, UserType>} [message] Optional message object for channel members notification
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "addMembers",
    value: function () {
      var _addMembers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee15(members, message) {
        return _regeneratorRuntime__default['default'].wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _context15.next = 2;
                return this._update({
                  add_members: members,
                  message: message
                });

              case 2:
                return _context15.abrupt("return", _context15.sent);

              case 3:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function addMembers(_x11, _x12) {
        return _addMembers.apply(this, arguments);
      }

      return addMembers;
    }()
    /**
     * addModerators - add moderators to the channel
     *
     * @param {string[]} members An array of member identifiers
     * @param {Message<AttachmentType, MessageType, UserType>} [message] Optional message object for channel members notification
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "addModerators",
    value: function () {
      var _addModerators = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee16(members, message) {
        return _regeneratorRuntime__default['default'].wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                _context16.next = 2;
                return this._update({
                  add_moderators: members,
                  message: message
                });

              case 2:
                return _context16.abrupt("return", _context16.sent);

              case 3:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function addModerators(_x13, _x14) {
        return _addModerators.apply(this, arguments);
      }

      return addModerators;
    }()
    /**
     * assignRoles - sets member roles in a channel
     *
     * @param {{channel_role: Role, user_id: string}[]} roles List of role assignments
     * @param {Message<AttachmentType, MessageType, UserType>} [message] Optional message object for channel members notification
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "assignRoles",
    value: function () {
      var _assignRoles = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee17(roles, message) {
        return _regeneratorRuntime__default['default'].wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                _context17.next = 2;
                return this._update({
                  assign_roles: roles,
                  message: message
                });

              case 2:
                return _context17.abrupt("return", _context17.sent);

              case 3:
              case "end":
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function assignRoles(_x15, _x16) {
        return _assignRoles.apply(this, arguments);
      }

      return assignRoles;
    }()
    /**
     * inviteMembers - invite members to the channel
     *
     * @param {{user_id: string, channel_role?: Role}[]} members An array of members to invite to the channel
     * @param {Message<AttachmentType, MessageType, UserType>} [message] Optional message object for channel members notification
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "inviteMembers",
    value: function () {
      var _inviteMembers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee18(members, message) {
        return _regeneratorRuntime__default['default'].wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                _context18.next = 2;
                return this._update({
                  invites: members,
                  message: message
                });

              case 2:
                return _context18.abrupt("return", _context18.sent);

              case 3:
              case "end":
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function inviteMembers(_x17, _x18) {
        return _inviteMembers.apply(this, arguments);
      }

      return inviteMembers;
    }()
    /**
     * removeMembers - remove members from channel
     *
     * @param {string[]} members An array of member identifiers
     * @param {Message<AttachmentType, MessageType, UserType>} [message] Optional message object for channel members notification
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "removeMembers",
    value: function () {
      var _removeMembers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee19(members, message) {
        return _regeneratorRuntime__default['default'].wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                _context19.next = 2;
                return this._update({
                  remove_members: members,
                  message: message
                });

              case 2:
                return _context19.abrupt("return", _context19.sent);

              case 3:
              case "end":
                return _context19.stop();
            }
          }
        }, _callee19, this);
      }));

      function removeMembers(_x19, _x20) {
        return _removeMembers.apply(this, arguments);
      }

      return removeMembers;
    }()
    /**
     * demoteModerators - remove moderator role from channel members
     *
     * @param {string[]} members An array of member identifiers
     * @param {Message<AttachmentType, MessageType, UserType>} [message] Optional message object for channel members notification
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "demoteModerators",
    value: function () {
      var _demoteModerators = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee20(members, message) {
        return _regeneratorRuntime__default['default'].wrap(function _callee20$(_context20) {
          while (1) {
            switch (_context20.prev = _context20.next) {
              case 0:
                _context20.next = 2;
                return this._update({
                  demote_moderators: members,
                  message: message
                });

              case 2:
                return _context20.abrupt("return", _context20.sent);

              case 3:
              case "end":
                return _context20.stop();
            }
          }
        }, _callee20, this);
      }));

      function demoteModerators(_x21, _x22) {
        return _demoteModerators.apply(this, arguments);
      }

      return demoteModerators;
    }()
    /**
     * _update - executes channel update request
     * @param payload Object Update Channel payload
     * @return {Promise<UpdateChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     * TODO: introduce new type instead of Object in the next major update
     */

  }, {
    key: "_update",
    value: function () {
      var _update3 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee21(payload) {
        var data;
        return _regeneratorRuntime__default['default'].wrap(function _callee21$(_context21) {
          while (1) {
            switch (_context21.prev = _context21.next) {
              case 0:
                _context21.next = 2;
                return this.getClient().post(this._channelURL(), payload);

              case 2:
                data = _context21.sent;
                this.data = data.channel;
                return _context21.abrupt("return", data);

              case 5:
              case "end":
                return _context21.stop();
            }
          }
        }, _callee21, this);
      }));

      function _update(_x23) {
        return _update3.apply(this, arguments);
      }

      return _update;
    }()
    /**
     * mute - mutes the current channel
     * @param {{ user_id?: string, expiration?: string }} opts expiration in minutes or user_id
     * @return {Promise<MuteChannelAPIResponse<ChannelType, CommandType, UserType>>} The server response
     *
     * example with expiration:
     * await channel.mute({expiration: moment.duration(2, 'weeks')});
     *
     * example server side:
     * await channel.mute({user_id: userId});
     *
     */

  }, {
    key: "mute",
    value: function () {
      var _mute = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee22() {
        var opts,
            _args22 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee22$(_context22) {
          while (1) {
            switch (_context22.prev = _context22.next) {
              case 0:
                opts = _args22.length > 0 && _args22[0] !== undefined ? _args22[0] : {};
                _context22.next = 3;
                return this.getClient().post(this.getClient().baseURL + '/moderation/mute/channel', _objectSpread$2({
                  channel_cid: this.cid
                }, opts));

              case 3:
                return _context22.abrupt("return", _context22.sent);

              case 4:
              case "end":
                return _context22.stop();
            }
          }
        }, _callee22, this);
      }));

      function mute() {
        return _mute.apply(this, arguments);
      }

      return mute;
    }()
    /**
     * unmute - mutes the current channel
     * @param {{ user_id?: string}} opts user_id
     * @return {Promise<APIResponse>} The server response
     *
     * example server side:
     * await channel.unmute({user_id: userId});
     */

  }, {
    key: "unmute",
    value: function () {
      var _unmute = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee23() {
        var opts,
            _args23 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee23$(_context23) {
          while (1) {
            switch (_context23.prev = _context23.next) {
              case 0:
                opts = _args23.length > 0 && _args23[0] !== undefined ? _args23[0] : {};
                _context23.next = 3;
                return this.getClient().post(this.getClient().baseURL + '/moderation/unmute/channel', _objectSpread$2({
                  channel_cid: this.cid
                }, opts));

              case 3:
                return _context23.abrupt("return", _context23.sent);

              case 4:
              case "end":
                return _context23.stop();
            }
          }
        }, _callee23, this);
      }));

      function unmute() {
        return _unmute.apply(this, arguments);
      }

      return unmute;
    }()
    /**
     * muteStatus - returns the mute status for the current channel
     * @return {{ muted: boolean; createdAt: Date | null; expiresAt: Date | null }} { muted: true | false, createdAt: Date | null, expiresAt: Date | null}
     */

  }, {
    key: "muteStatus",
    value: function muteStatus() {
      this._checkInitialized();

      return this.getClient()._muteStatus(this.cid);
    }
  }, {
    key: "sendAction",
    value: function sendAction(messageID, formData) {
      this._checkInitialized();

      if (!messageID) {
        throw Error("Message id is missing");
      }

      return this.getClient().post(this.getClient().baseURL + "/messages/".concat(messageID, "/action"), {
        message_id: messageID,
        form_data: formData,
        id: this.id,
        type: this.type
      });
    }
    /**
     * keystroke - First of the typing.start and typing.stop events based on the users keystrokes.
     * Call this on every keystroke
     * @see {@link https://getstream.io/chat/docs/typing_indicators/?language=js|Docs}
     * @param {string} [parent_id] set this field to `message.id` to indicate that typing event is happening in a thread
     */

  }, {
    key: "keystroke",
    value: function () {
      var _keystroke = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee24(parent_id) {
        var _this$getConfig;

        var now, diff;
        return _regeneratorRuntime__default['default'].wrap(function _callee24$(_context24) {
          while (1) {
            switch (_context24.prev = _context24.next) {
              case 0:
                if ((_this$getConfig = this.getConfig()) !== null && _this$getConfig !== void 0 && _this$getConfig.typing_events) {
                  _context24.next = 2;
                  break;
                }

                return _context24.abrupt("return");

              case 2:
                now = new Date();
                diff = this.lastTypingEvent && now.getTime() - this.lastTypingEvent.getTime();
                this.lastKeyStroke = now;
                this.isTyping = true; // send a typing.start every 2 seconds

                if (!(diff === null || diff > 2000)) {
                  _context24.next = 10;
                  break;
                }

                this.lastTypingEvent = new Date();
                _context24.next = 10;
                return this.sendEvent({
                  type: 'typing.start',
                  parent_id: parent_id
                });

              case 10:
              case "end":
                return _context24.stop();
            }
          }
        }, _callee24, this);
      }));

      function keystroke(_x24) {
        return _keystroke.apply(this, arguments);
      }

      return keystroke;
    }()
    /**
     * stopTyping - Sets last typing to null and sends the typing.stop event
     * @see {@link https://getstream.io/chat/docs/typing_indicators/?language=js|Docs}
     * @param {string} [parent_id] set this field to `message.id` to indicate that typing event is happening in a thread
     */

  }, {
    key: "stopTyping",
    value: function () {
      var _stopTyping = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee25(parent_id) {
        var _this$getConfig2;

        return _regeneratorRuntime__default['default'].wrap(function _callee25$(_context25) {
          while (1) {
            switch (_context25.prev = _context25.next) {
              case 0:
                if ((_this$getConfig2 = this.getConfig()) !== null && _this$getConfig2 !== void 0 && _this$getConfig2.typing_events) {
                  _context25.next = 2;
                  break;
                }

                return _context25.abrupt("return");

              case 2:
                this.lastTypingEvent = null;
                this.isTyping = false;
                _context25.next = 6;
                return this.sendEvent({
                  type: 'typing.stop',
                  parent_id: parent_id
                });

              case 6:
              case "end":
                return _context25.stop();
            }
          }
        }, _callee25, this);
      }));

      function stopTyping(_x25) {
        return _stopTyping.apply(this, arguments);
      }

      return stopTyping;
    }()
    /**
     * lastMessage - return the last message, takes into account that last few messages might not be perfectly sorted
     *
     * @return {ReturnType<ChannelState<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>['formatMessage']> | undefined} Description
     */

  }, {
    key: "lastMessage",
    value: function lastMessage() {
      // get last 5 messages, sort, return the latest
      // get a slice of the last 5
      var min = this.state.messages.length - 5;

      if (min < 0) {
        min = 0;
      }

      var max = this.state.messages.length + 1;
      var messageSlice = this.state.messages.slice(min, max); // sort by pk desc

      messageSlice.sort(function (a, b) {
        return b.created_at.getTime() - a.created_at.getTime();
      });
      return messageSlice[0];
    }
    /**
     * markRead - Send the mark read event for this user, only works if the `read_events` setting is enabled
     *
     * @param {MarkReadOptions<UserType>} data
     * @return {Promise<EventAPIResponse<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType> | null>} Description
     */

  }, {
    key: "markRead",
    value: function () {
      var _markRead = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee26() {
        var _this$getConfig3;

        var data,
            _args26 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee26$(_context26) {
          while (1) {
            switch (_context26.prev = _context26.next) {
              case 0:
                data = _args26.length > 0 && _args26[0] !== undefined ? _args26[0] : {};

                this._checkInitialized();

                if ((_this$getConfig3 = this.getConfig()) !== null && _this$getConfig3 !== void 0 && _this$getConfig3.read_events) {
                  _context26.next = 4;
                  break;
                }

                return _context26.abrupt("return", Promise.resolve(null));

              case 4:
                _context26.next = 6;
                return this.getClient().post(this._channelURL() + '/read', _objectSpread$2({}, data));

              case 6:
                return _context26.abrupt("return", _context26.sent);

              case 7:
              case "end":
                return _context26.stop();
            }
          }
        }, _callee26, this);
      }));

      function markRead() {
        return _markRead.apply(this, arguments);
      }

      return markRead;
    }()
    /**
     * clean - Cleans the channel state and fires stop typing if needed
     */

  }, {
    key: "clean",
    value: function clean() {
      if (this.lastKeyStroke) {
        var now = new Date();
        var diff = now.getTime() - this.lastKeyStroke.getTime();

        if (diff > 1000 && this.isTyping) {
          logChatPromiseExecution(this.stopTyping(), 'stop typing event');
        }
      }

      this.state.clean();
    }
    /**
     * watch - Loads the initial channel state and watches for changes
     *
     * @param {ChannelQueryOptions<ChannelType, CommandType, UserType>} options additional options for the query endpoint
     *
     * @return {Promise<ChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The server response
     */

  }, {
    key: "watch",
    value: function () {
      var _watch = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee27(options) {
        var defaultOptions, combined, state;
        return _regeneratorRuntime__default['default'].wrap(function _callee27$(_context27) {
          while (1) {
            switch (_context27.prev = _context27.next) {
              case 0:
                defaultOptions = {
                  state: true,
                  watch: true,
                  presence: false
                }; // Make sure we wait for the connect promise if there is a pending one

                _context27.next = 3;
                return this.getClient().wsPromise;

              case 3:
                if (!this.getClient()._hasConnectionID()) {
                  defaultOptions.watch = false;
                }

                combined = _objectSpread$2(_objectSpread$2({}, defaultOptions), options);
                _context27.next = 7;
                return this.query(combined);

              case 7:
                state = _context27.sent;
                this.initialized = true;
                this.data = state.channel;

                this._client.logger('info', "channel:watch() - started watching channel ".concat(this.cid), {
                  tags: ['channel'],
                  channel: this
                });

                return _context27.abrupt("return", state);

              case 12:
              case "end":
                return _context27.stop();
            }
          }
        }, _callee27, this);
      }));

      function watch(_x26) {
        return _watch.apply(this, arguments);
      }

      return watch;
    }()
    /**
     * stopWatching - Stops watching the channel
     *
     * @return {Promise<APIResponse>} The server response
     */

  }, {
    key: "stopWatching",
    value: function () {
      var _stopWatching = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee28() {
        var response;
        return _regeneratorRuntime__default['default'].wrap(function _callee28$(_context28) {
          while (1) {
            switch (_context28.prev = _context28.next) {
              case 0:
                _context28.next = 2;
                return this.getClient().post(this._channelURL() + '/stop-watching', {});

              case 2:
                response = _context28.sent;

                this._client.logger('info', "channel:watch() - stopped watching channel ".concat(this.cid), {
                  tags: ['channel'],
                  channel: this
                });

                return _context28.abrupt("return", response);

              case 5:
              case "end":
                return _context28.stop();
            }
          }
        }, _callee28, this);
      }));

      function stopWatching() {
        return _stopWatching.apply(this, arguments);
      }

      return stopWatching;
    }()
    /**
     * getReplies - List the message replies for a parent message
     *
     * @param {string} parent_id The message parent id, ie the top of the thread
     * @param {PaginationOptions & { user?: UserResponse<UserType>; user_id?: string }} options Pagination params, ie {limit:10, id_lte: 10}
     *
     * @return {Promise<GetRepliesAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} A response with a list of messages
     */

  }, {
    key: "getReplies",
    value: function () {
      var _getReplies = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee29(parent_id, options) {
        var data;
        return _regeneratorRuntime__default['default'].wrap(function _callee29$(_context29) {
          while (1) {
            switch (_context29.prev = _context29.next) {
              case 0:
                _context29.next = 2;
                return this.getClient().get(this.getClient().baseURL + "/messages/".concat(parent_id, "/replies"), _objectSpread$2({}, options));

              case 2:
                data = _context29.sent;

                // add any messages to our thread state
                if (data.messages) {
                  this.state.addMessagesSorted(data.messages);
                }

                return _context29.abrupt("return", data);

              case 5:
              case "end":
                return _context29.stop();
            }
          }
        }, _callee29, this);
      }));

      function getReplies(_x27, _x28) {
        return _getReplies.apply(this, arguments);
      }

      return getReplies;
    }()
    /**
     * getReactions - List the reactions, supports pagination
     *
     * @param {string} message_id The message id
     * @param {{ limit?: number; offset?: number }} options The pagination options
     *
     * @return {Promise<GetReactionsAPIResponse<ReactionType, UserType>>} Server response
     */

  }, {
    key: "getReactions",
    value: function getReactions(message_id, options) {
      return this.getClient().get(this.getClient().baseURL + "/messages/".concat(message_id, "/reactions"), _objectSpread$2({}, options));
    }
    /**
     * getMessagesById - Retrieves a list of messages by ID
     *
     * @param {string[]} messageIds The ids of the messages to retrieve from this channel
     *
     * @return {Promise<GetMultipleMessagesAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} Server response
     */

  }, {
    key: "getMessagesById",
    value: function getMessagesById(messageIds) {
      return this.getClient().get(this._channelURL() + '/messages', {
        ids: messageIds.join(',')
      });
    }
    /**
     * lastRead - returns the last time the user marked the channel as read if the user never marked the channel as read, this will return null
     * @return {Date | null | undefined}
     */

  }, {
    key: "lastRead",
    value: function lastRead() {
      this._checkInitialized();

      var _this$getClient = this.getClient(),
          userID = _this$getClient.userID;

      if (userID) {
        return this.state.read[userID] ? this.state.read[userID].last_read : null;
      }
    }
  }, {
    key: "_countMessageAsUnread",
    value: function _countMessageAsUnread(message) {
      var _message$user, _message$user2;

      if (message.shadowed) return false;
      if (message.silent) return false;
      if (((_message$user = message.user) === null || _message$user === void 0 ? void 0 : _message$user.id) === this.getClient().userID) return false;
      if ((_message$user2 = message.user) !== null && _message$user2 !== void 0 && _message$user2.id && this.getClient().userMuteStatus(message.user.id)) return false;
      if (this.muteStatus().muted) return false;
      return true;
    }
    /**
     * countUnread - Count of unread messages
     *
     * @param {Date | null} [lastRead] lastRead the time that the user read a message, defaults to current user's read state
     *
     * @return {number} Unread count
     */

  }, {
    key: "countUnread",
    value: function countUnread(lastRead) {
      if (!lastRead) return this.state.unreadCount;
      var count = 0;

      for (var i = 0; i < this.state.messages.length; i += 1) {
        var message = this.state.messages[i];

        if (message.created_at > lastRead && this._countMessageAsUnread(message)) {
          count++;
        }
      }

      return count;
    }
    /**
     * countUnread - Count the number of unread messages mentioning the current user
     *
     * @return {number} Unread mentions count
     */

  }, {
    key: "countUnreadMentions",
    value: function countUnreadMentions() {
      var lastRead = this.lastRead();
      var userID = this.getClient().userID;
      var count = 0;

      for (var i = 0; i < this.state.messages.length; i += 1) {
        var _message$mentioned_us;

        var message = this.state.messages[i];

        if (this._countMessageAsUnread(message) && (!lastRead || message.created_at > lastRead) && (_message$mentioned_us = message.mentioned_users) !== null && _message$mentioned_us !== void 0 && _message$mentioned_us.some(function (user) {
          return user.id === userID;
        })) {
          count++;
        }
      }

      return count;
    }
    /**
     * create - Creates a new channel
     *
     * @return {Promise<ChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} The Server Response
     */

  }, {
    key: "query",
    value:
    /**
     * query - Query the API, get messages, members or other channel fields
     *
     * @param {ChannelQueryOptions<ChannelType, CommandType, UserType>} options The query options
     *
     * @return {Promise<ChannelAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} Returns a query response
     */
    function () {
      var _query = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee30(options) {
        var queryURL, state, membersStr, tempChannelCid;
        return _regeneratorRuntime__default['default'].wrap(function _callee30$(_context30) {
          while (1) {
            switch (_context30.prev = _context30.next) {
              case 0:
                _context30.next = 2;
                return this.getClient().wsPromise;

              case 2:
                queryURL = "".concat(this.getClient().baseURL, "/channels/").concat(this.type);

                if (this.id) {
                  queryURL += "/".concat(this.id);
                }

                _context30.next = 6;
                return this.getClient().post(queryURL + '/query', _objectSpread$2({
                  data: this._data,
                  state: true
                }, options));

              case 6:
                state = _context30.sent;

                // update the channel id if it was missing
                if (!this.id) {
                  this.id = state.channel.id;
                  this.cid = state.channel.cid; // set the channel as active...

                  membersStr = state.members.map(function (member) {
                    var _member$user;

                    return member.user_id || ((_member$user = member.user) === null || _member$user === void 0 ? void 0 : _member$user.id);
                  }).sort().join(',');
                  tempChannelCid = "".concat(this.type, ":!members-").concat(membersStr);

                  if (tempChannelCid in this.getClient().activeChannels) {
                    // This gets set in `client.channel()` function, when channel is created
                    // using members, not id.
                    delete this.getClient().activeChannels[tempChannelCid];
                  }

                  if (!(this.cid in this.getClient().activeChannels)) {
                    this.getClient().activeChannels[this.cid] = this;
                  }
                }

                this.getClient()._addChannelConfig(state); // add any messages to our channel state


                this._initializeState(state);

                return _context30.abrupt("return", state);

              case 11:
              case "end":
                return _context30.stop();
            }
          }
        }, _callee30, this);
      }));

      function query(_x29) {
        return _query.apply(this, arguments);
      }

      return query;
    }()
    /**
     * banUser - Bans a user from a channel
     *
     * @param {string} targetUserID
     * @param {BanUserOptions<UserType>} options
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "banUser",
    value: function () {
      var _banUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee31(targetUserID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee31$(_context31) {
          while (1) {
            switch (_context31.prev = _context31.next) {
              case 0:
                this._checkInitialized();

                _context31.next = 3;
                return this.getClient().banUser(targetUserID, _objectSpread$2(_objectSpread$2({}, options), {}, {
                  type: this.type,
                  id: this.id
                }));

              case 3:
                return _context31.abrupt("return", _context31.sent);

              case 4:
              case "end":
                return _context31.stop();
            }
          }
        }, _callee31, this);
      }));

      function banUser(_x30, _x31) {
        return _banUser.apply(this, arguments);
      }

      return banUser;
    }()
    /**
     * hides the channel from queryChannels for the user until a message is added
     * If clearHistory is set to true - all messages will be removed for the user
     *
     * @param {string | null} userId
     * @param {boolean} clearHistory
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "hide",
    value: function () {
      var _hide = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee32() {
        var userId,
            clearHistory,
            _args32 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee32$(_context32) {
          while (1) {
            switch (_context32.prev = _context32.next) {
              case 0:
                userId = _args32.length > 0 && _args32[0] !== undefined ? _args32[0] : null;
                clearHistory = _args32.length > 1 && _args32[1] !== undefined ? _args32[1] : false;

                this._checkInitialized();

                _context32.next = 5;
                return this.getClient().post("".concat(this._channelURL(), "/hide"), {
                  user_id: userId,
                  clear_history: clearHistory
                });

              case 5:
                return _context32.abrupt("return", _context32.sent);

              case 6:
              case "end":
                return _context32.stop();
            }
          }
        }, _callee32, this);
      }));

      function hide() {
        return _hide.apply(this, arguments);
      }

      return hide;
    }()
    /**
     * removes the hidden status for a channel
     *
     * @param {string | null} userId
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "show",
    value: function () {
      var _show = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee33() {
        var userId,
            _args33 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee33$(_context33) {
          while (1) {
            switch (_context33.prev = _context33.next) {
              case 0:
                userId = _args33.length > 0 && _args33[0] !== undefined ? _args33[0] : null;

                this._checkInitialized();

                _context33.next = 4;
                return this.getClient().post("".concat(this._channelURL(), "/show"), {
                  user_id: userId
                });

              case 4:
                return _context33.abrupt("return", _context33.sent);

              case 5:
              case "end":
                return _context33.stop();
            }
          }
        }, _callee33, this);
      }));

      function show() {
        return _show.apply(this, arguments);
      }

      return show;
    }()
    /**
     * unbanUser - Removes the bans for a user on a channel
     *
     * @param {string} targetUserID
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "unbanUser",
    value: function () {
      var _unbanUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee34(targetUserID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee34$(_context34) {
          while (1) {
            switch (_context34.prev = _context34.next) {
              case 0:
                this._checkInitialized();

                _context34.next = 3;
                return this.getClient().unbanUser(targetUserID, {
                  type: this.type,
                  id: this.id
                });

              case 3:
                return _context34.abrupt("return", _context34.sent);

              case 4:
              case "end":
                return _context34.stop();
            }
          }
        }, _callee34, this);
      }));

      function unbanUser(_x32) {
        return _unbanUser.apply(this, arguments);
      }

      return unbanUser;
    }()
    /**
     * shadowBan - Shadow bans a user from a channel
     *
     * @param {string} targetUserID
     * @param {BanUserOptions<UserType>} options
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "shadowBan",
    value: function () {
      var _shadowBan = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee35(targetUserID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee35$(_context35) {
          while (1) {
            switch (_context35.prev = _context35.next) {
              case 0:
                this._checkInitialized();

                _context35.next = 3;
                return this.getClient().shadowBan(targetUserID, _objectSpread$2(_objectSpread$2({}, options), {}, {
                  type: this.type,
                  id: this.id
                }));

              case 3:
                return _context35.abrupt("return", _context35.sent);

              case 4:
              case "end":
                return _context35.stop();
            }
          }
        }, _callee35, this);
      }));

      function shadowBan(_x33, _x34) {
        return _shadowBan.apply(this, arguments);
      }

      return shadowBan;
    }()
    /**
     * removeShadowBan - Removes the shadow ban for a user on a channel
     *
     * @param {string} targetUserID
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "removeShadowBan",
    value: function () {
      var _removeShadowBan = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee36(targetUserID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee36$(_context36) {
          while (1) {
            switch (_context36.prev = _context36.next) {
              case 0:
                this._checkInitialized();

                _context36.next = 3;
                return this.getClient().removeShadowBan(targetUserID, {
                  type: this.type,
                  id: this.id
                });

              case 3:
                return _context36.abrupt("return", _context36.sent);

              case 4:
              case "end":
                return _context36.stop();
            }
          }
        }, _callee36, this);
      }));

      function removeShadowBan(_x35) {
        return _removeShadowBan.apply(this, arguments);
      }

      return removeShadowBan;
    }()
    /**
     * on - Listen to events on this channel.
     *
     * channel.on('message.new', event => {console.log("my new message", event, channel.state.messages)})
     * or
     * channel.on(event => {console.log(event.type)})
     *
     * @param {EventHandler<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType> | EventTypes} callbackOrString  The event type to listen for (optional)
     * @param {EventHandler<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>} [callbackOrNothing] The callback to call
     */

  }, {
    key: "on",
    value: function on(callbackOrString, callbackOrNothing) {
      var _this2 = this;

      var key = callbackOrNothing ? callbackOrString : 'all';
      var valid = isValidEventType(key);

      if (!valid) {
        throw Error("Invalid event type ".concat(key));
      }

      var callback = callbackOrNothing ? callbackOrNothing : callbackOrString;

      if (!(key in this.listeners)) {
        this.listeners[key] = [];
      }

      this._client.logger('info', "Attaching listener for ".concat(key, " event on channel ").concat(this.cid), {
        tags: ['event', 'channel'],
        channel: this
      });

      this.listeners[key].push(callback);
      return {
        unsubscribe: function unsubscribe() {
          _this2._client.logger('info', "Removing listener for ".concat(key, " event from channel ").concat(_this2.cid), {
            tags: ['event', 'channel'],
            channel: _this2
          });

          _this2.listeners[key] = _this2.listeners[key].filter(function (el) {
            return el !== callback;
          });
        }
      };
    }
    /**
     * off - Remove the event handler
     *
     */

  }, {
    key: "off",
    value: function off(callbackOrString, callbackOrNothing) {
      var key = callbackOrNothing ? callbackOrString : 'all';
      var valid = isValidEventType(key);

      if (!valid) {
        throw Error("Invalid event type ".concat(key));
      }

      var callback = callbackOrNothing ? callbackOrNothing : callbackOrString;

      if (!(key in this.listeners)) {
        this.listeners[key] = [];
      }

      this._client.logger('info', "Removing listener for ".concat(key, " event from channel ").concat(this.cid), {
        tags: ['event', 'channel'],
        channel: this
      });

      this.listeners[key] = this.listeners[key].filter(function (value) {
        return value !== callback;
      });
    } // eslint-disable-next-line sonarjs/cognitive-complexity

  }, {
    key: "_handleChannelEvent",
    value: function _handleChannelEvent(event) {
      var _event$user, _event$user2, _event$user3, _event$user5, _event$user6, _event$member, _event$user9;

      var channel = this;

      this._client.logger('info', "channel:_handleChannelEvent - Received event of type { ".concat(event.type, " } on ").concat(this.cid), {
        tags: ['event', 'channel'],
        channel: this
      });

      var channelState = channel.state;

      switch (event.type) {
        case 'typing.start':
          if ((_event$user = event.user) !== null && _event$user !== void 0 && _event$user.id) {
            channelState.typing[event.user.id] = event;
          }

          break;

        case 'typing.stop':
          if ((_event$user2 = event.user) !== null && _event$user2 !== void 0 && _event$user2.id) {
            delete channelState.typing[event.user.id];
          }

          break;

        case 'message.read':
          if ((_event$user3 = event.user) !== null && _event$user3 !== void 0 && _event$user3.id) {
            var _event$user4, _this$getClient$user;

            channelState.read[event.user.id] = {
              // because in client.ts the handleEvent call that flows to this sets this `event.received_at = new Date();`
              last_read: event.received_at,
              user: event.user
            };

            if (((_event$user4 = event.user) === null || _event$user4 === void 0 ? void 0 : _event$user4.id) === ((_this$getClient$user = this.getClient().user) === null || _this$getClient$user === void 0 ? void 0 : _this$getClient$user.id)) {
              channelState.unreadCount = 0;
            }
          }

          break;

        case 'user.watching.start':
        case 'user.updated':
          if ((_event$user5 = event.user) !== null && _event$user5 !== void 0 && _event$user5.id) {
            channelState.watchers[event.user.id] = event.user;
          }

          break;

        case 'user.watching.stop':
          if ((_event$user6 = event.user) !== null && _event$user6 !== void 0 && _event$user6.id) {
            delete channelState.watchers[event.user.id];
          }

          break;

        case 'message.deleted':
          if (event.message) {
            if (event.hard_delete) channelState.removeMessage(event.message);else channelState.addMessageSorted(event.message, false, false);
            channelState.removeQuotedMessageReferences(event.message);

            if (event.message.pinned) {
              channelState.removePinnedMessage(event.message);
            }
          }

          break;

        case 'message.new':
          if (event.message) {
            var _event$user7, _this$getClient$user2, _event$user8;

            /* if message belongs to current user, always assume timestamp is changed to filter it out and add again to avoid duplication */
            var ownMessage = ((_event$user7 = event.user) === null || _event$user7 === void 0 ? void 0 : _event$user7.id) === ((_this$getClient$user2 = this.getClient().user) === null || _this$getClient$user2 === void 0 ? void 0 : _this$getClient$user2.id);
            var isThreadMessage = event.message.parent_id && !event.message.show_in_channel;

            if (this.state.isUpToDate || isThreadMessage) {
              channelState.addMessageSorted(event.message, ownMessage);
            }

            if (event.message.pinned) {
              channelState.addPinnedMessage(event.message);
            }

            if (ownMessage && (_event$user8 = event.user) !== null && _event$user8 !== void 0 && _event$user8.id) {
              channelState.unreadCount = 0;
              channelState.read[event.user.id] = {
                last_read: new Date(event.created_at),
                user: event.user
              };
            } else if (this._countMessageAsUnread(event.message)) {
              channelState.unreadCount = channelState.unreadCount + 1;
            }
          }

          break;

        case 'message.updated':
          if (event.message) {
            channelState.addMessageSorted(event.message, false, false);

            if (event.message.pinned) {
              channelState.addPinnedMessage(event.message);
            } else {
              channelState.removePinnedMessage(event.message);
            }
          }

          break;

        case 'channel.truncated':
          channelState.clearMessages();
          channelState.unreadCount = 0;
          break;

        case 'member.added':
        case 'member.updated':
          if ((_event$member = event.member) !== null && _event$member !== void 0 && _event$member.user_id) {
            channelState.members[event.member.user_id] = event.member;
          }

          break;

        case 'member.removed':
          if ((_event$user9 = event.user) !== null && _event$user9 !== void 0 && _event$user9.id) {
            delete channelState.members[event.user.id];
          }

          break;

        case 'channel.updated':
          if (event.channel) {
            channel.data = event.channel;
          }

          break;

        case 'reaction.new':
          if (event.message && event.reaction) {
            event.message = channelState.addReaction(event.reaction, event.message);
          }

          break;

        case 'reaction.deleted':
          if (event.reaction) {
            event.message = channelState.removeReaction(event.reaction, event.message);
          }

          break;

        case 'reaction.updated':
          if (event.reaction) {
            // assuming reaction.updated is only called if enforce_unique is true
            event.message = channelState.addReaction(event.reaction, event.message, true);
          }

          break;

        case 'channel.hidden':
          if (event.clear_history) {
            channelState.clearMessages();
          }

          break;
      } // any event can send over the online count


      if (event.watcher_count !== undefined) {
        channel.state.watcher_count = event.watcher_count;
      }
    }
  }, {
    key: "_checkInitialized",
    value: function _checkInitialized() {
      if (!this.initialized && !this.getClient()._isUsingServerAuth()) {
        throw Error("Channel ".concat(this.cid, " hasn't been initialized yet. Make sure to call .watch() and wait for it to resolve"));
      }
    } // eslint-disable-next-line sonarjs/cognitive-complexity

  }, {
    key: "_initializeState",
    value: function _initializeState(state) {
      var _this$getClient2 = this.getClient(),
          clientState = _this$getClient2.state,
          user = _this$getClient2.user,
          userID = _this$getClient2.userID; // add the Users


      if (state.members) {
        var _iterator = _createForOfIteratorHelper$2(state.members),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var member = _step.value;

            if (member.user) {
              clientState.updateUserReference(member.user, this.cid);
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      this.state.membership = state.membership || {};
      var messages = state.messages || [];

      if (!this.state.messages) {
        this.state.messages = [];
      }

      this.state.addMessagesSorted(messages, false, true);

      if (!this.state.pinnedMessages) {
        this.state.pinnedMessages = [];
      }

      this.state.addPinnedMessages(state.pinned_messages || []);
      this.state.watcher_count = state.watcher_count || 0; // convert the arrays into objects for easier syncing...

      if (state.watchers) {
        var _iterator2 = _createForOfIteratorHelper$2(state.watchers),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var watcher = _step2.value;

            if (watcher) {
              clientState.updateUserReference(watcher, this.cid);
              this.state.watchers[watcher.id] = watcher;
            }
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      } // initialize read state to last message or current time if the channel is empty
      // if the user is a member, this value will be overwritten later on otherwise this ensures
      // that everything up to this point is not marked as unread


      if (userID != null) {
        var last_read = this.state.last_message_at || new Date();

        if (user) {
          this.state.read[user.id] = {
            user: user,
            last_read: last_read
          };
        }
      } // apply read state if part of the state


      if (state.read) {
        var _iterator3 = _createForOfIteratorHelper$2(state.read),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var read = _step3.value;

            var parsedRead = _objectSpread$2(_objectSpread$2({}, read), {}, {
              last_read: new Date(read.last_read)
            });

            this.state.read[read.user.id] = parsedRead;

            if (read.user.id === (user === null || user === void 0 ? void 0 : user.id) && typeof parsedRead.unread_messages === 'number') {
              this.state.unreadCount = parsedRead.unread_messages;
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }

      if (state.members) {
        var _iterator4 = _createForOfIteratorHelper$2(state.members),
            _step4;

        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            var _member = _step4.value;

            if (_member.user) {
              this.state.members[_member.user.id] = _member;
            }
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }
      }
    }
  }, {
    key: "_disconnect",
    value: function _disconnect() {
      this._client.logger('info', "channel:disconnect() - Disconnecting the channel ".concat(this.cid), {
        tags: ['connection', 'channel'],
        channel: this
      });

      this.disconnected = true;
      this.state.setIsUpToDate(false);
    }
  }]);

  return Channel;
}();

function _createForOfIteratorHelper$1(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * ClientState - A container class for the client state.
 */
var ClientState = /*#__PURE__*/function () {
  function ClientState() {
    _classCallCheck__default['default'](this, ClientState);

    _defineProperty__default['default'](this, "users", void 0);

    _defineProperty__default['default'](this, "userChannelReferences", void 0);

    // show the status for a certain user...
    // ie online, offline etc
    this.users = {}; // store which channels contain references to the specified user...

    this.userChannelReferences = {};
  }

  _createClass__default['default'](ClientState, [{
    key: "updateUsers",
    value: function updateUsers(users) {
      var _iterator = _createForOfIteratorHelper$1(users),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var user = _step.value;
          this.updateUser(user);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }, {
    key: "updateUser",
    value: function updateUser(user) {
      if (user != null) {
        this.users[user.id] = user;
      }
    }
  }, {
    key: "updateUserReference",
    value: function updateUserReference(user, channelID) {
      if (user == null) {
        return;
      }

      this.updateUser(user);

      if (!this.userChannelReferences[user.id]) {
        this.userChannelReferences[user.id] = {};
      }

      this.userChannelReferences[user.id][channelID] = true;
    }
  }, {
    key: "deleteAllChannelReference",
    value: function deleteAllChannelReference(channelID) {
      for (var userID in this.userChannelReferences) {
        delete this.userChannelReferences[userID][channelID];
      }
    }
  }]);

  return ClientState;
}();

// Type guards to check WebSocket error type
var isCloseEvent = function isCloseEvent(res) {
  return res.code !== undefined;
};

var isErrorEvent = function isErrorEvent(res) {
  return res.error !== undefined;
};

/**
 * StableWSConnection - A WS connection that reconnects upon failure.
 * - the browser will sometimes report that you're online or offline
 * - the WS connection can break and fail (there is a 30s health check)
 * - sometimes your WS connection will seem to work while the user is in fact offline
 * - to speed up online/offline detection you can use the window.addEventListener('offline');
 *
 * There are 4 ways in which a connection can become unhealthy:
 * - websocket.onerror is called
 * - websocket.onclose is called
 * - the health check fails and no event is received for ~40 seconds
 * - the browser indicates the connection is now offline
 *
 * There are 2 assumptions we make about the server:
 * - state can be recovered by querying the channel again
 * - if the servers fails to publish a message to the client, the WS connection is destroyed
 */
var StableWSConnection = /*#__PURE__*/function () {
  function StableWSConnection(_ref) {
    var _this = this;

    var apiKey = _ref.apiKey,
        authType = _ref.authType,
        clientID = _ref.clientID,
        eventCallback = _ref.eventCallback,
        logger = _ref.logger,
        messageCallback = _ref.messageCallback,
        recoverCallback = _ref.recoverCallback,
        tokenManager = _ref.tokenManager,
        user = _ref.user,
        userAgent = _ref.userAgent,
        userID = _ref.userID,
        wsBaseURL = _ref.wsBaseURL,
        device = _ref.device;

    _classCallCheck__default['default'](this, StableWSConnection);

    _defineProperty__default['default'](this, "apiKey", void 0);

    _defineProperty__default['default'](this, "authType", void 0);

    _defineProperty__default['default'](this, "clientID", void 0);

    _defineProperty__default['default'](this, "eventCallback", void 0);

    _defineProperty__default['default'](this, "logger", void 0);

    _defineProperty__default['default'](this, "messageCallback", void 0);

    _defineProperty__default['default'](this, "recoverCallback", void 0);

    _defineProperty__default['default'](this, "tokenManager", void 0);

    _defineProperty__default['default'](this, "user", void 0);

    _defineProperty__default['default'](this, "userAgent", void 0);

    _defineProperty__default['default'](this, "userID", void 0);

    _defineProperty__default['default'](this, "wsBaseURL", void 0);

    _defineProperty__default['default'](this, "device", void 0);

    _defineProperty__default['default'](this, "connectionID", void 0);

    _defineProperty__default['default'](this, "connectionOpen", void 0);

    _defineProperty__default['default'](this, "consecutiveFailures", void 0);

    _defineProperty__default['default'](this, "pingInterval", void 0);

    _defineProperty__default['default'](this, "healthCheckTimeoutRef", void 0);

    _defineProperty__default['default'](this, "isConnecting", void 0);

    _defineProperty__default['default'](this, "isHealthy", void 0);

    _defineProperty__default['default'](this, "isResolved", void 0);

    _defineProperty__default['default'](this, "lastEvent", void 0);

    _defineProperty__default['default'](this, "connectionCheckTimeout", void 0);

    _defineProperty__default['default'](this, "connectionCheckTimeoutRef", void 0);

    _defineProperty__default['default'](this, "rejectPromise", void 0);

    _defineProperty__default['default'](this, "resolvePromise", void 0);

    _defineProperty__default['default'](this, "totalFailures", void 0);

    _defineProperty__default['default'](this, "ws", void 0);

    _defineProperty__default['default'](this, "wsID", void 0);

    _defineProperty__default['default'](this, "_buildUrl", function () {
      var params = {
        user_id: _this.user.id,
        user_details: _this.user,
        user_token: _this.tokenManager.getToken(),
        server_determines_connection_id: true,
        device: _this.device
      };
      var qs = encodeURIComponent(JSON.stringify(params));

      var token = _this.tokenManager.getToken();

      return "".concat(_this.wsBaseURL, "/connect?json=").concat(qs, "&api_key=").concat(_this.apiKey, "&authorization=").concat(token, "&stream-auth-type=").concat(_this.authType, "&X-Stream-Client=").concat(_this.userAgent);
    });

    _defineProperty__default['default'](this, "onlineStatusChanged", function (event) {
      if (event.type === 'offline') {
        // mark the connection as down
        _this.logger('info', 'connection:onlineStatusChanged() - Status changing to offline', {
          tags: ['connection']
        });

        _this._setHealth(false);
      } else if (event.type === 'online') {
        // retry right now...
        // We check this.isHealthy, not sure if it's always
        // smart to create a new WS connection if the old one is still up and running.
        // it's possible we didn't miss any messages, so this process is just expensive and not needed.
        _this.logger('info', "connection:onlineStatusChanged() - Status changing to online. isHealthy: ".concat(_this.isHealthy), {
          tags: ['connection']
        });

        if (!_this.isHealthy) {
          _this._reconnect({
            interval: 10
          });
        }
      }
    });

    _defineProperty__default['default'](this, "onopen", function (wsID) {
      if (_this.wsID !== wsID) return;

      _this.logger('info', 'connection:onopen() - onopen callback', {
        tags: ['connection'],
        wsID: wsID
      });
    });

    _defineProperty__default['default'](this, "onmessage", function (wsID, event) {
      if (_this.wsID !== wsID) return;
      var data = typeof event.data === 'string' ? JSON.parse(event.data) : null; // we wait till the first message before we consider the connection open..
      // the reason for this is that auth errors and similar errors trigger a ws.onopen and immediately
      // after that a ws.onclose..

      if (!_this.isResolved && data) {
        _this.isResolved = true;

        if (data.error != null) {
          var _this$rejectPromise;

          (_this$rejectPromise = _this.rejectPromise) === null || _this$rejectPromise === void 0 ? void 0 : _this$rejectPromise.call(_this, _this._errorFromWSEvent(data, false));
          return;
        } else {
          var _this$resolvePromise;

          (_this$resolvePromise = _this.resolvePromise) === null || _this$resolvePromise === void 0 ? void 0 : _this$resolvePromise.call(_this, event);

          _this._setHealth(true);
        }
      } // trigger the event..


      _this.lastEvent = new Date();

      _this.logger('info', 'connection:onmessage() - onmessage callback', {
        tags: ['connection'],
        event: event,
        wsID: wsID
      });

      if (data && data.type === 'health.check') {
        _this.scheduleNextPing();
      }

      _this.messageCallback(event);

      _this.scheduleConnectionCheck();
    });

    _defineProperty__default['default'](this, "onclose", function (wsID, event) {
      _this.logger('info', 'connection:onclose() - onclose callback - ' + event.code, {
        tags: ['connection'],
        event: event,
        wsID: wsID
      });

      if (_this.wsID !== wsID) return;

      if (event.code === chatCodes.WS_CLOSED_SUCCESS) {
        var _this$rejectPromise2;

        // this is a permanent error raised by stream..
        // usually caused by invalid auth details
        var error = new Error("WS connection reject with error ".concat(event.reason));
        error.reason = event.reason;
        (_this$rejectPromise2 = _this.rejectPromise) === null || _this$rejectPromise2 === void 0 ? void 0 : _this$rejectPromise2.call(_this, error);

        _this.logger('info', "connection:onclose() - WS connection reject with error ".concat(event.reason), {
          tags: ['connection'],
          event: event
        });
      } else {
        var _this$rejectPromise3;

        _this.consecutiveFailures += 1;
        _this.totalFailures += 1;

        _this._setHealth(false);

        _this.isConnecting = false;
        (_this$rejectPromise3 = _this.rejectPromise) === null || _this$rejectPromise3 === void 0 ? void 0 : _this$rejectPromise3.call(_this, _this._errorFromWSEvent(event));

        _this.logger('info', "connection:onclose() - WS connection closed. Calling reconnect ...", {
          tags: ['connection'],
          event: event
        }); // reconnect if its an abnormal failure


        _this._reconnect();
      }
    });

    _defineProperty__default['default'](this, "onerror", function (wsID, event) {
      var _this$rejectPromise4;

      if (_this.wsID !== wsID) return;
      _this.consecutiveFailures += 1;
      _this.totalFailures += 1;

      _this._setHealth(false);

      _this.isConnecting = false;
      (_this$rejectPromise4 = _this.rejectPromise) === null || _this$rejectPromise4 === void 0 ? void 0 : _this$rejectPromise4.call(_this, _this._errorFromWSEvent(event));

      _this.logger('info', "connection:onerror() - WS connection resulted into error", {
        tags: ['connection'],
        event: event
      });

      _this._reconnect();
    });

    _defineProperty__default['default'](this, "_setHealth", function (healthy) {
      if (healthy && !_this.isHealthy) {
        // yes we are online:
        _this.isHealthy = true;

        _this.eventCallback({
          type: 'connection.changed',
          online: true
        });
      }

      if (!healthy && _this.isHealthy) {
        // bummer we are offline
        _this.isHealthy = false;
        setTimeout(function () {
          if (!_this.isHealthy) {
            _this.eventCallback({
              type: 'connection.changed',
              online: false
            });
          }
        }, 5000);
      }
    });

    _defineProperty__default['default'](this, "_errorFromWSEvent", function (event) {
      var isWSFailure = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      var code;
      var statusCode;
      var message;

      if (isCloseEvent(event)) {
        code = event.code;
        statusCode = 'unknown';
        message = event.reason;
      }

      if (isErrorEvent(event)) {
        code = event.error.code;
        statusCode = event.error.StatusCode;
        message = event.error.message;
      } // Keeping this `warn` level log, to avoid cluttering of error logs from ws failures.


      _this.logger('warn', "connection:_errorFromWSEvent() - WS failed with code ".concat(code), {
        tags: ['connection'],
        event: event
      });

      var error = new Error("WS failed with code ".concat(code, " and reason - ").concat(message));
      error.code = code;
      /**
       * StatusCode does not exist on any event types but has been left
       * as is to preserve JS functionality during the TS implementation
       */

      error.StatusCode = statusCode;
      error.isWSFailure = isWSFailure;
      return error;
    });

    _defineProperty__default['default'](this, "_listenForConnectionChanges", function () {
      if (typeof window !== 'undefined' && window != null && window.addEventListener != null) {
        window.addEventListener('offline', _this.onlineStatusChanged);
        window.addEventListener('online', _this.onlineStatusChanged);
      }
    });

    _defineProperty__default['default'](this, "_removeConnectionListeners", function () {
      if (typeof window !== 'undefined' && window != null && window.addEventListener != null) {
        window.removeEventListener('offline', _this.onlineStatusChanged);
        window.removeEventListener('online', _this.onlineStatusChanged);
      }
    });

    _defineProperty__default['default'](this, "_setupConnectionPromise", function () {
      var that = _this;
      _this.isResolved = false;
      /** a promise that is resolved once ws.open is called */

      _this.connectionOpen = new Promise(function (resolve, reject) {
        that.resolvePromise = resolve;
        that.rejectPromise = reject;
      }).then(function (e) {
        if (e.data && typeof e.data === 'string') {
          var data = JSON.parse(e.data);

          if (data && data.error != null) {
            throw new Error(JSON.stringify(data.error));
          }

          return data;
        } else {
          return undefined;
        }
      }, function (error) {
        throw error;
      });
    });

    _defineProperty__default['default'](this, "scheduleNextPing", function () {
      if (_this.healthCheckTimeoutRef) {
        clearTimeout(_this.healthCheckTimeoutRef);
      } // 30 seconds is the recommended interval (messenger uses this)


      _this.healthCheckTimeoutRef = setTimeout(function () {
        // send the healthcheck.., server replies with a health check event
        var data = [{
          type: 'health.check',
          client_id: _this.clientID,
          user_id: _this.userID
        }]; // try to send on the connection

        try {
          var _this$ws;

          (_this$ws = _this.ws) === null || _this$ws === void 0 ? void 0 : _this$ws.send(JSON.stringify(data));
        } catch (e) {// error will already be detected elsewhere
        }
      }, _this.pingInterval);
    });

    _defineProperty__default['default'](this, "scheduleConnectionCheck", function () {
      if (_this.connectionCheckTimeoutRef) {
        clearTimeout(_this.connectionCheckTimeoutRef);
      }

      _this.connectionCheckTimeoutRef = setTimeout(function () {
        var now = new Date();

        if (_this.lastEvent && now.getTime() - _this.lastEvent.getTime() > _this.connectionCheckTimeout) {
          _this.logger('info', 'connection:scheduleConnectionCheck - going to reconnect', {
            tags: ['connection']
          });

          _this._setHealth(false);

          _this._reconnect();
        }
      }, _this.connectionCheckTimeout);
    });

    this.wsBaseURL = wsBaseURL;
    this.clientID = clientID;
    this.userID = userID;
    this.user = user;
    this.authType = authType;
    this.userAgent = userAgent;
    this.apiKey = apiKey;
    this.tokenManager = tokenManager;
    this.device = device;
    /** consecutive failures influence the duration of the timeout */

    this.consecutiveFailures = 0;
    /** keep track of the total number of failures */

    this.totalFailures = 0;
    /** We only make 1 attempt to reconnect at the same time.. */

    this.isConnecting = false;
    /** Boolean that indicates if the connection promise is resolved */

    this.isResolved = false;
    /** Boolean that indicates if we have a working connection to the server */

    this.isHealthy = false;
    /** Callback when the connection fails and recovers */

    this.recoverCallback = recoverCallback;
    this.messageCallback = messageCallback;
    this.eventCallback = eventCallback;
    this.logger = logger;
    /** Incremented when a new WS connection is made */

    this.wsID = 1;
    /** Store the last event time for health checks */

    this.lastEvent = null;
    /** Send a health check message every 25 seconds */

    this.pingInterval = 25 * 1000;
    this.connectionCheckTimeout = this.pingInterval + 10 * 1000;

    this._listenForConnectionChanges();
  }
  /**
   * connect - Connect to the WS URL
   *
   * @return {ConnectAPIResponse<ChannelType, CommandType, UserType>} Promise that completes once the first health check message is received
   */


  _createClass__default['default'](StableWSConnection, [{
    key: "connect",
    value: function () {
      var _connect2 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee() {
        var healthCheck;
        return _regeneratorRuntime__default['default'].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!this.isConnecting) {
                  _context.next = 2;
                  break;
                }

                throw Error("You've called connect twice, can only attempt 1 connection at the time");

              case 2:
                _context.prev = 2;
                _context.next = 5;
                return this._connect();

              case 5:
                healthCheck = _context.sent;
                this.consecutiveFailures = 0;
                this.logger('info', "connection:connect() - Established ws connection with healthcheck: ".concat(healthCheck), {
                  tags: ['connection']
                });
                _context.next = 21;
                break;

              case 10:
                _context.prev = 10;
                _context.t0 = _context["catch"](2);
                this.isHealthy = false;
                this.consecutiveFailures += 1;

                if (!(_context.t0.code === chatCodes.TOKEN_EXPIRED && !this.tokenManager.isStatic())) {
                  _context.next = 19;
                  break;
                }

                this.logger('info', 'connection:connect() - WS failure due to expired token, so going to try to reload token and reconnect', {
                  tags: ['connection']
                });

                this._reconnect({
                  refreshToken: true
                });

                _context.next = 21;
                break;

              case 19:
                if (_context.t0.isWSFailure) {
                  _context.next = 21;
                  break;
                }

                throw new Error(JSON.stringify({
                  code: _context.t0.code,
                  StatusCode: _context.t0.StatusCode,
                  message: _context.t0.message,
                  isWSFailure: _context.t0.isWSFailure
                }));

              case 21:
                _context.next = 23;
                return this._waitForHealthy();

              case 23:
                return _context.abrupt("return", _context.sent);

              case 24:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[2, 10]]);
      }));

      function connect() {
        return _connect2.apply(this, arguments);
      }

      return connect;
    }()
    /**
     * _waitForHealthy polls the promise connection to see if its resolved until it times out
     * the default 15s timeout allows between 2~3 tries
     * @param timeout duration(ms)
     */

  }, {
    key: "_waitForHealthy",
    value: function () {
      var _waitForHealthy2 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee4() {
        var _this2 = this;

        var timeout,
            _args4 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                timeout = _args4.length > 0 && _args4[0] !== undefined ? _args4[0] : 15000;
                return _context4.abrupt("return", Promise.race([_asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee2() {
                  var interval, i;
                  return _regeneratorRuntime__default['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                      switch (_context2.prev = _context2.next) {
                        case 0:
                          interval = 50; // ms

                          i = 0;

                        case 2:
                          if (!(i <= timeout)) {
                            _context2.next = 18;
                            break;
                          }

                          _context2.prev = 3;
                          _context2.next = 6;
                          return _this2.connectionOpen;

                        case 6:
                          return _context2.abrupt("return", _context2.sent);

                        case 9:
                          _context2.prev = 9;
                          _context2.t0 = _context2["catch"](3);

                          if (!(i === timeout)) {
                            _context2.next = 13;
                            break;
                          }

                          throw new Error(JSON.stringify({
                            code: _context2.t0.code,
                            StatusCode: _context2.t0.StatusCode,
                            message: _context2.t0.message,
                            isWSFailure: _context2.t0.isWSFailure
                          }));

                        case 13:
                          _context2.next = 15;
                          return sleep(interval);

                        case 15:
                          i += interval;
                          _context2.next = 2;
                          break;

                        case 18:
                        case "end":
                          return _context2.stop();
                      }
                    }
                  }, _callee2, null, [[3, 9]]);
                }))(), _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee3() {
                  return _regeneratorRuntime__default['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          _context3.next = 2;
                          return sleep(timeout);

                        case 2:
                          throw new Error(JSON.stringify({
                            code: '',
                            StatusCode: '',
                            message: 'initial WS connection could not be established',
                            isWSFailure: true
                          }));

                        case 3:
                        case "end":
                          return _context3.stop();
                      }
                    }
                  }, _callee3);
                }))()]));

              case 2:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      function _waitForHealthy() {
        return _waitForHealthy2.apply(this, arguments);
      }

      return _waitForHealthy;
    }()
  }, {
    key: "disconnect",
    value:
    /**
     * disconnect - Disconnect the connection and doesn't recover...
     *
     */
    function disconnect(timeout) {
      var _this3 = this;

      this.logger('info', "connection:disconnect() - Closing the websocket connection for wsID ".concat(this.wsID), {
        tags: ['connection']
      });
      this.wsID += 1; // start by removing all the listeners

      if (this.healthCheckTimeoutRef) {
        clearInterval(this.healthCheckTimeoutRef);
      }

      if (this.connectionCheckTimeoutRef) {
        clearInterval(this.connectionCheckTimeoutRef);
      }

      this._removeConnectionListeners();

      this.isHealthy = false; // remove ws handlers...

      if (this.ws && this.ws.removeAllListeners) {
        this.ws.removeAllListeners();
      }

      var isClosedPromise; // and finally close...
      // Assigning to local here because we will remove it from this before the
      // promise resolves.

      var ws = this.ws;

      if (ws && ws.close && ws.readyState === ws.OPEN) {
        isClosedPromise = new Promise(function (resolve) {
          var onclose = function onclose(event) {
            _this3.logger('info', "connection:disconnect() - resolving isClosedPromise ".concat(event ? 'with' : 'without', " close frame"), {
              tags: ['connection'],
              event: event
            });

            resolve();
          };

          ws.onclose = onclose; // In case we don't receive close frame websocket server in time,
          // lets not wait for more than 1 seconds.

          setTimeout(onclose, timeout != null ? timeout : 1000);
        });
        this.logger('info', "connection:disconnect() - Manually closed connection by calling client.disconnect()", {
          tags: ['connection']
        });
        ws.close(chatCodes.WS_CLOSED_SUCCESS, 'Manually closed connection by calling client.disconnect()');
      } else {
        this.logger('info', "connection:disconnect() - ws connection doesn't exist or it is already closed.", {
          tags: ['connection']
        });
        isClosedPromise = Promise.resolve();
      }

      delete this.ws;
      return isClosedPromise;
    }
    /**
     * _connect - Connect to the WS endpoint
     *
     * @return {ConnectAPIResponse<ChannelType, CommandType, UserType>} Promise that completes once the first health check message is received
     */

  }, {
    key: "_connect",
    value: function () {
      var _connect3 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee5() {
        var wsURL, response;
        return _regeneratorRuntime__default['default'].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (!this.isConnecting) {
                  _context5.next = 2;
                  break;
                }

                return _context5.abrupt("return");

              case 2:
                // simply ignore _connect if it's currently trying to connect
                this.isConnecting = true;
                _context5.prev = 3;
                _context5.next = 6;
                return this.tokenManager.tokenReady();

              case 6:
                this._setupConnectionPromise();

                wsURL = this._buildUrl();
                this.ws = new WebSocket__default['default'](wsURL);
                this.ws.onopen = this.onopen.bind(this, this.wsID);
                this.ws.onclose = this.onclose.bind(this, this.wsID);
                this.ws.onerror = this.onerror.bind(this, this.wsID);
                this.ws.onmessage = this.onmessage.bind(this, this.wsID);
                _context5.next = 15;
                return this.connectionOpen;

              case 15:
                response = _context5.sent;
                this.isConnecting = false;

                if (!response) {
                  _context5.next = 20;
                  break;
                }

                this.connectionID = response.connection_id;
                return _context5.abrupt("return", response);

              case 20:
                _context5.next = 26;
                break;

              case 22:
                _context5.prev = 22;
                _context5.t0 = _context5["catch"](3);
                this.isConnecting = false;
                throw _context5.t0;

              case 26:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this, [[3, 22]]);
      }));

      function _connect() {
        return _connect3.apply(this, arguments);
      }

      return _connect;
    }()
    /**
     * _reconnect - Retry the connection to WS endpoint
     *
     * @param {{ interval?: number; refreshToken?: boolean }} options Following options are available
     *
     * - `interval`	{int}			number of ms that function should wait before reconnecting
     * - `refreshToken` {boolean}	reload/refresh user token be refreshed before attempting reconnection.
     */

  }, {
    key: "_reconnect",
    value: function () {
      var _reconnect2 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee6() {
        var options,
            interval,
            _open,
            _args6 = arguments;

        return _regeneratorRuntime__default['default'].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                options = _args6.length > 0 && _args6[0] !== undefined ? _args6[0] : {};
                this.logger('info', 'connection:_reconnect() - Initiating the reconnect', {
                  tags: ['connection']
                }); // only allow 1 connection at the time

                if (!(this.isConnecting || this.isHealthy)) {
                  _context6.next = 5;
                  break;
                }

                this.logger('info', 'connection:_reconnect() - Abort (1) since already connecting or healthy', {
                  tags: ['connection']
                });
                return _context6.abrupt("return");

              case 5:
                // reconnect in case of on error or on close
                // also reconnect if the health check cycle fails
                interval = options.interval;

                if (!interval) {
                  interval = retryInterval(this.consecutiveFailures);
                } // reconnect, or try again after a little while...


                _context6.next = 9;
                return sleep(interval);

              case 9:
                if (!(this.isConnecting || this.isHealthy)) {
                  _context6.next = 12;
                  break;
                }

                this.logger('info', 'connection:_reconnect() - Abort (2) since already connecting or healthy', {
                  tags: ['connection']
                });
                return _context6.abrupt("return");

              case 12:
                // cleanup the old connection
                this.logger('info', 'connection:_reconnect() - Destroying current WS connection', {
                  tags: ['connection']
                });

                this._destroyCurrentWSConnection();

                if (!options.refreshToken) {
                  _context6.next = 17;
                  break;
                }

                _context6.next = 17;
                return this.tokenManager.loadToken();

              case 17:
                _context6.prev = 17;
                _context6.next = 20;
                return this._connect();

              case 20:
                _open = _context6.sent;

                if (!this.recoverCallback) {
                  _context6.next = 26;
                  break;
                }

                this.logger('info', 'connection:_reconnect() - Waiting for recoverCallBack', {
                  tags: ['connection']
                });
                _context6.next = 25;
                return this.recoverCallback(_open);

              case 25:
                this.logger('info', 'connection:_reconnect() - Finished recoverCallBack', {
                  tags: ['connection']
                });

              case 26:
                this.consecutiveFailures = 0;
                _context6.next = 37;
                break;

              case 29:
                _context6.prev = 29;
                _context6.t0 = _context6["catch"](17);
                this.isHealthy = false;
                this.consecutiveFailures += 1;

                if (!(_context6.t0.code === chatCodes.TOKEN_EXPIRED && !this.tokenManager.isStatic())) {
                  _context6.next = 36;
                  break;
                }

                this.logger('info', 'connection:_reconnect() - WS failure due to expired token, so going to try to reload token and reconnect', {
                  tags: ['connection']
                });
                return _context6.abrupt("return", this._reconnect({
                  refreshToken: true
                }));

              case 36:
                // reconnect on WS failures, don't reconnect if there is a code bug
                if (_context6.t0.isWSFailure) {
                  this.logger('info', 'connection:_reconnect() - WS failure, so going to try to reconnect', {
                    tags: ['connection']
                  });

                  this._reconnect();
                }

              case 37:
                this.logger('info', 'connection:_reconnect() - == END ==', {
                  tags: ['connection']
                });

              case 38:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this, [[17, 29]]);
      }));

      function _reconnect() {
        return _reconnect2.apply(this, arguments);
      }

      return _reconnect;
    }()
    /**
     * onlineStatusChanged - this function is called when the browser connects or disconnects from the internet.
     *
     * @param {Event} event Event with type online or offline
     *
     */

  }, {
    key: "_destroyCurrentWSConnection",
    value:
    /**
     * _destroyCurrentWSConnection - Removes the current WS connection
     *
     */
    function _destroyCurrentWSConnection() {
      // increment the ID, meaning we will ignore all messages from the old
      // ws connection from now on.
      this.wsID += 1;

      try {
        if (this.ws && this.ws.removeAllListeners) {
          this.ws.removeAllListeners();
        }

        if (this.ws && this.ws.close) {
          this.ws.close();
        }
      } catch (e) {// we don't care
      }
    }
    /**
     * _setupPromise - sets up the this.connectOpen promise
     */

  }]);

  return StableWSConnection;
}();

var jwt = null;

var crypto = null;

function ownKeys$1(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread$1(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$1(Object(source), true).forEach(function (key) { _defineProperty__default['default'](target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$1(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 * Creates the JWT token that can be used for a UserSession
 * @method JWTUserToken
 * @memberof signing
 * @private
 * @param {Secret} apiSecret - API Secret key
 * @param {string} userId - The user_id key in the JWT payload
 * @param {UnknownType} [extraData] - Extra that should be part of the JWT token
 * @param {SignOptions} [jwtOptions] - Options that can be past to jwt.sign
 * @return {string} JWT Token
 */
function JWTUserToken(apiSecret, userId) {
  var extraData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var jwtOptions = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (typeof userId !== 'string') {
    throw new TypeError('userId should be a string');
  }

  var payload = _objectSpread$1({
    user_id: userId
  }, extraData); // make sure we return a clear error when jwt is shimmed (ie. browser build)


  {
    throw Error("Unable to find jwt crypto, if you are getting this error is probably because you are trying to generate tokens on browser or React Native (or other environment where crypto functions are not available). Please Note: token should only be generated server-side.");
  }

  var opts = _extends__default['default']({
    algorithm: 'HS256',
    noTimestamp: true
  }, jwtOptions);
}
function JWTServerToken(apiSecret) {
  var jwtOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var payload = {
    server: true
  };

  var opts = _extends__default['default']({
    algorithm: 'HS256',
    noTimestamp: true
  }, jwtOptions);

  return jwt.sign(payload, apiSecret, opts);
}
function UserFromToken(token) {
  var fragments = token.split('.');

  if (fragments.length !== 3) {
    return '';
  }

  var b64Payload = fragments[1];
  var payload = decodeBase64(b64Payload);
  var data = JSON.parse(payload);
  return data.user_id;
}
/**
 *
 * @param {string} userId the id of the user
 * @return {string}
 */

function DevToken(userId) {
  return ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', //{"alg": "HS256", "typ": "JWT"}
  encodeBase64(JSON.stringify({
    user_id: userId
  })), 'devtoken' // hardcoded signature
  ].join('.');
}
/**
 *
 * @param {string} body the signed message
 * @param {string} secret the shared secret used to generate the signature (Stream API secret)
 * @param {string} signature the signature to validate
 * @return {boolean}
 */

function CheckSignature(body, secret, signature) {
  var key = Buffer.from(secret, 'ascii');
  var hash = crypto.createHmac('sha256', key).update(body).digest('hex');
  return hash === signature;
}

/**
 * TokenManager
 *
 * Handles all the operations around user token.
 */
var TokenManager =
/**
 * Constructor
 *
 * @param {Secret} secret
 */
function TokenManager(secret) {
  var _this = this;

  _classCallCheck__default['default'](this, TokenManager);

  _defineProperty__default['default'](this, "loadTokenPromise", void 0);

  _defineProperty__default['default'](this, "type", void 0);

  _defineProperty__default['default'](this, "secret", void 0);

  _defineProperty__default['default'](this, "token", void 0);

  _defineProperty__default['default'](this, "tokenProvider", void 0);

  _defineProperty__default['default'](this, "user", void 0);

  _defineProperty__default['default'](this, "setTokenOrProvider", /*#__PURE__*/function () {
    var _ref = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee(tokenOrProvider, user) {
      return _regeneratorRuntime__default['default'].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _this.validateToken(tokenOrProvider, user);

              _this.user = user;

              if (isFunction(tokenOrProvider)) {
                _this.tokenProvider = tokenOrProvider;
                _this.type = 'provider';
              }

              if (typeof tokenOrProvider === 'string') {
                _this.token = tokenOrProvider;
                _this.type = 'static';
              }

              if (!tokenOrProvider && _this.user && _this.secret) {
                _this.token = JWTUserToken(_this.secret, user.id, {}, {});
                _this.type = 'static';
              }

              _context.next = 7;
              return _this.loadToken();

            case 7:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());

  _defineProperty__default['default'](this, "reset", function () {
    _this.token = undefined;
    _this.user = undefined;
    _this.loadTokenPromise = null;
  });

  _defineProperty__default['default'](this, "validateToken", function (tokenOrProvider, user) {
    // allow empty token for anon user
    if (user && user.anon && !tokenOrProvider) return; // Don't allow empty token for non-server side client.

    if (!_this.secret && !tokenOrProvider) {
      throw new Error('User token can not be empty');
    }

    if (tokenOrProvider && typeof tokenOrProvider !== 'string' && !isFunction(tokenOrProvider)) {
      throw new Error('user token should either be a string or a function');
    }

    if (typeof tokenOrProvider === 'string') {
      // Allow empty token for anonymous users
      if (user.anon && tokenOrProvider === '') return;
      var tokenUserId = UserFromToken(tokenOrProvider);

      if (tokenOrProvider != null && (tokenUserId == null || tokenUserId === '' || tokenUserId !== user.id)) {
        throw new Error('userToken does not have a user_id or is not matching with user.id');
      }
    }
  });

  _defineProperty__default['default'](this, "tokenReady", function () {
    return _this.loadTokenPromise;
  });

  _defineProperty__default['default'](this, "loadToken", function () {
    // eslint-disable-next-line no-async-promise-executor
    _this.loadTokenPromise = new Promise( /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee2(resolve) {
        return _regeneratorRuntime__default['default'].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(_this.type === 'static')) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt("return", resolve(_this.token));

              case 2:
                if (!(_this.tokenProvider && typeof _this.tokenProvider !== 'string')) {
                  _context2.next = 7;
                  break;
                }

                _context2.next = 5;
                return _this.tokenProvider();

              case 5:
                _this.token = _context2.sent;
                resolve(_this.token);

              case 7:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function (_x3) {
        return _ref2.apply(this, arguments);
      };
    }());
    return _this.loadTokenPromise;
  });

  _defineProperty__default['default'](this, "getToken", function () {
    if (_this.token) {
      return _this.token;
    }

    if (_this.user && _this.user.anon && !_this.token) {
      return _this.token;
    }

    if (_this.secret) {
      return JWTServerToken(_this.secret);
    }

    throw new Error("Both secret and user tokens are not set. Either client.connectUser wasn't called or client.disconnect was called");
  });

  _defineProperty__default['default'](this, "isStatic", function () {
    return _this.type === 'static';
  });

  this.loadTokenPromise = null;

  if (secret) {
    this.secret = secret;
  }

  this.type = 'static';

  if (this.secret) {
    this.token = JWTServerToken(this.secret);
  }
}
/**
 * Set the static string token or token provider.
 * Token provider should return a token string or a promise which resolves to string token.
 *
 * @param {TokenOrProvider} tokenOrProvider
 * @param {UserResponse<UserType>} user
 */
;

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty__default['default'](target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function isString(x) {
  return typeof x === 'string' || x instanceof String;
}

var StreamChat = /*#__PURE__*/function () {
  function StreamChat(_key, secretOrOptions, _options) {
    var _this = this;

    _classCallCheck__default['default'](this, StreamChat);

    _defineProperty__default['default'](this, "_user", void 0);

    _defineProperty__default['default'](this, "activeChannels", void 0);

    _defineProperty__default['default'](this, "anonymous", void 0);

    _defineProperty__default['default'](this, "axiosInstance", void 0);

    _defineProperty__default['default'](this, "baseURL", void 0);

    _defineProperty__default['default'](this, "browser", void 0);

    _defineProperty__default['default'](this, "cleaningIntervalRef", void 0);

    _defineProperty__default['default'](this, "clientID", void 0);

    _defineProperty__default['default'](this, "configs", void 0);

    _defineProperty__default['default'](this, "connectionID", void 0);

    _defineProperty__default['default'](this, "failures", void 0);

    _defineProperty__default['default'](this, "key", void 0);

    _defineProperty__default['default'](this, "listeners", void 0);

    _defineProperty__default['default'](this, "logger", void 0);

    _defineProperty__default['default'](this, "recoverStateOnReconnect", void 0);

    _defineProperty__default['default'](this, "mutedChannels", void 0);

    _defineProperty__default['default'](this, "mutedUsers", void 0);

    _defineProperty__default['default'](this, "node", void 0);

    _defineProperty__default['default'](this, "options", void 0);

    _defineProperty__default['default'](this, "secret", void 0);

    _defineProperty__default['default'](this, "setUserPromise", void 0);

    _defineProperty__default['default'](this, "state", void 0);

    _defineProperty__default['default'](this, "tokenManager", void 0);

    _defineProperty__default['default'](this, "user", void 0);

    _defineProperty__default['default'](this, "userAgent", void 0);

    _defineProperty__default['default'](this, "userID", void 0);

    _defineProperty__default['default'](this, "wsBaseURL", void 0);

    _defineProperty__default['default'](this, "wsConnection", void 0);

    _defineProperty__default['default'](this, "wsPromise", void 0);

    _defineProperty__default['default'](this, "consecutiveFailures", void 0);

    _defineProperty__default['default'](this, "_hasConnectionID", function () {
      var _this$wsConnection;

      return Boolean((_this$wsConnection = _this.wsConnection) === null || _this$wsConnection === void 0 ? void 0 : _this$wsConnection.connectionID);
    });

    _defineProperty__default['default'](this, "connectUser", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee(user, userTokenOrProvider) {
        var setTokenPromise, wsPromise;
        return _regeneratorRuntime__default['default'].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (user.id) {
                  _context.next = 2;
                  break;
                }

                throw new Error('The "id" field on the user is missing');

              case 2:
                if (!(_this.userID === user.id && _this.setUserPromise)) {
                  _context.next = 5;
                  break;
                }

                console.warn('Consecutive calls to connectUser is detected, ideally you should only call this function once in your app.');
                return _context.abrupt("return", _this.setUserPromise);

              case 5:
                if (!_this.userID) {
                  _context.next = 7;
                  break;
                }

                throw new Error('Use client.disconnect() before trying to connect as a different user. connectUser was called twice.');

              case 7:
                if ((_this._isUsingServerAuth() || _this.node) && !_this.options.allowServerSideConnect) {
                  console.warn('Please do not use connectUser server side. connectUser impacts MAU and concurrent connection usage and thus your bill. If you have a valid use-case, add "allowServerSideConnect: true" to the client options to disable this warning.');
                } // we generate the client id client side


                _this.userID = user.id;
                _this.anonymous = false;
                setTokenPromise = _this._setToken(user, userTokenOrProvider);

                _this._setUser(user);

                wsPromise = _this.openConnection();
                _this.setUserPromise = Promise.all([setTokenPromise, wsPromise]).then(function (result) {
                  return result[1];
                } // We only return connection promise;
                );
                _context.prev = 14;
                _context.next = 17;
                return _this.setUserPromise;

              case 17:
                return _context.abrupt("return", _context.sent);

              case 20:
                _context.prev = 20;
                _context.t0 = _context["catch"](14);

                // cleanup client to allow the user to retry connectUser again
                _this.disconnectUser();

                throw _context.t0;

              case 24:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[14, 20]]);
      }));

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }());

    _defineProperty__default['default'](this, "setUser", this.connectUser);

    _defineProperty__default['default'](this, "_setToken", function (user, userTokenOrProvider) {
      return _this.tokenManager.setTokenOrProvider(userTokenOrProvider, user);
    });

    _defineProperty__default['default'](this, "closeConnection", function (timeout) {
      if (_this.cleaningIntervalRef != null) {
        clearInterval(_this.cleaningIntervalRef);
        _this.cleaningIntervalRef = undefined;
      }

      if (!_this.wsConnection) {
        return Promise.resolve();
      }

      return _this.wsConnection.disconnect(timeout);
    });

    _defineProperty__default['default'](this, "openConnection", /*#__PURE__*/_asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee2() {
      var _this$wsConnection2;

      return _regeneratorRuntime__default['default'].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (_this.userID) {
                _context2.next = 2;
                break;
              }

              throw Error('User is not set on client, use client.connectUser or client.connectAnonymousUser instead');

            case 2:
              if (!((_this$wsConnection2 = _this.wsConnection) !== null && _this$wsConnection2 !== void 0 && _this$wsConnection2.isHealthy && _this._hasConnectionID())) {
                _context2.next = 5;
                break;
              }

              _this.logger('info', 'client:openConnection() - openConnection called twice, healthy connection already exists', {
                tags: ['connection', 'client']
              });

              return _context2.abrupt("return", Promise.resolve());

            case 5:
              _this.clientID = "".concat(_this.userID, "--").concat(randomId());
              _this.wsPromise = _this.connect();

              _this._startCleaning();

              return _context2.abrupt("return", _this.wsPromise);

            case 9:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));

    _defineProperty__default['default'](this, "_setupConnection", this.openConnection);

    _defineProperty__default['default'](this, "_normalizeDate", function (before) {
      if (before instanceof Date) {
        before = before.toISOString();
      }

      if (before === '') {
        throw new Error("Don't pass blank string for since, use null instead if resetting the token revoke");
      }

      return before;
    });

    _defineProperty__default['default'](this, "disconnectUser", /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee3(timeout) {
        var closePromise, _i, _Object$values, _channel;

        return _regeneratorRuntime__default['default'].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _this.logger('info', 'client:disconnect() - Disconnecting the client', {
                  tags: ['connection', 'client']
                }); // remove the user specific fields


                delete _this.user;
                delete _this._user;
                delete _this.userID;
                _this.anonymous = false;
                closePromise = _this.closeConnection(timeout);

                for (_i = 0, _Object$values = Object.values(_this.activeChannels); _i < _Object$values.length; _i++) {
                  _channel = _Object$values[_i];

                  _channel._disconnect();
                } // ensure we no longer return inactive channels


                _this.activeChannels = {}; // reset client state

                _this.state = new ClientState(); // reset token manager

                _this.tokenManager.reset(); // close the WS connection


                return _context3.abrupt("return", closePromise);

              case 11:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x3) {
        return _ref3.apply(this, arguments);
      };
    }());

    _defineProperty__default['default'](this, "disconnect", this.disconnectUser);

    _defineProperty__default['default'](this, "connectAnonymousUser", function () {
      if ((_this._isUsingServerAuth() || _this.node) && !_this.options.allowServerSideConnect) {
        console.warn('Please do not use connectUser server side. connectUser impacts MAU and concurrent connection usage and thus your bill. If you have a valid use-case, add "allowServerSideConnect: true" to the client options to disable this warning.');
      }

      _this.anonymous = true;
      _this.userID = randomId();
      var anonymousUser = {
        id: _this.userID,
        anon: true
      };

      _this._setToken(anonymousUser, '');

      _this._setUser(anonymousUser);

      return _this._setupConnection();
    });

    _defineProperty__default['default'](this, "setAnonymousUser", this.connectAnonymousUser);

    _defineProperty__default['default'](this, "doAxiosRequest", /*#__PURE__*/function () {
      var _ref4 = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee4(type, url, data) {
        var options,
            requestConfig,
            response,
            _args4 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                options = _args4.length > 3 && _args4[3] !== undefined ? _args4[3] : {};
                _context4.next = 3;
                return _this.tokenManager.tokenReady();

              case 3:
                requestConfig = _this._enrichAxiosOptions(options);
                _context4.prev = 4;

                _this._logApiRequest(type, url, data, requestConfig);

                _context4.t0 = type;
                _context4.next = _context4.t0 === 'get' ? 9 : _context4.t0 === 'delete' ? 13 : _context4.t0 === 'post' ? 17 : _context4.t0 === 'put' ? 21 : _context4.t0 === 'patch' ? 25 : _context4.t0 === 'options' ? 29 : 33;
                break;

              case 9:
                _context4.next = 11;
                return _this.axiosInstance.get(url, requestConfig);

              case 11:
                response = _context4.sent;
                return _context4.abrupt("break", 34);

              case 13:
                _context4.next = 15;
                return _this.axiosInstance.delete(url, requestConfig);

              case 15:
                response = _context4.sent;
                return _context4.abrupt("break", 34);

              case 17:
                _context4.next = 19;
                return _this.axiosInstance.post(url, data, requestConfig);

              case 19:
                response = _context4.sent;
                return _context4.abrupt("break", 34);

              case 21:
                _context4.next = 23;
                return _this.axiosInstance.put(url, data, requestConfig);

              case 23:
                response = _context4.sent;
                return _context4.abrupt("break", 34);

              case 25:
                _context4.next = 27;
                return _this.axiosInstance.patch(url, data, requestConfig);

              case 27:
                response = _context4.sent;
                return _context4.abrupt("break", 34);

              case 29:
                _context4.next = 31;
                return _this.axiosInstance.options(url, requestConfig);

              case 31:
                response = _context4.sent;
                return _context4.abrupt("break", 34);

              case 33:
                throw new Error('Invalid request type');

              case 34:
                _this._logApiResponse(type, url, response);

                _this.consecutiveFailures = 0;
                return _context4.abrupt("return", _this.handleResponse(response));

              case 39:
                _context4.prev = 39;
                _context4.t1 = _context4["catch"](4);

                _this._logApiError(type, url, _context4.t1);

                _this.consecutiveFailures += 1;

                if (!_context4.t1.response) {
                  _context4.next = 55;
                  break;
                }

                if (!(_context4.t1.response.data.code === chatCodes.TOKEN_EXPIRED && !_this.tokenManager.isStatic())) {
                  _context4.next = 52;
                  break;
                }

                if (!(_this.consecutiveFailures > 1)) {
                  _context4.next = 48;
                  break;
                }

                _context4.next = 48;
                return sleep(retryInterval(_this.consecutiveFailures));

              case 48:
                _this.tokenManager.loadToken();

                _context4.next = 51;
                return _this.doAxiosRequest(type, url, data, options);

              case 51:
                return _context4.abrupt("return", _context4.sent);

              case 52:
                return _context4.abrupt("return", _this.handleResponse(_context4.t1.response));

              case 55:
                throw _context4.t1;

              case 56:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, null, [[4, 39]]);
      }));

      return function (_x4, _x5, _x6) {
        return _ref4.apply(this, arguments);
      };
    }());

    _defineProperty__default['default'](this, "dispatchEvent", function (event) {
      // client event handlers
      var postListenerCallbacks = _this._handleClientEvent(event); // channel event handlers


      var cid = event.cid;
      var channel = cid ? _this.activeChannels[cid] : undefined;

      if (channel) {
        channel._handleChannelEvent(event);
      }

      _this._callClientListeners(event);

      if (channel) {
        channel._callChannelListeners(event);
      }

      postListenerCallbacks.forEach(function (c) {
        return c();
      });
    });

    _defineProperty__default['default'](this, "handleEvent", function (messageEvent) {
      // dispatch the event to the channel listeners
      var jsonString = messageEvent.data;
      var event = JSON.parse(jsonString);
      event.received_at = new Date();

      _this.dispatchEvent(event);
    });

    _defineProperty__default['default'](this, "_updateMemberWatcherReferences", function (user) {
      var refMap = _this.state.userChannelReferences[user.id] || {};

      for (var _channelID in refMap) {
        var _channel2 = _this.activeChannels[_channelID];
        /** search the members and watchers and update as needed... */

        if (_channel2 !== null && _channel2 !== void 0 && _channel2.state) {
          if (_channel2.state.members[user.id]) {
            _channel2.state.members[user.id].user = user;
          }

          if (_channel2.state.watchers[user.id]) {
            _channel2.state.watchers[user.id] = user;
          }
        }
      }
    });

    _defineProperty__default['default'](this, "_updateUserReferences", this._updateMemberWatcherReferences);

    _defineProperty__default['default'](this, "_updateUserMessageReferences", function (user) {
      var refMap = _this.state.userChannelReferences[user.id] || {};

      for (var _channelID2 in refMap) {
        var _channel3 = _this.activeChannels[_channelID2];
        var state = _channel3.state;
        /** update the messages from this user. */

        state === null || state === void 0 ? void 0 : state.updateUserMessages(user);
      }
    });

    _defineProperty__default['default'](this, "_deleteUserMessageReference", function (user) {
      var hardDelete = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var refMap = _this.state.userChannelReferences[user.id] || {};

      for (var _channelID3 in refMap) {
        var _channel4 = _this.activeChannels[_channelID3];
        var state = _channel4.state;
        /** deleted the messages from this user. */

        state === null || state === void 0 ? void 0 : state.deleteUserMessages(user, hardDelete);
      }
    });

    _defineProperty__default['default'](this, "_handleUserEvent", function (event) {
      if (!event.user) {
        return;
      }
      /** update the client.state with any changes to users */


      if (event.type === 'user.presence.changed' || event.type === 'user.updated') {
        if (event.user.id === _this.userID) {
          var user = _objectSpread({}, _this.user || {});

          var _user = _objectSpread({}, _this._user || {}); // Remove deleted properties from user objects.


          for (var _key2 in _this.user) {
            if (_key2 in event.user || isOwnUserBaseProperty(_key2)) {
              continue;
            }

            delete user[_key2];
            delete _user[_key2];
          }
          /** Updating only available properties in _user object. */


          for (var _key3 in event.user) {
            if (_user && _key3 in _user) {
              _user[_key3] = event.user[_key3];
            }
          } // @ts-expect-error


          _this._user = _objectSpread({}, _user);
          _this.user = _objectSpread(_objectSpread({}, user), event.user);
        }

        _this.state.updateUser(event.user);

        _this._updateMemberWatcherReferences(event.user);
      }

      if (event.type === 'user.updated') {
        _this._updateUserMessageReferences(event.user);
      }

      if (event.type === 'user.deleted' && event.user.deleted_at && (event.mark_messages_deleted || event.hard_delete)) {
        _this._deleteUserMessageReference(event.user, event.hard_delete);
      }
    });

    _defineProperty__default['default'](this, "_callClientListeners", function (event) {
      var client = _this; // gather and call the listeners

      var listeners = [];

      if (client.listeners.all) {
        listeners.push.apply(listeners, _toConsumableArray__default['default'](client.listeners.all));
      }

      if (client.listeners[event.type]) {
        listeners.push.apply(listeners, _toConsumableArray__default['default'](client.listeners[event.type]));
      } // call the event and send it to the listeners


      for (var _i2 = 0, _listeners = listeners; _i2 < _listeners.length; _i2++) {
        var listener = _listeners[_i2];
        listener(event);
      }
    });

    _defineProperty__default['default'](this, "recoverState", /*#__PURE__*/_asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee5() {
      var _this$wsConnection3;

      var cids;
      return _regeneratorRuntime__default['default'].wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _this.logger('info', "client:recoverState() - Start of recoverState with connectionID ".concat((_this$wsConnection3 = _this.wsConnection) === null || _this$wsConnection3 === void 0 ? void 0 : _this$wsConnection3.connectionID), {
                tags: ['connection']
              });

              cids = Object.keys(_this.activeChannels);

              if (!(cids.length && _this.recoverStateOnReconnect)) {
                _context5.next = 10;
                break;
              }

              _this.logger('info', "client:recoverState() - Start the querying of ".concat(cids.length, " channels"), {
                tags: ['connection', 'client']
              });

              _context5.next = 6;
              return _this.queryChannels({
                cid: {
                  $in: cids
                }
              }, {
                last_message_at: -1
              }, {
                limit: 30
              });

            case 6:
              _this.logger('info', 'client:recoverState() - Querying channels finished', {
                tags: ['connection', 'client']
              });

              _this.dispatchEvent({
                type: 'connection.recovered'
              });

              _context5.next = 11;
              break;

            case 10:
              _this.dispatchEvent({
                type: 'connection.recovered'
              });

            case 11:
              _this.wsPromise = Promise.resolve();
              _this.setUserPromise = Promise.resolve();

            case 13:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5);
    })));

    _defineProperty__default['default'](this, "getChannelByMembers", function (channelType, custom) {
      // Check if the channel already exists.
      // Only allow 1 channel object per cid
      var membersStr = _toConsumableArray__default['default'](custom.members || []).sort().join(',');

      var tempCid = "".concat(channelType, ":!members-").concat(membersStr);

      if (!membersStr) {
        throw Error('Please specify atleast one member when creating unique conversation');
      } // channel could exist in `activeChannels` list with either one of the following two keys:
      // 1. cid - Which gets set on channel only after calling channel.query or channel.watch or channel.create
      // 2. Sorted membersStr - E.g., "messaging:amin,vishal" OR "messaging:amin,jaap,tom"
      //                        This is set when you create a channel, but haven't queried yet. After query,
      //                        we will replace it with `cid`


      for (var _key4 in _this.activeChannels) {
        var _channel5 = _this.activeChannels[_key4];

        if (_channel5.disconnected) {
          continue;
        }

        if (_key4 === tempCid) {
          return _channel5;
        }

        if (_key4.indexOf("".concat(channelType, ":!members-")) === 0) {
          var membersStrInExistingChannel = Object.keys(_channel5.state.members).sort().join(',');

          if (membersStrInExistingChannel === membersStr) {
            return _channel5;
          }
        }
      }

      var channel = new Channel(_this, channelType, undefined, custom); // For the time being set the key as membersStr, since we don't know the cid yet.
      // In channel.query, we will replace it with 'cid'.

      _this.activeChannels[tempCid] = channel;
      return channel;
    });

    _defineProperty__default['default'](this, "getChannelById", function (channelType, channelID, custom) {
      if (typeof channelID === 'string' && ~channelID.indexOf(':')) {
        throw Error("Invalid channel id ".concat(channelID, ", can't contain the : character"));
      } // only allow 1 channel object per cid


      var cid = "".concat(channelType, ":").concat(channelID);

      if (cid in _this.activeChannels && !_this.activeChannels[cid].disconnected) {
        var _channel6 = _this.activeChannels[cid];

        if (Object.keys(custom).length > 0) {
          _channel6.data = custom;
          _channel6._data = custom;
        }

        return _channel6;
      }

      var channel = new Channel(_this, channelType, channelID, custom);
      _this.activeChannels[channel.cid] = channel;
      return channel;
    });

    _defineProperty__default['default'](this, "updateUsers", this.upsertUsers);

    _defineProperty__default['default'](this, "updateUser", this.upsertUser);

    _defineProperty__default['default'](this, "_isUsingServerAuth", function () {
      return !!_this.secret;
    });

    // set the key
    this.key = _key;
    this.listeners = {};
    this.state = new ClientState(); // a list of channels to hide ws events from

    this.mutedChannels = [];
    this.mutedUsers = []; // set the secret

    if (secretOrOptions && isString(secretOrOptions)) {
      this.secret = secretOrOptions;
    } // set the options... and figure out defaults...


    var inputOptions = _options ? _options : secretOrOptions && !isString(secretOrOptions) ? secretOrOptions : {};
    this.browser = typeof inputOptions.browser !== 'undefined' ? inputOptions.browser : typeof window !== 'undefined';
    this.node = !this.browser;
    this.options = _objectSpread({
      timeout: 3000,
      withCredentials: false,
      // making sure cookies are not sent
      warmUp: false,
      recoverStateOnReconnect: true
    }, inputOptions);

    if (this.node && !this.options.httpsAgent) {
      this.options.httpsAgent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 3000
      });
    }

    this.axiosInstance = axios__default['default'].create(this.options);
    this.setBaseURL(this.options.baseURL || 'https://chat-us-east-1.stream-io-api.com');

    if (typeof process !== 'undefined' && process.env.STREAM_LOCAL_TEST_RUN) {
      this.setBaseURL('http://localhost:3030');
    }

    if (typeof process !== 'undefined' && process.env.STREAM_LOCAL_TEST_HOST) {
      this.setBaseURL('http://' + process.env.STREAM_LOCAL_TEST_HOST);
    } // WS connection is initialized when setUser is called


    this.wsConnection = null;
    this.wsPromise = null;
    this.setUserPromise = null; // keeps a reference to all the channels that are in use

    this.activeChannels = {}; // mapping between channel groups and configs

    this.configs = {};
    this.anonymous = false; // If its a server-side client, then lets initialize the tokenManager, since token will be
    // generated from secret.

    this.tokenManager = new TokenManager(this.secret);
    this.consecutiveFailures = 0;
    /**
     * logger function should accept 3 parameters:
     * @param logLevel string
     * @param message   string
     * @param extraData object
     *
     * e.g.,
     * const client = new StreamChat('api_key', {}, {
     * 		logger = (logLevel, message, extraData) => {
     * 			console.log(message);
     * 		}
     * })
     *
     * extraData contains tags array attached to log message. Tags can have one/many of following values:
     * 1. api
     * 2. api_request
     * 3. api_response
     * 4. client
     * 5. channel
     * 6. connection
     * 7. event
     *
     * It may also contains some extra data, some examples have been mentioned below:
     * 1. {
     * 		tags: ['api', 'api_request', 'client'],
     * 		url: string,
     * 		payload: object,
     * 		config: object
     * }
     * 2. {
     * 		tags: ['api', 'api_response', 'client'],
     * 		url: string,
     * 		response: object
     * }
     * 3. {
     * 		tags: ['api', 'api_response', 'client'],
     * 		url: string,
     * 		error: object
     * }
     * 4. {
     * 		tags: ['event', 'client'],
     * 		event: object
     * }
     * 5. {
     * 		tags: ['channel'],
     * 		channel: object
     * }
     */

    this.logger = isFunction(inputOptions.logger) ? inputOptions.logger : function () {
      return null;
    };
    this.recoverStateOnReconnect = this.options.recoverStateOnReconnect;
  }
  /**
   * Get a client instance
   *
   * This function always returns the same Client instance to avoid issues raised by multiple Client and WS connections
   *
   * **After the first call, the client configuration will not change if the key or options parameters change**
   *
   * @param {string} key - the api key
   * @param {string} [secret] - the api secret
   * @param {StreamChatOptions} [options] - additional options, here you can pass custom options to axios instance
   * @param {boolean} [options.browser] - enforce the client to be in browser mode
   * @param {boolean} [options.warmUp] - default to false, if true, client will open a connection as soon as possible to speed up following requests
   * @param {Logger} [options.Logger] - custom logger
   * @param {number} [options.timeout] - default to 3000
   * @param {httpsAgent} [options.httpsAgent] - custom httpsAgent, in node it's default to https.agent()
   * @example <caption>initialize the client in user mode</caption>
   * StreamChat.getInstance('api_key')
   * @example <caption>initialize the client in user mode with options</caption>
   * StreamChat.getInstance('api_key', { timeout:5000 })
   * @example <caption>secret is optional and only used in server side mode</caption>
   * StreamChat.getInstance('api_key', "secret", { httpsAgent: customAgent })
   */


  _createClass__default['default'](StreamChat, [{
    key: "devToken",
    value: function devToken(userID) {
      return DevToken(userID);
    }
  }, {
    key: "getAuthType",
    value: function getAuthType() {
      return this.anonymous ? 'anonymous' : 'jwt';
    }
  }, {
    key: "setBaseURL",
    value: function setBaseURL(baseURL) {
      this.baseURL = baseURL;
      this.wsBaseURL = this.baseURL.replace('http', 'ws').replace(':3030', ':8800');
    }
  }, {
    key: "_setUser",
    value: function _setUser(user) {
      /**
       * This one is used by the frontend. This is a copy of the current user object stored on backend.
       * It contains reserved properties and own user properties which are not present in `this._user`.
       */
      this.user = user; // this one is actually used for requests. This is a copy of current user provided to `connectUser` function.

      this._user = _objectSpread({}, user);
    }
    /**
     * Disconnects the websocket connection, without removing the user set on client.
     * client.closeConnection will not trigger default auto-retry mechanism for reconnection. You need
     * to call client.openConnection to reconnect to websocket.
     *
     * This is mainly useful on mobile side. You can only receive push notifications
     * if you don't have active websocket connection.
     * So when your app goes to background, you can call `client.closeConnection`.
     * And when app comes back to foreground, call `client.openConnection`.
     *
     * @param timeout Max number of ms, to wait for close event of websocket, before forcefully assuming succesful disconnection.
     *                https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
     */

  }, {
    key: "updateAppSettings",
    value:
    /**
    * updateAppSettings - updates application settings
    *
    * @param {AppSettings} options App settings.
    * 		IE: {
     			"apn_config": {
    			"auth_type": "token",
    			"auth_key": fs.readFileSync(
    				'./apn-push-auth-key.p8',
    				'utf-8',
    			),
    			"key_id": "keyid",
    			"team_id": "teamid", //either ALL these 3
    			"notification_template": "notification handlebars template",
    			"bundle_id": "com.apple.your.app",
    			"development": true
    		},
    		"firebase_config": {
    			"server_key": "server key from fcm",
    			"notification_template": "notification handlebars template"
    			"data_template": "data handlebars template"
    		},
    		"webhook_url": "https://acme.com/my/awesome/webhook/"
    	}
    */
    function () {
      var _updateAppSettings = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee6(options) {
        var _options$apn_config;

        return _regeneratorRuntime__default['default'].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if ((_options$apn_config = options.apn_config) !== null && _options$apn_config !== void 0 && _options$apn_config.p12_cert) {
                  options.apn_config.p12_cert = Buffer.from(options.apn_config.p12_cert).toString('base64');
                }

                _context6.next = 3;
                return this.patch(this.baseURL + '/app', options);

              case 3:
                return _context6.abrupt("return", _context6.sent);

              case 4:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function updateAppSettings(_x7) {
        return _updateAppSettings.apply(this, arguments);
      }

      return updateAppSettings;
    }()
  }, {
    key: "revokeTokens",
    value:
    /**
     * Revokes all tokens on application level issued before given time
     */
    function () {
      var _revokeTokens = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee7(before) {
        return _regeneratorRuntime__default['default'].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.updateAppSettings({
                  revoke_tokens_issued_before: this._normalizeDate(before)
                });

              case 2:
                return _context7.abrupt("return", _context7.sent);

              case 3:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function revokeTokens(_x8) {
        return _revokeTokens.apply(this, arguments);
      }

      return revokeTokens;
    }()
    /**
     * Revokes token for a user issued before given time
     */

  }, {
    key: "revokeUserToken",
    value: function () {
      var _revokeUserToken = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee8(userID, before) {
        return _regeneratorRuntime__default['default'].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.revokeUsersToken([userID], before);

              case 2:
                return _context8.abrupt("return", _context8.sent);

              case 3:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function revokeUserToken(_x9, _x10) {
        return _revokeUserToken.apply(this, arguments);
      }

      return revokeUserToken;
    }()
    /**
     * Revokes tokens for a list of users issued before given time
     */

  }, {
    key: "revokeUsersToken",
    value: function () {
      var _revokeUsersToken = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee9(userIDs, before) {
        var users, _iterator, _step, userID;

        return _regeneratorRuntime__default['default'].wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                if (before === undefined) {
                  before = new Date().toISOString();
                } else {
                  before = this._normalizeDate(before);
                }

                users = [];
                _iterator = _createForOfIteratorHelper(userIDs);

                try {
                  for (_iterator.s(); !(_step = _iterator.n()).done;) {
                    userID = _step.value;
                    users.push({
                      id: userID,
                      set: {
                        revoke_tokens_issued_before: before
                      }
                    });
                  }
                } catch (err) {
                  _iterator.e(err);
                } finally {
                  _iterator.f();
                }

                _context9.next = 6;
                return this.partialUpdateUsers(users);

              case 6:
                return _context9.abrupt("return", _context9.sent);

              case 7:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function revokeUsersToken(_x11, _x12) {
        return _revokeUsersToken.apply(this, arguments);
      }

      return revokeUsersToken;
    }()
    /**
     * getAppSettings - retrieves application settings
     */

  }, {
    key: "getAppSettings",
    value: function () {
      var _getAppSettings = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee10() {
        return _regeneratorRuntime__default['default'].wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return this.get(this.baseURL + '/app');

              case 2:
                return _context10.abrupt("return", _context10.sent);

              case 3:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function getAppSettings() {
        return _getAppSettings.apply(this, arguments);
      }

      return getAppSettings;
    }()
    /**
    * testPushSettings - Tests the push settings for a user with a random chat message and the configured push templates
    *
    * @param {string} userID User ID. If user has no devices, it will error
    * @param {TestPushDataInput} [data] Overrides for push templates/message used
    * 		IE: {
    		  messageID: 'id-of-message',//will error if message does not exist
    		  apnTemplate: '{}', //if app doesn't have apn configured it will error
    		  firebaseTemplate: '{}', //if app doesn't have firebase configured it will error
    		  firebaseDataTemplate: '{}', //if app doesn't have firebase configured it will error
    		  skipDevices: true, // skip config/device checks and sending to real devices
    	}
    */

  }, {
    key: "testPushSettings",
    value: function () {
      var _testPushSettings = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee11(userID) {
        var data,
            _args11 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                data = _args11.length > 1 && _args11[1] !== undefined ? _args11[1] : {};
                _context11.next = 3;
                return this.post(this.baseURL + '/check_push', _objectSpread(_objectSpread(_objectSpread(_objectSpread(_objectSpread({
                  user_id: userID
                }, data.messageID ? {
                  message_id: data.messageID
                } : {}), data.apnTemplate ? {
                  apn_template: data.apnTemplate
                } : {}), data.firebaseTemplate ? {
                  firebase_template: data.firebaseTemplate
                } : {}), data.firebaseDataTemplate ? {
                  firebase_data_template: data.firebaseDataTemplate
                } : {}), data.skipDevices ? {
                  skip_devices: true
                } : {}));

              case 3:
                return _context11.abrupt("return", _context11.sent);

              case 4:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function testPushSettings(_x13) {
        return _testPushSettings.apply(this, arguments);
      }

      return testPushSettings;
    }()
    /**
     * testSQSSettings - Tests that the given or configured SQS configuration is valid
     *
     * @param {string} userID User ID. If user has no devices, it will error
     * @param {TestPushDataInput} [data] Overrides for push templates/message used
     * 		IE: {
    		  messageID: 'id-of-message',//will error if message does not exist
    		  apnTemplate: '{}', //if app doesn't have apn configured it will error
    		  firebaseTemplate: '{}', //if app doesn't have firebase configured it will error
    		  firebaseDataTemplate: '{}', //if app doesn't have firebase configured it will error
    	}
     */

  }, {
    key: "testSQSSettings",
    value: function () {
      var _testSQSSettings = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee12() {
        var data,
            _args12 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                data = _args12.length > 0 && _args12[0] !== undefined ? _args12[0] : {};
                _context12.next = 3;
                return this.post(this.baseURL + '/check_sqs', data);

              case 3:
                return _context12.abrupt("return", _context12.sent);

              case 4:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function testSQSSettings() {
        return _testSQSSettings.apply(this, arguments);
      }

      return testSQSSettings;
    }()
    /**
     * Disconnects the websocket and removes the user from client.
     *
     * @param timeout Max number of ms, to wait for close event of websocket, before forcefully assuming successful disconnection.
     *                https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
     */

  }, {
    key: "setGuestUser",
    value:
    /**
     * setGuestUser - Setup a temporary guest user
     *
     * @param {UserResponse<UserType>} user Data about this user. IE {name: "john"}
     *
     * @return {ConnectAPIResponse<ChannelType, CommandType, UserType>} Returns a promise that resolves when the connection is setup
     */
    function () {
      var _setGuestUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee13(user) {
        var response, _response$user, guestUser;

        return _regeneratorRuntime__default['default'].wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                this.anonymous = true;
                _context13.prev = 1;
                _context13.next = 4;
                return this.post(this.baseURL + '/guest', {
                  user: user
                });

              case 4:
                response = _context13.sent;
                _context13.next = 11;
                break;

              case 7:
                _context13.prev = 7;
                _context13.t0 = _context13["catch"](1);
                this.anonymous = false;
                throw _context13.t0;

              case 11:
                this.anonymous = false; // eslint-disable-next-line @typescript-eslint/no-unused-vars

                _response$user = response.user, _response$user.created_at, _response$user.updated_at, _response$user.last_active, _response$user.online, guestUser = _objectWithoutProperties__default['default'](_response$user, ["created_at", "updated_at", "last_active", "online"]);
                _context13.next = 15;
                return this.connectUser(guestUser, response.access_token);

              case 15:
                return _context13.abrupt("return", _context13.sent);

              case 16:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this, [[1, 7]]);
      }));

      function setGuestUser(_x14) {
        return _setGuestUser.apply(this, arguments);
      }

      return setGuestUser;
    }()
    /**
     * createToken - Creates a token to authenticate this user. This function is used server side.
     * The resulting token should be passed to the client side when the users registers or logs in
     *
     * @param {string} userID The User ID
     * @param {number} [exp] The expiration time for the token expressed in the number of seconds since the epoch
     *
     * @return {string} Returns a token
     */

  }, {
    key: "createToken",
    value: function createToken(userID, exp, iat) {
      if (this.secret == null) {
        throw Error("tokens can only be created server-side using the API Secret");
      }

      var extra = {};

      if (exp) {
        extra.exp = exp;
      }

      if (iat) {
        extra.iat = iat;
      }

      return JWTUserToken(this.secret, userID, extra, {});
    }
    /**
     * on - Listen to events on all channels and users your watching
     *
     * client.on('message.new', event => {console.log("my new message", event, channel.state.messages)})
     * or
     * client.on(event => {console.log(event.type)})
     *
     * @param {EventHandler<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType> | string} callbackOrString  The event type to listen for (optional)
     * @param {EventHandler<AttachmentType, ChannelType, CommandType, EventType, MessageType, ReactionType, UserType>} [callbackOrNothing] The callback to call
     *
     * @return {{ unsubscribe: () => void }} Description
     */

  }, {
    key: "on",
    value: function on(callbackOrString, callbackOrNothing) {
      var _this2 = this;

      var key = callbackOrNothing ? callbackOrString : 'all';
      var valid = isValidEventType(key);

      if (!valid) {
        throw Error("Invalid event type ".concat(key));
      }

      var callback = callbackOrNothing ? callbackOrNothing : callbackOrString;

      if (!(key in this.listeners)) {
        this.listeners[key] = [];
      }

      this.logger('info', "Attaching listener for ".concat(key, " event"), {
        tags: ['event', 'client']
      });
      this.listeners[key].push(callback);
      return {
        unsubscribe: function unsubscribe() {
          _this2.logger('info', "Removing listener for ".concat(key, " event"), {
            tags: ['event', 'client']
          });

          _this2.listeners[key] = _this2.listeners[key].filter(function (el) {
            return el !== callback;
          });
        }
      };
    }
    /**
     * off - Remove the event handler
     *
     */

  }, {
    key: "off",
    value: function off(callbackOrString, callbackOrNothing) {
      var key = callbackOrNothing ? callbackOrString : 'all';
      var valid = isValidEventType(key);

      if (!valid) {
        throw Error("Invalid event type ".concat(key));
      }

      var callback = callbackOrNothing ? callbackOrNothing : callbackOrString;

      if (!(key in this.listeners)) {
        this.listeners[key] = [];
      }

      this.logger('info', "Removing listener for ".concat(key, " event"), {
        tags: ['event', 'client']
      });
      this.listeners[key] = this.listeners[key].filter(function (value) {
        return value !== callback;
      });
    }
  }, {
    key: "_logApiRequest",
    value: function _logApiRequest(type, url, data, config) {
      this.logger('info', "client: ".concat(type, " - Request - ").concat(url), {
        tags: ['api', 'api_request', 'client'],
        url: url,
        payload: data,
        config: config
      });
    }
  }, {
    key: "_logApiResponse",
    value: function _logApiResponse(type, url, response) {
      this.logger('info', "client:".concat(type, " - Response - url: ").concat(url, " > status ").concat(response.status), {
        tags: ['api', 'api_response', 'client'],
        url: url,
        response: response
      });
    }
  }, {
    key: "_logApiError",
    value: function _logApiError(type, url, error) {
      this.logger('error', "client:".concat(type, " - Error - url: ").concat(url), {
        tags: ['api', 'api_response', 'client'],
        url: url,
        error: error
      });
    }
  }, {
    key: "get",
    value: function get(url, params) {
      return this.doAxiosRequest('get', url, null, {
        params: params
      });
    }
  }, {
    key: "put",
    value: function put(url, data) {
      return this.doAxiosRequest('put', url, data);
    }
  }, {
    key: "post",
    value: function post(url, data) {
      return this.doAxiosRequest('post', url, data);
    }
  }, {
    key: "patch",
    value: function patch(url, data) {
      return this.doAxiosRequest('patch', url, data);
    }
  }, {
    key: "delete",
    value: function _delete(url, params) {
      return this.doAxiosRequest('delete', url, null, {
        params: params
      });
    }
  }, {
    key: "sendFile",
    value: function sendFile(url, uri, name, contentType, user) {
      var data = addFileToFormData(uri, name, contentType);
      if (user != null) data.append('user', JSON.stringify(user));
      return this.doAxiosRequest('post', url, data, {
        headers: data.getHeaders ? data.getHeaders() : {},
        // node vs browser
        config: {
          timeout: 0,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      });
    }
  }, {
    key: "errorFromResponse",
    value: function errorFromResponse(response) {
      var err;
      err = new Error("StreamChat error HTTP code: ".concat(response.status));

      if (response.data && response.data.code) {
        err = new Error("StreamChat error code ".concat(response.data.code, ": ").concat(response.data.message));
        err.code = response.data.code;
      }

      err.response = response;
      err.status = response.status;
      return err;
    }
  }, {
    key: "handleResponse",
    value: function handleResponse(response) {
      var data = response.data;

      if ((response.status + '')[0] !== '2') {
        throw this.errorFromResponse(response);
      }

      return data;
    }
  }, {
    key: "_handleClientEvent",
    value: function _handleClientEvent(event) {
      var _event$me,
          _this3 = this,
          _event$me2;

      var client = this;
      var postListenerCallbacks = [];
      this.logger('info', "client:_handleClientEvent - Received event of type { ".concat(event.type, " }"), {
        tags: ['event', 'client'],
        event: event
      });

      if (event.type === 'user.presence.changed' || event.type === 'user.updated' || event.type === 'user.deleted') {
        this._handleUserEvent(event);
      }

      if (event.type === 'health.check' && event.me) {
        client.user = event.me;
        client.state.updateUser(event.me);
        client.mutedChannels = event.me.channel_mutes;
        client.mutedUsers = event.me.mutes;
      }

      if (event.channel && event.type === 'notification.message_new') {
        this.configs[event.channel.type] = event.channel.config;
      }

      if (event.type === 'notification.channel_mutes_updated' && (_event$me = event.me) !== null && _event$me !== void 0 && _event$me.channel_mutes) {
        var currentMutedChannelIds = [];
        var nextMutedChannelIds = [];
        this.mutedChannels.forEach(function (mute) {
          return mute.channel && currentMutedChannelIds.push(mute.channel.cid);
        });
        event.me.channel_mutes.forEach(function (mute) {
          return mute.channel && nextMutedChannelIds.push(mute.channel.cid);
        });
        /** Set the unread count of un-muted channels to 0, which is the behaviour of backend */

        currentMutedChannelIds.forEach(function (cid) {
          if (!nextMutedChannelIds.includes(cid) && _this3.activeChannels[cid]) {
            _this3.activeChannels[cid].state.unreadCount = 0;
          }
        });
        this.mutedChannels = event.me.channel_mutes;
      }

      if (event.type === 'notification.mutes_updated' && (_event$me2 = event.me) !== null && _event$me2 !== void 0 && _event$me2.mutes) {
        this.mutedUsers = event.me.mutes;
      }

      if ((event.type === 'channel.deleted' || event.type === 'notification.channel_deleted') && event.cid) {
        var _this$activeChannels$;

        client.state.deleteAllChannelReference(event.cid);
        (_this$activeChannels$ = this.activeChannels[event.cid]) === null || _this$activeChannels$ === void 0 ? void 0 : _this$activeChannels$._disconnect();
        postListenerCallbacks.push(function () {
          if (!event.cid) return;
          delete _this3.activeChannels[event.cid];
        });
      }

      return postListenerCallbacks;
    }
  }, {
    key: "_muteStatus",
    value: function _muteStatus(cid) {
      var muteStatus;

      for (var i = 0; i < this.mutedChannels.length; i++) {
        var _mute$channel;

        var mute = this.mutedChannels[i];

        if (((_mute$channel = mute.channel) === null || _mute$channel === void 0 ? void 0 : _mute$channel.cid) === cid) {
          muteStatus = {
            muted: mute.expires ? new Date(mute.expires).getTime() > new Date().getTime() : true,
            createdAt: mute.created_at ? new Date(mute.created_at) : new Date(),
            expiresAt: mute.expires ? new Date(mute.expires) : null
          };
          break;
        }
      }

      if (muteStatus) {
        return muteStatus;
      }

      return {
        muted: false,
        createdAt: null,
        expiresAt: null
      };
    }
  }, {
    key: "connect",
    value:
    /**
     * @private
     */
    function () {
      var _connect = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee14() {
        var client, warmUpPromise, handshake;
        return _regeneratorRuntime__default['default'].wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                client = this;
                this.failures = 0;

                if (!(client.userID == null || this._user == null)) {
                  _context14.next = 4;
                  break;
                }

                throw Error('Call connectUser or connectAnonymousUser before starting the connection');

              case 4:
                if (!(client.wsBaseURL == null)) {
                  _context14.next = 6;
                  break;
                }

                throw Error('Websocket base url not set');

              case 6:
                if (!(client.clientID == null)) {
                  _context14.next = 8;
                  break;
                }

                throw Error('clientID is not set');

              case 8:
                // The StableWSConnection handles all the reconnection logic.
                this.wsConnection = new StableWSConnection({
                  wsBaseURL: client.wsBaseURL,
                  clientID: client.clientID,
                  userID: client.userID,
                  tokenManager: client.tokenManager,
                  user: this._user,
                  authType: this.getAuthType(),
                  userAgent: this.getUserAgent(),
                  apiKey: this.key,
                  recoverCallback: this.recoverState,
                  messageCallback: this.handleEvent,
                  eventCallback: this.dispatchEvent,
                  logger: this.logger,
                  device: this.options.device
                });

                if (this.options.warmUp) {
                  warmUpPromise = this.doAxiosRequest('options', this.baseURL + '/connect');
                }

                _context14.next = 12;
                return this.wsConnection.connect();

              case 12:
                handshake = _context14.sent;
                _context14.prev = 13;
                _context14.next = 16;
                return warmUpPromise;

              case 16:
                _context14.next = 21;
                break;

              case 18:
                _context14.prev = 18;
                _context14.t0 = _context14["catch"](13);
                this.logger('error', 'Warmup request failed', {
                  error: _context14.t0
                });

              case 21:
                return _context14.abrupt("return", handshake);

              case 22:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this, [[13, 18]]);
      }));

      function connect() {
        return _connect.apply(this, arguments);
      }

      return connect;
    }()
    /**
     * queryUsers - Query users and watch user presence
     *
     * @param {UserFilters<UserType>} filterConditions MongoDB style filter conditions
     * @param {UserSort<UserType>} sort Sort options, for instance [{last_active: -1}].
     * When using multiple fields, make sure you use array of objects to guarantee field order, for instance [{last_active: -1}, {created_at: 1}]
     * @param {UserOptions} options Option object, {presence: true}
     *
     * @return {Promise<APIResponse & { users: Array<UserResponse<UserType>> }>} User Query Response
     */

  }, {
    key: "queryUsers",
    value: function () {
      var _queryUsers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee15(filterConditions) {
        var sort,
            options,
            defaultOptions,
            data,
            _args15 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                sort = _args15.length > 1 && _args15[1] !== undefined ? _args15[1] : [];
                options = _args15.length > 2 && _args15[2] !== undefined ? _args15[2] : {};
                defaultOptions = {
                  presence: false
                }; // Make sure we wait for the connect promise if there is a pending one

                _context15.next = 5;
                return this.setUserPromise;

              case 5:
                if (!this._hasConnectionID()) {
                  defaultOptions.presence = false;
                } // Return a list of users


                _context15.next = 8;
                return this.get(this.baseURL + '/users', {
                  payload: _objectSpread(_objectSpread({
                    filter_conditions: filterConditions,
                    sort: normalizeQuerySort(sort)
                  }, defaultOptions), options)
                });

              case 8:
                data = _context15.sent;
                this.state.updateUsers(data.users);
                return _context15.abrupt("return", data);

              case 11:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function queryUsers(_x15) {
        return _queryUsers.apply(this, arguments);
      }

      return queryUsers;
    }()
    /**
     * queryBannedUsers - Query user bans
     *
     * @param {BannedUsersFilters} filterConditions MongoDB style filter conditions
     * @param {BannedUsersSort} sort Sort options [{created_at: 1}].
     * @param {BannedUsersPaginationOptions} options Option object, {limit: 10, offset:0}
     *
     * @return {Promise<BannedUsersResponse<ChannelType, CommandType, UserType>>} Ban Query Response
     */

  }, {
    key: "queryBannedUsers",
    value: function () {
      var _queryBannedUsers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee16() {
        var filterConditions,
            sort,
            options,
            _args16 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                filterConditions = _args16.length > 0 && _args16[0] !== undefined ? _args16[0] : {};
                sort = _args16.length > 1 && _args16[1] !== undefined ? _args16[1] : [];
                options = _args16.length > 2 && _args16[2] !== undefined ? _args16[2] : {};
                _context16.next = 5;
                return this.get(this.baseURL + '/query_banned_users', {
                  payload: _objectSpread({
                    filter_conditions: filterConditions,
                    sort: normalizeQuerySort(sort)
                  }, options)
                });

              case 5:
                return _context16.abrupt("return", _context16.sent);

              case 6:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function queryBannedUsers() {
        return _queryBannedUsers.apply(this, arguments);
      }

      return queryBannedUsers;
    }()
    /**
     * queryMessageFlags - Query message flags
     *
     * @param {MessageFlagsFilters} filterConditions MongoDB style filter conditions
     * @param {MessageFlagsPaginationOptions} options Option object, {limit: 10, offset:0}
     *
     * @return {Promise<MessageFlagsResponse<ChannelType, CommandType, UserType>>} Message Flags Response
     */

  }, {
    key: "queryMessageFlags",
    value: function () {
      var _queryMessageFlags = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee17() {
        var filterConditions,
            options,
            _args17 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                filterConditions = _args17.length > 0 && _args17[0] !== undefined ? _args17[0] : {};
                options = _args17.length > 1 && _args17[1] !== undefined ? _args17[1] : {};
                _context17.next = 4;
                return this.get(this.baseURL + '/moderation/flags/message', {
                  payload: _objectSpread({
                    filter_conditions: filterConditions
                  }, options)
                });

              case 4:
                return _context17.abrupt("return", _context17.sent);

              case 5:
              case "end":
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function queryMessageFlags() {
        return _queryMessageFlags.apply(this, arguments);
      }

      return queryMessageFlags;
    }()
    /**
     * queryChannels - Query channels
     *
     * @param {ChannelFilters<ChannelType, CommandType, UserType>} filterConditions object MongoDB style filters
     * @param {ChannelSort<ChannelType>} [sort] Sort options, for instance {created_at: -1}.
     * When using multiple fields, make sure you use array of objects to guarantee field order, for instance [{last_updated: -1}, {created_at: 1}]
     * @param {ChannelOptions} [options] Options object
     * @param {ChannelStateOptions} [stateOptions] State options object. These options will only be used for state management and won't be sent in the request.
     * - stateOptions.skipInitialization - Skips the initialization of the state for the channels matching the ids in the list.
     *
     * @return {Promise<APIResponse & { channels: Array<ChannelAPIResponse<AttachmentType,ChannelType,CommandType,MessageType,ReactionType,UserType>>}> } search channels response
     */

  }, {
    key: "queryChannels",
    value: function () {
      var _queryChannels = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee18(filterConditions) {
        var sort,
            options,
            stateOptions,
            skipInitialization,
            defaultOptions,
            payload,
            data,
            channels,
            _iterator2,
            _step2,
            channelState,
            _iterator3,
            _step3,
            _channelState,
            c,
            _args18 = arguments;

        return _regeneratorRuntime__default['default'].wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                sort = _args18.length > 1 && _args18[1] !== undefined ? _args18[1] : [];
                options = _args18.length > 2 && _args18[2] !== undefined ? _args18[2] : {};
                stateOptions = _args18.length > 3 && _args18[3] !== undefined ? _args18[3] : {};
                skipInitialization = stateOptions.skipInitialization;
                defaultOptions = {
                  state: true,
                  watch: true,
                  presence: false
                }; // Make sure we wait for the connect promise if there is a pending one

                _context18.next = 7;
                return this.setUserPromise;

              case 7:
                if (!this._hasConnectionID()) {
                  defaultOptions.watch = false;
                } // Return a list of channels


                payload = _objectSpread(_objectSpread({
                  filter_conditions: filterConditions,
                  sort: normalizeQuerySort(sort)
                }, defaultOptions), options);
                _context18.next = 11;
                return this.post(this.baseURL + '/channels', payload);

              case 11:
                data = _context18.sent;
                channels = []; // update our cache of the configs

                _iterator2 = _createForOfIteratorHelper(data.channels);

                try {
                  for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                    channelState = _step2.value;

                    this._addChannelConfig(channelState);
                  }
                } catch (err) {
                  _iterator2.e(err);
                } finally {
                  _iterator2.f();
                }

                _iterator3 = _createForOfIteratorHelper(data.channels);

                try {
                  for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                    _channelState = _step3.value;
                    c = this.channel(_channelState.channel.type, _channelState.channel.id);
                    c.data = _channelState.channel;
                    c.initialized = true;

                    if (skipInitialization === undefined) {
                      c._initializeState(_channelState);
                    } else if (!skipInitialization.includes(_channelState.channel.id)) {
                      c.state.clearMessages();

                      c._initializeState(_channelState);
                    }

                    channels.push(c);
                  }
                } catch (err) {
                  _iterator3.e(err);
                } finally {
                  _iterator3.f();
                }

                return _context18.abrupt("return", channels);

              case 18:
              case "end":
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function queryChannels(_x16) {
        return _queryChannels.apply(this, arguments);
      }

      return queryChannels;
    }()
    /**
     * search - Query messages
     *
     * @param {ChannelFilters<ChannelType, CommandType, UserType>} filterConditions MongoDB style filter conditions
     * @param {MessageFilters<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType> | string} query search query or object MongoDB style filters
     * @param {SearchOptions<MessageType>} [options] Option object, {user_id: 'tommaso'}
     *
     * @return {Promise<SearchAPIResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>>} search messages response
     */

  }, {
    key: "search",
    value: function () {
      var _search = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee19(filterConditions, query) {
        var options,
            payload,
            _args19 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                options = _args19.length > 2 && _args19[2] !== undefined ? _args19[2] : {};

                if (!(options.offset && (options.sort || options.next))) {
                  _context19.next = 3;
                  break;
                }

                throw Error("Cannot specify offset with sort or next parameters");

              case 3:
                payload = _objectSpread(_objectSpread({
                  filter_conditions: filterConditions
                }, options), {}, {
                  sort: options.sort ? normalizeQuerySort(options.sort) : undefined
                });

                if (!(typeof query === 'string')) {
                  _context19.next = 8;
                  break;
                }

                payload.query = query;
                _context19.next = 13;
                break;

              case 8:
                if (!(_typeof__default['default'](query) === 'object')) {
                  _context19.next = 12;
                  break;
                }

                payload.message_filter_conditions = query;
                _context19.next = 13;
                break;

              case 12:
                throw Error("Invalid type ".concat(_typeof__default['default'](query), " for query parameter"));

              case 13:
                _context19.next = 15;
                return this.setUserPromise;

              case 15:
                _context19.next = 17;
                return this.get(this.baseURL + '/search', {
                  payload: payload
                });

              case 17:
                return _context19.abrupt("return", _context19.sent);

              case 18:
              case "end":
                return _context19.stop();
            }
          }
        }, _callee19, this);
      }));

      function search(_x17, _x18) {
        return _search.apply(this, arguments);
      }

      return search;
    }()
    /**
     * setLocalDevice - Set the device info for the current client(device) that will be sent via WS connection automatically
     *
     * @param {BaseDeviceFields} device the device object
     * @param {string} device.id device id
     * @param {string} device.push_provider the push provider (apn or firebase)
     *
     */

  }, {
    key: "setLocalDevice",
    value: function setLocalDevice(device) {
      if (this.wsConnection) {
        throw new Error('you can only set device before opening a websocket connection');
      }

      this.options.device = device;
    }
    /**
     * addDevice - Adds a push device for a user.
     *
     * @param {string} id the device id
     * @param {'apn' | 'firebase'} push_provider the push provider (apn or firebase)
     * @param {string} [userID] the user id (defaults to current user)
     *
     */

  }, {
    key: "addDevice",
    value: function () {
      var _addDevice = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee20(id, push_provider, userID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee20$(_context20) {
          while (1) {
            switch (_context20.prev = _context20.next) {
              case 0:
                _context20.next = 2;
                return this.post(this.baseURL + '/devices', _objectSpread({
                  id: id,
                  push_provider: push_provider
                }, userID != null ? {
                  user_id: userID
                } : {}));

              case 2:
                return _context20.abrupt("return", _context20.sent);

              case 3:
              case "end":
                return _context20.stop();
            }
          }
        }, _callee20, this);
      }));

      function addDevice(_x19, _x20, _x21) {
        return _addDevice.apply(this, arguments);
      }

      return addDevice;
    }()
    /**
     * getDevices - Returns the devices associated with a current user
     *
     * @param {string} [userID] User ID. Only works on serverside
     *
     * @return {APIResponse & Device<UserType>[]} Array of devices
     */

  }, {
    key: "getDevices",
    value: function () {
      var _getDevices = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee21(userID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee21$(_context21) {
          while (1) {
            switch (_context21.prev = _context21.next) {
              case 0:
                _context21.next = 2;
                return this.get(this.baseURL + '/devices', userID ? {
                  user_id: userID
                } : {});

              case 2:
                return _context21.abrupt("return", _context21.sent);

              case 3:
              case "end":
                return _context21.stop();
            }
          }
        }, _callee21, this);
      }));

      function getDevices(_x22) {
        return _getDevices.apply(this, arguments);
      }

      return getDevices;
    }()
    /**
     * removeDevice - Removes the device with the given id. Clientside users can only delete their own devices
     *
     * @param {string} id The device id
     * @param {string} [userID] The user id. Only specify this for serverside requests
     *
     */

  }, {
    key: "removeDevice",
    value: function () {
      var _removeDevice = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee22(id, userID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee22$(_context22) {
          while (1) {
            switch (_context22.prev = _context22.next) {
              case 0:
                _context22.next = 2;
                return this.delete(this.baseURL + '/devices', _objectSpread({
                  id: id
                }, userID ? {
                  user_id: userID
                } : {}));

              case 2:
                return _context22.abrupt("return", _context22.sent);

              case 3:
              case "end":
                return _context22.stop();
            }
          }
        }, _callee22, this);
      }));

      function removeDevice(_x23, _x24) {
        return _removeDevice.apply(this, arguments);
      }

      return removeDevice;
    }()
    /**
     * getRateLimits - Returns the rate limits quota and usage for the current app, possibly filter for a specific platform and/or endpoints.
     * Only available server-side.
     *
     * @param {object} [params] The params for the call. If none of the params are set, all limits for all platforms are returned.
     * @returns {Promise<GetRateLimitsResponse>}
     */

  }, {
    key: "getRateLimits",
    value: function () {
      var _getRateLimits = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee23(params) {
        var _ref6, serverSide, web, android, ios, endpoints;

        return _regeneratorRuntime__default['default'].wrap(function _callee23$(_context23) {
          while (1) {
            switch (_context23.prev = _context23.next) {
              case 0:
                _ref6 = params || {}, serverSide = _ref6.serverSide, web = _ref6.web, android = _ref6.android, ios = _ref6.ios, endpoints = _ref6.endpoints;
                return _context23.abrupt("return", this.get(this.baseURL + '/rate_limits', {
                  server_side: serverSide,
                  web: web,
                  android: android,
                  ios: ios,
                  endpoints: endpoints ? endpoints.join(',') : undefined
                }));

              case 2:
              case "end":
                return _context23.stop();
            }
          }
        }, _callee23, this);
      }));

      function getRateLimits(_x25) {
        return _getRateLimits.apply(this, arguments);
      }

      return getRateLimits;
    }()
  }, {
    key: "_addChannelConfig",
    value: function _addChannelConfig(channelState) {
      this.configs[channelState.channel.type] = channelState.channel.config;
    }
    /**
     * channel - Returns a new channel with the given type, id and custom data
     *
     * If you want to create a unique conversation between 2 or more users; you can leave out the ID parameter and provide the list of members.
     * Make sure to await channel.create() or channel.watch() before accessing channel functions:
     * ie. channel = client.channel("messaging", {members: ["tommaso", "thierry"]})
     * await channel.create() to assign an ID to channel
     *
     * @param {string} channelType The channel type
     * @param {string | ChannelData<ChannelType> | null} [channelIDOrCustom]   The channel ID, you can leave this out if you want to create a conversation channel
     * @param {object} [custom]    Custom data to attach to the channel
     *
     * @return {channel} The channel object, initialize it using channel.watch()
     */

  }, {
    key: "channel",
    value: function channel(channelType, channelIDOrCustom) {
      var custom = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (!this.userID && !this._isUsingServerAuth()) {
        throw Error('Call connectUser or connectAnonymousUser before creating a channel');
      }

      if (~channelType.indexOf(':')) {
        throw Error("Invalid channel group ".concat(channelType, ", can't contain the : character"));
      } // support channel("messaging", null, {options})
      // support channel("messaging", undefined, {options})
      // support channel("messaging", "", {options})


      if (channelIDOrCustom == null || channelIDOrCustom === '') {
        return new Channel(this, channelType, undefined, custom);
      } // support channel("messaging", {options})


      if (_typeof__default['default'](channelIDOrCustom) === 'object') {
        return this.getChannelByMembers(channelType, channelIDOrCustom);
      }

      return this.getChannelById(channelType, channelIDOrCustom, custom);
    }
    /**
     * It's a helper method for `client.channel()` method, used to create unique conversation or
     * channel based on member list instead of id.
     *
     * If the channel already exists in `activeChannels` list, then we simply return it, since that
     * means the same channel was already requested or created.
     *
     * Otherwise we create a new instance of Channel class and return it.
     *
     * @private
     *
     * @param {string} channelType The channel type
     * @param {object} [custom]    Custom data to attach to the channel
     *
     * @return {channel} The channel object, initialize it using channel.watch()
     */

  }, {
    key: "partialUpdateUser",
    value:
    /**
     * partialUpdateUser - Update the given user object
     *
     * @param {PartialUserUpdate<UserType>} partialUserObject which should contain id and any of "set" or "unset" params;
     * example: {id: "user1", set:{field: value}, unset:["field2"]}
     *
     * @return {Promise<APIResponse & { users: { [key: string]: UserResponse<UserType> } }>} list of updated users
     */
    function () {
      var _partialUpdateUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee24(partialUserObject) {
        return _regeneratorRuntime__default['default'].wrap(function _callee24$(_context24) {
          while (1) {
            switch (_context24.prev = _context24.next) {
              case 0:
                _context24.next = 2;
                return this.partialUpdateUsers([partialUserObject]);

              case 2:
                return _context24.abrupt("return", _context24.sent);

              case 3:
              case "end":
                return _context24.stop();
            }
          }
        }, _callee24, this);
      }));

      function partialUpdateUser(_x26) {
        return _partialUpdateUser.apply(this, arguments);
      }

      return partialUpdateUser;
    }()
    /**
     * upsertUsers - Batch upsert the list of users
     *
     * @param {UserResponse<UserType>[]} users list of users
     *
     * @return {Promise<APIResponse & { users: { [key: string]: UserResponse<UserType> } }>}
     */

  }, {
    key: "upsertUsers",
    value: function () {
      var _upsertUsers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee25(users) {
        var userMap, _iterator4, _step4, userObject;

        return _regeneratorRuntime__default['default'].wrap(function _callee25$(_context25) {
          while (1) {
            switch (_context25.prev = _context25.next) {
              case 0:
                userMap = {};
                _iterator4 = _createForOfIteratorHelper(users);
                _context25.prev = 2;

                _iterator4.s();

              case 4:
                if ((_step4 = _iterator4.n()).done) {
                  _context25.next = 11;
                  break;
                }

                userObject = _step4.value;

                if (userObject.id) {
                  _context25.next = 8;
                  break;
                }

                throw Error('User ID is required when updating a user');

              case 8:
                userMap[userObject.id] = userObject;

              case 9:
                _context25.next = 4;
                break;

              case 11:
                _context25.next = 16;
                break;

              case 13:
                _context25.prev = 13;
                _context25.t0 = _context25["catch"](2);

                _iterator4.e(_context25.t0);

              case 16:
                _context25.prev = 16;

                _iterator4.f();

                return _context25.finish(16);

              case 19:
                _context25.next = 21;
                return this.post(this.baseURL + '/users', {
                  users: userMap
                });

              case 21:
                return _context25.abrupt("return", _context25.sent);

              case 22:
              case "end":
                return _context25.stop();
            }
          }
        }, _callee25, this, [[2, 13, 16, 19]]);
      }));

      function upsertUsers(_x27) {
        return _upsertUsers.apply(this, arguments);
      }

      return upsertUsers;
    }()
    /**
     * @deprecated Please use upsertUsers() function instead.
     *
     * updateUsers - Batch update the list of users
     *
     * @param {UserResponse<UserType>[]} users list of users
     * @return {Promise<APIResponse & { users: { [key: string]: UserResponse<UserType> } }>}
     */

  }, {
    key: "upsertUser",
    value:
    /**
     * upsertUser - Update or Create the given user object
     *
     * @param {UserResponse<UserType>} userObject user object, the only required field is the user id. IE {id: "myuser"} is valid
     *
     * @return {Promise<APIResponse & { users: { [key: string]: UserResponse<UserType> } }>}
     */
    function upsertUser(userObject) {
      return this.upsertUsers([userObject]);
    }
    /**
     * @deprecated Please use upsertUser() function instead.
     *
     * updateUser - Update or Create the given user object
     *
     * @param {UserResponse<UserType>} userObject user object, the only required field is the user id. IE {id: "myuser"} is valid
     * @return {Promise<APIResponse & { users: { [key: string]: UserResponse<UserType> } }>}
     */

  }, {
    key: "partialUpdateUsers",
    value:
    /**
     * partialUpdateUsers - Batch partial update of users
     *
     * @param {PartialUserUpdate<UserType>[]} users list of partial update requests
     *
     * @return {Promise<APIResponse & { users: { [key: string]: UserResponse<UserType> } }>}
     */
    function () {
      var _partialUpdateUsers = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee26(users) {
        var _iterator5, _step5, userObject;

        return _regeneratorRuntime__default['default'].wrap(function _callee26$(_context26) {
          while (1) {
            switch (_context26.prev = _context26.next) {
              case 0:
                _iterator5 = _createForOfIteratorHelper(users);
                _context26.prev = 1;

                _iterator5.s();

              case 3:
                if ((_step5 = _iterator5.n()).done) {
                  _context26.next = 9;
                  break;
                }

                userObject = _step5.value;

                if (userObject.id) {
                  _context26.next = 7;
                  break;
                }

                throw Error('User ID is required when updating a user');

              case 7:
                _context26.next = 3;
                break;

              case 9:
                _context26.next = 14;
                break;

              case 11:
                _context26.prev = 11;
                _context26.t0 = _context26["catch"](1);

                _iterator5.e(_context26.t0);

              case 14:
                _context26.prev = 14;

                _iterator5.f();

                return _context26.finish(14);

              case 17:
                _context26.next = 19;
                return this.patch(this.baseURL + '/users', {
                  users: users
                });

              case 19:
                return _context26.abrupt("return", _context26.sent);

              case 20:
              case "end":
                return _context26.stop();
            }
          }
        }, _callee26, this, [[1, 11, 14, 17]]);
      }));

      function partialUpdateUsers(_x28) {
        return _partialUpdateUsers.apply(this, arguments);
      }

      return partialUpdateUsers;
    }()
  }, {
    key: "deleteUser",
    value: function () {
      var _deleteUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee27(userID, params) {
        return _regeneratorRuntime__default['default'].wrap(function _callee27$(_context27) {
          while (1) {
            switch (_context27.prev = _context27.next) {
              case 0:
                _context27.next = 2;
                return this.delete(this.baseURL + "/users/".concat(userID), params);

              case 2:
                return _context27.abrupt("return", _context27.sent);

              case 3:
              case "end":
                return _context27.stop();
            }
          }
        }, _callee27, this);
      }));

      function deleteUser(_x29, _x30) {
        return _deleteUser.apply(this, arguments);
      }

      return deleteUser;
    }()
  }, {
    key: "reactivateUser",
    value: function () {
      var _reactivateUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee28(userID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee28$(_context28) {
          while (1) {
            switch (_context28.prev = _context28.next) {
              case 0:
                _context28.next = 2;
                return this.post(this.baseURL + "/users/".concat(userID, "/reactivate"), _objectSpread({}, options));

              case 2:
                return _context28.abrupt("return", _context28.sent);

              case 3:
              case "end":
                return _context28.stop();
            }
          }
        }, _callee28, this);
      }));

      function reactivateUser(_x31, _x32) {
        return _reactivateUser.apply(this, arguments);
      }

      return reactivateUser;
    }()
  }, {
    key: "deactivateUser",
    value: function () {
      var _deactivateUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee29(userID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee29$(_context29) {
          while (1) {
            switch (_context29.prev = _context29.next) {
              case 0:
                _context29.next = 2;
                return this.post(this.baseURL + "/users/".concat(userID, "/deactivate"), _objectSpread({}, options));

              case 2:
                return _context29.abrupt("return", _context29.sent);

              case 3:
              case "end":
                return _context29.stop();
            }
          }
        }, _callee29, this);
      }));

      function deactivateUser(_x33, _x34) {
        return _deactivateUser.apply(this, arguments);
      }

      return deactivateUser;
    }()
  }, {
    key: "exportUser",
    value: function () {
      var _exportUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee30(userID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee30$(_context30) {
          while (1) {
            switch (_context30.prev = _context30.next) {
              case 0:
                _context30.next = 2;
                return this.get(this.baseURL + "/users/".concat(userID, "/export"), _objectSpread({}, options));

              case 2:
                return _context30.abrupt("return", _context30.sent);

              case 3:
              case "end":
                return _context30.stop();
            }
          }
        }, _callee30, this);
      }));

      function exportUser(_x35, _x36) {
        return _exportUser.apply(this, arguments);
      }

      return exportUser;
    }()
    /** banUser - bans a user from all channels
     *
     * @param {string} targetUserID
     * @param {BanUserOptions<UserType>} [options]
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "banUser",
    value: function () {
      var _banUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee31(targetUserID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee31$(_context31) {
          while (1) {
            switch (_context31.prev = _context31.next) {
              case 0:
                if ((options === null || options === void 0 ? void 0 : options.user_id) !== undefined) {
                  options.banned_by_id = options.user_id;
                  delete options.user_id;
                  console.warn("banUser: 'user_id' is deprecated, please consider switching to 'banned_by_id'");
                }

                if ((options === null || options === void 0 ? void 0 : options.user) !== undefined) {
                  options.banned_by = options.user;
                  delete options.user;
                  console.warn("banUser: 'user' is deprecated, please consider switching to 'banned_by'");
                }

                _context31.next = 4;
                return this.post(this.baseURL + '/moderation/ban', _objectSpread({
                  target_user_id: targetUserID
                }, options));

              case 4:
                return _context31.abrupt("return", _context31.sent);

              case 5:
              case "end":
                return _context31.stop();
            }
          }
        }, _callee31, this);
      }));

      function banUser(_x37, _x38) {
        return _banUser.apply(this, arguments);
      }

      return banUser;
    }()
    /** unbanUser - revoke global ban for a user
     *
     * @param {string} targetUserID
     * @param {UnBanUserOptions} [options]
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "unbanUser",
    value: function () {
      var _unbanUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee32(targetUserID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee32$(_context32) {
          while (1) {
            switch (_context32.prev = _context32.next) {
              case 0:
                _context32.next = 2;
                return this.delete(this.baseURL + '/moderation/ban', _objectSpread({
                  target_user_id: targetUserID
                }, options));

              case 2:
                return _context32.abrupt("return", _context32.sent);

              case 3:
              case "end":
                return _context32.stop();
            }
          }
        }, _callee32, this);
      }));

      function unbanUser(_x39, _x40) {
        return _unbanUser.apply(this, arguments);
      }

      return unbanUser;
    }()
    /** shadowBan - shadow bans a user from all channels
     *
     * @param {string} targetUserID
     * @param {BanUserOptions<UserType>} [options]
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "shadowBan",
    value: function () {
      var _shadowBan = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee33(targetUserID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee33$(_context33) {
          while (1) {
            switch (_context33.prev = _context33.next) {
              case 0:
                _context33.next = 2;
                return this.banUser(targetUserID, _objectSpread({
                  shadow: true
                }, options));

              case 2:
                return _context33.abrupt("return", _context33.sent);

              case 3:
              case "end":
                return _context33.stop();
            }
          }
        }, _callee33, this);
      }));

      function shadowBan(_x41, _x42) {
        return _shadowBan.apply(this, arguments);
      }

      return shadowBan;
    }()
    /** removeShadowBan - revoke global shadow ban for a user
     *
     * @param {string} targetUserID
     * @param {UnBanUserOptions} [options]
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "removeShadowBan",
    value: function () {
      var _removeShadowBan = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee34(targetUserID, options) {
        return _regeneratorRuntime__default['default'].wrap(function _callee34$(_context34) {
          while (1) {
            switch (_context34.prev = _context34.next) {
              case 0:
                _context34.next = 2;
                return this.unbanUser(targetUserID, _objectSpread({
                  shadow: true
                }, options));

              case 2:
                return _context34.abrupt("return", _context34.sent);

              case 3:
              case "end":
                return _context34.stop();
            }
          }
        }, _callee34, this);
      }));

      function removeShadowBan(_x43, _x44) {
        return _removeShadowBan.apply(this, arguments);
      }

      return removeShadowBan;
    }()
    /** muteUser - mutes a user
     *
     * @param {string} targetID
     * @param {string} [userID] Only used with serverside auth
     * @param {MuteUserOptions<UserType>} [options]
     * @returns {Promise<MuteUserResponse<ChannelType, CommandType, UserType>>}
     */

  }, {
    key: "muteUser",
    value: function () {
      var _muteUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee35(targetID, userID) {
        var options,
            _args35 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee35$(_context35) {
          while (1) {
            switch (_context35.prev = _context35.next) {
              case 0:
                options = _args35.length > 2 && _args35[2] !== undefined ? _args35[2] : {};
                _context35.next = 3;
                return this.post(this.baseURL + '/moderation/mute', _objectSpread(_objectSpread({
                  target_id: targetID
                }, userID ? {
                  user_id: userID
                } : {}), options));

              case 3:
                return _context35.abrupt("return", _context35.sent);

              case 4:
              case "end":
                return _context35.stop();
            }
          }
        }, _callee35, this);
      }));

      function muteUser(_x45, _x46) {
        return _muteUser.apply(this, arguments);
      }

      return muteUser;
    }()
    /** unmuteUser - unmutes a user
     *
     * @param {string} targetID
     * @param {string} [currentUserID] Only used with serverside auth
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "unmuteUser",
    value: function () {
      var _unmuteUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee36(targetID, currentUserID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee36$(_context36) {
          while (1) {
            switch (_context36.prev = _context36.next) {
              case 0:
                _context36.next = 2;
                return this.post(this.baseURL + '/moderation/unmute', _objectSpread({
                  target_id: targetID
                }, currentUserID ? {
                  user_id: currentUserID
                } : {}));

              case 2:
                return _context36.abrupt("return", _context36.sent);

              case 3:
              case "end":
                return _context36.stop();
            }
          }
        }, _callee36, this);
      }));

      function unmuteUser(_x47, _x48) {
        return _unmuteUser.apply(this, arguments);
      }

      return unmuteUser;
    }()
    /** userMuteStatus - check if a user is muted or not, can be used after connectUser() is called
     *
     * @param {string} targetID
     * @returns {boolean}
     */

  }, {
    key: "userMuteStatus",
    value: function userMuteStatus(targetID) {
      if (!this.user || !this.wsPromise) {
        throw new Error('Make sure to await connectUser() first.');
      }

      for (var i = 0; i < this.mutedUsers.length; i += 1) {
        if (this.mutedUsers[i].target.id === targetID) return true;
      }

      return false;
    }
    /**
     * flagMessage - flag a message
     * @param {string} targetMessageID
     * @param {string} [options.user_id] currentUserID, only used with serverside auth
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "flagMessage",
    value: function () {
      var _flagMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee37(targetMessageID) {
        var options,
            _args37 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee37$(_context37) {
          while (1) {
            switch (_context37.prev = _context37.next) {
              case 0:
                options = _args37.length > 1 && _args37[1] !== undefined ? _args37[1] : {};
                _context37.next = 3;
                return this.post(this.baseURL + '/moderation/flag', _objectSpread({
                  target_message_id: targetMessageID
                }, options));

              case 3:
                return _context37.abrupt("return", _context37.sent);

              case 4:
              case "end":
                return _context37.stop();
            }
          }
        }, _callee37, this);
      }));

      function flagMessage(_x49) {
        return _flagMessage.apply(this, arguments);
      }

      return flagMessage;
    }()
    /**
     * flagUser - flag a user
     * @param {string} targetID
     * @param {string} [options.user_id] currentUserID, only used with serverside auth
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "flagUser",
    value: function () {
      var _flagUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee38(targetID) {
        var options,
            _args38 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee38$(_context38) {
          while (1) {
            switch (_context38.prev = _context38.next) {
              case 0:
                options = _args38.length > 1 && _args38[1] !== undefined ? _args38[1] : {};
                _context38.next = 3;
                return this.post(this.baseURL + '/moderation/flag', _objectSpread({
                  target_user_id: targetID
                }, options));

              case 3:
                return _context38.abrupt("return", _context38.sent);

              case 4:
              case "end":
                return _context38.stop();
            }
          }
        }, _callee38, this);
      }));

      function flagUser(_x50) {
        return _flagUser.apply(this, arguments);
      }

      return flagUser;
    }()
    /**
     * unflagMessage - unflag a message
     * @param {string} targetMessageID
     * @param {string} [options.user_id] currentUserID, only used with serverside auth
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "unflagMessage",
    value: function () {
      var _unflagMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee39(targetMessageID) {
        var options,
            _args39 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee39$(_context39) {
          while (1) {
            switch (_context39.prev = _context39.next) {
              case 0:
                options = _args39.length > 1 && _args39[1] !== undefined ? _args39[1] : {};
                _context39.next = 3;
                return this.post(this.baseURL + '/moderation/unflag', _objectSpread({
                  target_message_id: targetMessageID
                }, options));

              case 3:
                return _context39.abrupt("return", _context39.sent);

              case 4:
              case "end":
                return _context39.stop();
            }
          }
        }, _callee39, this);
      }));

      function unflagMessage(_x51) {
        return _unflagMessage.apply(this, arguments);
      }

      return unflagMessage;
    }()
    /**
     * unflagUser - unflag a user
     * @param {string} targetID
     * @param {string} [options.user_id] currentUserID, only used with serverside auth
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "unflagUser",
    value: function () {
      var _unflagUser = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee40(targetID) {
        var options,
            _args40 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee40$(_context40) {
          while (1) {
            switch (_context40.prev = _context40.next) {
              case 0:
                options = _args40.length > 1 && _args40[1] !== undefined ? _args40[1] : {};
                _context40.next = 3;
                return this.post(this.baseURL + '/moderation/unflag', _objectSpread({
                  target_user_id: targetID
                }, options));

              case 3:
                return _context40.abrupt("return", _context40.sent);

              case 4:
              case "end":
                return _context40.stop();
            }
          }
        }, _callee40, this);
      }));

      function unflagUser(_x52) {
        return _unflagUser.apply(this, arguments);
      }

      return unflagUser;
    }()
    /**
     * markAllRead - marks all channels for this user as read
     * @param {MarkAllReadOptions<UserType>} [data]
     *
     * @return {Promise<APIResponse>}
     */

  }, {
    key: "markAllRead",
    value: function () {
      var _markAllRead = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee41() {
        var data,
            _args41 = arguments;
        return _regeneratorRuntime__default['default'].wrap(function _callee41$(_context41) {
          while (1) {
            switch (_context41.prev = _context41.next) {
              case 0:
                data = _args41.length > 0 && _args41[0] !== undefined ? _args41[0] : {};
                _context41.next = 3;
                return this.post(this.baseURL + '/channels/read', _objectSpread({}, data));

              case 3:
              case "end":
                return _context41.stop();
            }
          }
        }, _callee41, this);
      }));

      function markAllRead() {
        return _markAllRead.apply(this, arguments);
      }

      return markAllRead;
    }()
  }, {
    key: "createCommand",
    value: function createCommand(data) {
      return this.post(this.baseURL + '/commands', data);
    }
  }, {
    key: "getCommand",
    value: function getCommand(name) {
      return this.get(this.baseURL + "/commands/".concat(name));
    }
  }, {
    key: "updateCommand",
    value: function updateCommand(name, data) {
      return this.put(this.baseURL + "/commands/".concat(name), data);
    }
  }, {
    key: "deleteCommand",
    value: function deleteCommand(name) {
      return this.delete(this.baseURL + "/commands/".concat(name));
    }
  }, {
    key: "listCommands",
    value: function listCommands() {
      return this.get(this.baseURL + "/commands");
    }
  }, {
    key: "createChannelType",
    value: function createChannelType(data) {
      var channelData = _extends__default['default']({}, {
        commands: ['all']
      }, data);

      return this.post(this.baseURL + '/channeltypes', channelData);
    }
  }, {
    key: "getChannelType",
    value: function getChannelType(channelType) {
      return this.get(this.baseURL + "/channeltypes/".concat(channelType));
    }
  }, {
    key: "updateChannelType",
    value: function updateChannelType(channelType, data) {
      return this.put(this.baseURL + "/channeltypes/".concat(channelType), data);
    }
  }, {
    key: "deleteChannelType",
    value: function deleteChannelType(channelType) {
      return this.delete(this.baseURL + "/channeltypes/".concat(channelType));
    }
  }, {
    key: "listChannelTypes",
    value: function listChannelTypes() {
      return this.get(this.baseURL + "/channeltypes");
    }
    /**
     * translateMessage - adds the translation to the message
     *
     * @param {string} messageId
     * @param {string} language
     *
     * @return {APIResponse & MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>} Response that includes the message
     */

  }, {
    key: "translateMessage",
    value: function () {
      var _translateMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee42(messageId, language) {
        return _regeneratorRuntime__default['default'].wrap(function _callee42$(_context42) {
          while (1) {
            switch (_context42.prev = _context42.next) {
              case 0:
                _context42.next = 2;
                return this.post(this.baseURL + "/messages/".concat(messageId, "/translate"), {
                  language: language
                });

              case 2:
                return _context42.abrupt("return", _context42.sent);

              case 3:
              case "end":
                return _context42.stop();
            }
          }
        }, _callee42, this);
      }));

      function translateMessage(_x53, _x54) {
        return _translateMessage.apply(this, arguments);
      }

      return translateMessage;
    }()
    /**
     * _normalizeExpiration - transforms expiration value into ISO string
     * @param {undefined|null|number|string|Date} timeoutOrExpirationDate expiration date or timeout. Use number type to set timeout in seconds, string or Date to set exact expiration date
     */

  }, {
    key: "_normalizeExpiration",
    value: function _normalizeExpiration(timeoutOrExpirationDate) {
      var pinExpires;

      if (typeof timeoutOrExpirationDate === 'number') {
        var now = new Date();
        now.setSeconds(now.getSeconds() + timeoutOrExpirationDate);
        pinExpires = now.toISOString();
      } else if (isString(timeoutOrExpirationDate)) {
        pinExpires = timeoutOrExpirationDate;
      } else if (timeoutOrExpirationDate instanceof Date) {
        pinExpires = timeoutOrExpirationDate.toISOString();
      }

      return pinExpires;
    }
    /**
     * _messageId - extracts string message id from either message object or message id
     * @param {string | { id: string }} messageOrMessageId message object or message id
     * @param {string} errorText error message to report in case of message id absence
     */

  }, {
    key: "_validateAndGetMessageId",
    value: function _validateAndGetMessageId(messageOrMessageId, errorText) {
      var messageId;

      if (typeof messageOrMessageId === 'string') {
        messageId = messageOrMessageId;
      } else {
        if (!messageOrMessageId.id) {
          throw Error(errorText);
        }

        messageId = messageOrMessageId.id;
      }

      return messageId;
    }
    /**
     * pinMessage - pins the message
     * @param {string | { id: string }} messageOrMessageId message object or message id
     * @param {undefined|null|number|string|Date} timeoutOrExpirationDate expiration date or timeout. Use number type to set timeout in seconds, string or Date to set exact expiration date
     * @param {string | { id: string }} [userId]
     */

  }, {
    key: "pinMessage",
    value: function pinMessage(messageOrMessageId, timeoutOrExpirationDate, userId) {
      var messageId = this._validateAndGetMessageId(messageOrMessageId, 'Please specify the message id when calling unpinMessage');

      return this.partialUpdateMessage(messageId, {
        set: {
          pinned: true,
          pin_expires: this._normalizeExpiration(timeoutOrExpirationDate)
        }
      }, userId);
    }
    /**
     * unpinMessage - unpins the message that was previously pinned
     * @param {string | { id: string }} messageOrMessageId message object or message id
     * @param {string | { id: string }} [userId]
     */

  }, {
    key: "unpinMessage",
    value: function unpinMessage(messageOrMessageId, userId) {
      var messageId = this._validateAndGetMessageId(messageOrMessageId, 'Please specify the message id when calling unpinMessage');

      return this.partialUpdateMessage(messageId, {
        set: {
          pinned: false
        }
      }, userId);
    }
    /**
     * updateMessage - Update the given message
     *
     * @param {Omit<MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType>, 'mentioned_users'> & { mentioned_users?: string[] }} message object, id needs to be specified
     * @param {string | { id: string }} [userId]
     *
     * @return {APIResponse & { message: MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType> }} Response that includes the message
     */

  }, {
    key: "updateMessage",
    value: function () {
      var _updateMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee43(message, userId) {
        var clonedMessage, reservedMessageFields;
        return _regeneratorRuntime__default['default'].wrap(function _callee43$(_context43) {
          while (1) {
            switch (_context43.prev = _context43.next) {
              case 0:
                if (message.id) {
                  _context43.next = 2;
                  break;
                }

                throw Error('Please specify the message id when calling updateMessage');

              case 2:
                clonedMessage = _extends__default['default']({}, message);
                delete clonedMessage.id;
                reservedMessageFields = ['command', 'created_at', 'html', 'latest_reactions', 'own_reactions', 'reaction_counts', 'reply_count', 'type', 'updated_at', 'user', '__html'];
                reservedMessageFields.forEach(function (item) {
                  if (clonedMessage[item] != null) {
                    delete clonedMessage[item];
                  }
                });

                if (userId != null) {
                  if (isString(userId)) {
                    clonedMessage.user_id = userId;
                  } else {
                    clonedMessage.user = {
                      id: userId.id
                    };
                  }
                }
                /**
                 * Server always expects mentioned_users to be array of string. We are adding extra check, just in case
                 * SDK missed this conversion.
                 */


                if (Array.isArray(clonedMessage.mentioned_users) && !isString(clonedMessage.mentioned_users[0])) {
                  clonedMessage.mentioned_users = clonedMessage.mentioned_users.map(function (mu) {
                    return mu.id;
                  });
                }

                _context43.next = 10;
                return this.post(this.baseURL + "/messages/".concat(message.id), {
                  message: clonedMessage
                });

              case 10:
                return _context43.abrupt("return", _context43.sent);

              case 11:
              case "end":
                return _context43.stop();
            }
          }
        }, _callee43, this);
      }));

      function updateMessage(_x55, _x56) {
        return _updateMessage.apply(this, arguments);
      }

      return updateMessage;
    }()
    /**
     * partialUpdateMessage - Update the given message id while retaining additional properties
     *
     * @param {string} id the message id
     *
     * @param {PartialUpdateMessage<MessageType>}  partialMessageObject which should contain id and any of "set" or "unset" params;
     *         example: {id: "user1", set:{text: "hi"}, unset:["color"]}
     * @param {string | { id: string }} [userId]
     *
     * @return {APIResponse & { message: MessageResponse<AttachmentType, ChannelType, CommandType, MessageType, ReactionType, UserType> }} Response that includes the updated message
     */

  }, {
    key: "partialUpdateMessage",
    value: function () {
      var _partialUpdateMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee44(id, partialMessageObject, userId) {
        var user;
        return _regeneratorRuntime__default['default'].wrap(function _callee44$(_context44) {
          while (1) {
            switch (_context44.prev = _context44.next) {
              case 0:
                if (id) {
                  _context44.next = 2;
                  break;
                }

                throw Error('Please specify the message id when calling partialUpdateMessage');

              case 2:
                user = userId;

                if (userId != null && isString(userId)) {
                  user = {
                    id: userId
                  };
                }

                _context44.next = 6;
                return this.put(this.baseURL + "/messages/".concat(id), _objectSpread(_objectSpread({}, partialMessageObject), {}, {
                  user: user
                }));

              case 6:
                return _context44.abrupt("return", _context44.sent);

              case 7:
              case "end":
                return _context44.stop();
            }
          }
        }, _callee44, this);
      }));

      function partialUpdateMessage(_x57, _x58, _x59) {
        return _partialUpdateMessage.apply(this, arguments);
      }

      return partialUpdateMessage;
    }()
  }, {
    key: "deleteMessage",
    value: function () {
      var _deleteMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee45(messageID, hardDelete) {
        var params;
        return _regeneratorRuntime__default['default'].wrap(function _callee45$(_context45) {
          while (1) {
            switch (_context45.prev = _context45.next) {
              case 0:
                params = {};

                if (hardDelete) {
                  params = {
                    hard: true
                  };
                }

                _context45.next = 4;
                return this.delete(this.baseURL + "/messages/".concat(messageID), params);

              case 4:
                return _context45.abrupt("return", _context45.sent);

              case 5:
              case "end":
                return _context45.stop();
            }
          }
        }, _callee45, this);
      }));

      function deleteMessage(_x60, _x61) {
        return _deleteMessage.apply(this, arguments);
      }

      return deleteMessage;
    }()
  }, {
    key: "getMessage",
    value: function () {
      var _getMessage = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee46(messageID) {
        return _regeneratorRuntime__default['default'].wrap(function _callee46$(_context46) {
          while (1) {
            switch (_context46.prev = _context46.next) {
              case 0:
                _context46.next = 2;
                return this.get(this.baseURL + "/messages/".concat(messageID));

              case 2:
                return _context46.abrupt("return", _context46.sent);

              case 3:
              case "end":
                return _context46.stop();
            }
          }
        }, _callee46, this);
      }));

      function getMessage(_x62) {
        return _getMessage.apply(this, arguments);
      }

      return getMessage;
    }()
  }, {
    key: "getUserAgent",
    value: function getUserAgent() {
      return this.userAgent || "stream-chat-javascript-client-".concat(this.node ? 'node' : 'browser', "-", "4.2.0");
    }
  }, {
    key: "setUserAgent",
    value: function setUserAgent(userAgent) {
      this.userAgent = userAgent;
    }
    /**
     * _isUsingServerAuth - Returns true if we're using server side auth
     */

  }, {
    key: "_enrichAxiosOptions",
    value: function _enrichAxiosOptions() {
      var _this$wsConnection4;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        params: {},
        headers: {},
        config: {}
      };

      var token = this._getToken();

      return _objectSpread({
        params: _objectSpread(_objectSpread({
          user_id: this.userID
        }, options.params), {}, {
          api_key: this.key,
          connection_id: (_this$wsConnection4 = this.wsConnection) === null || _this$wsConnection4 === void 0 ? void 0 : _this$wsConnection4.connectionID
        }),
        headers: _objectSpread({
          Authorization: token,
          'stream-auth-type': this.getAuthType(),
          'X-Stream-Client': this.getUserAgent()
        }, options.headers)
      }, options.config);
    }
  }, {
    key: "_getToken",
    value: function _getToken() {
      if (!this.tokenManager || this.anonymous) return null;
      return this.tokenManager.getToken();
    }
  }, {
    key: "_startCleaning",
    value: function _startCleaning() {
      var that = this;

      if (this.cleaningIntervalRef != null) {
        return;
      }

      this.cleaningIntervalRef = setInterval(function () {
        // call clean on the channel, used for calling the stop.typing event etc.
        for (var _i3 = 0, _Object$values2 = Object.values(that.activeChannels); _i3 < _Object$values2.length; _i3++) {
          var _channel7 = _Object$values2[_i3];

          _channel7.clean();
        }
      }, 500);
    }
  }, {
    key: "verifyWebhook",
    value: function verifyWebhook(requestBody, xSignature) {
      return !!this.secret && CheckSignature(requestBody, this.secret, xSignature);
    }
    /** getPermission - gets the definition for a permission
     *
     * @param {string} name
     * @returns {Promise<PermissionAPIResponse>}
     */

  }, {
    key: "getPermission",
    value: function getPermission(name) {
      return this.get("".concat(this.baseURL, "/permissions/").concat(name));
    }
    /** createPermission - creates a custom permission
     *
     * @param {CustomPermissionOptions} permissionData the permission data
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "createPermission",
    value: function createPermission(permissionData) {
      return this.post("".concat(this.baseURL, "/permissions"), _objectSpread({}, permissionData));
    }
    /** updatePermission - updates an existing custom permission
     *
     * @param {string} id
     * @param {Omit<CustomPermissionOptions, 'id'>} permissionData the permission data
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "updatePermission",
    value: function updatePermission(id, permissionData) {
      return this.put("".concat(this.baseURL, "/permissions/").concat(id), _objectSpread({}, permissionData));
    }
    /** deletePermission - deletes a custom permission
     *
     * @param {string} name
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "deletePermission",
    value: function deletePermission(name) {
      return this.delete("".concat(this.baseURL, "/permissions/").concat(name));
    }
    /** listPermissions - returns the list of all permissions for this application
     *
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "listPermissions",
    value: function listPermissions() {
      return this.get("".concat(this.baseURL, "/permissions"));
    }
    /** createRole - creates a custom role
     *
     * @param {string} name the new role name
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "createRole",
    value: function createRole(name) {
      return this.post("".concat(this.baseURL, "/roles"), {
        name: name
      });
    }
    /** listRoles - returns the list of all roles for this application
     *
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "listRoles",
    value: function listRoles() {
      return this.get("".concat(this.baseURL, "/roles"));
    }
    /** deleteRole - deletes a custom role
     *
     * @param {string} name the role name
     * @returns {Promise<APIResponse>}
     */

  }, {
    key: "deleteRole",
    value: function deleteRole(name) {
      return this.delete("".concat(this.baseURL, "/roles/").concat(name));
    }
    /** sync - returns all events that happened for a list of channels since last sync
     * @param {string[]} channel_cids list of channel CIDs
     * @param {string} last_sync_at last time the user was online and in sync. RFC3339 ie. "2020-05-06T15:05:01.207Z"
     */

  }, {
    key: "sync",
    value: function sync(channel_cids, last_sync_at) {
      return this.post("".concat(this.baseURL, "/sync"), {
        channel_cids: channel_cids,
        last_sync_at: last_sync_at
      });
    }
    /**
     * sendUserCustomEvent - Send a custom event to a user
     *
     * @param {string} targetUserID target user id
     * @param {UserCustomEvent} event for example {type: 'friendship-request'}
     *
     * @return {Promise<APIResponse>} The Server Response
     */

  }, {
    key: "sendUserCustomEvent",
    value: function () {
      var _sendUserCustomEvent = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee47(targetUserID, event) {
        return _regeneratorRuntime__default['default'].wrap(function _callee47$(_context47) {
          while (1) {
            switch (_context47.prev = _context47.next) {
              case 0:
                _context47.next = 2;
                return this.post("".concat(this.baseURL, "/users/").concat(targetUserID, "/event"), {
                  event: event
                });

              case 2:
                return _context47.abrupt("return", _context47.sent);

              case 3:
              case "end":
                return _context47.stop();
            }
          }
        }, _callee47, this);
      }));

      function sendUserCustomEvent(_x63, _x64) {
        return _sendUserCustomEvent.apply(this, arguments);
      }

      return sendUserCustomEvent;
    }()
  }, {
    key: "createBlockList",
    value: function createBlockList(blockList) {
      return this.post("".concat(this.baseURL, "/blocklists"), blockList);
    }
  }, {
    key: "listBlockLists",
    value: function listBlockLists() {
      return this.get("".concat(this.baseURL, "/blocklists"));
    }
  }, {
    key: "getBlockList",
    value: function getBlockList(name) {
      return this.get("".concat(this.baseURL, "/blocklists/").concat(name));
    }
  }, {
    key: "updateBlockList",
    value: function updateBlockList(name, data) {
      return this.put("".concat(this.baseURL, "/blocklists/").concat(name), data);
    }
  }, {
    key: "deleteBlockList",
    value: function deleteBlockList(name) {
      return this.delete("".concat(this.baseURL, "/blocklists/").concat(name));
    }
  }, {
    key: "exportChannels",
    value: function exportChannels(request) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var payload = _objectSpread({
        channels: request
      }, options);

      return this.post("".concat(this.baseURL, "/export_channels"), payload);
    }
  }, {
    key: "exportChannel",
    value: function exportChannel(request, options) {
      return this.exportChannels([request], options);
    }
  }, {
    key: "getExportChannelStatus",
    value: function getExportChannelStatus(id) {
      return this.get("".concat(this.baseURL, "/export_channels/").concat(id));
    }
    /**
     * createSegment - Creates a Campaign Segment
     *
     * @param {SegmentData} params Segment data
     *
     * @return {Segment} The Created Segment
     */

  }, {
    key: "createSegment",
    value: function () {
      var _createSegment = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee48(params) {
        var _yield$this$post, segment;

        return _regeneratorRuntime__default['default'].wrap(function _callee48$(_context48) {
          while (1) {
            switch (_context48.prev = _context48.next) {
              case 0:
                _context48.next = 2;
                return this.post(this.baseURL + "/segments", {
                  segment: params
                });

              case 2:
                _yield$this$post = _context48.sent;
                segment = _yield$this$post.segment;
                return _context48.abrupt("return", segment);

              case 5:
              case "end":
                return _context48.stop();
            }
          }
        }, _callee48, this);
      }));

      function createSegment(_x65) {
        return _createSegment.apply(this, arguments);
      }

      return createSegment;
    }()
    /**
     * getSegment - Get a Campaign Segment
     *
     * @param {string} id Segment ID
     *
     * @return {Segment} A Segment
     */

  }, {
    key: "getSegment",
    value: function () {
      var _getSegment = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee49(id) {
        var _yield$this$get, segment;

        return _regeneratorRuntime__default['default'].wrap(function _callee49$(_context49) {
          while (1) {
            switch (_context49.prev = _context49.next) {
              case 0:
                _context49.next = 2;
                return this.get(this.baseURL + "/segments/".concat(id));

              case 2:
                _yield$this$get = _context49.sent;
                segment = _yield$this$get.segment;
                return _context49.abrupt("return", segment);

              case 5:
              case "end":
                return _context49.stop();
            }
          }
        }, _callee49, this);
      }));

      function getSegment(_x66) {
        return _getSegment.apply(this, arguments);
      }

      return getSegment;
    }()
    /**
     * listSegments - List Campaign Segments
     *
     *
     * @return {Segment[]} Segments
     */

  }, {
    key: "listSegments",
    value: function () {
      var _listSegments = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee50(options) {
        var _yield$this$get2, segments;

        return _regeneratorRuntime__default['default'].wrap(function _callee50$(_context50) {
          while (1) {
            switch (_context50.prev = _context50.next) {
              case 0:
                _context50.next = 2;
                return this.get(this.baseURL + "/segments", options);

              case 2:
                _yield$this$get2 = _context50.sent;
                segments = _yield$this$get2.segments;
                return _context50.abrupt("return", segments);

              case 5:
              case "end":
                return _context50.stop();
            }
          }
        }, _callee50, this);
      }));

      function listSegments(_x67) {
        return _listSegments.apply(this, arguments);
      }

      return listSegments;
    }()
    /**
     * updateSegment - Update a Campaign Segment
     *
     * @param {string} id Segment ID
     * @param {Partial<SegmentData>} params Segment data
     *
     * @return {Segment} Updated Segment
     */

  }, {
    key: "updateSegment",
    value: function () {
      var _updateSegment = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee51(id, params) {
        var _yield$this$put, segment;

        return _regeneratorRuntime__default['default'].wrap(function _callee51$(_context51) {
          while (1) {
            switch (_context51.prev = _context51.next) {
              case 0:
                _context51.next = 2;
                return this.put(this.baseURL + "/segments/".concat(id), {
                  segment: params
                });

              case 2:
                _yield$this$put = _context51.sent;
                segment = _yield$this$put.segment;
                return _context51.abrupt("return", segment);

              case 5:
              case "end":
                return _context51.stop();
            }
          }
        }, _callee51, this);
      }));

      function updateSegment(_x68, _x69) {
        return _updateSegment.apply(this, arguments);
      }

      return updateSegment;
    }()
    /**
     * deleteSegment - Delete a Campaign Segment
     *
     * @param {string} id Segment ID
     *
     * @return {Promise<APIResponse>} The Server Response
     */

  }, {
    key: "deleteSegment",
    value: function () {
      var _deleteSegment = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee52(id) {
        return _regeneratorRuntime__default['default'].wrap(function _callee52$(_context52) {
          while (1) {
            switch (_context52.prev = _context52.next) {
              case 0:
                return _context52.abrupt("return", this.delete(this.baseURL + "/segments/".concat(id)));

              case 1:
              case "end":
                return _context52.stop();
            }
          }
        }, _callee52, this);
      }));

      function deleteSegment(_x70) {
        return _deleteSegment.apply(this, arguments);
      }

      return deleteSegment;
    }()
    /**
     * createCampaign - Creates a Campaign
     *
     * @param {CampaignData} params Campaign data
     *
     * @return {Campaign} The Created Campaign
     */

  }, {
    key: "createCampaign",
    value: function () {
      var _createCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee53(params) {
        var _yield$this$post2, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee53$(_context53) {
          while (1) {
            switch (_context53.prev = _context53.next) {
              case 0:
                _context53.next = 2;
                return this.post(this.baseURL + "/campaigns", {
                  campaign: params
                });

              case 2:
                _yield$this$post2 = _context53.sent;
                campaign = _yield$this$post2.campaign;
                return _context53.abrupt("return", campaign);

              case 5:
              case "end":
                return _context53.stop();
            }
          }
        }, _callee53, this);
      }));

      function createCampaign(_x71) {
        return _createCampaign.apply(this, arguments);
      }

      return createCampaign;
    }()
    /**
     * getCampaign - Get a Campaign
     *
     * @param {string} id Campaign ID
     *
     * @return {Campaign} A Campaign
     */

  }, {
    key: "getCampaign",
    value: function () {
      var _getCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee54(id) {
        var _yield$this$get3, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee54$(_context54) {
          while (1) {
            switch (_context54.prev = _context54.next) {
              case 0:
                _context54.next = 2;
                return this.get(this.baseURL + "/campaigns/".concat(id));

              case 2:
                _yield$this$get3 = _context54.sent;
                campaign = _yield$this$get3.campaign;
                return _context54.abrupt("return", campaign);

              case 5:
              case "end":
                return _context54.stop();
            }
          }
        }, _callee54, this);
      }));

      function getCampaign(_x72) {
        return _getCampaign.apply(this, arguments);
      }

      return getCampaign;
    }()
    /**
     * listCampaigns - List Campaigns
     *
     *
     * @return {Campaign[]} Campaigns
     */

  }, {
    key: "listCampaigns",
    value: function () {
      var _listCampaigns = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee55(options) {
        var _yield$this$get4, campaigns;

        return _regeneratorRuntime__default['default'].wrap(function _callee55$(_context55) {
          while (1) {
            switch (_context55.prev = _context55.next) {
              case 0:
                _context55.next = 2;
                return this.get(this.baseURL + "/campaigns", options);

              case 2:
                _yield$this$get4 = _context55.sent;
                campaigns = _yield$this$get4.campaigns;
                return _context55.abrupt("return", campaigns);

              case 5:
              case "end":
                return _context55.stop();
            }
          }
        }, _callee55, this);
      }));

      function listCampaigns(_x73) {
        return _listCampaigns.apply(this, arguments);
      }

      return listCampaigns;
    }()
    /**
     * updateCampaign - Update a Campaign
     *
     * @param {string} id Campaign ID
     * @param {Partial<CampaignData>} params Campaign data
     *
     * @return {Campaign} Updated Campaign
     */

  }, {
    key: "updateCampaign",
    value: function () {
      var _updateCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee56(id, params) {
        var _yield$this$put2, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee56$(_context56) {
          while (1) {
            switch (_context56.prev = _context56.next) {
              case 0:
                _context56.next = 2;
                return this.put(this.baseURL + "/campaigns/".concat(id), {
                  campaign: params
                });

              case 2:
                _yield$this$put2 = _context56.sent;
                campaign = _yield$this$put2.campaign;
                return _context56.abrupt("return", campaign);

              case 5:
              case "end":
                return _context56.stop();
            }
          }
        }, _callee56, this);
      }));

      function updateCampaign(_x74, _x75) {
        return _updateCampaign.apply(this, arguments);
      }

      return updateCampaign;
    }()
    /**
     * deleteCampaign - Delete a Campaign
     *
     * @param {string} id Campaign ID
     *
     * @return {Promise<APIResponse>} The Server Response
     */

  }, {
    key: "deleteCampaign",
    value: function () {
      var _deleteCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee57(id) {
        return _regeneratorRuntime__default['default'].wrap(function _callee57$(_context57) {
          while (1) {
            switch (_context57.prev = _context57.next) {
              case 0:
                return _context57.abrupt("return", this.delete(this.baseURL + "/campaigns/".concat(id)));

              case 1:
              case "end":
                return _context57.stop();
            }
          }
        }, _callee57, this);
      }));

      function deleteCampaign(_x76) {
        return _deleteCampaign.apply(this, arguments);
      }

      return deleteCampaign;
    }()
    /**
     * scheduleCampaign - Schedule a Campaign
     *
     * @param {string} id Campaign ID
     * @param {{sendAt: number}} params Schedule params
     *
     * @return {Campaign} Scheduled Campaign
     */

  }, {
    key: "scheduleCampaign",
    value: function () {
      var _scheduleCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee58(id, params) {
        var sendAt, _yield$this$patch, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee58$(_context58) {
          while (1) {
            switch (_context58.prev = _context58.next) {
              case 0:
                sendAt = params.sendAt;
                _context58.next = 3;
                return this.patch(this.baseURL + "/campaigns/".concat(id, "/schedule"), {
                  send_at: sendAt
                });

              case 3:
                _yield$this$patch = _context58.sent;
                campaign = _yield$this$patch.campaign;
                return _context58.abrupt("return", campaign);

              case 6:
              case "end":
                return _context58.stop();
            }
          }
        }, _callee58, this);
      }));

      function scheduleCampaign(_x77, _x78) {
        return _scheduleCampaign.apply(this, arguments);
      }

      return scheduleCampaign;
    }()
    /**
     * stopCampaign - Stop a Campaign
     *
     * @param {string} id Campaign ID
     *
     * @return {Campaign} Stopped Campaign
     */

  }, {
    key: "stopCampaign",
    value: function () {
      var _stopCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee59(id) {
        var _yield$this$patch2, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee59$(_context59) {
          while (1) {
            switch (_context59.prev = _context59.next) {
              case 0:
                _context59.next = 2;
                return this.patch(this.baseURL + "/campaigns/".concat(id, "/stop"));

              case 2:
                _yield$this$patch2 = _context59.sent;
                campaign = _yield$this$patch2.campaign;
                return _context59.abrupt("return", campaign);

              case 5:
              case "end":
                return _context59.stop();
            }
          }
        }, _callee59, this);
      }));

      function stopCampaign(_x79) {
        return _stopCampaign.apply(this, arguments);
      }

      return stopCampaign;
    }()
    /**
     * resumeCampaign - Resume a Campaign
     *
     * @param {string} id Campaign ID
     *
     * @return {Campaign} Resumed Campaign
     */

  }, {
    key: "resumeCampaign",
    value: function () {
      var _resumeCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee60(id) {
        var _yield$this$patch3, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee60$(_context60) {
          while (1) {
            switch (_context60.prev = _context60.next) {
              case 0:
                _context60.next = 2;
                return this.patch(this.baseURL + "/campaigns/".concat(id, "/resume"));

              case 2:
                _yield$this$patch3 = _context60.sent;
                campaign = _yield$this$patch3.campaign;
                return _context60.abrupt("return", campaign);

              case 5:
              case "end":
                return _context60.stop();
            }
          }
        }, _callee60, this);
      }));

      function resumeCampaign(_x80) {
        return _resumeCampaign.apply(this, arguments);
      }

      return resumeCampaign;
    }()
    /**
     * testCampaign - Test a Campaign
     *
     * @param {string} id Campaign ID
     * @param {{users: string[]}} params Test params
     * @return {Campaign} Test Campaign
     */

  }, {
    key: "testCampaign",
    value: function () {
      var _testCampaign = _asyncToGenerator__default['default']( /*#__PURE__*/_regeneratorRuntime__default['default'].mark(function _callee61(id, params) {
        var users, _yield$this$post3, campaign;

        return _regeneratorRuntime__default['default'].wrap(function _callee61$(_context61) {
          while (1) {
            switch (_context61.prev = _context61.next) {
              case 0:
                users = params.users;
                _context61.next = 3;
                return this.post(this.baseURL + "/campaigns/".concat(id, "/test"), {
                  users: users
                });

              case 3:
                _yield$this$post3 = _context61.sent;
                campaign = _yield$this$post3.campaign;
                return _context61.abrupt("return", campaign);

              case 6:
              case "end":
                return _context61.stop();
            }
          }
        }, _callee61, this);
      }));

      function testCampaign(_x81, _x82) {
        return _testCampaign.apply(this, arguments);
      }

      return testCampaign;
    }()
  }], [{
    key: "getInstance",
    value: function getInstance(key, secretOrOptions, options) {
      if (!StreamChat._instance) {
        if (typeof secretOrOptions === 'string') {
          StreamChat._instance = new StreamChat(key, secretOrOptions, options);
        } else {
          StreamChat._instance = new StreamChat(key, secretOrOptions);
        }
      }

      return StreamChat._instance;
    }
  }]);

  return StreamChat;
}();

_defineProperty__default['default'](StreamChat, "_instance", void 0);

var Allow = 'Allow';
var Deny = 'Deny';
var AnyResource = ['*'];
var AnyRole = ['*'];
var MaxPriority = 999;
var MinPriority = 1; // deprecated permission object class, you should use the new permission system v2 and use permissions
// defined in BuiltinPermissions to configure your channel types

var Permission = function Permission(name, priority) {
  var resources = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : AnyResource;
  var roles = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : AnyRole;
  var owner = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  var action = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : Allow;

  _classCallCheck__default['default'](this, Permission);

  _defineProperty__default['default'](this, "name", void 0);

  _defineProperty__default['default'](this, "action", void 0);

  _defineProperty__default['default'](this, "owner", void 0);

  _defineProperty__default['default'](this, "priority", void 0);

  _defineProperty__default['default'](this, "resources", void 0);

  _defineProperty__default['default'](this, "roles", void 0);

  this.name = name;
  this.action = action;
  this.owner = owner;
  this.priority = priority;
  this.resources = resources;
  this.roles = roles;
}; // deprecated

var AllowAll = new Permission('Allow all', MaxPriority, AnyResource, AnyRole, false, Allow); // deprecated

var DenyAll = new Permission('Deny all', MinPriority, AnyResource, AnyRole, false, Deny);
var BuiltinRoles = {
  Admin: 'admin',
  Anonymous: 'anonymous',
  ChannelMember: 'channel_member',
  ChannelModerator: 'channel_moderator',
  Guest: 'guest',
  User: 'user'
};
var BuiltinPermissions = {
  AddLinks: 'Add Links',
  BanUser: 'Ban User',
  CreateChannel: 'Create Channel',
  CreateMessage: 'Create Message',
  CreateReaction: 'Create Reaction',
  DeleteAnyAttachment: 'Delete Any Attachment',
  DeleteAnyChannel: 'Delete Any Channel',
  DeleteAnyMessage: 'Delete Any Message',
  DeleteAnyReaction: 'Delete Any Reaction',
  DeleteOwnAttachment: 'Delete Own Attachment',
  DeleteOwnChannel: 'Delete Own Channel',
  DeleteOwnMessage: 'Delete Own Message',
  DeleteOwnReaction: 'Delete Own Reaction',
  ReadAnyChannel: 'Read Any Channel',
  ReadOwnChannel: 'Read Own Channel',
  RunMessageAction: 'Run Message Action',
  UpdateAnyChannel: 'Update Any Channel',
  UpdateAnyMessage: 'Update Any Message',
  UpdateMembersAnyChannel: 'Update Members Any Channel',
  UpdateMembersOwnChannel: 'Update Members Own Channel',
  UpdateOwnChannel: 'Update Own Channel',
  UpdateOwnMessage: 'Update Own Message',
  UploadAttachment: 'Upload Attachment',
  UseFrozenChannel: 'Send messages and reactions to frozen channels'
};

exports.Allow = Allow;
exports.AllowAll = AllowAll;
exports.AnyResource = AnyResource;
exports.AnyRole = AnyRole;
exports.BuiltinPermissions = BuiltinPermissions;
exports.BuiltinRoles = BuiltinRoles;
exports.Channel = Channel;
exports.ChannelState = ChannelState;
exports.CheckSignature = CheckSignature;
exports.ClientState = ClientState;
exports.Deny = Deny;
exports.DenyAll = DenyAll;
exports.DevToken = DevToken;
exports.EVENT_MAP = EVENT_MAP;
exports.JWTServerToken = JWTServerToken;
exports.JWTUserToken = JWTUserToken;
exports.MaxPriority = MaxPriority;
exports.MinPriority = MinPriority;
exports.Permission = Permission;
exports.StableWSConnection = StableWSConnection;
exports.StreamChat = StreamChat;
exports.TokenManager = TokenManager;
exports.UserFromToken = UserFromToken;
exports.chatCodes = chatCodes;
exports.decodeBase64 = decodeBase64;
exports.encodeBase64 = encodeBase64;
exports.isOwnUser = isOwnUser;
exports.isValidEventType = isValidEventType;
exports.logChatPromiseExecution = logChatPromiseExecution;


}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"@babel/runtime/helpers/asyncToGenerator":8,"@babel/runtime/helpers/classCallCheck":9,"@babel/runtime/helpers/createClass":10,"@babel/runtime/helpers/defineProperty":11,"@babel/runtime/helpers/extends":12,"@babel/runtime/helpers/objectWithoutProperties":17,"@babel/runtime/helpers/slicedToArray":19,"@babel/runtime/helpers/toConsumableArray":20,"@babel/runtime/helpers/typeof":21,"@babel/runtime/regenerator":23,"_process":4,"axios":24,"base64-js":53,"buffer":2,"form-data":54,"isomorphic-ws":55}],98:[function(require,module,exports){
const Stream = require('../../node_modules/stream-chat/dist/index.js');
const config = require('../Utils/config');
const { StreamChat } = Stream;
const { BubbleTemplate } = config;
const messsageText = document.getElementById('message-input');
const info = document.getElementById('info');
const token = 'fdjfknfdfmdbfknmbhvcwewf';
const apiKey = 'bfkjbeifjkbjwe';

const client = new StreamChat(apiKey);
//initialize user
client.setUser(
  {
    id: 'userid',
    name: `First Name Last Name`,
    image: 'https://image.flaticon.com/icons/svg/145/145867.svg'
  },
  token
);

// Set Channel details
const channel = client.channel('messaging', 'General', {
  name: 'Awesome channel about traveling'
});

// fetch the channel state, subscribe to future updates
const state = channel.watch();

// sends an event typing.start to all channel participants
const checkTyping = async e => {
  if (e.type === 'keypress') {
    // sends an event typing.start to all channel participants
    await channel.keystroke();
  }
};

// Send message to the channel
messsageText.addEventListener('keypress', e => {
  checkTyping(e);
  if (e.keyCode == 13) {
    // clean message input a bit
    const text = e.target.value
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .trim();
    if (text === '') {
      return -1; //empty messages cannot be sent
    } else {
      channel.sendMessage({
        text: e.target.value
      });
      e.target.value = '';
    }
  }
});

messsageText.addEventListener('keyup', e => {
  checkTyping(e);
});

// Listen for new messages
channel.on('message.new', event => {
  const message = channel.state.messages[channel.state.messages.length - 1];
  //push the new message to the UI
  singleMessageDisplay(message);
});

channel.on('typing.start', event => {
  // You don't want to see your own 'you are typing...'. So only show that other people are typing and not you
  if (event.user.name !== client.user.name) {
    info.textContent = event.user.name + ' is typing...';
  }
});

channel.on('typing.stop', event => {
  // Replace the ... is typing ... text with nothing 2 seconds after they stop typing.
  setTimeout(() => {
    info.textContent = '';
  }, 2000);
});

// What is our current channel state? We get to know that from here
async function getState() {
  return await state;
}

// Get historical messages
getState().then(data => {
  document.getElementById('loading').textContent = '';
  data.messages.map(message => {
    singleMessageDisplay(message);
  });
});

// Push single message to display. This function pushes a chat bubble to the UI when you hit enter
const singleMessageDisplay = message => {
  if (message.user.id === client.user.id) {
    const div = document.createElement('div');
    div.className = 'msg right-msg';
    div.innerHTML = BubbleTemplate(
      message.user.name,
      message.user.id,
      message.text,
      message.created_at,
      client.user.image
    );
    document.getElementById('right-msg').appendChild(div);
  }

  if (message.user.id !== client.user.id) {
    const div = document.createElement('div');
    div.className = 'msg left-msg';
    div.innerHTML = BubbleTemplate(
      message.user.name,
      message.user.id,
      message.text,
      message.created_at,
      message.user.image
    );
    document.getElementById('left-msg').appendChild(div);
  }
};
},{"../../node_modules/stream-chat/dist/index.js":97,"../Utils/config":99}],99:[function(require,module,exports){
const TimeAgo = require('../../node_modules/javascript-time-ago');

// Load locale-specific relative date/time formatting rules.
const en = require('javascript-time-ago/locale/en');
TimeAgo.addLocale(en);

const timeAgo = new TimeAgo('en-US');

const config = {
  BubbleTemplate: (name, id, text, date, image) => {
    return `
      <div id="userImage" style="background-image: url(${image})"
      class="msg-img">
          </div>
              <div class="msg-bubble">
                  <div class="msg-info">
                      <div class="msg-info-name" id="name">${name}</div>
                      <div class="msg-info-time">${timeAgo.format(
                        date
                      )}</div>
                  </div>
                  <div class="msg-text">
                      ${text}
                  </div>
              </div>
      `;
  }
};

module.exports = config;
},{"../../node_modules/javascript-time-ago":87,"javascript-time-ago/locale/en":88}]},{},[98]);
