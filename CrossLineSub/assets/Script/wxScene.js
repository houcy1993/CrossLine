// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

cc.Class({
    extends: cc.Component,

    properties: {
        item: cc.Prefab,
        content: cc.Node,
        timeLab: cc.Node,
        scrollView: cc.Node
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad: function() {
        wx.onMessage(function(data) {
            console.log("receive msg ===", data);
            if (data.msgName === "getUserInfo") {
                this.getWxCloudInfo(data.msgData);
            } else if (data.msgName === "showScroll") {
                this.scrollView.active = true;
                this.showScroll();
            } else if (data.msgName === "hideScroll") {
                this.scrollView.active = false;
            } else if (data.msgName === "saveScore") {
                this.saveScore(data.msgData);
            } else if (data.msgName === "showScore") {
                this.showScore(data.msgData);
            } else if (data.msgName === "hideScore") {
                this.timeLab.active = false;
            }
        }.bind(this));

        this.items = [];
        for (var i = 0; i < 20; i++) {
            var item = cc.instantiate(this.item);
            this.content.addChild(item);
            item.getChildByName("levelNum").getComponent(cc.Label).string = i + 1;
            this.items.push(item);
        }

        this.getWxCloudInfo();
    },

    showScroll: function() {
        for (var i = 0; i < this.KVDataList.length; i++) {
            var level = this.KVDataList[i].key;
            var time = this.KVDataList[i].value;

            if (this.items[parseInt(level) - 1]) {
                var item = this.items[parseInt(level) - 1];
                item.getChildByName("bestTimeLab").getComponent(cc.Label).string = time;
            }
        }
    },

    showScore: function(data) {
        this.timeLab.active = true;
        var i = 0;
        for (i; i < this.KVDataList.length; i++) {
            if (data.level === this.KVDataList[i].key) {
                this.timeLab.getComponent(cc.Label).string = this.KVDataList[i].value;
                break;
            }
        }
        if (i === this.KVDataList.length) {
            this.timeLab.getComponent(cc.Label).string = "--:--";
        }
        console.log("current time = ", this.timeLab.getComponent(cc.Label).string);
        console.log(this.timeLab.x);
        console.log(this.timeLab.y);
    },

    saveScore: function(data) {
        console.log(data);
        var i = 0;
        for (i; i < this.KVDataList.length; i++) {
            if (data.level === this.KVDataList[i].key) {
                if (data.time < this.KVDataList[i].value) {
                    this.KVDataList[i].value = data.time;
                }
                break;
            }
        }

        if (i === this.KVDataList.length) {
            var data = {
                key: data.level,
                value: data.time
            };
            this.KVDataList.push(data);
        }
        this.saveWxCloudInfo();
    },

    getList: function() {
        return [
            "1", "2", "3", "4", "5",
            "6", "7", "8", "9", "10",
            "11", "12", "13", "14",
            "15", "16", "17", "18", "19", "20"
        ];
    },

    getWxCloudInfo: function() {
        var _this = this;
        wx.getUserCloudStorage({
            keyList: _this.getList(),
            success: function (res) {
                console.log("get user info success", res);
                _this.KVDataList = res.KVDataList || [];
            },
            fail: function(res) {
                console.log("get user info error", res);
            },
            complete: function(res) {
                console.log("get user info complete", res);
            }
        });


    },

    saveWxCloudInfo: function() {
        var _this = this;
        console.log("set user cloud storage", _this.KVDataList);
        wx.setUserCloudStorage({
            KVDataList: _this.KVDataList,
            success: function() {
                console.log("save wxConfig success");
            }.bind(this),
            fail: function() {
                console.log("save wxConfig fail");
            }.bind(this),
            complete: function() {
                console.log("save wxConfig complete");
            }.bind(this)
        });
    }
    // update (dt) {},
});
