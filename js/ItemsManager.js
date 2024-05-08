(function (){
    // Dependencies: localforage, UIItem, getTotpCodeAtNow, isEmptyObj, isFunction, encrypt, URLize
    
    var ItemsStorage = {
        storageKey: 'OTPEntities', 
        secret: null,
        setSecret: function (){
            if (!this.secret) {
                var fingerprint = getBrowserFingerprint({loose: 1});
                this.secret = fingerprint ? fingerprint.toString('16').substring(0,8) : null; // key length must be 4/6/8 for sjcl.aes
            }
        },
        store: function (obj){
            this.setSecret();
            var storeData = this.secret ? encrypt(this.secret, obj) : obj;
            localforage.setItem(this.storageKey, storeData); // https://localforage.github.io/localForage/
            return true;
        },
        restore: function (callback){
            this.setSecret();
            var self = this;
            return localforage.getItem(this.storageKey, function (err, data){
                if (err) {
                    alert(err);
                } else {
                    if (data && typeof(data) == 'string' && self.secret) {
                        data = decrypt(self.secret, data)
                    }
                    isFunction(callback) && callback(data);
                }
            });
        }
        
    };
    
    var ItemsManager = {
        ASC: 'asc',
        DESC: 'desc',
        containerEle: null,
        UIItems:{},
        OTPEntities:{},
        orders:[],
        setContainer: function (containerEle){
            this.containerEle = containerEle;
            return this;
        },
        showOTPCode: function (OTPEntity, store) {
            store = typeof store === 'undefined' ? true : store;
            var codeObj = getTotpCodeAtNow(OTPEntity);
            this.addOTPEntity(OTPEntity).renderOTPEntity(OTPEntity.id, codeObj);
            if (store) {
                this.storeOTPEntities();
            }
            return this;
        },
        addOTPEntity: function (OTPEntity){
            this.OTPEntities[OTPEntity.id] = OTPEntity;
            return this;
        },
        storeOTPEntities: function (){
            ItemsStorage.store(this.OTPEntities);
            return this;
        },
        renderOTPEntity: function (id, codeObj){
            var OTPEntity = this._getOTPEntity(id);
            var options = {
                id: OTPEntity.id,
                schema: OTPEntity.schema,
                account: OTPEntity.account,
                issuer: OTPEntity.issuer,
                period: OTPEntity.period,
                digits: OTPEntity.digits,
                rest: codeObj.rest,
                code: codeObj.code,
                counter: codeObj.counter
            };
            var item = new UIItem(options);
            this._appendItem(item);
        },
        _getOTPEntity: function (id){
            return this.OTPEntities[id];
        },
        _appendItem: function (item){
            this.UIItems[item.id] = item;
            this._display(item);
            return this;
        },
        _display: function (item){
            item.attach(this.containerEle);
        },
        
        //询问是否要更新
        observe: function (){
            for (var id in this.UIItems) {
                if (!this.UIItems.hasOwnProperty(id)) {
                    continue;
                }
                var Item = this.getUIItem(id);
                if (!Item.counterChanged()){
                    continue;
                }
                var OTPEntity = this._getOTPEntity(id);
                var codeObj = getTotpCodeAtNow(OTPEntity);
                this.updateUIItem(Item, codeObj);
            }
        },
        
        getUIItem: function (id){
            return this.UIItems[id];
        },
        
        //更新UIItem
        updateUIItem: function (item, codeObj){
            item.refresh(codeObj);
            return this;
        },
        
        remove: function (id){
            if (id in this.OTPEntities) {
                this.getUIItem(id).remove();
                delete this.OTPEntities[id];
                delete this.UIItems[id];
                //remove from storage
                this.storeOTPEntities();
            }
        },
        
        toggleVisible: function (id){
            if (id in this.OTPEntities) {
                this.getUIItem(id).toggleVisible();
            }
        },
        
        has: function (id){
            return id in this.OTPEntities;
        },
        updateSecret: function (_OTPEntity){
            if (this.has(_OTPEntity.id)) {
                var otpEntity = this._getOTPEntity(_OTPEntity.id);
                if (_OTPEntity.secret !== otpEntity.secret) {
                    this.remove(_OTPEntity.id);
                    this.showOTPCode(_OTPEntity);
                }
            }
            return this;
        },
        loadFromStorage: function (callback){
            var OTPEntity, items = [], _self = this;
            ItemsStorage.restore(function (data) {
                if (data && isObject(data)) {
                    for (var k in data) {
                        OTPEntity = data[k];
                        _self.showOTPCode(OTPEntity, false);
                        items.push(OTPEntity);
                    }
                }
                isFunction(callback) && callback(items);
            });
        },
        
        genBackupUrl: function(encrypting){
            encrypting = encrypting || false;
            var data = {}, list = this.OTPEntities;
            if (!list) return;
            if (isEmptyObj(list)) return;
            
            if (encrypting) {
                var token = prompt("Please enter a password for encrypting, and do remember it. The password will be used to decrypt the content on restoring.", "");
                if (!token) return;
                data.data = encrypt(token, list);
                data.encrypted = true;
            } else {
                data.data = list;
                data.encrypted = false;
            }
            return URLize(data);
        },
        
        restoreFromBackup: function(strDataOfBackup, overwrite){
            if (!strDataOfBackup) return;
            var data = JSON.parse(strDataOfBackup);
            if (!data) return;
            var skipped = [], items;
            if (data.encrypted) {
                var token = prompt("Please enter the password.", "");
                if (!token) return;
                items = decrypt(token, data.data);
            } else {
                items = data.data;
            }
            for (var id in items) {
                if (!overwrite && (id in this.OTPEntities)) {
                    skipped.push(items[id]);
                    continue;
                } else {
                    this.showOTPCode(items[id]);
                }
            }
            return skipped;
        }
    };
    
    window.ItemsManager = ItemsManager;
})();