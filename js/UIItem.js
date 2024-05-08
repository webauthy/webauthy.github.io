(function (){
    // Dependencies: isFunction, removeItem

    function UIItem(options){
        this.id = options.id;
        this.data = {
            id: options.id,
            schema: options.schema,
            code: options.code,
            account: options.account,
            issuer: options.issuer,
            period: options.period,
            rest: options.rest,
            digits: options.digits || 6,
            counter: options.counter
        };
        this._init()._renderData();
    }
    UIItem.prototype._init = function (){
        this.fragment = document.createDocumentFragment();
        var rootEle = document.createElement('div');
        rootEle.className = 'row';
        rootEle.id = this.data.id;
        this.fragment.appendChild(rootEle);
        var ele = document.createElement('div');
        ele.className = 'item';
        ele.innerHTML = '<div class="code"></div><div class="issuer"></div><a class="btn eye-btn eye-off" href="javascript:toggleVisible(\''+this.id+'\');"></a><a href="javascript:removeItem(\''+this.id+'\');" class="btn del-btn"></a>';
        rootEle.appendChild(ele);
        ele = null;
        ele = document.createElement('div');
        ele.className = 'bar-slot';
        ele.appendChild(this._buildAnimation(this.data.rest));
        rootEle.appendChild(ele);
        
        this.rootEle = rootEle;
        return this;
    };
    UIItem.prototype._buildAnimation = function (sec){
        var fragment = document.createDocumentFragment();
        var ele = document.createElement('div');
        ele.className = 'bar';
        ele.style.animation = 'growing '+sec+'s linear';//linear表示匀速
        fragment.appendChild(ele);
        return fragment;
    };
    UIItem.prototype.template = '\
        <div class="item"><div class="code">{{code}}</div><div class="issuer"><b>{{account}}</b> ({{issuer}})</div><a class="btn del-btn"></a></div>\
        <div class="bar-slot"><div class="bar" style="-moz-animation:growing {{rest}}s;-webkit-animation:growing {{rest}}s;animation:growing {{rest}}s;"></div></div>\
    '; //并没有用到template
    UIItem.prototype._renderData = function (){
        this.fragment.querySelector('.code').innerHTML = this.formatCode(this.data.code);
        this.fragment.querySelector('.issuer').innerHTML = '<b>{{issuer}}</b>&nbsp;&nbsp;( {{account}} )'.replace(/\{\{account\}\}/, this.data.account).replace(/\{\{issuer\}\}/, this.data.issuer);
        return this;
    };
    UIItem.prototype.remove = function (){
        this.container.removeChild($Id(this.id));
        return this;
    };
    UIItem.prototype.toggleVisible = function (){
        this.rootEle.querySelector('.code').classList.toggle('mosaic');
        var eyeBtn = this.rootEle.querySelector('.eye-btn');
        eyeBtn.classList.toggle('eye-on');
        eyeBtn.classList.toggle('eye-off');
    };
    UIItem.prototype.counterChanged = function (){
        var counter = this.data.counter;
        var now = new Date().getTime();
        var epoch = Math.round(now / 1000.0);
        var realtimeCounter = Math.floor(epoch / this.data.period);
        if (realtimeCounter != counter) {
            return true;
        }
        return false;
    };
    UIItem.prototype.refresh = function (codeObj, callback){
        this.data.rest = codeObj.rest;
        this.data.counter = codeObj.counter;
        this.data.code = codeObj.code;
        this.rootEle.querySelector('.code').innerHTML = this.formatCode(this.data.code);
        this.rootEle.querySelector('.bar-slot').innerHTML = '';
        this.rootEle.querySelector('.bar-slot').appendChild(this._buildAnimation(this.data.rest));
        isFunction(callback) && callback();
        return this;
    };
    UIItem.prototype.formatCode = function (code) {
        var len = code.length;
        return code.slice(0, len / 2) + "&nbsp;" + code.slice(len / 2);
    };
    UIItem.prototype.flashBorder = function (){
        var classList = this.rootEle.classList, flashClassName = 'flash-border';
        if (classList.contains(flashClassName)) {
            classList.remove(flashClassName);
            void this.rootEle.offsetWidth; //简单地移除class再重新加上，并不能重新启动动画，此代码触发重绘以解决这个问题。
        }
        classList.add(flashClassName);
        return this;
    };
    UIItem.prototype.toggleWarningBorder = function (){
        var classList = this.rootEle.classList, flashClassName = 'warning-border';
        classList.toggle(flashClassName);
        return this;
    };
    UIItem.prototype.attach = function (eleContainer, prepend){
        this.container = eleContainer;
        if (prepend) {
            var children = this.container.childNodes;
            if (children) {
                for (var i = 0, l = children.length; i < l; i++) {
                    if (children[i].nodeType === 1 ) {
                        this.container.insertBefore(this.fragment, children[i]);
                        return this;
                    }
                }
            }
        }
        this.container.appendChild(this.fragment);
        return this;
    };
    
    window.UIItem = UIItem;
})();