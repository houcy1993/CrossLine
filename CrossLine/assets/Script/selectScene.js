import global from "./global"

cc.Class({
    extends: cc.Component,

    properties: {
        closeBtn: cc.Node,
        display: cc.Node,
        best: cc.Node,
        level: cc.Node,
        item: cc.Prefab
    },

    onLoad: function() {
        console.log("===========    ");
        this.registeEvent();

        if (window.wx) {
            wx.getOpenDataContext().postMessage({
                msgName: "getUserInfo"
            });
        }

        this.tex = new cc.Texture2D();

        this.isSubClientShow = false;
        var _this = this;

        for (var i = 0; i < 20; i++) {
            (function(j) {
                var levelNode = cc.instantiate(_this.item);
                levelNode.getChildByName("level").getComponent(cc.Label).string = j + 1;
                levelNode.opacity = 0;
                levelNode.on(cc.Node.EventType.TOUCH_END, function() {
                    global.currentLevel = j;
                    cc.director.preloadScene("gameScene", function(err) {
                        if (!err) {
                            cc.director.loadScene("gameScene");
                        }
                    });
                }.bind(this));
                _this.level.addChild(levelNode);
            })(i);
        }
    },

    start: function() {
        this.showLevel();
    },

    onDestroy: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },

    hideAllLevel: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        for (var i = 0; i < this.level.children.length; i++) {
            this.level.children[i].stopAllActions();
            this.level.children[i].opacity = 0;
            this.level.children[i].active = false;
        }
    },

    showLevel: function() {
        if (this.interval) return;
        var count = 0;
        var levels = this.level.children;
        this.interval = setInterval(function() {
            levels[count].active = true;
            levels[count].runAction(cc.fadeIn(0.2));
            count++;
            if (count > 19) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }.bind(this), 40);
    },

    registeEvent: function() {
        this.closeBtn.on(cc.Node.EventType.TOUCH_END, function() {
            if (this.isSubClientShow) {
                this.isSubClientShow = false;
                this.showLevel();
                if (window.wx) {
                    wx.getOpenDataContext().postMessage({
                        msgName: "hideScroll"
                    });
                }
            } else {
                cc.director.loadScene("mainScene");
            }
        }.bind(this));

        this.best.on(cc.Node.EventType.TOUCH_END, function() {
            this.isSubClientShow = true;
            this.hideAllLevel();
            if (window.wx) {
                wx.getOpenDataContext().postMessage({
                    msgName: "showScroll"
                });
            }
        }.bind(this));
    },

    update: function() {
        if (!this.tex) {
            console.log("========== this.tex");
            return;
        }

        if (!window.wx) return;

        // console.log("=========== update sub client");

        var openDataContext = wx.getOpenDataContext();
        var sharedCanvas = openDataContext.canvas;
        this.tex.initWithElement(sharedCanvas);
        this.tex.handleLoadedTexture();
        var spf = new cc.SpriteFrame(this.tex);
        // console.log("spf        ", spf);
        this.display.getComponent(cc.Sprite).spriteFrame = spf;
    }
});
