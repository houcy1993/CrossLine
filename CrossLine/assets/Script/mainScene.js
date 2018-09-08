import global from "./global"

cc.Class({
    extends: cc.Component,

    properties: {
        titleLab: cc.Node,
        startBtn: cc.Node,
        settingBtn: cc.Node
    },

    onLoad: function() {
        if (window.wx) {
            wx.onShareAppMessage(function() {
                return {
                    title: "CrossLine",
                    imageUrl: "imageUrl"
                }
            });

            wx.showShareMenu({
                withShareTicket: false
            })
        }

        console.log("预加载场景");
        cc.director.preloadScene("gameScene");
        cc.director.preloadScene("selectScene");
        cc.director.preloadScene("settingScene");
    },

    start: function() {
        this.node.getComponent(cc.Animation).play();
    },

    sendWxMsg: function(msgName, data)  {
        if (window.wx) {
            var openDataContext = wx.getOpenDataContext();
            openDataContext.postMessage({
                msg: msgName,
                param: data
            });
        }
    },

    buttonClick: function(event, customData) {
        switch (customData) {
            case "begin":
                global.currentLevel = 0;
                this.node.getComponent(cc.Animation).play("mainSceneHide").on("finished", function() {
                    cc.director.loadScene("gameScene");
                }.bind(this));
                break;
            case "setting":
                this.node.getComponent(cc.Animation).play("mainSceneHide").on("finished", function() {
                    cc.director.loadScene("selectScene");
                }.bind(this));
                break;
            default:
                break;
        }
    }
});
