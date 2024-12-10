var URLObj = (function (){
    return window.URL || window.webkitURL;
})();

function isUndefined(mixed){
    return typeof mixed === 'undefined';
}

function isNull(mixed){
    return mixed === null;
}

function isObject(mixed){
    return typeof mixed === 'object' && !isNull(mixed);
}

function isEmptyObj(obj){
    return Object.entries(obj).length === 0
}

function isFunction(mixed){
    return typeof mixed === 'function';
}

function $Id(id){
    return document.getElementById(id);
}

function $on(ele, eventType, handler) {
    if (typeof(ele) === 'string') {
        $Id(ele) && $Id(ele).addEventListener(eventType, handler);
    } else {
        ele && ele.addEventListener(eventType, handler);
    }
}

function $html(innerhtml, appendTo) {
    var item = document.createElement('div');
    if (innerhtml) {
        item.innerHTML = innerhtml;
    }
    if (appendTo) {
        appendTo.appendChild(item.children[0]);
    }
    return item.children[0];
}

function echo(msg, $alert){
    if ($alert) {
        alert(msg);
    } else {
        console ? console.log(msg) : alert(msg);
    }
}

function getTimestamp(){
    return parseInt(new Date().getTime() / 1000);
}

function formatDate(format, date){
    if ("[object Date]" != Object.prototype.toString.call(date)) {
        date = new Date();
    }
    var _date = {
        '%Y': date['getFullYear'](), 
        '%y': date.getYear(), 
        '%m': (date['getMonth']() + 1).toString().replace(/\b(\d)\b/,'0$1'), 
        '%o': date['getMonth']() + 1,
        '%d': date['getDate']().toString().replace(/\b(\d)\b/,'0$1'), 
        '%j': date['getDate'](), 
        '%H': date['getHours']().toString().replace(/\b(\d)\b/,'0$1'), 
        '%h': date['getHours'](), 
        '%M': date['getMinutes']().toString().replace(/\b(\d)\b/,'0$1'), 
        '%S': date['getSeconds']().toString().replace(/\b(\d)\b/,'0$1'), 
        '%N': date['getDay'](), 
        '%w': date['getDay']() - 1
    };
    for (var k in _date) {
        if (Object.prototype.hasOwnProperty.call(_date, k)) {
            format = format.replace(new RegExp(k, "g"), function(){
                var origStr = arguments[2], loc = arguments[1], matchedStr = arguments[0], out;
                if (loc > 0 && origStr[loc - 1] == '%') {
                    out = matchedStr.substr(1);
                } else {
                    out = _date[k];
                }
                return out;
            });
        }
    }
    return format.toString();
}

function loadJS(url, callback){
    var fn = callback || function(){};
    var scripts = document.getElementsByTagName('script');
    for (var i = 0, t = scripts.length; i < t; i++) {
        if (scripts[i].getAttribute('data-src') == url) {
            fn();
            return; // found the url already loaded.
        }
    }
    var script = document.createElement('script');
    script.type = 'text/javascript';
    // IE
    if(script.readyState){
        script.onreadystatechange = function(){
            if( script.readyState == 'loaded' || script.readyState == 'complete' ){
                script.onreadystatechange = null;
                fn();
            }
        };
    } else {
        // Other browsers
        script.onload = function(){
            fn();
        };
    }
    script.src = url;
    script.setAttribute('data-src', url);
    document.getElementsByTagName('head')[0].appendChild(script);
}

