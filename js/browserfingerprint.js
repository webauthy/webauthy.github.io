// Bring from https://github.com/damianobarbati/get-browser-fingerprint/blob/main/src/index.js
/**
    If the lib is not good, can consider react lib: https://github.com/sushinpv/react-secure-storage/blob/master/src/lib/fingerprint.lib.ts
*/
(function () {
  var getBrowserFingerprint = function({loose = false, hardwareOnly = false, enableWebgl = false, debug = false } = {}){
  var { cookieEnabled, deviceMemory, doNotTrack, hardwareConcurrency, language, languages, maxTouchPoints, platform, userAgent, vendor } = window.navigator;

  var { width, height, colorDepth, pixelDepth } = window.screen;
  var timezoneOffset = new Date().getTimezoneOffset();
  var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var touchSupport = 'ontouchstart' in window;
  var devicePixelRatio = window.devicePixelRatio;

  var canvas = getCanvasID(debug);
  var webgl = enableWebgl ? getWebglID(debug) : undefined; // undefined will remove this from the stringify down here
  var webglInfo = enableWebgl ? getWebglInfo(debug) : undefined; // undefined will remove this from the stringify down here

  var data = loose
    ? JSON.stringify({
        canvas,
        deviceMemory,
        hardwareConcurrency,
        maxTouchPoints,
        touchSupport,
      })
    : (hardwareOnly
    ? JSON.stringify({
        canvas,
        colorDepth,
        deviceMemory,
        devicePixelRatio,
        hardwareConcurrency,
        height,
        maxTouchPoints,
        pixelDepth,
        platform,
        touchSupport,
        webgl,
        webglInfo,
        width,
      })
    : JSON.stringify({
        canvas,
        colorDepth,
        cookieEnabled,
        deviceMemory,
        devicePixelRatio,
        doNotTrack,
        hardwareConcurrency,
        height,
        language,
        languages,
        maxTouchPoints,
        pixelDepth,
        platform,
        timezone,
        timezoneOffset,
        touchSupport,
        userAgent,
        vendor,
        webgl,
        webglInfo,
        width,
      })
      );

  var datastring = JSON.stringify(data, null, 4);

  if (debug) console.log('fingerprint data', datastring);

  var result = murmurhash3_32_gc(datastring);
  return result;
};

var getCanvasID = function (debug){
  try {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~1!2@3#4$5%6^7&8*9(0)-_=+[{]}|;:',<.>/?";
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText(text, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText(text, 4, 17);

    var result = canvas.toDataURL();

    if (debug) {
      document.body.appendChild(canvas);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return murmurhash3_32_gc(result);
  } catch {
    return null;
  }
};

var getWebglID = function(debug){
  try {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('webgl');
    canvas.width = 256;
    canvas.height = 128;

    var f =
      'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}';
    var g = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}';
    var h = ctx.createBuffer();

    ctx.bindBuffer(ctx.ARRAY_BUFFER, h);

    var i = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.7321, 0]);

    ctx.bufferData(ctx.ARRAY_BUFFER, i, ctx.STATIC_DRAW), (h.itemSize = 3), (h.numItems = 3);

    var j = ctx.createProgram();
    var k = ctx.createShader(ctx.VERTEX_SHADER);

    ctx.shaderSource(k, f);
    ctx.compileShader(k);

    var l = ctx.createShader(ctx.FRAGMENT_SHADER);

    ctx.shaderSource(l, g);
    ctx.compileShader(l);
    ctx.attachShader(j, k);
    ctx.attachShader(j, l);
    ctx.linkProgram(j);
    ctx.useProgram(j);

    j.vertexPosAttrib = ctx.getAttribLocation(j, 'attrVertex');
    j.offsetUniform = ctx.getUniformLocation(j, 'uniformOffset');

    ctx.enableVertexAttribArray(j.vertexPosArray);
    ctx.vertexAttribPointer(j.vertexPosAttrib, h.itemSize, ctx.FLOAT, !1, 0, 0);
    ctx.uniform2f(j.offsetUniform, 1, 1);
    ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, h.numItems);

    var n = new Uint8Array(canvas.width * canvas.height * 4);
    ctx.readPixels(0, 0, canvas.width, canvas.height, ctx.RGBA, ctx.UNSIGNED_BYTE, n);

    var result = JSON.stringify(n).replace(/,?"[0-9]+":/g, '');

    if (debug) {
      document.body.appendChild(canvas);
    } else {
      ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT);
    }

    return murmurhash3_32_gc(result);
  } catch {
    return null;
  }
};

var getWebglInfo = function(){
  try {
    var ctx = document.createElement('canvas').getContext('webgl');

    var result = {
      VERSION: ctx.getParameter(ctx.VERSION),
      SHADING_LANGUAGE_VERSION: ctx.getParameter(ctx.SHADING_LANGUAGE_VERSION),
      VENDOR: ctx.getParameter(ctx.VENDOR),
      SUPORTED_EXTENSIONS: ctx.getSupportedExtensions(),
    };

    return result;
  } catch {
    return null;
  }
};

var murmurhash3_32_gc = function(key){
  var remainder = key.length & 3; // key.length % 4
  var bytes = key.length - remainder;
  var c1 = 0xcc9e2d51;
  var c2 = 0x1b873593;

  var h1, h1b, k1;

  for (var i = 0; i < bytes; i++) {
    k1 = (key.charCodeAt(i) & 0xff) | ((key.charCodeAt(++i) & 0xff) << 8) | ((key.charCodeAt(++i) & 0xff) << 16) | ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1b = ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
    h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
  }

  var i = bytes - 1;

  k1 = 0;

  switch (remainder) {
    case 3: {
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
      break;
    }
    case 2: {
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
      break;
    }
    case 1: {
      k1 ^= key.charCodeAt(i) & 0xff;
      break;
    }
  }

  k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
  k1 = (k1 << 15) | (k1 >>> 17);
  k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= k1;

  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 = ((h1 & 0xffff) * 0x85ebca6b + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 13;
  h1 = ((h1 & 0xffff) * 0xc2b2ae35 + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
};

window.getBrowserFingerprint = getBrowserFingerprint;
})()
