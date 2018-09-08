// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

import Place from './Place'
import global from "./global"

cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //     // ATTRIBUTES:
        //     default: null,        // The default value will be used only when the component attaching
        //                           // to a node for the first time
        //     type: cc.SpriteFrame, // optional, default is typeof default
        //     serializable: true,   // optional, default is true
        // },
        // bar: {
        //     get () {
        //         return this._bar;
        //     },
        //     set (value) {
        //         this._bar = value;
        //     }
        // },

        // 关卡模式
        levelLab: cc.Node,
        timeLab: cc.Node,

        // 创建模式
        tipLab: cc.Node,
        addPoint: cc.Node,
        controlBtn: cc.Node,
        gameNode: cc.Node,

        // 解锁成功
        successNode: cc.Node,
        successTipLab: cc.Label,

        lineNode: cc.Prefab,
        pointNode: cc.Prefab,
        posNode: cc.Prefab,
        display: cc.Node,
    },

    onLoad: function() {
        this.pool = {};
        this.tex = new cc.Texture2D();
        this.createPool("line");
        this.createPool("point");
        this.currentPoint = null;

        this.currentLevel = global.currentLevel;

        this.gamePoints = [];
        this.gameLines = [];

        this.registTouchEvent();
        this.createPos();

        this.setPlace(this.currentLevel);
    },

    showSuccess: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        var time = this.timeLab.getComponent(cc.Label).string;
        this.successNode.active = true;
        this.successTipLab.string = "解绑成功\n" + time;
        if (window.wx) {
            // 保存分数
            var _this = this;
            wx.getOpenDataContext().postMessage({
                msgName: "saveScore",
                msgData: {
                    level: _this.currentLevel + 1 + "",
                    time: time
                }
            });
        }
    },

    hideBest: function() {
        if (window.wx) {
            // 保存分数
            var _this = this;
            wx.getOpenDataContext().postMessage({
                msgName: "hideScore"
            });
        }
    },

    showBest: function() {
        if (window.wx) {
            var _this = this;
            wx.getOpenDataContext().postMessage({
                msgName: "showScore",
                msgData: {
                    level: _this.currentLevel + 1 + "",
                }
            });
        }
    },

    setTime: function() {
        var time = 0;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.interval = setInterval(function() {
            var minute = (time / 60) | 0;
            var second = time % 60;

            var minuteStr;
            if (minute < 10) {
                minuteStr = "0" + minute;
            } else {
                minuteStr = minute + "";
            }

            var secondStr;
            if (second < 10) {
                secondStr = "0" + second;
            } else {
                secondStr = second + "";
            }

            var str = minuteStr + ":" + secondStr;
            this.timeLab.getComponent(cc.Label).string = str;
            time++;
        }.bind(this), 1000);
    },

    setPlace: function(level) {
        if (level >= 19) {
            level = 19;
        }
        var place = Place();
        var currentPlace = place[level];
        this.showBest();
        this.levelLab.getComponent(cc.Label).string = "关卡-" + (this.currentLevel + 1);
        this.timeLab.getComponent(cc.Label).string = "00:00";
        this.createPlace(currentPlace);
        this.setupPointPosition();
        this.lineMoveWithIndex();
        setTimeout(function() {
            this.setTime();
        }.bind(this), 300);

        var _this = this;
        if (window.wx) {
            wx.getOpenDataContext().postMessage({
                msgName: "showScore",
                msgData: {
                    level: _this.currentLevel + 1 + ""
                }
            });
        }
    },

    setCreate: function() {
        this.isCreateMode = true;
        this.operate = "point";
    },

    buttonClick: function(event, customData) {
        switch (customData) {
            case "sure":
                this.successNode.active = false;
                this.clearPlace();
                this.currentLevel++;
                this.setPlace(this.currentLevel);
                break;
            case "return":
                if (this.interval) {
                    clearInterval(this.interval);
                    this.interval = null;
                }
                this.hideBest();
                cc.director.loadScene("mainScene");
                break;
            case "next":
                this.clearPlace();
                this.currentLevel++;
                this.setPlace(this.currentLevel);
                break;
            case "restart":
                this.clearPlace();
                this.setPlace(this.currentLevel);
                break;
            case "clear":
                // 清空
                this.operate = "point";
                this.node.getChildByName("modeCreate").getChildByName("next").getChildByName("label").getComponent(cc.Label).string = "下一步";
                this.tipLab.getComponent(cc.Label).string = "请先添加端点";
                var points = this.gameNode.getChildByName("points").children;
                while (points.length > 0) {
                    this.putInPool("point", points[0]);
                }

                var lines = this.gameNode.getChildByName("lines").children;
                while (lines.length > 0) {
                    this.putInPool("line", lines[0]);
                }

                this.gamePoints = [];
                this.gameLines = [];
                break;
            case "next":
                if (this.operate === "point") {
                    // 连线
                    this.tipLab.getComponent(cc.Label).string = "请开始连线，禁止交叉";
                    this.operate = "next";
                    this.gamePoints = [];
                    this.gameLines = [];
                    var points = this.gameNode.getChildByName("points").children;
                    for (var i = 0; i < points.length; i++) {
                        var pointNode = points[i];
                        pointNode.index = i;
                        pointNode.lineIndexes = [];
                        this.gamePoints.push(pointNode);
                    }
                } else if (this.operate === "next") {
                    // 移动
                    this.lineMoveWithIndex();
                    this.tipLab.getComponent(cc.Label).string = "请打乱顺序";
                    this.operate = "move";
                    this.node.getChildByName("modeCreate").getChildByName("next").getChildByName("label").getComponent(cc.Label).string = "完成";
                } else if (this.operate === "move") {
                    // 完成
                    var place = {};
                    place.points = [];
                    place.lines = [];
                    for (var m = 0; m < this.gameLines.length; m++) {
                        var line = this.gameLines[m];
                        var lineData = { p1: line.point1Index + 1, p2: line.point2Index + 1 };
                        place.lines.push(lineData);
                    }

                    for (var n = 0; n < this.gamePoints.length; n++) {
                        var point = this.gamePoints[n];
                        var x = (this.gameNode.width / 2 - point.x + 30) / 60;
                        var y = (this.gameNode.height / 2 - point.y + 30) / 60;
                        var pointData = { x: x, y: y };
                        place.points.push(pointData);
                    }
                    console.log(JSON.stringify(place));
                }

                break;
            case "last":
                // 撤回
                var points = this.gameNode.getChildByName("points").children;
                if (this.operate === "point" && points.length > 0) {
                    // 撤回端点
                    this.putInPool("point", points[points.length - 1]);
                } else if (this.operate === "next" && this.gameLines.length > 0) {
                    // 撤回线
                    var line = this.gameLines[this.gameLines.length - 1];
                    var point1Index = line.point1Index;
                    var point2Index = line.point2Index;
                    var lineIndex = line.index;
                    this.putInPool("line", line);
                    this.gameLines.splice(this.gameLines.length - 1, 1);

                    if (this.gamePoints[point1Index]) {
                        var index = this.gamePoints[point1Index].lineIndexes.indexOf(lineIndex);
                        this.gamePoints[point1Index].lineIndexes.splice(index, 1);
                    }

                    if (this.gamePoints[point2Index]) {
                        var index2 = this.gamePoints[point2Index].lineIndexes.indexOf(lineIndex);
                        this.gamePoints[point2Index].lineIndexes.splice(index2, 1);
                    }
                }
                break;
            default:
                break;
        }
    },

    clearPlace: function() {
        this.gameLines.forEach(function(line) {
            line.stopAllActions();
            this.putInPool("line", line);
        }.bind(this));
        this.gamePoints.forEach(function(point) {
            point.stopAllActions();
            this.putInPool("point", point);
        }.bind(this));

        this.gamePoints = [];
        this.gameLines = [];
    },

    createPlace: function (place) {
        place = JSON.parse(place);
        var points = place.points;
        for (var i = 0; i < points.length; i++) {
            var pointNode = this.getPrefab(this.pointNode.name);
            this.resetPoint(pointNode);
            pointNode.x = this.gameNode.width / 2 - (points[i].x - 1) * 60 - 30;
            pointNode.y = this.gameNode.height / 2 - (points[i].y - 1) * 60 - 30;
            pointNode.index = i;
            pointNode.lineIndexes = [];
            pointNode.scale = 0;
            pointNode.runAction(cc.scaleTo(0.3, 1));
            this.gamePoints.push(pointNode);
            this.gameNode.getChildByName("points").addChild(pointNode);
        }

        var lines = place.lines;
        for (var j = 0; j < lines.length; j++) {
            var lineNode = this.getPrefab(this.lineNode.name);
            this.resetLine(lineNode);
            lineNode.point1Index = this.gamePoints[lines[j].p1 - 1].index;
            lineNode.point2Index = this.gamePoints[lines[j].p2 - 1].index;
            lineNode.index = j;
            lineNode.isCross = true;
            this.gamePoints[lineNode.point1Index].lineIndexes.push(lineNode.index);
            this.gamePoints[lineNode.point2Index].lineIndexes.push(lineNode.index);
            this.gameLines.push(lineNode);
            this.gameNode.getChildByName("lines").addChild(lineNode);
            this.setLine(lineNode, this.gamePoints[lineNode.point1Index], this.gamePoints[lineNode.point2Index], true);
        }
    },

    createPos: function() {
        this.posNodes = [];
        for (var i = 0; i < 15; i++) {
            for (var j = 0; j < 11; j ++) {
                var pos = cc.instantiate(this.posNode);
                pos.x = 30 + (j * 60) - this.gameNode.width / 2;
                pos.y = 30 + (i * 60) - this.gameNode.height / 2;
                pos.px = i + 1;
                pos.py = j + 1;
                this.posNodes.push(pos);
                this.gameNode.getChildByName("pos").addChild(pos);
            }
        }
    },

    registTouchEvent: function() {
        var screenSize = cc.size(cc.visibleRect);
        this.controlBtn.on(cc.Node.EventType.TOUCH_START, function(event) {
            if (this.operate === "next") return;
            var pos = cc.p(event.getLocation().x - screenSize.width / 2, event.getLocation().y - screenSize.height / 2);
            if (cc.pDistance(pos, this.addPoint.position) < 25 && this.operate === "point") {
                this.createPoint = this.getPrefab("point");
                this.resetPoint(this.createPoint);
                this.createPoint.position = this.addPoint.position;
                this.gameNode.getChildByName("points").addChild(this.createPoint);
            } else {
                var points = this.gameNode.getChildByName("points").children;
                for (var i = 0; i < points.length; i++) {
                    var point = points[i];
                    if (cc.pDistance(pos, point.position) < 25) {
                        this.currentPoint = point;
                        this.cachePos = this.currentPoint.position;
                        break;
                    }
                }
            }
        }.bind(this));

        this.controlBtn.on(cc.Node.EventType.TOUCH_MOVE, function(event) {
            if (this.operate === "next") return;
            var pos = cc.p(event.getLocation().x - screenSize.width / 2, event.getLocation().y - screenSize.height / 2);
            if (this.createPoint) {
                if (!this.createPoint) return;
                this.createPoint.position = pos;
            } else if (this.currentPoint) {
                this.currentPoint.position = pos;
                var index = this.currentPoint.index;
                this.lineMoveWithIndex(index);
            }
        }.bind(this));

        this.controlBtn.on(cc.Node.EventType.TOUCH_END, function(event) {
            if (this.operate === "next") {
                // 准备连线
                var pos = cc.p(event.getLocation().x - screenSize.width / 2, event.getLocation().y - screenSize.height / 2);
                for (var i = 0; i < this.gamePoints.length; i++) {
                    if (this.startPoint && cc.pDistance(pos, this.startPoint.position) < 25) {
                        // 取消选中
                        this.startPoint.color = cc.color(102, 83, 70);
                        this.startPoint = null;
                        return;
                    }

                    if (cc.pDistance(pos, this.gamePoints[i].position) < 25) {
                        if (!this.startPoint) {
                            this.startPoint = this.gamePoints[i];
                            this.startPoint.color = cc.color(255,  255, 255);
                        } else if (this.startPoint.index !== this.gamePoints[i].index) {
                            this.endPoint = this.gamePoints[i];

                            // todo 判断重复
                            var j = 0;
                            for (j; j < this.gameLines.length; j++) {
                                var line1 = this.gameLines[j];

                                if (line1.point1Index === this.startPoint.index &&
                                    line1.point2Index === this.endPoint.index) {
                                    console.log("重复了");
                                    break;
                                }

                                if (line1.point2Index === this.startPoint.index &&
                                    line1.point1Index === this.endPoint.index) {
                                    console.log("重复了");
                                    break;
                                }

                                // todo 判断交叉
                                if (line1.point1Index === this.startPoint.index ||
                                    line1.point1Index === this.endPoint.index ||
                                    line1.point2Index === this.startPoint.index ||
                                    line1.point2Index === this.endPoint.index) continue;
                                var point1 = this.startPoint;
                                var point2 = this.endPoint;
                                var point3 = this.gamePoints[line1.point1Index];
                                var point4 = this.gamePoints[line1.point2Index];
                                if(cc.Intersection.lineLine(point1.position, point2.position, point3.position, point4.position)) {
                                    console.log("交叉了");
                                    break;
                                }
                            }

                            if (j < this.gameLines.length) {
                                this.endPoint = null;
                                return;
                            }

                            var lineNode = this.getPrefab("line");
                            this.resetLine(lineNode);
                            lineNode.point1Index = this.startPoint.index;
                            lineNode.point2Index = this.endPoint.index;
                            lineNode.index = this.gameLines.length;
                            lineNode.isCross = false;
                            this.gamePoints[this.startPoint.index].lineIndexes.push(lineNode.index);
                            this.gamePoints[this.endPoint.index].lineIndexes.push(lineNode.index);
                            this.gameLines.push(lineNode);
                            this.gameNode.getChildByName("lines").addChild(lineNode);
                            this.setLine(lineNode, this.startPoint, this.endPoint);
                            // 重置状态
                            this.startPoint.color = cc.color(102, 83, 70);
                            this.startPoint = null;
                            this.endPoint = null;
                        }
                        break;
                    }
                }
                return;
            }
            if (this.createPoint) {
                if (Math.abs(this.createPoint.x) > this.gameNode.width/2 || Math.abs(this.createPoint.y) > this.gameNode.height/2) {
                    this.putInPool("point", this.createPoint);
                }  else {
                    this.resetPointPos(this.createPoint);
                    this.createPoint = null;
                }
            } else {
                if (!this.isCreateMode) {
                    if (this.allClear) {
                        console.log("革命成功");
                        this.showSuccess();
                    } else {
                        console.log("革命尚未成功");
                    }
                }

                if (!this.currentPoint) return;
                if (Math.abs(this.currentPoint.x) > this.gameNode.width/2 || Math.abs(this.currentPoint.y) > this.gameNode.height/2) {
                    this.currentPoint.position = this.cachePos;
                }  else {
                    this.currentPoint = this.resetPointPos(this.currentPoint);
                }
                var index = this.currentPoint.index;
                this.lineMoveWithIndex(index);
                this.currentPoint = null;
            }
        }.bind(this));
    },

    resetPointPos: function(point) {
        var min = 60;
        var i = 0;
        var currentPos;
        for (var i = 0; i < this.posNodes.length; i++) {
            var pos = this.posNodes[i];
            var dis = cc.pDistance(point.position, pos.position);
            if (dis <= 30) {
                point.position = pos.position;
                break;
            }
            if (dis < min) {
                min = dis;
                currentPos = pos;
            }
        }
        if (i === this.posNodes.length) {
            point.position = currentPos.position;
        }
        return point;
    },

    lineMoveWithIndex: function() {
        for (var i = 0; i < this.gameLines.length; i++) {
            var line = this.gameLines[i];
            this.setLine(line, this.gamePoints[line.point1Index], this.gamePoints[line.point2Index]);
            var j = 0;
            for (j; j < this.gameLines.length; j++) {
                if (i === j) continue;
                var line1 = this.gameLines[j];
                if (line1.point1Index === line.point1Index ||
                    line1.point1Index === line.point2Index ||
                    line1.point2Index === line.point1Index ||
                    line1.point2Index === line.point2Index) continue;

                var point1 = this.gamePoints[line.point1Index];
                var point2 = this.gamePoints[line.point2Index];
                var point3 = this.gamePoints[line1.point1Index];
                var point4 = this.gamePoints[line1.point2Index];
                if(cc.Intersection.lineLine(point1.position, point2.position, point3.position, point4.position)) {
                    break;
                }
            }
            if (j === this.gameLines.length) {
                line.color = cc.color(255,  255, 255);
                line.isCross = false;
            } else {
                line.color = cc.color(102, 83, 70);
                line.isCross = true;
            }
        }

        this.allClear = true;

        for (var k = 0; k < this.gamePoints.length; k++) {
            var point = this.gamePoints[k];
            var n = 0;
            for (n; n < point.lineIndexes.length; n++) {
                if (this.gameLines[point.lineIndexes[n]].isCross) {
                    this.allClear = false;
                    break;
                }
            }
            if (n === point.lineIndexes.length) {
                point.color = cc.color(255,  255, 255);
            } else {
                point.color = cc.color(102, 83, 70);
            }
        }
    },

    setLine: function(line, pos1, pos2, isAni) {
        var lenY = pos2.y - pos1.y;
        var lenX = pos2.x - pos1.x;

        var tanYx = Math.abs(lenY) / Math.abs(lenX);

        var angle = 0;
        if (lenY >= 0 && lenX <= 0) {
            angle = ((Math.atan(tanYx) * 180) / Math.PI) - 90;
        } else if (lenY >= 0 && lenX >= 0) {
            angle = 90 - ((Math.atan(tanYx) * 180) / Math.PI);
        } else if (lenY <= 0 && lenX <= 0) {
            angle = ((-Math.atan(tanYx) * 180) / Math.PI) - 90;
        } else if (lenY <= 0 && lenX >= 0) {
            angle = ((Math.atan(tanYx) * 180) / Math.PI) + 90;
        }
        line.position = pos1.position;
        line.anchorY = 0;
        line.height = cc.pDistance(pos2, pos1);
        if (isAni) {
            line.scaleX = 1;
            line.scaleY = 0;
            line.runAction(cc.scaleTo(0.4, 1, 1));
        }
        line.rotation = angle;
    },

    setupPointPosition: function() {
        var points = this.gameNode.getChildByName("points").children;
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            this.resetPointPos(point);
        }
    },

    resetPoint: function(point) {
        point.color = cc.color(102, 83, 70);
        point.lineIndexes = [];
    },

    resetLine: function(line) {
        line.color = cc.color(102, 83, 70);
    },

    /**
     *              pool
     * **/
    createPool: function(poolName) {
        this.pool[poolName] = new cc.NodePool();
    },

    getPrefab: function(poolName) {
        if (this.pool[poolName].size() > 0) {
            return this.pool[poolName].get();
        } else {
            return cc.instantiate(this[poolName + "Node"]);
        }
    },

    putInPool: function(poolName, node) {
        this.pool[poolName].put(node);
    },

    update: function() {
        if (!window.wx) return;
        var openDataContext = wx.getOpenDataContext();
        var sharedCanvas = openDataContext.canvas;
        this.tex.initWithElement(sharedCanvas);
        this.tex.handleLoadedTexture();
        var spf = new cc.SpriteFrame(this.tex);
        this.display.getComponent(cc.Sprite).spriteFrame = spf;
    }
});