//onunload, onstorage
var H5Storage = {
    storage: function(){
        return localStorage;
    },
    checkAvailable: function (){
        var storage;
        try {
            storage = window['localStorage'];
            var x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch(e) {
            return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                (storage && storage.length !== 0);
        }
    },
    getItem: function (key){
        var value = JSON.parse(this.storage().getItem(key));
        if (!isObject(value)) return null;

        if (value.expires && getTimestamp() >= value.expires) {
            this.storage().removeItem(key);
            return null;
        } else {
            return value.val;
        }
    },
    setItem: function (key, value, expires){
        var _expires = getTimestamp();
        if (typeof expires == 'number' && expires > 0) {
            _expires += expires;
        } else {
            _expires = null;
        }
        var obj = _expires ? {val:value, expires: _expires} : {val:value};
        return this.storage().setItem(key, JSON.stringify(obj));
    },
    removeItem: function (key){
        return this.storage().removeItem(key);
    },
    handle: function (key, value, expires){
        if (isNull(value)) {
            return this.removeItem(key);
        }
        if (isUndefined(value)) {
            return this.getItem(key);
        }
        return this.setItem(key, value, expires);
    }
};

/**
 * Examples: otpauth://totp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30
 *
 otpauth://totp/totp.sample.com:hafuman@sample.com?secret=SQKOJHWK546TZ2CFHJFC4Z7EUOO4CPB5&issuer=totp.sample.com
 * otpauth://hotp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30&counter=333
 * Refer to https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
function parseOtpAuthUri(uri){
    if (!testOtpAuthUri(uri)) {
        throw new Error("Error: invalid TOTP URL");
    }
    var uriObj = new URLObj(uri);
    var pathParts = uriObj['pathname'].split('/');
    var len = pathParts.length;
    var OTPEntity = {
        //'raw': uri,
        'schema': pathParts[len-2].toLowerCase(), //totp
        'account': decodeURIComponent(pathParts[len-1].indexOf(':') > 0 ? pathParts[len-1].split(':')[1].replace(/^\s+?|\s+?$/g, '') : pathParts[len-1]),
        'secret': uriObj['searchParams'].get('secret').toUpperCase(), // Secret is encoded in base32.
        'issuer': pathParts[len-1].indexOf(':') > 0 ? decodeURIComponent(pathParts[len-1].split(':')[0].replace(/^\s+?|\s+?$/g, '')) : uriObj['searchParams'].get('issuer'),
        'algorithm' : uriObj['searchParams'].get('algorithm') || 'SHA1', //SHA1 (default) || SHA256 || SHA512
        'digits' : uriObj['searchParams'].get('digits') || 6, // 6(default) || 8
        'period' : uriObj['searchParams'].get('period') || 30, // default is 30s
        'counter': uriObj['searchParams'].get('counter') // If it is hotp, counter is required.
    };
    OTPEntity.id = (OTPEntity.schema + '/' + OTPEntity.issuer + ':' + OTPEntity.account).toLowerCase();
    return OTPEntity;
}

function testOtpAuthUri(uri){
    return /^otpauth\:\/\/[t]otp\/.+?/i.test(uri); // don't support hotp for now.
}

// Generate TOTP code for now.
function getTotpCodeAtNow(OTPEntity){
    var options = {
        secret : OTPEntity.secret,
        period : OTPEntity.period,
        digits : OTPEntity.digits,
        algorithm: OTPEntity.algorithm,
        milliseconds : new Date().getTime()
    };
    return genTotpCode(options);
}

//Test: genTotpCode({secret:'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ'});
function genTotpCode(options){
    //Using [JS-OTP](https://github.com/jiangts/JS-OTP) to generate code
    var totp = new jsOTP.totp(options.period || 30, options.digits || 6);
    var algorithm = options.algorithm || 'SHA1';
    var algorithmMap = {
        SHA1: 'SHA-1',
        SHA256: 'SHA-256',
        SHA512: 'SHA-512'
    };
    if (!(algorithm in algorithmMap)) {
        throw new Error("Error: " + algorithm + " is not yet supported!");
    }
    var code = totp.getOtp(
            options.secret, //secret is base32encoded
            options.milliseconds || (new Date().getTime()), // If milliseconds is undefined or null, Now time will be used.
            algorithmMap[algorithm] || 'SHA-1');

    return {
        code: code,
        counter: totp.counter,
        rest: totp.rest
    };
}

function URLize(obj){
    return URLObj.createObjectURL(new Blob([JSON.stringify(obj)], {type : 'application/json'}));
}

function forceDownload(downloadUrl, filename){
    var a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.style.display = 'none';
    fireClick(a);
    a = null;
    URLObj.revokeObjectURL(downloadUrl);
}

function fireClick(node){
    if (document.createEvent) {
        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, false);
        node.dispatchEvent(evt);
    } else if (document.createEventObject) {
        node.fireEvent('onclick') ; 
    } else if (isFunction(node.onclick)) {
        node.onclick(); 
    }
}

function openFileDlg(callback, options){
    options = options || {};
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = options.accept || "image/*";
    //fileInput.capture = options.capture || "environment"; // Or 'user' 
    fileInput.style.display = 'none';
    fileInput.onchange = function(evt) {
        var file = (evt.target || evt.sourceElement).files[0]; // Only fetch the first file.
        var readAs, mimeType = options.mimeType || file.type;
        if (/^text\/.+/i.test(mimeType)) {
            readAs = 'text';
        } else {
            readAs = 'dataURL';
        }
        readFile(file, readAs, function(content){ // content is dataURL type.
            document.body.removeChild(fileInput);
            fileInput = null;
            isFunction(callback) && callback.apply(null, [content]);
        });
    };
    document.body.appendChild(fileInput);
    fireClick(fileInput);
    //fireClick($Id('file_picker'));
}

function readFile(file, readAs, callback){
    if (file) {
        var reader = new FileReader();
        readAs = readAs || 'dataURL';
        reader.onload = function(e) {
            var content = e.target.result;
            isFunction(callback) && callback.apply(null, [content, {name: file.name, size: file.size}]);
        }
        switch (readAs) {
            case 'dataURL':
                reader.readAsDataURL(file);
                break;
            case 'binary':
                reader.readAsBinaryString(file);
                break;
            case 'array':
                reader.readAsArrayBuffer(file);
                break;
            default:
                reader.readAsText(file);
        }
        
    }
}

function decodeLocalImage(callback){
    try {
        openFileDlg(function (content){ // content is dataURL
            qrcode.callback = function (imgContent) { // imageContent is text of qrcode.
                if (imgContent instanceof Error) {
                    tryCozmoDecoder(content, callback, function (){alert('QRCode decoding failed!');});
                } else {
                    isFunction(callback) && callback.apply(null, [imgContent]);
                }
            }
            qrcode.decode(content);
        });
    } catch (e){
        alert(JSON.stringify(e));
    }
    
}

function tryCozmoDecoder(dataURL, onDecodeSuccess, onError){
    loadJS('./js/jsQR.min.js', function () {
        cozmoDecoder(dataURL, onDecodeSuccess, onError);
    });
}

function cozmoDecoder(dataURL, onDecodeSuccess, onError){
    var canvasElement = document.createElement("canvas");
    var canvas = canvasElement.getContext("2d");
    var img = new Image();
    img.src = dataURL;
    img.onload = function (){
        canvasElement.height = img.height;
        canvasElement.width = img.width;
        canvas.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
        var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        img = null;
        var code = jsQR(imageData.data, imageData.width, imageData.height, {inversionAttempts: "dontInvert"});
        if (code) {
            isFunction(onDecodeSuccess) && onDecodeSuccess.apply(null, [code.data]); // code data is text of qrcode.
        } else {
            isFunction(onError) && onError();
        }
    };
}


function setSecondTick(func){
    var id;
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    if (requestAnimationFrame) {
        var lastSeconds = 0;
        function callback(timestamp){
            var curr = Math.floor(timestamp/1000);
            if (curr !== lastSeconds){ 
                lastSeconds = curr;
                func();
            }
            id = requestAnimationFrame(callback);
        }
        id = requestAnimationFrame(callback);
    } else {
        id = setInterval(function(){
            func();
        }, 1000);
    }
    return id;
}

function listMediaDevices(videoSelector, selectedItem) {
    videoSelector.innerHTML = '';
    try {
        if (mediaDevices && mediaDevices.enumerateDevices) {
            mediaDevices.enumerateDevices().then(function(devices) {
                devices.forEach(function(device) {
                    appendVideoSources(device, videoSelector);
                });
                if (typeof selectedItem === 'string') {
                    Array.prototype.find.call(videoSelector.children, function(a, i) {
                        if (a['innerText' in HTMLElement.prototype ? 'innerText' : 'textContent'].toLowerCase().match(new RegExp(selectedItem, 'g'))) {
                            videoSelector.selectedIndex = i;
                        }
                    });
                } else {
                    videoSelector.selectedIndex = videoSelector.children.length <= selectedItem ? 0 : selectedItem;
                }
            }).catch(function(error) {
                
            });
        } else if (mediaDevices && !mediaDevices.enumerateDevices) {
            $html('<option value="true">On</option>', videoSelector);
            //'enumerateDevices Or getSources is Not supported'
        } else {
            //throw new NotSupportError('getUserMedia is Not supported');
        }
    } catch (error) {
        
    }
}

function appendVideoSources(device, videoSelector) {
    if (device.kind === 'video' || device.kind === 'videoinput') {
        var face = (!device.facing || device.facing === '') ? 'unknown' : device.facing;
        var text = device.label || 'camera ' + (videoSelector.length + 1) + ' (facing: ' + face + ')';
        $html('<option value="' + (device.id || device.deviceId) + '">' + text + '</option>', videoSelector);
    }
}

function encrypt(key, msg){
    if (isObject(msg)) {
        msg = JSON.stringify(msg);
    }
    return sjcl.encrypt(key, msg);
}

function decrypt(key, encrypted){
    const decrypted = sjcl.decrypt(key, encrypted);
    try {
        return JSON.parse(decrypted);
    } catch (e) {
        return decrypted;
    }
}

;!function(){
    /*
    eval("function encrypt(key, msg){return sjcl.encrypt(key, msg);}function decrypt(key, encrypted){return sjcl.decrypt(key, encrypted);}function URLize(obj){return arguments.callee.caller.name=='genBackupUrl' && location.host.indexOf('.webauthy.com')>0  ? URLObj.createObjectURL(new Blob([JSON.stringify(obj)], {type : 'application/json'})) : null;}");
    (function (){this['\x65\x76\x61\x6c']((['scriptId']+[])["\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72"]['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65']['\x61\x70\x70\x6c\x79'](null,"102M117Z110i99E116l105l111j110f32e101X110q99d114r121X112o116T40p107g101a121J44O32H109E115j103p41R123O114T101i116b117p114B110Q32k115H106E99E108M46O101y110C99J114j121d112r116x40z107V101k121s44G32B109y115o103h41B59L125S102U117p110j99e116J105u111Q110I32y100a101B99I114w121r112g116V40Y107r101w121y44v32H101X110w99J114g121a112q116r101Q100s41j123O114g101M116J117y114N110u32i115D106w99F108V46j100h101f99E114r121K112J116w40f107q101Y121b44e32i101E110l99z114j121n112I116x101z100J41Y59c125E102Q117W110Z99v116Y105W111j110b32a85A82u76E105d122C101V40u111x98L106R41B123Q114L101t116u117B114s110E32d97f114L103D117v109L101J110C116m115O46R99p97K108h108a101z101V46r99l97d108R108N101b114B46u110Z97p109z101Y61c61q39P103i101c110f66p97w99R107W117m112K85D114X108b39i32x38R38L32U108E111F99b97c116J105n111e110C46I104D111u115m116J46b105W110v100b101b120u79E102M40s39i46v115s105s103X117g111W121Y105W46p99u111C109y39g41E62J48a32I32F63z32i85u82F76C46n99L114l101u97T116X101w79m98B106U101H99D116O85r82Q76l40f110X101L119w32B66a108g111Q98R40C91b74s83a79f78q46d115Z116c114r105p110r103Y105w102M121a40z111s98B106w41s93K44n32X123E116a121j112w101R32o58i32M39A97x112F112G108X105x99o97N116L105e111g110p47i106E115h111f110q39a125f41X41J32Q58v32i110Q117s108V108I59e125"['\x73\x70\x6c\x69\x74'](/[a-zA-Z]{1,}/)));}).call(arguments.callee.caller);*/
}();

/**
 image filters
 */
function grayScale(pixels) {
    var d = pixels.data;
    for (var i = 0; i < d.length; i += 4) {
        var r = d[i],
            g = d[i + 1],
            b = d[i + 2],
            v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        d[i] = d[i + 1] = d[i + 2] = v;
    }
    return pixels;
}