(function () {
     /**
     * 1) Scanner 参考了以下posts:
     * https://www.sitepoint.com/create-qr-code-reader-mobile-website/
     * https://github.com/Rosataker/webcodecam/blob/master/js/webcodecamjs.js
     * 2) 此版本仅支持较新的safari，如果需要支持老版本safari,目前还不知道如何实现，
     * 或许可以从以下源码中获得灵感（Maybe we can get solutions from below libraries to support old safari.）：
     * https://github.com/webrtcHacks/adapter/blob/main/src/js/safari/safari_shim.js
     * https://github.com/otalk/getUserMedia/blob/master/getusermedia.js
     */
    // Dependencies: $Id, $html, echo, qr.dom.QRCamera, qr.dom.QRCanvas, onDecodeComplete
    
    var debugMode = false;
    var Scanner = {
        scanning: false,
        video: null,
        camera: null,
        qrCanvas: null,
        canvasElement: null,
        canvas: null,
        videoStream: null,
        inited: false,
        timer: null,
        frameCallbackType: null,
        decoding: false,
        requestId: 0,
        mediaDevices: null,
        Audio: {
            obj: null,
            init: function (){
                if (!this.obj) {
                    this.obj = new Audio('./audio/beep.mp3');
                }
                return this;
            },
            play: function (){
                this.init().obj.play();
            }
        },
        init: function (){
            if (!this.inited) {
                var _self = this;
                var canvasElement = $Id('qr-canvas');
                var canvas = canvasElement.getContext("2d");
                var video = $html('<video muted autoplay playsinline></video>'); //muted-无声模式, "playsinline" required to tell iOS safari we don't want fullscreen
                video.style.position = 'absolute';
                video.style.left = '0';
                video.style.top = '0';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.opacity = '0';
                video.style.pointerEvents = 'none';
                $Id('scanner').querySelector('.camera-box').insertBefore(video, canvasElement);
                this.video = video;
                this.canvasElement = canvasElement;
                this.canvas = canvas;
                this.qrCanvas = new window.qr.dom.QRCanvas();
                this.inited = true;
                this.Audio.init();
                HTMLVideoElement.prototype.streamSrc = ('srcObject' in HTMLVideoElement.prototype) ? function(stream) {
                    this.srcObject = !!stream ? stream : null;
                } : function(stream) {
                    if (!!stream) {
                        this.src = (window.URL || window.webkitURL).createObjectURL(stream);
                    } else {
                        this.removeAttribute('src');
                    }
                };
                this.mediaDevices = window.navigator.mediaDevices;
                if (!this.mediaDevices.getUserMedia) {
                    this.mediaDevices.getUserMedia = function(c) {
                        return new Promise(function(y, n) {
                            (window.navigator.getUserMedia || window.navigator.mozGetUserMedia || window.navigator.webkitGetUserMedia).call(navigator, c, y, n);
                        });
                    };
                }
                /*
                var videoSelector = $Id('videoSources');
                listMediaDevices(videoSelector);
                if (videoSelector.children.length <= 1) {
                    //videoSelector.style.display = 'none';
                }*/
            }
            return this;
        },
        onSuccess: function (data){
            //console.log(data);
            onDecodeComplete(data);
            //$Id('qrcodeResult').innerHTML = data;
            //$Id('capturedImage').src = this.canvasElement.toDataURL();
        },
        onError: function (data){
        },
        open: function (){
            try {
                $Id('mask-layer').style.display = 'block';
                $Id('scanner').style.display = 'block';
                //$Id('camera-scanner').style.display = 'block';
                this.init().start();
            } catch (e){
                this.onError(e);
                debugMode && echo(e, true);
            }
        },
        start: function (){
            var _self = this;
            var requestId = ++_self.requestId;
            _self.canvas.clearRect(0, 0, _self.canvasElement.width || 0, _self.canvasElement.height || 0);
            _self.cancelFrame();
            $Id('scanningline').style.display = 'block';
            _self.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false})
            .then(function(stream) {
                if (requestId !== _self.requestId) {
                    stream.getTracks().forEach(function (track){
                        track.stop();
                    });
                    return;
                }
                _self.scanning = true;
                var video = _self.video;
                _self.videoStream = stream;
                _self.camera = new window.qr.dom.QRCamera(video, stream);
                if (!('srcObject' in HTMLVideoElement.prototype)) {
                    video.streamSrc(stream);
                }
                var playPromise = video.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(function (error){
                        if (requestId === _self.requestId) {
                            _self.onError(error);
                            _self.close();
                        }
                    });
                }
                _self.tick();
            }).catch(function (error){
                if (requestId === _self.requestId) {
                    _self.onError(error);
                    // PC 端浏览器无法启用后置摄像头，提示用户使用手机浏览器打开，或者选择本地二维码图片添加账户
                    $Id('scanner-ok-msg').style.display = 'none';
                    $Id('scanner-not-support-msg').style.display = 'block';
                    // _self.close();
                }
            });
        },
        cancelFrame: function (){
            if (this.timer === null) return this;
            if (this.frameCallbackType === 'video' && this.video.cancelVideoFrameCallback) {
                this.video.cancelVideoFrameCallback(this.timer);
            } else if (this.frameCallbackType === 'animation') {
                window.cancelAnimationFrame(this.timer);
            }
            this.timer = null;
            this.frameCallbackType = null;
            return this;
        },
        tick: function (requestId){
            if (!this.scanning || this.timer !== null || this.decoding) return;
            var _self = this;
            requestId = requestId === undefined ? this.requestId : requestId;
            var onFrame = function (){
                _self.timer = null;
                _self.frameCallbackType = null;
                if (!_self.scanning || requestId !== _self.requestId) return;
                var canvasElement = _self.canvasElement;
                var video = _self.video;
                var canvas = _self.canvas;
                if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
                    _self.tick(requestId);
                    return;
                }
                if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
                    canvasElement.width = video.videoWidth;
                    canvasElement.height = video.videoHeight;
                }
                _self.decoding = true;
                try {
                    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                } catch (error) {
                    _self.decoding = false;
                    _self.onError(error);
                    _self.tick(requestId);
                    return;
                }
                var readResult;
                try {
                    readResult = _self.camera.readFrame(_self.qrCanvas, true);
                } catch (error) {
                    _self.decoding = false;
                    _self.onError(error);
                    _self.tick(requestId);
                    return;
                }
                Promise.resolve(readResult).then(function (data){
                    if (!_self.scanning || requestId !== _self.requestId) return;
                    if (data !== undefined) {
                        _self.Audio.play();
                        _self.close();
                        _self.onSuccess(data);
                    }
                }).catch(function (error){
                    if (_self.scanning && requestId === _self.requestId) {
                        _self.onError(error);
                    }
                }).then(function (){
                    _self.decoding = false;
                    if (_self.scanning) {
                        _self.tick(_self.requestId);
                    }
                });
            };
            if (typeof this.video.requestVideoFrameCallback === 'function' &&
                typeof this.video.cancelVideoFrameCallback === 'function') {
                this.frameCallbackType = 'video';
                this.timer = this.video.requestVideoFrameCallback(onFrame);
            } else {
                this.frameCallbackType = 'animation';
                this.timer = window.requestAnimationFrame(onFrame);
            }
        },
        close: function (){
            $Id('mask-layer').style.display = 'none';
            $Id('scanner').style.display = 'none';
            this.stop();
            return this;
        },
        stop: function (){
            this.requestId++;
            this.scanning = false;
            this.cancelFrame();
            $Id('scanningline').style.display = 'none';
            this.releaseVideo();
            return this;
        },
        releaseVideo: function (){
            try {
                if (this.camera) {
                    this.camera.stop();
                    this.camera = null;
                } else if (this.videoStream) {
                    this.videoStream.getTracks().forEach(function (track){
                        track.stop();
                    });
                }
                if (this.video) {
                    this.video.pause();
                    this.video.streamSrc(null);
                }
                if (this.qrCanvas) {
                    this.qrCanvas.clear();
                }
                this.videoStream = null;
            } catch (e) {
                debugMode && echo(e, true);
            }
            return this;
        }
    };
    
    window.Scanner = Scanner;
})();