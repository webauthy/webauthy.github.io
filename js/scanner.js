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
    // Dependencies: $Id, $html, echo, qrcode, onDecodeComplete
    
    var debugMode = false;
    var Scanner = {
        scanning: false,
        video: null,
        canvasElement: null,
        canvas: null,
        videoStream: null,
        inited: false,
        timer: null,
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
                this.video = video;
                this.canvasElement = canvasElement;
                this.canvas = canvas;
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
                
                qrcode.callback = function (data){
                    if (!(data instanceof Error)) {
                        _self.Audio.play();
                        _self.close();
                        _self.onSuccess(data);
                    } else {
                        _self.onError(data);
                    }
                    
                };
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
                this.init().start();
            } catch (e){
                debugMode && echo(e, true);
            }
        },
        start: function (){
            var _self = this;
            _self.canvas.clearRect(0, 0, _self.canvasElement.width || 0, _self.canvasElement.height || 0);
            clearTimeout(_self.timer);
            $Id('scanningline').style.display = 'block';
            _self.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false})
            .then(function(stream) {
                _self.scanning = true;
                var canvasElement = _self.canvasElement;
                var video = _self.video;
                video.streamSrc(stream);
                _self.videoStream = stream;
                video.play();
                _self.tick();
            }).catch(function (){
                _self.close();
            });
        },
        tick: function (){
            if (!this.scanning) return;
            var _self = this;
            _self.timer = window.setTimeout(function (){
                var canvasElement = _self.canvasElement;
                var video = _self.video;
                var canvas = _self.canvas;
                canvasElement.height = video.videoHeight;
                canvasElement.width = video.videoWidth;
                canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                // var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                //imageData = grayScale(imageData); //不做灰度化处理
                // canvas.putImageData(imageData, 0, 0); // 这代码在safari中无法运行
                
                try {
                    qrcode.decode(canvasElement.toDataURL());
                } catch (e){}
                _self.tick();
            }, 200);
        },
        close: function (){
            $Id('mask-layer').style.display = 'none';
            $Id('scanner').style.display = 'none';
            if (this.scanning) {
                this.stop();
            }
            return this;
        },
        stop: function (){
            this.scanning = false;
            clearTimeout(this.timer);
            $Id('scanningline').style.display = 'none';
            this.releaseVideo();
            return this;
        },
        releaseVideo: function (){
            try {
                this.video.streamSrc(null);
                this.videoStream.getTracks().forEach(function (track){
                    track.stop();
                });
                this.videoStream = null;
            } catch (e) {
                debugMode && echo(e, true);
            }
            return this;
        }
    };
    
    window.Scanner = Scanner;
})();