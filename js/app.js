var UIInterface = {
    _callFuncCatchError: function (func){
        try {
            if (isFunction(func)) {
                return func.call(this);
            }
        } catch (e) {
            console.log(e);
            alert(JSON.stringify(e));
        }
    },
    addByImage: function (callback){
        this._callFuncCatchError(function () {
            var _self = this;
            decodeLocalImage(function (content){
                onDecodeComplete(content, callback);
            });
        });
    },
    removeItem: function (id){
        this._callFuncCatchError(function(){
            if (confirm('Confirm to remove it?')) {
                ItemsManager.remove(id);
            }
        });
    },
    toggleVisible: function (id) {
        this._callFuncCatchError(function(){
            ItemsManager.toggleVisible(id);
        });
    },
    backup: function (){
        this._callFuncCatchError(function(){
            var encryptNeeded = false, fileName = formatDate('WebAuthy_backup_%Y%m%d%H%M%S.totp');
            /*
            if (confirm('Do you want to encrypt content backuped?')) {
                encryptNeeded = true;
            }*/
            exportToFile(encryptNeeded, fileName);
        });
    },
    restore: function (){
        this._callFuncCatchError(function(){
            var _self = this;
            var overwrite = false;
            importFromFile({overwrite:overwrite, onRestored: function(skippedItems){
                //console.log(skippedItems);
            }});
        });
    }, 
    refresh: function (){
        this._callFuncCatchError(function(){
            this.renderOtpList();
        });
    },
    donate: function (){
        if ($Id('donate').style.display == 'block') {
            $Id('donate').style.display = 'none';
        } else {
            $Id('donate').style.display = 'block';
        }
    }
}

function removeItem(id){
    UIInterface.removeItem(id);
}

function toggleVisible(id){
    UIInterface.toggleVisible(id);
}

function onDecodeComplete(content, callback){
    isFunction(callback) && callback(content);
    if (!testOtpAuthUri(content)) return;
    var uiitem = handleOtpAuthUrl(content);
    if (uiitem) uiitem.flashBorder();
}
//handleOtpAuthUrl('otpauth://totp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=10');
function handleOtpAuthUrl(url){
    try {
        var OTPEntity = parseOtpAuthUri(url);
        if (ItemsManager.has(OTPEntity.id)) {
            ItemsManager.updateSecret(OTPEntity);
        } else {
            ItemsManager.showOTPCode(OTPEntity);
        }
        return ItemsManager.getUIItem(OTPEntity.id);
    } catch (e) {
        console.log(e.message);
    }
}

function exportToFile(encrypting, filename){ //to do
    filename = filename || 'optauth_accounts.totp';
    encrypting = encrypting || false;
    var downloadUrl = ItemsManager.genBackupUrl(encrypting);
    downloadUrl && forceDownload(downloadUrl, filename);
}

function importFromFile(options){ //to do
    options = options || {};
    openFileDlg(function(content){
        var skippedItems = ItemsManager.restoreFromBackup(content, options['overwrite'] || false);
        isFunction(options['onRestored']) && options['onRestored'].apply(null, [skippedItems]);
    }, {accept: '.totp', mimeType: 'text/totp'});
}

function showMenu(e){
    $Id('more-menu').style.display = 'block';
    e.stopPropagation();
}

function hideOverlays(){
    var nodelist = document.querySelectorAll('.overlay');
    for (var i in nodelist) {
        if (nodelist.hasOwnProperty(i)) {
            nodelist[i].style.display = 'none';
        }
    }
}

function fadeoutToast(){
    setTimeout(function () {
        document.getElementById('msg_toast').style.height='0px';
    }, 6000);
}

function loadItems(){
    ItemsManager.setContainer($Id('container')).loadFromStorage(function (items){
        if (items.length == 0) {
            // 样例展示
            var sample = {
                id: 'totp/sample.com:test@sample.com',
                schema: 'totp',
                account: "test@sample.com",
                secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ",
                issuer: "sample.com",
                algorithm: "SHA1",
                digits: 6,
                period: 30
            };
            ItemsManager.showOTPCode(sample, false);
        }
        
        setSecondTick(function (){
            ItemsManager.observe();
        });
    });
}


window.onload = function () {
    fadeoutToast();
    
    $on(document, 'click', function (){
        hideOverlays();
    });
    $on('scan-btn', 'click', function (){
        Scanner.open();
    });
    $on('pickImage-btn', 'click', function (){
        UIInterface.addByImage(function(content){
            //console.log(content);
        });
    });
    $on('more-btn', 'click', function (e){
        showMenu(e);
    });
    $on('refresh-btn', 'click', function (){
        location.reload();
    });
    $on('backup-btn', 'click', function (){
        UIInterface.backup();
    });
    $on('restore-btn', 'click', function (){
        UIInterface.restore();
    });
    $on('donate-btn', 'click', function (){
        UIInterface.donate();
    });
    $on('donate-close-btn', 'click', function (){
        UIInterface.donate();
    });
    
    loadItems();
    
    
}

function swRegister(){
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: './' }).then(function (reg){
            if (reg.installing) {
                console.log('Service worker installing');
            } else if (reg.waiting) {
                console.log('Service worker installed');
            } else if (reg.active) {
                console.log('Service worker active');
            }
        }).catch(function (e){
            console.log('Registration failed with ' + e);
        });
    }
}

swRegister();
