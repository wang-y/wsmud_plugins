// ==UserScript==
// @name         wsmud_pluginss
// @namespace    cqv1
// @version      0.0.32.95
// @date         01/07/2018
// @modified     18/06/2020
// @homepage     https://greasyfork.org/zh-CN/scripts/371372
// @description  武神传说 MUD 武神脚本 武神传说 脚本 qq群367657589
// @author       fjcqv(源程序) & zhzhwcn(提供websocket监听)& knva(做了一些微小的贡献) &Bob.cn(raid.js作者)
// @match        http://*.wsmud.com/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/vue/dist/vue.js
// @require      https://cdn.staticfile.org/jquery/3.3.1/jquery.js
// @require      https://cdn.staticfile.org/jquery-contextmenu/3.0.0-beta.2/jquery.contextMenu.min.js
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard

// ==/UserScript==

(function () {
    'use strict';

    Array.prototype.baoremove = function (dx) {
        if (isNaN(dx) || dx > this.length) {
            return false;
        }
        this.splice(dx, 1);
    };
    Array.prototype.remove = function (val) {
        var index = this.indexOf(val);
        if (index > -1) {
            this.splice(index, 1);
        }
    };
    String.prototype.replaceAll = function (s1, s2) {
        return this.replace(new RegExp(s1, "gm"), s2);
    };
    var copyToClipboard = function (text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();

        document.execCommand("Copy");
        textarea.parentNode.removeChild(textarea);
    };
    if (WebSocket) {
        console.log('插件可正常运行,Plugins can run normally');

        function show_msg(msg) {
            ws_on_message({
                type: "text",
                data: msg
            });
        }
        var _ws = WebSocket,
            ws, ws_on_message;
        unsafeWindow.WebSocket = function (uri) {
            ws = new _ws(uri);
            document.getElementsByClassName("signinfo")[0].innerHTML = "<HIR>武神传说SS插件正常运行！ QQ群 367657589</HIR>"
            $('.signinfo').on('click', function () {
                ProConsole.init();
            });
        };
        unsafeWindow.WebSocket.prototype = {
            CONNECTING: _ws.CONNECTING,
            OPEN: _ws.OPEN,
            CLOSING: _ws.CLOSING,
            CLOSED: _ws.CLOSED,
            get url() {
                return ws.url;
            },
            get protocol() {
                return ws.protocol;
            },
            get readyState() {
                return ws.readyState;
            },
            get bufferedAmount() {
                return ws.bufferedAmount;
            },
            get extensions() {
                return ws.extensions;
            },
            get binaryType() {
                return ws.binaryType;
            },
            set binaryType(t) {
                ws.binaryType = t;
            },
            get onopen() {
                return ws.onopen;
            },
            set onopen(fn) {
                ws.onopen = fn;
            },
            get onmessage() {
                return ws.onmessage;
            },
            set onmessage(fn) {
                ws_on_message = fn;
                ws.onmessage = WG.receive_message;
            },
            get onclose() {
                return ws.onclose;
            },
            set onclose(fn) {
                ws.onclose = (e)=>{
                    auto_relogin = GM_getValue(role + "_auto_relogin", auto_relogin);
                    fn(e);
                    if(auto_relogin == "开"){
                        setTimeout(() => {
                            console.log(new Date());
                            KEY.do_command("score");
                        }, 10000);
                    }
                }

            },
            get onerror() {
                return ws.onerror;
            },
            set onerror(fn) {
                ws.onerror = fn;
            },
            send: function (text) {
                if (G.cmd_echo) {
                    show_msg('<hiy>' + text + '</hiy>');
                }
                if (text[0] == "$") {
                    WG.SendCmd(text);
                    return;
                }
                if (text[0] == '@') {
                    if (unsafeWindow && unsafeWindow.ToRaid) {
                        ToRaid.perform(text);
                        return;
                    } else {
                        messageAppend("插件未安装,请访问 https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid 下载并安装");
                        window.open("https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid ", '_blank').location;
                    }
                }
                if (text.indexOf('drop') == 0) {
                    var itemids = text.split(' ');
                    var itemid = itemids[itemids.length - 1];
                    WG.getItemNameByid(itemid, function (name) {
                        if (lock_list.indexOf(name) >= 0) {
                            messageAppend(`已锁物品${name}，无法丢弃，请解锁后重试`);
                            return;
                        } else {
                            ws.send(text);
                        }
                    })
                    return;
                }
                if (text.indexOf('jh ') == 0 || text.indexOf("go ") == 0){
                    if(auto_rewardgoto=="开"){
                        WG.Send("tm " + text);
                    }
                }

                switch (text) {
                    case 'sm':
                        T.sm();
                        break;
                    case 'wk':
                        WG.zdwk();
                        break;
                    case 'backup':
                        WG.make_config();
                        break;
                    case 'load':
                        WG.load_config();
                        break;
                    default:
                        ws.send(text);
                        break;
                }
            },
            close: function () {
                ws.close();
            }
        };

        var cmd_queue = [],
            cmd_busy = false,
            echo = false;
        var _send_cmd = function () {
            if (!ws || ws.readyState != 1) {
                cmd_busy = false;
                cmd_queue = []
            } else if (cmd_queue.length > 0) {
                cmd_busy = true;
                var t = new Date().getTime();
                for (var i = 0; i < cmd_queue.length; i++) {
                    if (!cmd_queue[i].timestamp || cmd_queue[i].timestamp >= t - 1300) {
                        cmd_queue.splice(0, i);
                        break
                    }
                }
                for (i = 0; i < Math.min(cmd_queue.length, 5); i++) {
                    if (!cmd_queue[i].timestamp) {
                        try {
                            ws.send(cmd_queue[i].cmd);
                            cmd_queue[i].timestamp = t
                        } catch (e) {
                            cmd_busy = false;
                            cmd_queue = [];
                            return
                        }
                    }
                }
                if (!cmd_queue[cmd_queue.length - 1].timestamp) {
                    setTimeout(_send_cmd, 100)
                } else {
                    cmd_busy = false
                }
            } else {
                cmd_busy = false
            }
        };
        var send_cmd = function (cmd, no_queue) {
            if (ws && ws.readyState == 1) {
                cmd = cmd instanceof Array ? cmd : cmd.split(';');
                if (no_queue) {
                    for (var i = 0; i < cmd.length; i++) {
                        if (G.cmd_echo) {
                            show_msg('<hiy>' + cmd[i] + '</hiy>')
                        }
                        ws.send(cmd[i])
                    }
                } else {
                    for (i = 0; i < cmd.length; i++) {
                        cmd_queue.push({
                            cmd: cmd[i],
                            timestamp: 0
                        })
                    }
                    if (!cmd_busy) {
                        _send_cmd()
                    }
                }
            }
        };

    } else {
        console.log("插件不可运行,请打开'https://greasyfork.org/zh-CN/forum/discussion/41547/x'");
        document.getElementsByClassName("signinfo")[0].innerHTML = "<HIR>武神传说SS插件没有正常运行！请使用CTRL+F5刷新 QQ群 367657589</HIR>"

    }
    var L = {
        msg: function (msg) {
            if (layer) {
                layer.msg(msg, {
                    offset: '50%',
                    shift: 5
                })
            } else {
                messageAppend(msg);
            }
        },
        isMobile: function () {
            var ua = navigator.userAgent;
            var ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
                isIphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
                isAndroid = ua.match(/(Android)\s+([\d.]+)/),
                isMobile = isIphone || isAndroid;
            return isMobile;
        }
    };

    var roomItemSelectIndex = -1;
    var timer = 0;
    var cnt = 0;
    var zb_npc;
    var zb_place;
    var next = 0;
    var roomData = [];
    var packData = [];
    var eqData = [];
    var store_list = [];
    var lock_list = [];
    var needfind = {
        "武当派-林间小径": ["go south"],
        "峨眉派-走廊": ["go north", "go south;go south", "go north;go east;go east"],
        "丐帮-暗道": ["go east", "go east;go east", "go east"],
        "逍遥派-林间小道": ["go west;go north", "go south;go south", "go north;go west"],
        "少林派-竹林": ["go north"],
        "逍遥派-地下石室": ["go up"],
        "逍遥派-木屋": ["go south;go south;go south;go south"]
    };
    var goods = {
        "米饭": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "包子": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "鸡腿": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "面条": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "扬州炒饭": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "米酒": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "花雕酒": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "女儿红": {
            "id": null,
            "type": "wht",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "醉仙酿": {
            "id": null,
            "type": "hig",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "神仙醉": {
            "id": null,
            "type": "hiy",
            "sales": "店小二",
            "place": "扬州城-醉仙楼"
        },
        "布衣": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "钢刀": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "木棍": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "英雄巾": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "布鞋": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "铁戒指": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "簪子": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "长鞭": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "钓鱼竿": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "鱼饵": {
            "id": null,
            "type": "wht",
            "sales": "杂货铺老板 杨永福",
            "place": "扬州城-杂货铺"
        },
        "铁剑": {
            "id": null,
            "type": "wht",
            "sales": "铁匠铺老板 铁匠",
            "place": "扬州城-打铁铺"
        },
        "钢刀": {
            "id": null,
            "type": "wht",
            "sales": "铁匠铺老板 铁匠",
            "place": "扬州城-打铁铺"
        },
        "铁棍": {
            "id": null,
            "type": "wht",
            "sales": "铁匠铺老板 铁匠",
            "place": "扬州城-打铁铺"
        },
        "铁杖": {
            "id": null,
            "type": "wht",
            "sales": "铁匠铺老板 铁匠",
            "place": "扬州城-打铁铺"
        },
        "铁镐": {
            "id": null,
            "type": "wht",
            "sales": "铁匠铺老板 铁匠",
            "place": "扬州城-打铁铺"
        },
        "飞镖": {
            "id": null,
            "type": "wht",
            "sales": "铁匠铺老板 铁匠",
            "place": "扬州城-打铁铺"
        },
        "金创药": {
            "id": null,
            "type": "hig",
            "sales": "药铺老板 平一指",
            "place": "扬州城-药铺"
        },
        "引气丹": {
            "id": null,
            "type": "hig",
            "sales": "药铺老板 平一指",
            "place": "扬州城-药铺"
        },
        "养精丹": {
            "id": null,
            "type": "hig",
            "sales": "药铺老板 平一指",
            "place": "扬州城-药铺"
        },
    };
    var equip = {
        "铁镐": 0,
    };
    var npcs = {
        "店小二": 0,
        "铁匠铺老板 铁匠": 0,
        "药铺老板 平一指": 0,
        "杂货铺老板 杨永福": 0
    };
    var place = {
        "住房": "jh fam 0 start;go west;go west;go north;go enter",
        "住房-卧室": "jh fam 0 start;go west;go west;go north;go enter;go north",
        "住房-小花园": "jh fam 0 start;go west;go west;go north;go enter;go northeast",
        "住房-炼药房": "jh fam 0 start;go west;go west;go north;go enter;go east",
        "住房-练功房": "jh fam 0 start;go west;go west;go north;go enter;go west",
        "扬州城-钱庄": "jh fam 0 start;go north;go west;store",
        "扬州城-广场": "jh fam 0 start",
        "扬州城-醉仙楼": "jh fam 0 start;go north;go north;go east",
        "扬州城-杂货铺": "jh fam 0 start;go east;go south",
        "扬州城-打铁铺": "jh fam 0 start;go east;go east;go south",
        "扬州城-药铺": "jh fam 0 start;go east;go east;go north",
        "扬州城-衙门正厅": "jh fam 0 start;go west;go north;go north",
        "扬州城-镖局正厅": "jh fam 0 start;go west;go west;go south;go south",
        "扬州城-矿山": "jh fam 0 start;go west;go west;go west;go west",
        "扬州城-喜宴": "jh fam 0 start;go north;go north;go east;go up",
        "扬州城-擂台": "jh fam 0 start;go west;go south",
        "扬州城-当铺": "jh fam 0 start;go south;go east",
        "扬州城-帮派": "jh fam 0 start;go south;go south;go east",
        "扬州城-有间客栈": "jh fam 0 start;go north;go east",
        "扬州城-赌场": "jh fam 0 start;go south;go west",
        "帮会-大门": "jh fam 0 start;go south;go south;go east;go east",
        "帮会-大院": "jh fam 0 start;go south;go south;go east;go east;go east",
        "帮会-练功房": "jh fam 0 start;go south;go south;go east;go east;go east;go north",
        "帮会-聚义堂": "jh fam 0 start;go south;go south;go east;go east;go east;go east",
        "帮会-仓库": "jh fam 0 start;go south;go south;go east;go east;go east;go east;go north",
        "帮会-炼药房": "jh fam 0 start;go south;go south;go east;go east;go east;go south",
        "扬州城-扬州武馆": "jh fam 0 start;go south;go south;go west",
        "扬州城-武庙": "jh fam 0 start;go north;go north;go west",
        "武当派-广场": "jh fam 1 start;",
        "武当派-三清殿": "jh fam 1 start;go north",
        "武当派-石阶": "jh fam 1 start;go west",
        "武当派-练功房": "jh fam 1 start;go west;go west",
        "武当派-太子岩": "jh fam 1 start;go west;go northup",
        "武当派-桃园小路": "jh fam 1 start;go west;go northup;go north",
        "武当派-舍身崖": "jh fam 1 start;go west;go northup;go north;go east",
        "武当派-南岩峰": "jh fam 1 start;go west;go northup;go north;go west",
        "武当派-乌鸦岭": "jh fam 1 start;go west;go northup;go north;go west;go northup",
        "武当派-五老峰": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup",
        "武当派-虎头岩": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup",
        "武当派-朝天宫": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north",
        "武当派-三天门": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north",
        "武当派-紫金城": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north",
        "武当派-林间小径": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north",
        "武当派-后山小院": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north;go north",
        "少林派-广场": "jh fam 2 start;",
        "少林派-山门殿": "jh fam 2 start;go north",
        "少林派-东侧殿": "jh fam 2 start;go north;go east",
        "少林派-西侧殿": "jh fam 2 start;go north;go west",
        "少林派-天王殿": "jh fam 2 start;go north;go north",
        "少林派-大雄宝殿": "jh fam 2 start;go north;go north;go northup",
        "少林派-钟楼": "jh fam 2 start;go north;go north;go northeast",
        "少林派-鼓楼": "jh fam 2 start;go north;go north;go northwest",
        "少林派-后殿": "jh fam 2 start;go north;go north;go northwest;go northeast",
        "少林派-练武场": "jh fam 2 start;go north;go north;go northwest;go northeast;go north",
        "少林派-罗汉堂": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go east",
        "少林派-般若堂": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go west",
        "少林派-方丈楼": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north",
        "少林派-戒律院": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go east",
        "少林派-达摩院": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go west",
        "少林派-竹林": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north",
        "少林派-藏经阁": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north;go west",
        "少林派-达摩洞": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north;go north;go north",
        "华山派-镇岳宫": "jh fam 3 start;",
        "华山派-苍龙岭": "jh fam 3 start;go eastup",
        "华山派-舍身崖": "jh fam 3 start;go eastup;go southup",
        "华山派-峭壁": "jh fam 3 start;go eastup;go southup;jumpdown",
        "华山派-山谷": "jh fam 3 start;go eastup;go southup;jumpdown;go southup",
        "华山派-山间平地": "jh fam 3 start;go eastup;go southup;jumpdown;go southup;go south",
        "华山派-林间小屋": "jh fam 3 start;go eastup;go southup;jumpdown;go southup;go south;go east",
        "华山派-玉女峰": "jh fam 3 start;go westup",
        "华山派-玉女祠": "jh fam 3 start;go westup;go west",
        "华山派-练武场": "jh fam 3 start;go westup;go north",
        "华山派-练功房": "jh fam 3 start;go westup;go north;go east",
        "华山派-客厅": "jh fam 3 start;go westup;go north;go north",
        "华山派-偏厅": "jh fam 3 start;go westup;go north;go north;go east",
        "华山派-寝室": "jh fam 3 start;go westup;go north;go north;go north",
        "华山派-玉女峰山路": "jh fam 3 start;go westup;go south",
        "华山派-玉女峰小径": "jh fam 3 start;go westup;go south;go southup",
        "华山派-思过崖": "jh fam 3 start;go westup;go south;go southup;go southup",
        "华山派-山洞": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter",
        "华山派-长空栈道": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup",
        "华山派-落雁峰": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup;go westup",
        "华山派-华山绝顶": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup;go westup;jumpup",
        "峨眉派-金顶": "jh fam 4 start",
        "峨眉派-庙门": "jh fam 4 start;go west",
        "峨眉派-广场": "jh fam 4 start;go west;go south",
        "峨眉派-走廊": "jh fam 4 start;go west;go south;go west",
        "峨眉派-休息室": "jh fam 4 start;go west;go south;go east;go south",
        "峨眉派-厨房": "jh fam 4 start;go west;go south;go east;go east",
        "峨眉派-练功房": "jh fam 4 start;go west;go south;go west;go west",
        "峨眉派-小屋": "jh fam 4 start;go west;go south;go west;go north;go north",
        "峨眉派-清修洞": "jh fam 4 start;go west;go south;go west;go south;go south",
        "峨眉派-大殿": "jh fam 4 start;go west;go south;go south",
        "峨眉派-睹光台": "jh fam 4 start;go northup",
        "峨眉派-华藏庵": "jh fam 4 start;go northup;go east",
        "逍遥派-青草坪": "jh fam 5 start",
        "逍遥派-林间小道": "jh fam 5 start;go east",
        "逍遥派-练功房": "jh fam 5 start;go east;go north",
        "逍遥派-木板路": "jh fam 5 start;go east;go south",
        "逍遥派-工匠屋": "jh fam 5 start;go east;go south;go south",
        "逍遥派-休息室": "jh fam 5 start;go west;go south",
        "逍遥派-木屋": "jh fam 5 start;go north;go north",
        "逍遥派-地下石室": "jh fam 5 start;go down;go down",
        "丐帮-树洞内部": "jh fam 6 start",
        "丐帮-树洞下": "jh fam 6 start;go down",
        "丐帮-暗道": "jh fam 6 start;go down;go east",
        "丐帮-破庙密室": "jh fam 6 start;go down;go east;go east;go east",
        "丐帮-土地庙": "jh fam 6 start;go down;go east;go east;go east;go up",
        "丐帮-林间小屋": "jh fam 6 start;go down;go east;go east;go east;go east;go east;go up",
        "杀手楼-大门": "jh fam 7 start",
        "杀手楼-大厅": "jh fam 7 start;go north",
        "杀手楼-暗阁": "jh fam 7 start;go north;go up",
        "杀手楼-铜楼": "jh fam 7 start;go north;go up;go up",
        "杀手楼-休息室": "jh fam 7 start;go north;go up;go up;go east",
        "杀手楼-银楼": "jh fam 7 start;go north;go up;go up;go up;go up",
        "杀手楼-练功房": "jh fam 7 start;go north;go up;go up;go up;go up;go east",
        "杀手楼-金楼": "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up",
        "杀手楼-书房": "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up;go west",
        "杀手楼-平台": "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up;go up",
        "襄阳城-广场": "jh fam 8 start",
        "武道塔": "jh fam 9 start"
    };
    var mpz_path = {
        "武当派": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north",
        "华山派": "jh fam 3 start;go westup;go north",
        "少林派": "jh fam 2 start;go north;go north;go northwest;go northeast;go north",
        "峨眉派": "jh fam 4 start;go west;go south;go west;go south",
        "逍遥派": "jh fam 5 start;go west;go east;go down",
        "丐帮": "jh fam 6 start;go down;go east;go east;go east;go east;go east",
    };
    var td_path = {
        "缥缈峰": "cr lingjiu/shanjiao 1 0;cr over;",
        "光明顶": "",
        "天龙寺": "",
        "血刀门": "",
        "古墓派": "",
        "华山论剑": "",
        "侠客岛": "",
        "净念禅宗": "",

    };
    var fb_path = [];
    var drop_list = [];
    var fenjie_list = [];
    //boss黑名单
    var blacklist = "";
    //pfm黑名单
    var blackpfm = [];
    //角色
    var role;
    //门派
    var family = null;
    //师门自动放弃
    var sm_loser = "开";
    //师门自动牌子
    var sm_price = null;
    //师门自动取
    var sm_getstore = null;
    //
    var wudao_pfm = "1";
    //boss战斗前等待(ms)
    var ks_pfm = "2000";
    //boss等待时间(s)
    var ks_wait = "120";
    //自动婚宴
    var automarry = null;
    //自动boss
    var autoKsBoss = null;
    //系列自动
    var stopauto = false;
    //获得物品战士
    var getitemShow = null;
    //自命令展示方式
    var zmlshowsetting = 0;
    //停止后动作
    var auto_command = null;
    //装备列表
    var eqlist = {
        1: [],
        2: [],
        3: []
    };
    //{'unarmed':'','force':'','dodge':'','sword':'','blade':'','club':'','staff':'','whip':'','parry':''}
    var skilllist = {
        1: {},
        2: {},
        3: {}
    };
    //自动施法黑名单
    var unauto_pfm = '';
    //自动施法开关
    var auto_pfmswitch = "开";
    //自动转发路径
    var auto_rewardgoto = "关";
    //自动更新仓库数据
    var auto_updateStore = "关";
    //自动重连
    var auto_relogin = "关";
    var autoeq = 0;
    //自命令数组  type 0 原生 1 自命令 2js
    //[{"name":"name","zmlRun":"zzzz","zmlShow":"1","zmlType":"0"}]
    var zml = [];
    //自定义存取
    var zdy_item_store = '';
    //自定义存取
    var zdy_item_store2 = '';
    //自定义锁
    var zdy_item_lock = '';
    //自定义丢弃
    var zdy_item_drop = '';
    //自定义分解
    var zdy_item_fenjie = '';
    //状态监控 type 类型  ishave  0 =其他任何人 1= 本人  2 仅npc  send 命令数组
    //[{"name":"","type":"status","action":"remove","keyword":"busy","ishave":"0","send":"","isactive":"1","maxcount":10,"pname":"宋远桥","istip":"1"}]
    var ztjk_item = [];
    //  自定义技能开关
    var zdyskills = "关";
    var zdyskilllist = "";
    //欢迎语
    var welcome = '';
    //屏蔽开关
    var shieldswitch = "开"
    //屏蔽列表
    var shield = '';
    //屏蔽关键字列表
    var shieldkey = '';
    //当你学习，练习，打坐中断后，自动去挖矿或以下操作
    var statehml = '';
    //背景图片
    var backimageurl = '';
    //登录后执行
    var loginhml = '';
    //定时任务
    //名称   类型 一次 1 每天 0 发送命令  触发时间 24小时制
    //[{"name":"","type":"0","send":"","h":"","s":"","m":""}]
    var timequestion = [];
    //安静模式
    var silence = '开';
    //dps统计信息
    var pfmnum = 0;
    var pfmdps = 0;
    var dpssakada = '开'
    //funny计算
    var funnycalc = '关'
    //自定义btn
    //[{"name":名称,"send":""},]
    var inzdy_btn = false;
    var zdy_btnlist = [];
    //自动购买
    var auto_buylist = "";
    //快捷键功能
    var exit1 = undefined;
    var exit2 = undefined;
    var exit3 = undefined;
    var KEY = {
        keys: [],
        roomItemSelectIndex: -1,
        init: function () {
            //添加快捷键说明
            $("span[command=stopstate] span:eq(0)").html("S");
            $("span[command=showcombat] span:eq(0)").html("A");
            $("span[command=showtool] span:eq(0)").html("C");
            $("span[command=pack] span:eq(0)").html("B");
            $("span[command=tasks] span:eq(0)").html("L");
            $("span[command=score] span:eq(0)").html("O");
            $("span[command=jh] span:eq(0)").html("J");
            $("span[command=skills] span:eq(0)").html("K");
            $("span[command=message] span:eq(0)").html("U");
            $("span[command=shop] span:eq(0)").html("P");
            $("span[command=stats] span:eq(0)").html("I");
            $("span[command=setting] span:eq(0)").html(",");

            $(document).on("keydown", this.e);
            this.add(27, function () {
                KEY.dialog_close();
            });
            this.add(192, function () {
                $(".map-icon").click();
            });
            this.add(32, function () {
                KEY.dialog_confirm();
            });
            this.add(83, function () {
                KEY.do_command("stopstate");
            });
            this.add(13, function () {
                KEY.do_command("showchat");
            });
            this.add(65, function () {
                KEY.do_command("showcombat");
            });
            this.add(67, function () {
                KEY.do_command("showtool");
            });
            this.add(66, function () {
                KEY.do_command("pack");
            });
            this.add(76, function () {
                KEY.do_command("tasks");
            });
            this.add(79, function () {
                KEY.do_command("score");
            });
            this.add(74, function () {
                KEY.do_command("jh");
            });
            this.add(75, function () {
                KEY.do_command("skills");
            });
            this.add(73, function () {
                KEY.do_command("stats");
            });
            this.add(85, function () {
                KEY.do_command("message");
            });
            this.add(80, function () {
                KEY.do_command("shop");
            });
            this.add(188, function () {
                KEY.do_command("setting");
            });
            this.add(81, function () {
                inzdy_btn ? WG.zdybtnfunc(0) : WG.sm_button();
            });
            this.add(87, function () {
                inzdy_btn ? WG.zdybtnfunc(1) : WG.go_yamen_task();
            });
            this.add(69, function () {
                inzdy_btn ? WG.zdybtnfunc(2) : WG.kill_all();
            });
            this.add(82, function () {
                inzdy_btn ? WG.zdybtnfunc(3) : WG.get_all();
            });
            this.add(84, function () {
                inzdy_btn ? WG.zdybtnfunc(4) : WG.sell_all();
            });
            this.add(89, function () {
                inzdy_btn ? WG.zdybtnfunc(5) : WG.zdwk();
            });
            this.add(9, function () {
                KEY.onRoomItemSelect();
                return false;
            });
            //方向
            this.add(102, function () {
                // NumPad 6 等同于→
                exit1 = G.exits.get("east");
                exit2 = G.exits.get("eastup");
                exit3 = G.exits.get("eastdown");
                if (exit1) {
                    WG.Send("go east")
                } else if (exit2) {
                    {
                        WG.Send("go eastup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go eastdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(39, function () {
                exit1 = G.exits.get("east");
                exit2 = G.exits.get("eastup");
                exit3 = G.exits.get("eastdown");
                if (exit1) {
                    WG.Send("go east")
                } else if (exit2) {
                    {
                        WG.Send("go eastup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go eastdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(100, function () {
                exit1 = G.exits.get("west");
                exit2 = G.exits.get("westup");
                exit3 = G.exits.get("westdown");
                if (exit1) {
                    WG.Send("go west")
                } else if (exit2) {
                    {
                        WG.Send("go westup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go westdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(37, function () {
                exit1 = G.exits.get("west");
                exit2 = G.exits.get("westup");
                exit3 = G.exits.get("westdown");
                if (exit1) {
                    WG.Send("go west")
                } else if (exit2) {
                    {
                        WG.Send("go westup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go westdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(98, function () {
                // NumPad 2 等同于↓
                exit1 = G.exits.get("south");
                exit2 = G.exits.get("southup");
                exit3 = G.exits.get("southdown");
                if (exit1) {
                    WG.Send("go south")
                } else if (exit2) {
                    {
                        WG.Send("go southup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go southdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(40, function () {
                // Down Arrow↓
                exit1 = G.exits.get("south");
                exit2 = G.exits.get("southup");
                exit3 = G.exits.get("southdown");
                if (exit1) {
                    WG.Send("go south")
                } else if (exit2) {
                    {
                        WG.Send("go southup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go southdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(101, function () {
                // NumPad 3 控制down,按住alt时为up
                WG.Send("go down");
            });
            this.add(101 + 512, function () {
                // NumPad 3 控制down,按住alt时为up
                WG.Send("go up");
            });
            this.add(104, function () {
                exit1 = G.exits.get("north");
                exit2 = G.exits.get("northup");
                exit3 = G.exits.get("northdown");
                if (exit1) {
                    WG.Send("go north")
                } else if (exit2) {
                    {
                        WG.Send("go northup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go northdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(38, function () {
                exit1 = G.exits.get("north");
                exit2 = G.exits.get("northup");
                exit3 = G.exits.get("northdown");
                if (exit1) {
                    WG.Send("go north")
                } else if (exit2) {
                    {
                        WG.Send("go northup")
                    }
                } else if (exit3) {
                    {
                        WG.Send("go northdown")
                    }
                }
                KEY.onChangeRoom();
            });
            this.add(99, function () {
                WG.Send("go southeast");
                KEY.onChangeRoom();
            });
            this.add(97, function () {
                WG.Send("go southwest");
                KEY.onChangeRoom();
            });
            this.add(105, function () {
                WG.Send("go northeast");
                KEY.onChangeRoom();
            });
            this.add(103, function () {
                WG.Send("go northwest");
                KEY.onChangeRoom();
            });

            this.add(49, function () {
                KEY.combat_commands(0);
            });
            this.add(50, function () {
                KEY.combat_commands(1);
            });
            this.add(51, function () {
                KEY.combat_commands(2);
            });
            this.add(52, function () {
                KEY.combat_commands(3);
            });
            this.add(53, function () {
                KEY.combat_commands(4);
            });
            this.add(54, function () {
                KEY.combat_commands(5);
            });
            this.add(55, function () {//7
                KEY.combat_commands(6);
            });
            this.add(56, function () {//8
                KEY.combat_commands(7);
            });
            this.add(57, function () {//9
                KEY.combat_commands(8);
            });
            this.add(48, function () {//0
                KEY.combat_commands(9);
            });
            this.add(45, function () {//-
                KEY.combat_commands(10);
            });
            this.add(61, function () {//=
                KEY.combat_commands(11);
            });

            //alt
            this.add(49 + 512, function () {
                KEY.onRoomItemAction(0);
            });
            this.add(50 + 512, function () {
                KEY.onRoomItemAction(1);
            });
            this.add(51 + 512, function () {
                KEY.onRoomItemAction(2);
            });
            this.add(52 + 512, function () {
                KEY.onRoomItemAction(3);
            });
            this.add(53 + 512, function () {
                KEY.onRoomItemAction(4);
            });
            this.add(54 + 512, function () {
                KEY.onRoomItemAction(5);
            });
            //ctrl
            this.add(49 + 1024, function () {
                KEY.room_commands(0);
            });
            this.add(50 + 1024, function () {
                KEY.room_commands(1);
            });
            this.add(51 + 1024, function () {
                KEY.room_commands(2);
            });
            this.add(52 + 1024, function () {
                KEY.room_commands(3);
            });
            this.add(53 + 1024, function () {
                KEY.room_commands(4);
            });
            this.add(54 + 1024, function () {
                KEY.room_commands(5);
            });
        },
        add: function (k, c) {
            var tmp = {
                key: k,
                callback: c,
            };
            this.keys.push(tmp);
        },
        e: function (event) {
            if ($(".channel-box").is(":visible")) {
                KEY.chatModeKeyEvent(event);
                return;
            }
            if ($(".dialog-confirm").is(":visible") &&
                ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)))
                return;
            if ($('input').is(':focus') || $('textarea').is(':focus')) {
                return;
            }
            var kk = (event.ctrlKey || event.metaKey ? 1024 : 0) + (event.altKey ? 512 : 0) + event.keyCode;
            for (var k of KEY.keys) {
                if (k.key == kk)
                    return k.callback();
            }
        },
        dialog_close: function () {
            $(".dialog-close").click();
        },
        dialog_confirm: function () {
            $(".dialog-btn.btn-ok").click();
        },
        do_command: function (name) {
            $("span[command=" + name + "]").click();
        },
        room_commands: function (index) {
            $("div.combat-panel div.room-commands span:eq(" + index + ")").click();
        },
        combat_commands: function (index) {
            $("div.combat-panel div.combat-commands span.pfm-item:eq(" + index + ")").click();
        },
        chatModeKeyEvent: function (event) {
            if (event.keyCode == 27) {
                KEY.dialog_close();
            } else if (event.keyCode == 13) {
                if ($(".sender-box").val().length) $(".sender-btn").click();
                else KEY.dialog_close();
            }
        },
        onChangeRoom: function () {
            KEY.roomItemSelectIndex = -1;
        },
        onRoomItemSelect: function () {
            if (KEY.roomItemSelectIndex != -1) {
                $(".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")").css("background", "#000");
            }
            KEY.roomItemSelectIndex = (KEY.roomItemSelectIndex + 1) % $(".room_items div.room-item").length;
            var curItem = $(".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")");
            curItem.css("background", "#444");
            curItem.click();
        },
        onRoomItemAction: function (index) {
            //NPC下方按键
            $(".room_items .item-commands span:eq(" + index + ")").click();
        },
    }

    function messageClear() {
        $(".WG_log pre").html("");
    }
    var log_line = 0;

    function messageAppend(m, t = 0, area = 0) {
        if (area) {
            var ap = m + "\n";
            if (t == 1) {
                ap = "<hiy>" + ap + "</hiy>";
            } else if (t == 2) {
                ap = "<hig>" + ap + "</hig>";
            } else if (t == 3) {
                ap = "<hiw>" + ap + "</hiw>";
            }
            $('.content-message pre').append(ap)
        } else {
            100 < log_line && (log_line = 0, $(".WG_log pre").empty());
            var ap = m + "\n";
            if (t == 1) {
                ap = "<hiy>" + ap + "</hiy>";
            } else if (t == 2) {
                ap = "<hig>" + ap + "</hig>";
            } else if (t == 3) {
                ap = "<hiw>" + ap + "</hiw>";
            }
            $(".WG_log pre").append(ap);
            log_line++;
            $(".WG_log")[0].scrollTop = 99999;
        }
    }
    var sm_array = {
        '武当': {
            "place": "武当派-三清殿",
            "npc": "武当派第二代弟子 武当首侠 宋远桥",
            "sxplace": "武当派-太子岩",
            "sx": "首席弟子"
        },
        '华山': {
            "place": "华山派-镇岳宫",
            "npc": "市井豪杰 高根明",
            "sxplace": "华山派-练武场",
            "sx": "首席弟子"
        },
        '少林': {
            "place": "少林派-天王殿",
            "npc": "少林寺第三十九代弟子 道觉禅师",
            "sxplace": "少林派-练武场",
            "sx": "大师兄"
        },
        '逍遥': {
            "place": "逍遥派-青草坪",
            "npc": "聪辩老人 苏星河",
            "sxplace": "-jh fam 5 start;go west",
            "sx": "首席弟子"
        },
        '丐帮': {
            "place": "丐帮-树洞下",
            "npc": "丐帮七袋弟子 左全",
            "sxplace": "丐帮-破庙密室",
            "sx": "首席弟子"
        },
        '峨眉': {
            "place": "峨眉派-大殿",
            "npc": "峨眉派第四代弟子 静心",
            "sxplace": "峨眉派-广场",
            "sx": "大师姐"
        },
        '武馆': {
            "place": "扬州城-扬州武馆",
            "npc": "武馆教习",
            "sxplace": "扬州城-扬州武馆"
        },
        '杀手楼': {
            "place": "杀手楼-大厅",
            "npc": "杀手教习 何小二",
            "sxplace": "杀手楼-练功房",
            "sx": "金牌杀手"
        },
    };
    var WG = {
        sm_state: -1,
        sm_item: null,
        sm_store: null,
        init: function () {
            $("li[command=SelectRole]").on("click", function () {
                WG.login();
            });
        },
        inArray: function (val, arr) {
            for (let i = 0; i < arr.length; i++) {
                let item = arr[i];
                if (item[0] == "<") {
                    if (item == val) return true;

                } else {
                    if (item != "") {
                        if (val.indexOf(item) >= 0) return true;
                    }
                }
            }
            return false;
        },
        login: function () {
            role = $('.role-list .select').text().split(/[\s\n]/).pop();
            $(".bottom-bar").append("<span class='item-commands' style='display:none'><span WG='WG' cmd=''></span></span>"); //命令行模块
            var html = UI.wgui();
            $(".content-message").after(html);
            $('.content-bottom').after("<div class='zdy-commands'></div>");
            var css = `.zdy-item{
                display: inline-block;border: solid 1px gray;color: gray;background-color: black;
                text-align: center;cursor: pointer;border-radius: 0.25em;min-width: 2.5em;margin-right: 0em;
                margin-left: 0.4em;position: relative;padding-left: 0.4em;padding-right: 0.4em;line-height: 24px;}
                .WG_log{flex: 1;overflow-y: auto;border: 1px solid #404000;max-height: 15em;width: calc(100% - 40px);}
                .WG_log > pre{margin: 0px; white-space: pre-line;}
                .WG_button { width: calc(100% - 40px);}
                .item-plushp{display: inline-block;float: right;width: 100px;}
                .item-dps{display: inline-block;float: right;width: 100px;}
                .settingbox {margin-left: 0.625 em;border: 1px solid gray;background-color: transparent;color: unset;resize: none;width: 80% ;height: 3rem;}
                .runtest textarea{display:block;width:300px;height:160px;border:10px solid #F8F8F8;border-top-width:0;padding:10px;line-height:20px;overflow:auto;background-color:#3F3F3F;color:#eee;font-size:12px;font-family:Courier New}
                .runtest a{position:absolute;right:20px;bottom:20px}
                .layui-btn,.layui-input,.layui-select,.layui-textarea,.layui-upload-button{outline:0;-webkit-appearance:none;transition:all .3s;-webkit-transition:all .3s;box-sizing:border-box}
                .layui-btn{display:inline-block;height:38px;line-height:38px;padding:0 18px;background-color:#009688;color:#fff;white-space:nowrap;text-align:center;font-size:14px;border:none;border-radius:2px;cursor:pointer}
                .layui-btn-normal{background-color:#1E9FFF}
                .layui-layer-moves{background-color:transparent}
                .switch2 {display: inline-block;position: relative;height: 1.25em;width: 3.125em;line-height: 1.25em;
                border-radius: 0.875em;background: #dedede;cursor: pointer;-ms-user-select: none;-moz-user-select: none;
                -webkit-user-select: none;user-select: none;vertical-align: middle;text-align: center;}
                .switch2 > .switch-button {position: absolute;left: 0px;height: 1.25em;width: 1.25em;
                border-radius: 0.875em;background: #fff;box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
                transition: 0.3s;-webkit-transition: 0.3s;left: 0px;}
                .switch2 > .switch-text {color:#898989;margin-left: 0.625em;}
                .on>.switch-button {right:0px;left:auto;}
                .on>.switch-text {color:#ffffff;margin-right: 0.625em;    margin-left: 0px;}
                .on {background-color:#008000;}
                .crit{
                    height:24px;
                    position:relative;
                    animation:myfirst 1s;
                    -webkit-animation:myfirst 0.4s; /* Safari and Chrome */
                }
                    @keyframes myfirst
                {
                    0%   {background:red; left:0px; top:0px;}
                    33% {background:red; left:0px; top:-14px;}
                    66% {background:red; left:0px; top:14px;}
                    100% {background:red; left:0px; top:0px;}
                }

                @-webkit-keyframes myfirst /* Safari and Chrome */
                {
                    0%   {background:red; left:0px; top:0px;}
                    33% {background:red; left:0px; top:-30px;}
                    100% {background:red; left:0px; top:0px;}
                }
            `;
            GM_addStyle(css);
            npcs = GM_getValue("npcs", npcs);
            goods = GM_getValue("goods", goods);
            equip = GM_getValue(role + "_equip", equip);
            //初始化角色配置
            GI.configInit();
            if (backimageurl != '') {
                GM_addStyle(`body{background-color:rgb(0,0,0,.25)}
                div{ opacity:1;}
                html{background:rgba(255,255,255,0.25);
                background-image:url('${backimageurl}');
                background-repeat:no-repeat;
                background-size:100% 100%;
                -moz-background-size:100% 100%;} `);
            }


            setTimeout(() => {
                role = role;
                var logintext = '';
                document.title = role + "-MUD游戏-武神传说";
                L.msg(`欢迎使用 ${welcome} 版本号${GM_info.script.version}`);
                KEY.do_command("showtool");
                KEY.do_command("pack");
                KEY.do_command("score");
                WG.SendCmd("score2");
                setTimeout(() => {
                    //bind settingbox
                    KEY.do_command("score");
                    var rolep = role;
                    if (G.level) {
                        rolep = G.level + role;
                        if (G.level.indexOf('武帝') >= 0||G.level.indexOf('武神') >= 0) {
                            $('.zdy-item.zdwk').html("修炼(Y)");
                        }
                    }
                    rolep = welcome + "" + rolep;
                    if (WebSocket) {
                        if (shieldswitch == "开" || silence == '开') {
                            messageAppend('已注入屏蔽系统', 0, 1);
                        }
                        if (npcs['店小二'] == 0) {
                            logintext = `
                                <hiy>欢迎${rolep},插件已加载！第一次使用,请在设置中,初始化ID,并且设置一下是否自动婚宴,自动传送boss
                                插件版本: ${GM_info.script.version}
                                </hiy>`;
                        } else {
                                   $.get("https://wsmud.ii74.com/hello/"+role, (result)=>{

                                       let tmp  = `
                                <hiy>欢迎${rolep},插件已加载！
                                插件版本: ${GM_info.script.version}
                                更新日志: ${result}
                                </hiy>`;
                                        messageAppend(tmp);
                                   });
                        }
                        WG.ztjk_func();
                        WG.zml_showp();
                        WG.dsj_func();
                    } else {
                        logintext = `
                            <hiy>欢迎${role},插件未正常加载！
                            当前浏览器不支持自动喜宴自动boss,请使用火狐浏览器
                            谷歌系浏览器,请在network中勾选disable cache,多刷新几次,直至提示已加载!
                            多次刷新无法仍然出现本提示，请打开tampermonkey 插件设置
                            开启高级设置，在最下方实验 设置 “注入模式：即时”“严格模式：禁用”
                            插件版本: ${GM_info.script.version}
                            </hiy>`;
                    }
                    messageAppend(logintext);
                }, 500);
                KEY.do_command("showcombat");
                //执行记忆面板
                var closeBorad = localStorage.getItem("closeBorad");
                if (closeBorad==="true"){
                    WG.showhideborad()
                }
                WG.runLoginhml();
                //开启定时器
                var systime = setInterval(() => {
                    var myDate = new Date();
                    let timeTips = {
                        data: JSON.stringify({
                            type: "time",
                            h: myDate.getHours(),
                            m: myDate.getMinutes(),
                            s: myDate.getSeconds(),
                            time: myDate.toTimeString()
                        })
                    };
                    WG.receive_message(timeTips);
                }, 1000);
            }, 1000);
        },
        update_goods_id: function () {
            var lists = $(".dialog-list > .obj-list:first");
            var id;
            var name;
            if (lists.length) {
                messageAppend("检测到商品清单");
                for (var a of lists.children()) {
                    a = $(a);
                    id = a.attr("obj");
                    name = $(a.children()[0]).html();
                    goods[name].id = id;
                    messageAppend(name + ":" + id);
                }
                GM_setValue("goods", goods);
                return true;
            } else {
                messageAppend("未检测到商品清单");
                return false;
            }
        },
        update_npc_id: function () {
            var lists = $(".room_items .room-item");

            for (var npc of lists) {
                if (npc.lastElementChild.innerText.indexOf("[") >= 0) {
                    if (npc.lastElementChild.lastElementChild.lastElementChild.lastElementChild == null) {
                        if (npc.lastElementChild.firstChild.nodeType == 3 &&
                            npc.lastElementChild.firstChild.nextSibling.tagName == "SPAN") {
                            npcs[npc.lastElementChild.innerText.split('[')[0]] = $(npc).attr("itemid");
                            messageAppend(npc.lastElementChild.innerText.split('[')[0] + " 的ID:" + $(npc).attr("itemid"));
                        }
                    }
                } else {
                    if (npc.lastElementChild.lastElementChild == null) {
                        npcs[npc.lastElementChild.innerText] = $(npc).attr("itemid");
                        messageAppend(npc.lastElementChild.innerText + " 的ID:" + $(npc).attr("itemid"));
                    }
                }
            }
            GM_setValue("npcs", npcs);
        },
        update_id_all: function () {
            var t = [];
            Object.keys(goods).forEach(function (key) {
                if (t[goods[key].place] == undefined)
                    t[goods[key].place] = goods[key].sales;
            });
            var keys = Object.keys(t);
            var i = 0;
            var state = 0;
            var place, sales;
            //获取
            var timer = setInterval(() => {

                switch (state) {
                    case 0:
                        if (i >= keys.length) {
                            messageAppend("初始化完成");
                            WG.go("武当派-广场");
                            clearInterval(timer);
                            return;
                        }
                        place = keys[i];
                        sales = t[place];
                        WG.go(place);
                        state = 1;
                        break;
                    case 1:
                        WG.update_npc_id();
                        var id = npcs[sales];
                        WG.Send("list " + id);
                        state = 2;
                        break;
                    case 2:
                        if (WG.update_goods_id()) {
                            state = 0;
                            i++;
                        } else
                            state = 1;
                        break;
                }
            }, 1000);
        },
        update_store_hook: undefined,
        update_store: async function () {
            WG.update_store_hook = WG.add_hook(['dialog', 'text'], (data) => {
                if (data.dialog == 'list' && data.max_store_count) {
                    messageAppend("<hio>仓库信息获取</hio>开始");
                    var stores = data.stores;
                    store_list = [];
                    for (let store of stores) {
                        store_list.push(store.name.toLowerCase());
                    }
                    zdy_item_store = store_list.join(',');
                    $('#store_info').val(zdy_item_store);
                    GM_setValue(role + "_zdy_item_store", zdy_item_store);
                } else if (data.type == 'text' && data.msg == '没有这个玩家。') {
                    messageAppend("<hio>仓库信息获取</hio>完成");

                    $('.dialog-close').click();
                    WG.remove_hook(WG.update_store_hook);
                    WG.update_store_hook = undefined;
                }
            });
            WG.SendCmd("$to 扬州城-广场;$to 扬州城-钱庄;look3 1");
        },
        clean_dps: function () {
            pfmdps = 0;
            pfmnum = 0;
        },
        Send: async function (cmd) {
            if (WebSocket) {
                send_cmd(cmd, true);
            } else {
                if (cmd) {
                    cmd = cmd instanceof Array ? cmd : cmd.split(';');
                    for (var c of cmd) {
                        $("span[WG='WG']").attr("cmd", c).click();
                    };
                }
            }
        },
        SendStep: async function (cmd) {
            if (cmd) {
                cmd = cmd instanceof Array ? cmd : cmd.split(';');
                for (var c of cmd) {
                    WG.SendCmd(c);
                    await WG.sleep(12000);
                };
            }
        },
        SendCmd: async function (cmd) {
            if (cmd) {
                if (cmd.indexOf(",") >= 0) {
                    if (cmd instanceof Array) {
                        cmd = cmd;
                    } else {
                        if (cmd.indexOf(";") >= 0) {
                            cmd = cmd.split(";");
                        } else {
                            cmd = cmd.split(",");
                        }
                    }
                } else {
                    cmd = cmd instanceof Array ? cmd : cmd.split(';');
                }
                let idx = 0;
                let cmds = '';
                for (var c of cmd) {
                    if (c.indexOf("$") >= 0) {
                        if (c[0] == "$") {
                            c = c.replace("$", "");
                            let p0 = c.split(" ")[0];
                            let p1 = c.split(" ")[1];
                            cmds = cmd.join(";");
                            eval("T." + p0 + "(" + idx + ",'" + p1 + "','" + cmds + "')");
                            return;
                        } else {
                            var p_c = c.split(" ");
                            p_c = p_c[p_c.length - 1];
                            // buy $sitem from $snpc
                            if (p_c) {
                                if (p_c[0] == "$") {
                                    p_c = p_c.replace("$", "");
                                    let patt = new RegExp(/\".*?\"/);
                                    let result = patt.exec(p_c)[0];
                                    cmds = cmd.join(";");
                                    eval("T." + p_c.split('(')[0] + "(" + idx + "," + result + ",'" + cmds + "')");
                                    return;
                                } else {
                                    p_c = c.split(" ");
                                    if (p_c[1].indexOf('$') >= 0) {
                                        p_c = p_c[1].replace("$", "");
                                        let patt = new RegExp(/\".*?\"/);
                                        let result = patt.exec(p_c)[0];
                                        cmds = cmd.join(";");
                                        eval("T." + p_c.split('(')[0] + "(" + idx + "," + result + ",'" + cmds + "')");
                                        return;
                                    }
                                }
                            } else {

                                return;
                            }
                        }
                    }
                    //npc id解析
                    if (c.indexOf("%") >= 0) {
                        var rep = c.match("\%([^%]+)\%");
                        if (npcs[rep[1]] != undefined) {
                            var subStr = new RegExp('\%([^%]+)\%'); //创建正则表达式对象
                            c = c.replace(subStr, npcs[rep[1]]);
                        } else {
                            for (let item of roomData) {
                                if (item != 0) {
                                    if (item.name.indexOf(rep[1]) >= 0) {
                                        var subStr = new RegExp('\%([^%]+)\%');
                                        c = c.replace(subStr, item.id);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    //商店 id解析
                    if (c.indexOf("*") >= 0) {
                        var rep = c.match("\\*([^%]+)\\*");
                        if (goods[rep[1]] != undefined) {
                            var subStr = new RegExp('\\*([^%]+)\\*');
                            c = c.replace(subStr, goods[rep[1]].id);
                        }
                    }

                    WG.Send(c);
                    idx = idx + 1;
                };
            }
        },
        sleep: function (time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        },
        stopAllAuto: function () {
            stopauto = true;
        },
        reSetAllAuto: function () {
            stopauto = false;
        },
        go: async function (p) {
            if (needfind[p] == undefined) {
                if (WG.at(p)) {
                    return;
                }
            }
            if (place[p] != undefined) {
                G.ingo = true;
                await WG.SendCmd(place[p]);
                G.ingo = false;
            }
        },
        at: function (p) {
            var w = $(".room-name").html();
            return w.indexOf(p) == -1 ? false : true;
        },

        getIdByName: function (n) {
            for (let i = 0; i < roomData.length; i++) {
                if (roomData[i].name && roomData[i].name.indexOf(n) >= 0) {
                    return roomData[i].id;
                }
            }
            return null;
        },
        smhook: undefined,
        ungetStore: false,
        sm: function () {
            if (!WG.smhook) {
                WG.smhook = WG.add_hook('text', function (data) {
                    if (data.msg.indexOf("辛苦了， 你先去休息") >= 0 ||
                        data.msg.indexOf("和本门毫无瓜葛") >= 0 ||
                        data.msg.indexOf("你没有") >= 0
                    ) {
                        WG.Send("taskover signin");
                        WG.sm_state = -1;
                        $(".sm_button").text("师门(Q)");
                        WG.remove_hook(WG.smhook);
                        WG.smhook = undefined;
                    }
                });
            }
            switch (WG.sm_state) {
                case 0:
                    //前往师门接收任务
                    WG.go(sm_array[family].place);
                    WG.sm_state = 1;
                    setTimeout(WG.sm, 500);
                    break;
                case 1:
                    //接受任务
                    var lists = $(".room_items .room-item");
                    var id = null;
                    for (var npc of lists) {
                        if (npc.lastElementChild.innerText.indexOf("[") >= 0) {
                            if (npc.lastElementChild.lastElementChild.lastElementChild.lastElementChild == null) {
                                if (npc.lastElementChild.firstChild.nodeType == 3 &&
                                    npc.lastElementChild.firstChild.nextSibling.tagName == "SPAN") {
                                    if (npc.lastElementChild.innerText.split('[')[0] == sm_array[family].npc)
                                        id = $(npc).attr("itemid");
                                }
                            }
                        } else {
                            if (npc.lastElementChild.lastElementChild == null) {
                                if (npc.lastElementChild.innerText == sm_array[family].npc) {
                                    id = $(npc).attr("itemid");
                                }
                            }
                        }
                    }
                    if (id != undefined) {
                        WG.Send("task sm " + id);
                        WG.Send("task sm " + id);
                        WG.sm_state = 2;
                    } else {
                        WG.update_npc_id();
                        WG.sm_state = 0;
                    }
                    setTimeout(WG.sm, 500);
                    break;
                case 2:
                    var mysm_loser = GM_getValue(role + "_sm_loser", sm_loser);
                    //获取师门任务物品
                    var item = $("span[cmd$='giveup']:last").parent().prev();
                    if (item.length == 0) {
                        WG.sm_state = 0;
                        setTimeout(WG.sm, 500);
                        return;
                    };
                    var itemName = item.html();
                    item = item[0].outerHTML;
                    if (WG.ungetStore) {
                        if (mysm_loser == "开") {
                            $("span[cmd$='giveup']:last").click();
                            messageAppend("放弃任务");
                            WG.ungetStore = false;
                            WG.sm_state = 0;
                            setTimeout(WG.sm, 150);
                            return;
                        } else if (mysm_loser == "关") {
                            WG.sm_state = -1;
                            $(".sm_button").text("师门(Q)");
                        }
                    }
                    //能上交直接上交
                    var tmpObj = $("span[cmd$='giveup']:last").prev();
                    for (let i = 0; i < 6; i++) {
                        if (tmpObj.children().html()) {
                            if (tmpObj.html().indexOf(item) >= 0) {
                                tmpObj.click();
                                messageAppend("自动上交" + item);
                                WG.sm_state = 0;
                                setTimeout(WG.sm, 500);
                                return;
                            }
                            tmpObj = tmpObj.prev();
                        }
                    }
                    //不能上交自动购买
                    WG.sm_item = goods[itemName];
                    if (item != undefined && WG.inArray(item, store_list) && sm_getstore == "开") {
                        if (item.indexOf("hiz") >= 0 || item.indexOf("hio") >= 0) {
                            var a = window.confirm("您确定要交稀有物品吗");
                            if (a) {
                                messageAppend("自动仓库取" + item);
                                WG.sm_store = item;
                                WG.sm_state = 4;
                                setTimeout(WG.sm, 500);
                                return;
                            }
                        } else {
                            messageAppend("自动仓库取" + item);
                            WG.sm_store = item;
                            WG.sm_state = 4;
                            setTimeout(WG.sm, 500);
                            return;
                        }
                    }
                    if (WG.sm_item != undefined && item.indexOf(WG.sm_item.type) >= 0) {
                        WG.go(WG.sm_item.place);
                        messageAppend("自动购买" + item);
                        WG.sm_state = 3;
                        setTimeout(WG.sm, 500);
                    } else {
                        if (sm_price == "开") {
                            let pz = [{}, {}, {}, {}, {}]
                            tmpObj = $("span[cmd$='giveup']:last").prev();
                            for (let i = 0; i < 6; i++) {
                                if (tmpObj.children().html()) {
                                    if (tmpObj.html().indexOf('放弃') == -1 &&
                                        tmpObj.html().indexOf('令牌') >= 0) {
                                        if (tmpObj.html().indexOf('hig') >= 0) {
                                            pz[0] = tmpObj;
                                        }
                                        if (tmpObj.html().indexOf('hic') >= 0) {
                                            pz[1] = tmpObj;
                                        }
                                        if (tmpObj.html().indexOf('hiy') >= 0) {
                                            pz[2] = tmpObj;
                                        }
                                        if (tmpObj.html().indexOf('hiz') >= 0) {
                                            pz[3] = tmpObj;
                                        }
                                        if (tmpObj.html().indexOf('hio') >= 0) {
                                            pz[4] = tmpObj;
                                        }
                                    }
                                }
                                tmpObj = tmpObj.prev();
                            }
                            let _p = false;
                            for (let p of pz) {
                                if (p.html != undefined) {
                                    p.click();
                                    messageAppend("自动上交牌子");
                                    WG.sm_state = 0;
                                    _p = true;
                                    setTimeout(WG.sm, 500);
                                    return;
                                }
                            }
                            if (!_p) {
                                messageAppend("没有牌子并且无法购买" + item);
                                if (mysm_loser == "关") {
                                    WG.sm_state = -1;
                                    $(".sm_button").text("师门(Q)");
                                } else if (mysm_loser == "开") {
                                    $("span[cmd$='giveup']:last").click();
                                    messageAppend("放弃任务");
                                    WG.sm_state = 0;
                                    setTimeout(WG.sm, 500);
                                    return;
                                }
                            }
                        } else {
                            messageAppend("无法购买" + item);
                            if (mysm_loser == "关") {
                                WG.sm_state = -1;
                                $(".sm_button").text("师门(Q)");
                            } else if (mysm_loser == "开") {
                                $("span[cmd$='giveup']:last").click();
                                messageAppend("放弃任务");
                                WG.sm_state = 0;
                                setTimeout(WG.sm, 500);
                                return;
                            }
                        }
                    }
                    break;
                case 3:
                    WG.go(WG.sm_item.place);
                    if (WG.buy(WG.sm_item)) {
                        WG.sm_state = 0;
                    }
                    setTimeout(WG.sm, 500);
                    break;
                case 4:
                    var mysm_loser = GM_getValue(role + "_sm_loser", sm_loser);
                    WG.go("扬州城-钱庄");
                    WG.qu(WG.sm_store, (res) => {
                        if (res) {
                            WG.sm_state = 0;
                            setTimeout(WG.sm, 500);
                        } else {
                            messageAppend("无法取" + WG.sm_store);
                            if (WG.sm_item != undefined && WG.sm_store.indexOf(WG.sm_item.type) >= 0) {
                                WG.go(WG.sm_item.place);
                                messageAppend("自动购买" + WG.sm_store);
                                WG.sm_state = 3;
                                setTimeout(WG.sm, 500);
                                return;
                            } else {
                                if (mysm_loser == "关") {
                                    WG.sm_state = -1;
                                    $(".sm_button").text("师门(Q)");
                                } else if (mysm_loser == "开") {
                                    WG.ungetStore = true;
                                    WG.sm_state = 0;
                                    setTimeout(WG.sm, 500);
                                }
                            }
                        }
                    });
                    break;
                default:
                    break;
            }
        },
        sm_button: function () {
            if (WG.sm_state >= 0) {
                WG.sm_state = -1;
                $(".sm_button").text("师门(Q)");
            } else {
                WG.sm_state = 0;
                $(".sm_button").text("停止(Q)");
                setTimeout(WG.sm, 50);
            }
        },
        buy: function (good) {
            var tmp = npcs[good.sales];
            if (tmp == undefined) {
                WG.update_npc_id();
                return false;
            }
            WG.Send("list " + tmp);
            WG.Send("buy 1 " + good.id + " from " + tmp);
            return true;
        },
        qu: function (good, callback) {
            setTimeout(() => {
                let storestatus = false;
                $(".obj-item").each(function () {
                    if ($(this).html().toLowerCase().indexOf(good) != -1) {
                        storestatus = true;
                        var id = $(this).attr("obj")
                        WG.Send("qu 1 " + id);
                        return;
                    }
                })
                callback(storestatus);
            }, 1000);

        },
        Give: function (items) {
            var tmp = npcs["店小二"];
            if (tmp == undefined) {
                WG.update_npc_id();
                return false;
            }
            WG.Send("give " + tmp + " " + items);
            return true;
        },
        eq: function (e) {
            WG.Send("eq " + equip[e]);
        },
        ask: function (npc, i) {
            npc = npcs[npc];
            npc != undefined ? WG.Send("ask" + i + " " + npc) : WG.update_npc_id();
        },
        yamen_lister: undefined,
        go_yamen_task: async function () {
            if (!WG.yamen_lister) {
                WG.yamen_lister = WG.add_hook('text', function (data) {
                    if (data.msg.indexOf("最近没有在逃的逃犯了，你先休息下吧。") >= 0) {
                        clearInterval(WG.check_yamen_task);
                        WG.check_yamen_task = 'over';
                        WG.remove_hook(WG.yamen_lister);
                        WG.yamen_lister = undefined;
                    } else if (data.msg.indexOf("没有这个人") >= 0) {
                        WG.update_npc_id();
                    }
                });
            }
            WG.go("扬州城-衙门正厅");
            await WG.sleep(200);
            WG.update_npc_id();
            WG.ask("扬州知府 程药发", 1);
            if (WG.check_yamen_task == 'over') {
                return;
            }
            window.setTimeout(WG.check_yamen_task, 1000);
        },
        check_yamen_task: function () {
            if (WG.check_yamen_task == 'over') {
                return;
            }
            messageAppend("查找任务中");
            var task = $(".task-desc:eq(-2)").text();
            if (task.indexOf("扬州知府") == -1) {
                task = $(".task-desc:eq(-3)").text();
            }
            if (task.length == 0) {
                KEY.do_command("tasks");
                window.setTimeout(WG.check_yamen_task, 1000);
                return;
            }
            try {
                zb_npc = task.match("犯：([^%]+)，据")[1];
                zb_place = task.match("在([^%]+)出")[1];
                messageAppend("追捕任务：" + zb_npc + "   地点：" + zb_place);
                KEY.do_command("score");
                WG.go(zb_place);
                window.setTimeout(WG.check_zb_npc, 1000);
            } catch (error) {
                messageAppend("查找衙门追捕失败");
                window.setTimeout(WG.check_yamen_task, 1000);
            }
        },
        zb_next: 0,
        check_zb_npc: function () {
            var lists = $(".room_items .room-item");
            var found = false;

            for (var npc of lists) {
                if (npc.innerText.indexOf(zb_npc) != -1) {
                    found = true;
                    WG.Send("kill " + $(npc).attr("itemid"));
                    messageAppend("找到" + zb_npc + "，自动击杀！！！");
                    WG.zb_next = 0;
                    return;
                }
            }
            var fj = needfind[zb_place];
            if (!found && needfind[zb_place] != undefined && WG.zb_next < fj.length) {
                messageAppend("寻找附近");
                WG.Send(fj[WG.zb_next]);
                WG.zb_next++;
            }
            if (!found) {
                window.setTimeout(WG.check_zb_npc, 1000);
            }
        },
        kill_all: function () {
            var lists = $(".room_items .room-item");
            for (var npc of lists) {
                if ($(npc).html().indexOf("尸体") == -1) {
                    WG.Send("kill " + $(npc).attr("itemid"));
                }
            }
        },
        get_all: function () {
            var lists = $(".room_items .room-item");
            for (var npc of lists) {
                WG.Send("get all from " + $(npc).attr("itemid"));
            }
        },
        clean_all: function () {
            WG.go("扬州城-打铁铺");
            WG.Send("sell all");
        },
        sort_hook: undefined,
        sort_all: function () {

            var storeset = [
            ];
            if (WG.sort_hook) {
                messageAppend("<hio>仓库排序</hio>运行中");
                messageAppend("<hio>仓库排序</hio>手动结束");
                WG.remove_hook(WG.sort_hook);
                WG.sort_hook = undefined;
                return;
            }
            var sortCmd = "";
            var getandstore = function (set) {

                var cmds = [];
                for (let s of set) {
                    cmds.push("qu " + s.count + " " + s.id + ";$wait 350;");
                }
                set = set.sort(function (a, b) {
                    return a.name.length - b.name.length;
                })
                for (let s of set) {
                    cmds.push("store " + s.count + " " + s.id + ";$wait 350;");
                }
                return cmds.join("");
            }
            WG.sort_hook = WG.add_hook(['dialog', 'text'], (data) => {
                if (data.type == 'dialog' && data.dialog == 'list') {
                    if (data.stores == undefined) {
                        return;
                    }
                const colorSet = ['wht','hig','hic','hiy','hiz','hio','red','hir','ord'];

                    for (let store of data.stores) {
                        let num = 0;
                        for (let cx of colorSet){
                            if (store.name.toLocaleLowerCase().indexOf(cx) >= 0) {
                                if(storeset[num]){
                                    storeset[num].push(store);
                                }else{
                                    storeset[num] = [store];
                                }
                            }
                            num++;
                        }

                    }
                    for (let item of storeset) {
                        if(item){
                            sortCmd += getandstore(item);
                         }
                    }
                    sortCmd += "look3 1";
                    WG.SendCmd(sortCmd);
                } else if (data.type == 'text' && data.msg == '没有这个玩家。') {
                    messageAppend("<hio>仓库排序</hio>完成");
                    WG.remove_hook(WG.sort_hook);
                    WG.sort_hook = undefined;
                }

            });
            messageAppend("<hio>仓库排序</hio>开始");
            if (WG.at("扬州城-钱庄")) {
                WG.Send("store");
            } else {
                WG.go("扬州城-钱庄");
            }
        },
        sort_all_bag: function () {

            var storeset = [
            ];
            if (WG.sort_hook) {
                messageAppend("<hio>背包排序</hio>运行中");
                messageAppend("<hio>背包排序</hio>手动结束");
                WG.remove_hook(WG.sort_hook);
                WG.sort_hook = undefined;
                return;
            }
            var sortCmd = "";
            var getandstore = function (set) {

                var cmds = [];
                for (let s of set) {
                    cmds.push("store " + s.count + " " + s.id + ";$wait 350;");
                }
                set = set.sort(function (a, b) {
                    return a.name.length - b.name.length;
                })
                for (let s of set) {
                    cmds.push("qu " + s.count + " " + s.id + ";$wait 350;");
                }
                return cmds.join("");
            }
            WG.sort_hook = WG.add_hook(['dialog', 'text'], (data) => {
                if (data.type == 'dialog' && data.dialog == 'pack') {
                    if (data.items == undefined) {
                        return;
                    }
                    const colorSet = ['wht','hig','hic','hiy','hiz','hio','red','hir','ord'];

                    for (let store of data.items) {
                        let num = 0;
                        for (let cx of colorSet){
                            if (store.name.toLocaleLowerCase().indexOf(cx) >= 0) {
                                if(storeset[num]){
                                    storeset[num].push(store);
                                }else{
                                    storeset[num] = [store];
                                }
                            }
                            num++;
                        }
                    }
                    for (let item of storeset) {
                        if(item){
                           sortCmd += getandstore(item);
                        }
                    }
                    sortCmd += "look3 1";
                    WG.SendCmd(sortCmd);
                } else if (data.type == 'text' && data.msg == '没有这个玩家。') {
                    messageAppend("<hio>背包排序</hio>完成,执行后请刷新并重新登录");
                    WG.remove_hook(WG.sort_hook);
                    WG.sort_hook = undefined;
                }

            });
            messageAppend("<hio>背包排序</hio>开始");
            if (WG.at("扬州城-钱庄")) {
                WG.Send("pack");
                KEY.dialog_close();
                //WG.Send("store");
            } else {
                WG.go("扬州城-钱庄");
            }
        },
        packup_listener: null,
        sell_all: function (store = 1, fenjie = 1, drop = 1) {
            if (WG.packup_listener) {
                messageAppend("<hio>包裹整理</hio>运行中");
                messageAppend("<hio>包裹整理</hio>手动结束");
                WG.remove_hook(WG.packup_listener);
                WG.packup_listener = undefined;
                return;
            }
            let stores = [];
            WG.packup_listener = WG.add_hook(["dialog", "text"], (data) => {
                if (data.type == "dialog" && data.dialog == "list") {
                    if (data.stores == undefined) {
                        return;
                    }
                    stores = [];
                    //去重
                    for (let i = 0; i < data.stores.length; i++) {
                        let s = null;
                        for (let j = 0; j < stores.length; j++) {
                            if (stores[j].name == data.stores[i].name.toLowerCase()) {
                                s = stores[j];
                                break;
                            }
                        }
                        if (s != null) {
                            s.count += data.stores[i].count;
                        } else {
                            stores.push(data.stores[i]);
                        }
                    }
                } else if (data.type == "dialog" && data.dialog == "pack") {
                    let cmds = [];
                    let dropcmds = [];
                    if (data.items == undefined) {
                        return;
                    }
                    for (var i = 0; i < data.items.length; i++) {
                        //仓库
                        if (store_list.length != 0) {
                            if (WG.inArray(data.items[i].name.toLowerCase(), store_list) && store) {
                                if (data.items[i].can_eq) {
                                    //装备物品，不能叠加，计算总数
                                    let store = null;
                                    for (let j = 0; j < stores.length; j++) {
                                        if (stores[j].name == data.items[i].name.toLowerCase()) {
                                            store = stores[j];
                                            break;
                                        }
                                    }
                                    if (store != null) {
                                        if (store.count < 4) {
                                            store.count += data.items[i].count;
                                            cmds.push("store " + data.items[i].count + " " + data.items[i].id);
                                            cmds.push("$wait 200");
                                            messageAppend("<hio>包裹整理</hio>" + data.items[i].name + "储存到仓库");
                                        } else {
                                            messageAppend("<hio>包裹整理</hio>" + data.items[i].name + "超过设置的储存上限");
                                        }
                                    } else {
                                        stores.push(data.items[i]);
                                        cmds.push("store " + data.items[i].count + " " + data.items[i].id);
                                        cmds.push("$wait 200");
                                        messageAppend("<hio>包裹整理</hio>" + data.items[i].name + "储存到仓库");
                                    }
                                } else {
                                    cmds.push("store " + data.items[i].count + " " + data.items[i].id);
                                    cmds.push("$wait 200");
                                    messageAppend("<hio>包裹整理</hio>" + data.items[i].name + "储存到仓库");
                                }
                            }
                        }
                        //丢弃
                        if (WG.inArray(data.items[i].name.toLowerCase(), drop_list) && drop && (data.items[i].name.indexOf("★") == -1 || data.items[i].name.indexOf("☆") == -1)) {
                            if (lock_list.indexOf(data.items[i].name.toLowerCase()) >= 0) { continue; }
                            if (data.items[i].count == 1) {
                                dropcmds.push("drop " + data.items[i].id);
                                dropcmds.push("$wait 200");
                            } else {
                                dropcmds.push("drop " + data.items[i].count + " " + data.items[i].id);
                                dropcmds.push("$wait 200");
                            }

                            messageAppend("<hio>包裹整理</hio>" + data.items[i].name + "丢弃");

                        }
                        //分解
                        if (fenjie_list.length && WG.inArray(data.items[i].name.toLowerCase(), fenjie_list) && data.items[i].name.indexOf("★") == -1 && fenjie) {
                            cmds.push("fenjie " + data.items[i].id);
                            cmds.push("$wait 200");
                            messageAppend("<hio>包裹整理</hio>" + data.items[i].name + "分解");

                        }
                    }
                    cmds.push("$to 扬州城-杂货铺");
                    cmds.push("sell all");
                    cmds.push("$wait 1000");
                    cmds = cmds.concat(dropcmds);
                    cmds.push("look3 1");
                    if (cmds.length > 0) {
                        WG.SendCmd(cmds);
                    }
                } else if (data.type == 'text' && data.msg == '没有这个玩家。') {
                    messageAppend("<hio>包裹整理</hio>完成");
                    WG.remove_hook(WG.packup_listener);
                    WG.packup_listener = undefined;
                }
            });

            messageAppend("<hio>包裹整理</hio>开始");
            WG.go("扬州城-钱庄");
            WG.Send("store;pack");
        },
        cmd_echo_button: function () {
            if (G.cmd_echo) {
                G.cmd_echo = false;
                messageAppend("<hio>命令代码关闭</hio>");
            } else {
                G.cmd_echo = true;
                ProConsole.init();
                messageAppend("<hio>命令代码显示</hio>");
            }
        },
        getItemNameByid: (id, callback) => {
            packData.forEach(function (item) {
                if (item != 0) {
                    if (item.id == id) {
                        callback(item.name);
                        return;
                    }
                }
            })
        },
        addstore: (itemname) => {
            if (zdy_item_store2 == "") {
                zdy_item_store2 = itemname;
            } else {
                zdy_item_store2 = zdy_item_store2 + "," + itemname;
            }
            GM_setValue(role + "_zdy_item_store2", zdy_item_store2);

            $('#store_info2').val(zdy_item_store2);

            if (zdy_item_store2) {
                store_list = zdy_item_store2.split(",");
            }

            messageAppend("添加存仓成功" + itemname);
        },
        addlock: (itemname) => {
            if (zdy_item_lock == "") {
                zdy_item_lock = itemname;
            } else {
                zdy_item_lock = zdy_item_lock + "," + itemname;
            }
            GM_setValue(role + "_zdy_item_lock", zdy_item_lock);

            $('#lock_info').val(zdy_item_lock);

            if (zdy_item_lock) {
                lock_list = zdy_item_lock.split(",");
            }

            messageAppend("添加物品锁成功" + itemname);
        },
        dellock: (itemname) => {
            lock_list.remove(itemname);
            zdy_item_lock = lock_list.join(',');
            GM_setValue(role + "_zdy_item_lock", zdy_item_lock);

            $('#lock_info').val(zdy_item_lock);

            messageAppend("解锁物品锁成功" + itemname);
        },
        addfenjieid: (itemname) => {
            if (zdy_item_fenjie == "") {
                zdy_item_fenjie = itemname;
            } else {
                zdy_item_fenjie = zdy_item_fenjie + "," + itemname;
            }
            GM_setValue(role + "_zdy_item_fenjie", zdy_item_fenjie);


            if (zdy_item_fenjie) {
                fenjie_list = zdy_item_fenjie.split(",");
            }
            messageAppend("添加分解成功" + itemname);

            $('#store_fenjie_info').val(zdy_item_fenjie);
        },
        adddrop: (itemname) => {
            if (itemname.indexOf("hio") >= 0 || itemname.indexOf("hir") >= 0 || itemname.indexOf("ord") >= 0) {
                messageAppend("高级物品,不添加整理时丢弃" + itemname);
                return;
            }
            if (zdy_item_drop == "") {
                zdy_item_drop = itemname;
            } else {
                zdy_item_drop = zdy_item_drop + "," + itemname;
            }
            GM_setValue(role + "_zdy_item_drop", zdy_item_drop);
            if (zdy_item_drop) {
                drop_list = zdy_item_drop.split(",");
            }
            messageAppend("添加丢弃成功" + itemname);

            $('#store_drop_info').val(zdy_item_drop);
        },

        zdwk: function (v,x=true) {
            if(x){
                if (G.level) {
                    if (G.level.indexOf('武帝') >= 0||G.level.indexOf('武神') >= 0) {
                        WG.go("住房-练功房");
                        WG.Send("xiulian");
                        return;
                    }
                }
            }
            if (WebSocket) {
                if (v == "remove") {
                    if (G.wk_listener) {
                        WG.remove_hook(G.wk_listener);
                        G.wk_listener = undefined;
                    }
                    return;
                }
                if (G.wk_listener) return;
                let tiejiang_id;
                let wk_busy = false;
                G.wk_listener = WG.add_hook(["dialog", "text"], function (data) {
                    if (data.type == "dialog" && data.dialog == "pack") {
                        //检查是否装备铁镐
                        let tiegao_id;
                        if (data.name) {
                            if (data.name == "<wht>铁镐</wht>") {
                                WG.Send("eq " + data.id);
                                WG.go("扬州城-矿山");
                                WG.Send("wa");
                                WG.zdwk("remove",false);
                                return;
                            }
                        } else if (data.items) {
                            if (data.eqs[0] && data.eqs[0].name.indexOf("铁镐") > -1) {
                                WG.go("扬州城-矿山");
                                WG.Send("wa");
                                WG.zdwk("remove",false);
                                return;
                            } else {
                                for (let i = 0; i < data.items.length; i++) {
                                    let item = data.items[i];
                                    if (item.name.indexOf("铁镐") > -1) {
                                        tiegao_id = item.id;
                                        break;
                                    }
                                }
                                if (tiegao_id) {
                                    WG.Send("eq " + tiegao_id);
                                    WG.go("扬州城-矿山");
                                    WG.Send("wa");
                                    WG.zdwk("remove",false);
                                    return;
                                } else {
                                    WG.go("扬州城-打铁铺");
                                    WG.Send("look 1");
                                }
                            }
                        }
                    }
                    if (data.type == 'text' && data.msg == '你要看什么？') {
                        let id = WG.getIdByName('铁匠');
                        if (id) {
                            tiejiang_id = id;
                            WG.Send('list ' + id);
                        } else {
                            messageAppend("<hio>自动挖矿</hio>未发现铁匠");
                            WG.zdwk("remove",false);
                        }
                    } else if (data.type == 'text') {
                        if (data.msg == '你挥着铁镐开始认真挖矿。') WG.zdwk("remove");
                        else if ((data.msg == "你现在正忙。" || data.msg == "你正在战斗，待会再说。" || data.msg.indexOf("不要急") >= 0 || data.msg.indexOf("这个方向没有出路") >= 0) && wk_busy == false) {
                            wk_busy = true;
                            messageAppend('卡顿,五秒后再次尝试操作', 0, 1);
                            setTimeout(() => {
                                wk_busy = false;
                                WG.Send("stopstate;pack");
                            }, 5000);
                        }
                    }
                    if (data.type == 'dialog' && data.dialog == 'list' && data.seller == tiejiang_id) {
                        let item_id;
                        for (let i = 0; i < data.selllist.length; i++) {
                            let item = data.selllist[i];
                            if (item.name == "<wht>铁镐</wht>") {
                                item_id = item.id;
                                break;
                            }
                        }
                        if (item_id) {
                            WG.Send('buy 1 ' + item_id + ' from ' + tiejiang_id);
                        } else {
                            messageAppend("<hio>自动挖矿</hio>无法购买<wht>铁镐</wht>");
                            WG.zdwk("remove",false);
                        }
                    }
                });
                WG.Send("stopstate;pack");

            } else {
                var t = $(".room_items .room-item:first .item-name").text();
                t = t.indexOf("<挖矿");

                if (t == -1) {
                    messageAppend("当前不在挖矿状态");
                    if (timer == 0) {
                        console.log(timer);
                        WG.go("扬州城-矿山");
                        WG.eq("铁镐");
                        WG.Send("wa");
                        timer = setInterval(WG.zdwk, 5000);
                    }
                } else {
                    WG.timer_close();
                }

                if (WG.at("扬州城-矿山") && t == -1) {
                    //不能挖矿，自动买铁镐
                    WG.go("扬州城-打铁铺");
                    WG.buy(goods["铁镐"]);
                    //买完等待下一次检查
                    messageAppend("自动买铁镐");
                    return;
                }
                if (WG.at("扬州城-打铁铺")) {
                    var lists = $(".dialog-list > .obj-list:eq(1)");
                    var id;
                    var name;
                    if (lists.length) {
                        messageAppend("查找铁镐ID");
                        for (var a of lists.children()) {
                            a = $(a);
                            id = a.attr("obj");
                            name = $(a.children()[0]).html();
                            if (name == "铁镐") {
                                equip["铁镐"] = id;
                                WG.eq("铁镐");
                                break;
                            }
                        }
                        GM_setValue(role + "_equip", equip);
                        WG.go("扬州城-矿山");
                        WG.Send("wa");
                    }
                    return;
                }
            }
        },
        timer_close: function () {
            if (timer) {
                clearInterval(timer);
                timer = 0;
            }
        },
        wudao_hook: undefined,
        wudao_auto: function () {
            //创建定时器
            if (timer == 0) {
                timer = setInterval(WG.wudao_auto, 2000);
            }
            if (!WG.at("武道塔")) {
                //进入武道塔 对于武神塔不知道咋操作
                if (WebSocket) {
                    if (!WG.wudao_hook) {
                        WG.wudao_hook = WG.add_hook("dialog", (data) => {
                            var item = data.items
                            for (var ii of item) {
                                if (ii.id == "signin") {
                                    WG.go("武道塔");
                                    //var pattern = "/-?[1-9]\d*/-?[1-9]\d*/", str = ii.desc;//写不来正则
                                    var reg = new RegExp("进度([^%]+)，<");
                                    var wudaojindu = (ii.desc.match(reg))[1];
                                    if (wudaojindu != null) {
                                        messageAppend("爬塔 : " + wudaojindu);
                                        var index = wudaojindu.indexOf('<');
                                        var wudao = wudaojindu.substring(0, index).split('/')
                                        var wudaocongz = ii.desc.indexOf("武道塔可以重置") != -1;
                                        // messageAppend("测试结果 : "+wudaocongz+"__" + wudao [0]+ "__" + wudao [1] );
                                        if (wudao[0] == wudao[1]) {
                                            messageAppend("爬塔完成! ");
                                            if (wudaocongz) { //重置
                                                WG.ask("守门人", 1);
                                                messageAppend("爬塔重置完成! ");
                                                WG.Send("go enter");
                                            } else {
                                                messageAppend("爬塔已经重置过了!");
                                                WG.timer_close();
                                            }
                                        } else { //没爬完
                                            messageAppend("爬塔未完成!");
                                            WG.Send("go enter");
                                        }
                                        //messageAppend(" ii  "+ wudaojindu +" ____" + wudaocongz);
                                    } else {
                                        messageAppend("获取爬塔信息失败 : " + ii.desc);
                                    }
                                    break;
                                }
                            }
                            WG.remove_hook(WG.wudao_hook);
                            WG.wudao_hook = undefined;
                        })
                    }
                    WG.Send("tasks");
                } else {
                    WG.go("武道塔");
                    WG.ask("守门人", 1);
                    WG.Send("go enter");
                }
            } else {
                //武道塔内处理
                //messageAppend("武道塔");
                var w = $(".room_items .room-item:last");
                var t = w.text();
                if (t.indexOf("守护者") != -1) {
                    WG.Send("kill " + w.attr("itemid"));
                    WG.wudao_autopfm();
                } else {
                    WG.Send("go up");
                }
            }
        },
        wudao_autopfm: function () {
            var pfm = wudao_pfm.split(',');
            for (var p of pfm) {
                if ($("div.combat-panel div.combat-commands span.pfm-item:eq(" + p + ") span").css("left") == "0px")
                    $("div.combat-panel div.combat-commands span.pfm-item:eq(" + p + ") ").click();
            }
        },
        xue_auto: function () {
            var t = $(".room_items .room-item:first .item-name").text();
            t = t.indexOf("<打坐") != -1 || t.indexOf("<学习") != -1 || t.indexOf("<练习") != -1;
            //创建定时器
            if (timer == 0) {
                if (t == false) {
                    messageAppend("当前不在打坐或学技能");
                    return;
                }
                timer = setInterval(WG.xue_auto, 1000);
            }
            if (t == false) {
                //学习状态中止，自动去挖矿
                WG.timer_close();
                WG.zdwk();
            } else {
                messageAppend("自动打坐学技能");
            }
        },
        fbnum: 0,
        needGrove: 0,
        oncegrove: function () {
            this.fbnum += 1;
            messageAppend("第" + this.fbnum + "次");
            WG.Send("cr yz/lw/shangu;cr over");
            if (this.needGrove <= this.fbnum) {
                WG.Send("taskover signin");
                messageAppend("<hiy>" + this.fbnum + "次副本小树林秒进秒退已完成</hiy>");
                WG.remove_hook(WG.daily_hook);
                WG.daily_hook = undefined;
                this.timer_close();
                //WG.zdwk();
                this.needGrove = 0;
                this.fbnum = 0;
            }
        },
        grove_ask_info: function () {
            return prompt("请输入需要秒进秒退的副本次数", "");
        },
        grove_auto: function (needG = null) {
            if (timer == 0) {
                if (needG == null) {
                    this.needGrove = this.grove_ask_info();
                } else {
                    this.needGrove = needG;
                }
                if (this.needGrove) //如果返回的有内容
                {
                    if (parseFloat(this.needGrove).toString() == "NaN") {
                        messageAppend("请输入数字");
                        return;
                    }
                    messageAppend("开始秒进秒退小树林" + this.needGrove + "次");

                    timer = setInterval(() => {
                        this.oncegrove()
                    }, 1000);
                }
            }
        },
        showhideborad: function () {
            if ($('.WG_log').css('display') == 'none') {
                window.localStorage.setItem("closeBorad","false")
                $('.WG_log').show();
            } else {
                window.localStorage.setItem("closeBorad", "true")
                $('.WG_log').hide();
            }
        },
        calc: function () {
            messageClear();
            var html = UI.jsquivue;
            messageAppend(html);
            const jsqset = new Vue({
                el: '.JsqVueUI',
                data: {
                    status: 1
                },
                methods: {
                    qnjs_btn: function () {
                        WG.qnjs();
                    },
                    lxjs_btn: function () {
                        WG.lxjs();
                    },
                    khjs_btn: function () {
                        WG.khjs();
                    },
                    getskilljson: function () {
                        WG.getPlayerSkill();
                    },
                    autoAddLianxi: function () {
                        WG.selectLowKongfu();
                    },
                    onekeydaily: function () {
                        WG.SendCmd("$daily");
                    },
                    onekeypk: function () {
                        WG.auto_fight();
                    },
                    onekeysansan: function () {
                        let mlh=`// 导入三三懒人包流程，方便后续导入操作
                        // 自命令类型选 Raidjs流程
                        // 四区白三三
                        ($f_ss)={"name":"三三懒人包","source":"http://wsmud-cdn.if404.com/三三懒人包.flow.txt","finder":"根文件夹"}
                        @js var time=Date.parse(new Date());var f=(f_ss);var n=f["name"];var s=f["source"];var fd=f["finder"];WorkflowConfig.removeWorkflow({"name":n,"type":"flow","finder":fd});$.get(s,{stamp:time},function(data,status){WorkflowConfig.createWorkflow(n,data,fd);});
                        @awiat 2000
                        tm 【三三懒人包】流程已导入，如果曾用早期版本的懒人包导入过流程，请先删除这些流程后再使用。`;

                        if (unsafeWindow && unsafeWindow.ToRaid) {
                            ToRaid.perform(mlh);
                        }else{
                            messageAppend("请先安装Raid.js");
                        }
                    },
                    onekeystore: function () {
                        WG.SendCmd("$store")
                    },
                    onekeysell: function () {
                        WG.SendCmd("$drop")
                    },
                    onekeyfenjie: function () {
                        WG.SendCmd("$fenjie")
                    },
                    updatestore: function () {
                        WG.update_store();
                    },
                    cleandps: function () {
                        WG.clean_dps();
                    },
                    sortstore: function () {
                        WG.sort_all();
                    },
                    sortbag: function () {
                        WG.sort_all_bag();
                    },
                    dsrw: function () {
                        WG.dsj();
                    },
                    zdybtnset: function () {
                        WG.zdy_btnset();
                    }
                }
            })

        },
        dsj_hook: undefined,
        dsj_func: function () {
            if (WG.dsj_hook) {
                WG.remove_hook(WG.dsj_hook);
            }
            messageAppend("已注入定时任务", 0, 1);
            timequestion = GM_getValue(role + "_timequestion", timequestion);
            WG.dsj_hook = WG.add_hook("time", (data) => {
                if (data.type == 'time') {
                    let i = 0;
                    for (let p of timequestion) {
                        if ((p.h == data.h && p.m == data.m && p.s == data.s) ||
                            (p.h == "" && p.m == data.m && p.s == data.s) ||
                            (p.h == "" && p.m == "" && p.s == data.s)) {
                            messageAppend("已触发计划" + p.name, 1, 0);
                            WG.SendCmd(p.send);
                            if (p.type == 1) {
                                messageAppend("一次性任务,已移除" + p.name, 1, 0);
                                timequestion.baoremove(i);
                                GM_setValue(role + "_timequestion", timequestion);
                            }
                        }
                        i = i + 1;
                    }
                }
            })
        },
        dsj: function () {
            WG.dsj_func();
            messageClear();
            var html = UI.timeoutui;
            messageAppend(html);
            $(".startQuest").off('click');
            $(".removeQuest").off('click');
            //[{"name":"","type":"0","send":"","h":"","s":"","m":""}]
            timequestion = GM_getValue(role + "_timequestion", timequestion);
            for (let q of timequestion) {
                let phtml = `<span class='addrun${q.name}'>编辑${q.name}</span>
                <span class='stoprun${q.name}'>删除${q.name}</span>
             <br/>
                `
                $('.questlist').append(phtml);
                $("." + `addrun${q.name}`).on("click", () => {
                    $("#questname").val(q.name);
                    $("#rtype").val(q.type);
                    $("#ht").val(q.h);
                    $("#mt").val(q.m);
                    $("#st").val(q.s);
                    $("#zml_info").val(q.send);
                });
                $("." + `stoprun${q.name}`).on("click", () => {
                    let questname = q.name;
                    let i = 0
                    for (let p of timequestion) {
                        if (p.name == questname) {
                            timequestion.baoremove(i);
                        }
                        i = i + 1;
                    }
                    GM_setValue(role + "_timequestion", timequestion);
                    WG.dsj();
                });
            }
            $(".startQuest").on("click", () => {
                let questname = $("#questname").val();
                let type = $("#rtype").val();
                let h = $("#ht").val();
                let m = $("#mt").val();
                let s = $("#st").val();
                let send = $("#zml_info").val();
                let item = {
                    "name": questname,
                    "type": type,
                    "send": send,
                    "h": h,
                    "m": m,
                    "s": s
                };
                let i = 0;
                for (let p of timequestion) {
                    if (questname == p.name) {
                        timequestion[i] = item;
                        GM_setValue(role + "_timequestion", timequestion);
                        WG.dsj();
                        return;
                    }
                    i = i + 1;
                }

                timequestion.push(item);
                GM_setValue(role + "_timequestion", timequestion);
                WG.dsj();
            });
            $(".removeQuest").on("click", () => {
                let questname = $("#questname").val();
                let i = 0
                for (let p of timequestion) {
                    if (p.name == questname) {
                        timequestion.baoremove(i);
                        return;
                    }
                    i = i + 1;
                }
                GM_setValue(role + "_timequestion", timequestion);
                WG.dsj();
            });


        },
        qnjs: function () {
            messageClear();
            var html = UI.qnjsui;
            messageAppend(html);
            const qnvue = new Vue({
                el: ".QianNengCalc",
                data: {
                    qnsx: {
                        m: 0,
                        c: 0,
                        color: 0
                    }
                },
                methods: {
                    qnjscalc: function () {
                        $.each(this.qnsx, (key, value) => {
                            this.qnsx[key] = Number(value);
                        })
                        messageAppend("需要潜能:" + WG.dian(this.qnsx.c,this.qnsx.m,this.qnsx.color));
                    }
                }
            })

        },
        lxjs: function () {
            messageClear();
            var html = UI.lxjsui;
            messageAppend(html);
            const lxjsvue = new Vue({
                el: ".StudyTimeCalc",
                data: {
                    jsqsx: {
                        xtwx: 0,
                        htwx: 0,
                        lxxl: 0,
                        clevel: 0,
                        mlevel: 0,
                        color: 0
                    }
                },
                created() {
                    this.jsqsx.xtwx = G.score.int;
                    this.jsqsx.htwx = G.score.int_add;
                    this.jsqsx.lxxl = parseInt(G.score2.lianxi_per.replaceAll("%", ""));
                },
                methods: {
                    lxjscalc: function () {
                        $.each(this.jsqsx, (key, value) => {
                            this.jsqsx[key] = Number(value);
                        })
                        const lxObj = WG.lx(this.jsqsx.xtwx, this.jsqsx.htwx, this.jsqsx.lxxl,
                            this.jsqsx.clevel, this.jsqsx.mlevel, this.jsqsx.color);
                        messageAppend("需要潜能:" + lxObj.qianneng + "     所需时间:" + lxObj.time);
                    }
                }
            })
        },
        khjs: function () {
            messageClear();
            var html = UI.khjsui;
            messageAppend(html);
            const khvue = new Vue({
                el: ".KaihuaCalc",
                data: {
                    khsx: {
                        nl: 0,
                        xg: 0,
                        hg: 0
                    }
                },
                created() {
                    this.khsx.nl = G.score.max_mp;
                    this.khsx.xg = G.score.con;
                    this.khsx.hg = G.score.con_add;
                },
                methods: {
                    khjscalc: function () {
                        $.each(this.khsx, (key, value) => {
                            this.khsx[key] = Number(value);
                        })
                        messageAppend("你的分值:" + WG.gen(this.khsx.nl, this.khsx.xg, this.khsx.hg));
                    }
                }
            })
        },
        switchReversal: function (e) {
            let p = e.hasClass("on");
            if (!p) {
                return "开";
            }
            return "关";
        },

        auto_preform_switch: function () {

            if (G.auto_preform) {
                G.auto_preform = false;
                messageAppend("<hio>自动施法</hio>关闭");
                WG.auto_preform("stop");
            } else {
                G.auto_preform = true;
                messageAppend("<hio>自动施法</hio>开启");
                WG.auto_preform();
            }
        },
        auto_preform: function (v) {
            if (v == "stop") {
                if (G.preform_timer) {
                    clearInterval(G.preform_timer);
                    G.preform_timer = undefined;
                    $(".auto_perform").css("background", "");
                }
                return;
            }
            if (G.preform_timer || G.auto_preform == false) return;
            $(".auto_perform").css("background", "#3E0000");
             //出招时重新获取黑名单
                unauto_pfm = GM_getValue(role + "_unauto_pfm", unauto_pfm);
                var unpfm = unauto_pfm.split(',');
                for (var pfmname of unpfm) {
                    if (!WG.inArray(pfmname, blackpfm))
                        blackpfm.push(pfmname);
                }
            G.preform_timer = setInterval(() => {

                if (G.in_fight == false) WG.auto_preform("stop");
                for (var skill of G.skills) {
                    if (family.indexOf("逍遥") >= 0) {
                        if (skill.id == "force.duo") {
                            continue;
                        }
                    }
                    if (WG.inArray(skill.id, blackpfm)) {
                        continue;
                    }
                    if (!G.gcd && !G.cds.get(skill.id)) {
                        WG.Send("perform " + skill.id);
                        break;
                    }
                }
            }, 350);
        },

        formatCurrencyTenThou: function (num) {
            num = num.toString().replace(/\$|\,/g, '');
            if (isNaN(num)) num = "0";
            var sign = (num == (num = Math.abs(num)));
            num = Math.floor(num * 10 + 0.50000000001); //cents = num%10;
            num = Math.floor(num / 10).toString();
            for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++) {
                num = num.substring(0, num.length - (4 * i + 3)) + ',' + num.substring(num.length - (4 * i + 3));
            }
            return (((sign) ? '' : '-') + num);
        },
        gen: function (nl, xg, hg) {
            var jg = nl / 100 + xg * hg / 10;
            var sd = this.formatCurrencyTenThou(jg);
            return sd;
        },
        dian: function (c, m, se) {
            var j = c + m;
            var jj = m - c;
            var jjc = jj / 2;
            var z = j * jjc * se * 5;
            var sd = this.formatCurrencyTenThou(z);
            return sd;
        },
        lx: function (xtwx, htwx, lxxl, dqdj, mbdj, k) {
            var qianneng = (mbdj * mbdj - dqdj * dqdj) * 2.5 * k;
            var time = qianneng / (xtwx + htwx) / (1 + lxxl / 100 - xtwx / 100) / 12;
            var timeString = time < 60 ? `${parseInt(time)}分钟` : `${parseInt(time / 60)}小时${parseInt(time % 60)}分钟`;
            return { qianneng: qianneng, time: timeString };
        },
        //找boss,boss不在,-1,
        findboss: function (data, bossname, callback) {
            for (let i = 0; i < data.items.length; i++) {
                if (data.items[i] != 0) {
                    if (data.items[i].name.indexOf(bossname) >= 0) {
                        callback(data.items[i].id);
                    }
                }
            }
            callback(-1);
        },
        ksboss: undefined,
        kksBoss: function (data) {
            var boss_place = data.content.match("出现在([^%]+)一带。")[1];
            var boss_name = data.content.match("听说([^%]+)出现在")[1];
            if (boss_name == null || boss_place == null) {
                return;
            }
            blacklist = GM_getValue(role + "_blacklist", blacklist);
            blacklist = blacklist instanceof Array ? blacklist : blacklist.split(",");
            if (WG.inArray(boss_name.replace("/<(.*?)>/g", ""), blacklist)) {
                messageAppend("黑名单boss,忽略!");
                return;
            }
            autoKsBoss = GM_getValue(role + "_autoKsBoss", autoKsBoss);
            ks_pfm = GM_getValue(role + "_ks_pfm", ks_pfm);
            ks_wait = GM_getValue(role + "_ks_wait", ks_wait);
            autoeq = GM_getValue(role + "_auto_eq", autoeq);
            console.log("boss");
            console.log(boss_place);
            var c = "<div class=\"item-commands\"><span id = 'closeauto'>关闭自动执行后命令</span></div>";
            messageAppend("自动前往BOSS地点 " + c);
            $('#closeauto').off('click');
            $('#closeauto').on('click', () => {
                if (timer != 0) {
                    WG.timer_close();
                    messageAppend("已停止后命令");
                } else {
                    messageAppend("已经停止");
                }
            });

            WG.Send("stopstate");
            WG.go(boss_place);
            WG.ksboss = WG.add_hook(["items", "itemadd", "die", "room"], function (data) {
                if (data.type == "items") {
                    if (!WG.at(boss_place)) {
                        return;
                    }
                    WG.findboss(data, boss_name, function (bid) {
                        if (bid != -1) {
                            next = 999;
                            WG.eqhelper(autoeq);
                            setTimeout(() => {
                                WG.Send("kill " + bid);
                                //WG.Send("select " + bid);
                                next = 0;
                            }, Number(ks_pfm));
                        } else {
                            if (next == 999) {
                                console.log('found');
                                return;
                            }
                            let lj = needfind[boss_place];
                            if (needfind[boss_place] != undefined && next < lj.length) {
                                setTimeout(() => {
                                    console.log(lj[next]);
                                    WG.Send(lj[next]);
                                    next++;
                                }, 1000);
                            } else {
                                console.log("not found");
                            }
                        }
                    });
                }
                if (data.type == "itemadd") {
                    if (data.name.indexOf(boss_name) >= 0) {
                        next = 0;
                        WG.Send("get all from " + data.id);
                        WG.remove_hook(this.index);
                    }
                }
                if (data.type == "die") {
                    next = 0;
                    WG.Send('relive');
                    WG.remove_hook(this.index);
                }
                if (data.type == 'room') {
                    if (next == 999) {
                        next = 0;
                    }
                }
            });
            timer = setTimeout(() => {
                console.log("复活挖矿");
                WG.Send('relive');
                WG.remove_hook(this.ksboss);
                auto_command = GM_getValue(role + "_auto_command", auto_command);
                if (auto_command && auto_command != null && auto_command != "" && auto_command != "null") {
                    WG.SendCmd(auto_command);
                } else {
                    WG.zdwk();
                }
                next = 0;
                WG.timer_close();
            }, 1000 * ks_wait);

        },
        marryhy: undefined,
        xiyan: async function () {

            var c = "<div class=\"item-commands\"><span id = 'closeauto'>关闭自动执行后命令</span></div>";
            messageAppend("自动喜宴 " + c);
            $('#closeauto').off('click');
            $('#closeauto').on('click', () => {
                if (timer != 0) {
                    WG.timer_close();
                    messageAppend("已停止后命令");
                } else {
                    messageAppend("已经停止");
                }
            });
            WG.Send("stopstate");
            WG.go("扬州城-喜宴");
            WG.marryhy = WG.add_hook(['items', 'cmds', 'text', 'msg'], function (data) {
                if (data.type == 'items') {
                    for (let idx = 0; idx < data.items.length; idx++) {
                        if (data.items[idx] != 0) {
                            if (data.items[idx].name.indexOf(">婚宴礼桌<") >= 0) {
                                console.log("拾取");
                                WG.Send('get all from ' + data.items[idx].id);
                                console.log("xy" + WG.marryhy);
                                WG.remove_hook(WG.marryhy);
                                break;
                            }
                        }
                    }
                } else if (data.type == 'text') {
                    if (data.msg == "你要给谁东西？") {
                        console.log("没人");
                    }
                    if (/^店小二拦住你说道：怎么又是你，每次都跑这么快，等下再进去。$/.test(data.msg)) {
                        console.log("cd");
                        messageAppend("<hiy>你太勤快了, 1秒后回去挖矿</hiy>")
                    }
                    if (/^店小二拦住你说道：这位(.+)，不好意思，婚宴宾客已经太多了。$/.test(data.msg)) {
                        console.log("客满");
                        messageAppend("<hiy>你来太晚了, 1秒后回去挖矿</hiy>")

                    }
                } else if (data.type == 'cmds') {
                    for (let idx = 0; idx < data.items.length; idx++) {
                        if (data.items[idx].name == '1金贺礼') {
                            WG.SendCmd(data.items[idx].cmd + ';go up;$wait 2000;go down;go up');
                            console.log("交钱");
                            break;
                        }
                    }
                }
            });
            timer = setTimeout(() => {
                console.log("挖矿");
                WG.remove_hook(this.marryhy);
                if (auto_command && auto_command != null && auto_command != "" && auto_command != "null") {
                    WG.SendCmd(auto_command);
                } else {
                    WG.zdwk();
                }
                next = 0;
                WG.timer_close();
            }, 30000);
        },

        saveRoomstate(data) {
            roomData = data.items;
        },
        haspack: function (name, callback) {
            WG.Send('pack');
            for (let item of packData) {
                if (item.name.indexOf(name) >= 0) {
                    callback(item.id);
                    return;
                }
            }
            callback('');
        },
        eqx: null,
        eqhelper(type, enaskill = 0) {
            if (type == undefined || type == 0 || type > eqlist.length) {
                return;
            }
            if (eqlist == null || eqlist[type] == "") {
                messageAppend("套装未保存,保存当前装备作为套装" + type + "!", 1);
                WG.eqx = WG.add_hook("dialog", (data) => {
                    if (data.dialog == "pack" && data.eqs != undefined) {
                        eqlist[type] = data.eqs;
                        GM_setValue(role + "_eqlist", eqlist);
                        messageAppend("套装" + type + "保存成功!", 1);
                        WG.remove_hook(WG.eqx);
                    }
                    if (data.dialog == 'skills' && data.items != null) {
                        var nowskill = { 'throwing': '', 'unarmed': '', 'force': '', 'dodge': '', 'sword': '', 'blade': '', 'club': '', 'staff': '', 'whip': '', 'parry': '' };
                        for (let item of data.items) {
                            if (nowskill[item.id] != null) {
                                if (item.enable_skill == null) {
                                    nowskill[item.id] = 'none';
                                } else {
                                    nowskill[item.id] = item.enable_skill;
                                }
                            }
                        }
                        skilllist[type] = nowskill;
                        GM_setValue(role + "_skilllist", skilllist);
                        messageAppend("技能" + type + "保存成功!", 1);
                    }
                });
                WG.Send("cha");
                WG.Send("pack");
            } else {
                if (WG.eqx != null) {
                    WG.remove_hook(WG.eqx);
                    WG.eqx = null;
                }
                eqlist = GM_getValue(role + "_eqlist", eqlist);
                skilllist = GM_getValue(role + "_skilllist", skilllist);
                var p_cmds = "";
                if (enaskill === 0) {
                    for (let i = 1; i < eqlist[type].length; i++) {
                        if (eqlist[type][i] != null) {
                            p_cmds += ("$wait 20;eq " + eqlist[type][i].id + ";");
                        }
                    }
                    if (eqlist[type][0] != null) {
                        p_cmds += ("$wait 40;eq " + eqlist[type][0].id + ";");
                    }
                }
                if (enaskill === 1) {
                    for (var key in skilllist[type]) {
                        p_cmds += (`$wait 40;enable ${key} ${skilllist[type][key]};`);
                    }
                }
                p_cmds = p_cmds + '$wait 40;look3 1';

                WG.eqx = WG.add_hook('text', function (data) {
                    if (data.type == 'text') {

                        if (data.msg.indexOf('没有这个玩家') >= 0) {
                            messageAppend("套装或技能装备成功" + type + "!", 1);
                            WG.remove_hook(WG.eqx);
                        }
                    }
                });
                WG.SendCmd(p_cmds);
            }
        },
        eqhelperdel: function (type) {
            eqlist = GM_getValue(role + "_eqlist", eqlist);
            skilllist = GM_getValue(role + "_skilllist", skilllist);
            eqlist[type] = [];
            skilllist[type] = {};
            GM_setValue(role + "_eqlist", eqlist);
            GM_setValue(role + "_skilllist", skilllist);
            messageAppend("清除套装 技能" + type + "设置成功!", 1);
        },
        uneqall: function () {
            this.eqx = WG.add_hook("dialog", (data) => {
                if (data.dialog == "pack" && data.eqs != undefined) {
                    for (let i = 0; i < data.eqs.length; i++) {
                        if (data.eqs[i] != null) {
                            WG.Send("uneq " + data.eqs[i].id);
                        }
                    }
                    WG.remove_hook(this.eqx);
                }
            });
            WG.Send("pack");
            messageAppend("取消所有装备成功!", 1);
        },

        fight_listener: undefined,
        auto_fight: function () {

            if (WG.fight_listener) {
                messageAppend("<hio>自动比试</hio>结束");
                WG.remove_hook(WG.fight_listener);
                WG.fight_listener = undefined;
                return;
            }
            let name = prompt("请输入NPC名称,例如:\"高根明\"");
            let id = WG.find_item(name);

            if (id == null) return;
            WG.fight_listener = WG.add_hook(["text", "sc", "combat"], async function (data) {
                if (data.type == "combat" && data.end) {
                    let item = G.items.get(G.id);
                    if (item.mp / item.max_mp < 0.8) {
                        WG.SendCmd("dazuo");
                    }
                    WG.SendCmd("liaoshang");
                } else if (data.type == "sc" && data.id == id) {
                    let item = G.items.get(id);
                    if (item.hp >= item.max_hp) {
                        WG.Send("stopstate;fight " + id);
                    }
                } else if (data.type == 'sc' && data.id == G.id) {
                    if (data.hp >= data.max_hp) {
                        WG.Send("stopstate;fight " + id);
                    }
                } else if (data.type == 'text') {
                    if (data.msg.indexOf("你先调整好自己的状态再来找别人比试吧") >= 0) {
                        WG.SendCmd("liaoshang");
                    }
                    if (data.msg.indexOf("你想趁人之危吗") >= 0) {
                        WG.SendCmd("dazuo");
                    }
                    if (data.msg.indexOf(">你疗伤完毕，深深吸了口气") >= 0) {
                        WG.Send("stopstate;fight " + id);
                    }
                }

            });
            WG.Send("stopstate;fight " + id);
            messageAppend("<hio>自动比试</hio>开始");
        },
        find_item: function (name) {
            for (let [k, v] of G.items) {
                if (v.name == name) {
                    return k;
                }
            }
            return null;
        },
        recover: function (hp, mp, cd, callback) {
            //返回定时器
            if (hp == 0) {
                if (WG.recover_timer) {
                    clearTimeout(WG.recover_timer);
                    WG.recover_timer = undefined;
                }
                return;
            }
            WG.Send("dazuo");
            WG.recover_timer = setInterval(function () {
                //检查状态
                let item = G.items.get(G.id);
                if (item.mp / item.max_mp < mp) { //内力控制
                    if (item.state != "打坐") {
                        WG.Send("stopstate;dazuo");
                    }
                    return;
                }
                if (item.hp / item.max_hp < hp) {
                    //血满
                    if (item.state != "疗伤") {
                        WG.Send("stopstate;liaoshang");
                    }
                    return;
                }
                if (item.state) WG.Send("stopstate");
                if (cd) {
                    for (let [k, v] of G.cds) {
                        if (k == "force.tu") continue;
                        if (v) return;
                    }
                }
                clearInterval(WG.recover_timer);
                callback();
            }, 1000);
        },
        useitem_hook: undefined,
        auto_useitem: async function () {
            var useflag = true;
            if (!WG.useitem_hook) {
                WG.useitem_hook = WG.add_hook("text", function (data) {
                    if (data.msg.indexOf("你身上没有这个东西") >= 0 || data.msg.indexOf("太多") >= 0 || data.msg.indexOf("不能使用") >= 0) {
                        useflag = false;
                        WG.remove_hook(WG.useitem_hook);
                        WG.useitem_hook = undefined;
                    }
                })
            }
            let name = prompt("请输入物品id,在背包中点击查看物品,即可在提示窗口看到物品id输出");
            if (!name) {
                WG.remove_hook(WG.useitem_hook);
                WG.useitem_hook = undefined;
                return;
            }
            let num = prompt("请输入物品使用次数,例如:\"10\"", '10');
            if (name) {
                if (name.length != 11) {
                    L.msg('id不合法');
                    WG.remove_hook(WG.useitem_hook);
                    WG.useitem_hook = undefined;
                    return;
                }
                for (var i = 0; i < num; i++) {
                    if (useflag) {
                        WG.Send('use ' + name);
                        await WG.sleep(1000);
                    } else {
                        WG.remove_hook(WG.useitem_hook);
                        WG.useitem_hook = undefined;
                        return;
                    }
                }
            }
            WG.remove_hook(WG.useitem_hook);
            WG.useitem_hook = undefined;
        },

        auto_Development_medicine: function () {
            messageClear();
            var a = UI.lyui;
            messageAppend(a);
            const lianyaovue = new Vue({
                el:"#LianYao",
                data:{
                    level:0,
                    num:1,
                    info:""
                },
                created(){
                    this.info = GM_getValue("lastmed", $('#medicint_info').val());
                    this.level = GM_getValue("lastmedlevel", $('#medicine_level').val());
                },
                methods:{
                    startDev:function(){
                        if (WG.at('住房-炼药房') || WG.at('帮会-炼药房')) {
                            WG.auto_start_dev_med(this.info.replace(" ", ""),this.level,this.num);
                        } else {
                            L.msg("请先前往炼药房");
                        }
                    },
                    stopDev:function(){
                        WG.Send("stopstate");
                    }
                }
            });
        },
        findMedItems_hook: undefined,
        auto_start_dev_med: function (med_item, level, num) {
            GM_setValue("lastmed", med_item);
            GM_setValue("lastmedlevel", level);
            if (med_item) {
                if (med_item.split(",").length < 2) {
                    L.msg("素材不足");
                    return;
                }
            } else {
                L.msg("素材不足");
                return;
            }
            var tmpitme = med_item.split('|');
            var med_items = [];
            for (let pitem of tmpitme) {
                med_items.push(pitem.split(","));
            }

            WG.findMedItems_hook = WG.add_hook("dialog", function (data) {
                if (data.dialog == "pack" && data.items != undefined && data.items.length >= 0) {
                    let med_items_ids = [];

                    let med_haves = [];

                    for (let item of med_items) {
                        let med_items_id = [];
                        let med_have = [];
                        for (let med_item of item) {
                            if (JSON.stringify(data.items).indexOf(med_item) >= 0) {
                                for (let pitem of data.items) {
                                    if (pitem.name.indexOf(med_item) >= 0) {
                                        med_items_id.push(pitem.id);
                                        med_have.push(med_item);
                                    }
                                }
                            }
                        }
                        med_haves.push(med_have);
                        med_items_ids.push(med_items_id);
                    }
                    let idx = 0;
                    for (let med_items_id of med_items_ids) {
                        if (med_items_id.length != med_items[idx].length) {
                            var temp = [];
                            var temparray = [];
                            for (var i = 0; i < med_haves[idx].length; i++) {
                                temp[med_haves[idx][i]] = typeof med_haves[idx][i];;
                            }
                            for (var i = 0; i < med_items[idx].length; i++) {
                                var type = typeof med_items[idx][i];
                                if (!temp[med_items[idx][i]]) {
                                    temparray.push(med_items[idx][i]);
                                } else if (temp[med_items[idx][i]].indexOf(type) < 0) {
                                    temparray.push(med_items[idx][i]);
                                }
                            }
                            let arr = [];
                            for (const item of new Set(temparray)) {
                                arr.push(item)
                            }

                            L.msg("素材不足,请检查背包是否存在" + arr.join('.'));
                            WG.remove_hook(WG.findMedItems_hook);
                            WG.findMedItems_hook = null;
                            return;
                        }
                        idx = idx + 1;
                    }
                    var p_Cmd = WG.make_med_cmd(med_items_ids, level, num);
                    console.log(p_Cmd);
                    WG.SendStep(p_Cmd);
                    WG.remove_hook(WG.findMedItems_hook);
                }
            });
            WG.Send('pack');

        },
        make_med_cmd: function (medItem_ids, level, num) {
            let result = "";
            for (let medItem_id of medItem_ids) {
                for (let i = 0; i < parseInt(num); i++) {
                    let startCmd = "lianyao2 start " + level + ";";
                    let endCmd = "lianyao2 stop;";
                    let midCmd = "lianyao2 add ";
                    for (let medid of medItem_id) {
                        result += startCmd + midCmd + medid + ";"
                    }
                    result += endCmd;
                }
            }
            return result + "$syso 炼制完成;";
        },
        zmlfire: async function (zml) {
            if (zml) {

                messageAppend("运行" + zml.name, 2);
                if (zml.zmlType == 0 || zml.zmlType == "" || zml.zmlType == undefined) {
                    await WG.SendCmd(zml.zmlRun);
                } else if (zml.zmlType == 1) {
                    if (unsafeWindow && unsafeWindow.ToRaid) {
                        ToRaid.perform(zml.zmlRun);
                    }
                } else if (zml.zmlType == 2) {
                    eval(zml.zmlRun);
                }

            }
        },
        zmlztjk: function () {
            zml = GM_getValue(role + "_zml", zml);
            if (! typeof zml instanceof Array) {
                zml = [];
            }
            messageClear();
            var a = UI.zmlandztjkui;
            messageAppend(a);
            const zmlvue = new Vue({
                el:"#zmlandztjk",
                data:{
                },
                created(){
                    this.zmldata = zml;
                },
                methods: {
                    run:function(v){
                        WG.zmlfire(v);
                    },
                    zml:function(){
                        WG.zml_edit();
                    },
                    ztjk:function(){
                        WG.ztjk_edit();
                    },
                    startjk:function () {
                        WG.ztjk_func();
                    },
                    stopjk:function () {
                        if (WG.ztjk_hook) {
                            WG.remove_hook(WG.ztjk_hook);
                            WG.ztjk_hook = undefined;
                            messageAppend("已取消注入", 2);
                            return;
                        }
                        messageAppend("未注入", 2);
                    }

                }
            })
        },
        zml_edit: function () {
            zml = GM_getValue(role + "_zml", zml);
            if(! typeof zml instanceof Array){
                zml = [];
            }
            messageClear();
            var edithtml = UI.zmlsetting;
            messageAppend(edithtml);
            const zmlvue = new Vue({
                el: "#zmldialog",
                data: {
                    singnalzml: {
                        name :"",
                        zmlType: "0",
                        zmlRun: ""
                    },
                    zmldata: zml
                },
                created() {
                    this.zmldata = zml;
                },
                methods: {
                    add: function () {
                        let zmljson = {
                            "name": this.singnalzml.name,
                            "zmlRun": this.singnalzml.zmlRun,
                            "zmlShow": 0,
                            "zmlType": this.singnalzml.zmlType
                        };
                        let _flag = true;
                        for(let item of this.zmldata){
                            if (item.name == zmljson.name) {
                                zmljson.zmlShow = item.zmlShow;
                                item = zmljson;
                                _flag = false;
                            }
                        }

                        if (_flag) {
                            this.zmldata.push(zmljson);
                        }
                        GM_setValue(role + "_zml", this.zmldata);
                        L.msg("保存成功");
                    },
                    del:function(){
                        this.zmldata.forEach( (v, k)=> {
                            if (v.name == this.singnalzml.name) {
                                this.zmldata.baoremove(k);
                                GM_setValue(role + "_zml", this.zmldata);
                                L.msg("删除成功");
                            }
                        });
                    },
                    getShare:function(){
                        var id = prompt("请输入分享码");
                        S.getShareJson(id, (res) => {
                            let v = JSON.parse(res.json);
                            if (v.zmlRun != undefined) {
                                this.singnalzml = v;
                            } else {
                                L.msg("不合法")
                            }
                        });
                    },
                    edit:function(v){
                        this.singnalzml = v;
                    },
                    showp: function (v) {
                        zmlshowsetting = GM_getValue(role + "_zmlshowsetting", zmlshowsetting);
                        //<span class="zdy-item act-item-zdy" zml="use j8ea35f34ce">大还丹</span>
                        let a = $(".room-commands");

                        if (zmlshowsetting == 1) {
                            a = $(".zdy-commands");
                        }

                        for (let item of a.children()) {
                            if (item.textContent == v.name) {
                                item.remove();
                                v.zmlShow = 0;
                                GM_setValue(role + "_zml", zml);
                                messageAppend("删除快速使用" + v.name, 1);
                                return;
                            }
                        }
                        a.append("<span class=\"zdy-item act-item-zdy\">" + v.name + "</span>")
                        v.zmlShow = 1;
                        GM_setValue(role + "_zml", zml);
                        messageAppend("设置快速使用" + v.name, 0, 1);
                        //绑定事件
                        $('.act-item-zdy').off('click');
                        $(".act-item-zdy").on('click', function () {
                            T.usezml(0, this.textContent, "");
                        });
                    },
                    share:function(v){
                        S.shareJson(G.id, v);
                    }
                }
            })

        },
        isseted: false,
        zml_showp: function () {
            $(".zdy-commands").empty();
            $('.act-item-zdy').remove();
            zmlshowsetting = GM_getValue(role + "_zmlshowsetting", zmlshowsetting);
            for (let zmlitem of zml) {
                let a = $(".room-commands");
                if (zmlshowsetting == 1) {
                    for (let item of a.children()) {
                        if (item.textContent == zmlitem.name) {
                            item.remove();
                        }
                    }
                    a = $(".zdy-commands");
                    if (!WG.isseted) {
                        let px = $('.tool-bar.right-bar').css("bottom");
                        px.replace("px", "");
                        px = parseInt(px);
                        px = px + 24;
                        $('.tool-bar.right-bar').css("bottom", px + "px");
                        WG.isseted = true;
                    }

                } else {
                    for (let item of $(".zdy-commands").children()) {
                        if (item.textContent == zmlitem.name) {
                            item.remove();
                        }
                    }
                }

                if (zmlitem.zmlShow == 1) {

                    a.append("<span class=\"zdy-item act-item-zdy\">" + zmlitem.name + "</span>")
                    messageAppend("设置快速使用" + zmlitem.name, 0, 1);
                    //绑定事件
                    $('.act-item-zdy').off('click');
                    $(".act-item-zdy").on('click', function () {
                        T.usezml(0, this.textContent, "");
                    });
                }
            }
        },
        ztjk_edit: function () {

            //[{"name":"","type":"state","action":"remove","keyword":"busy","ishave":"0","send":""}]
            ztjk_item = GM_getValue(role + "_ztjk", ztjk_item);
            messageClear();
            var edithtml = UI.ztjksetting;
            messageAppend(edithtml);
            $(".ztjk_sharedfind").on('click', () => {
                var id = prompt("请输入分享码");
                S.getShareJson(id, (res) => {
                    let v = JSON.parse(res.json);
                    if (v.type != undefined) {
                        $('#ztjk_name').val(v.name);
                        $('#ztjk_type').val(v.type);
                        $('#ztjk_action').val(v.action);
                        $('#ztjk_keyword').val(v.keyword);
                        $('#ztjk_ishave').val(v.ishave);
                        $('#ztjk_send').val(v.send);
                        $('#ztjk_senduser').val(v.senduser);
                        $("#ztjk_maxcount").val(v.maxcount);
                        $("#ztjk_istip").val(v.istip);
                    } else {
                        L.msg("不合法")
                    }
                });
            });
            $('.ztjk_editadd').on("click", function () {
                var ztjk = {
                    name: $('#ztjk_name').val(),
                    type: $('#ztjk_type').val(),
                    action: $('#ztjk_action').val(),
                    keyword: $('#ztjk_keyword').val(),
                    ishave: $('#ztjk_ishave').val(),
                    send: $('#ztjk_send').val(),
                    senduser: $('#ztjk_senduser').val(),
                    isactive: 1,
                    maxcount: $('#ztjk_maxcount').val(),
                    istip: $('#ztjk_istip').val()
                };
                let _flag = true;
                ztjk_item.forEach(function (v, k) {
                    if (v.name == $('#ztjk_name').val()) {
                        ztjk_item[k] = ztjk;
                        _flag = false;
                    }
                });
                if (_flag) {
                    ztjk_item.push(ztjk);
                }
                GM_setValue(role + "_ztjk", ztjk_item);

                WG.ztjk_edit();
                messageAppend("保存成功", 2);
                WG.ztjk_func();
            });
            $(".ztjk_editdel").on('click', function () {
                let name = $('#ztjk_name').val();
                ztjk_item.forEach(function (v, k) {
                    if (v.name == name) {
                        ztjk_item.baoremove(k);
                        GM_setValue(role + "_ztjk", ztjk_item);
                        WG.ztjk_edit();
                        messageAppend("删除成功", 2);
                        WG.ztjk_func();
                    }
                });
            })
            ztjk_item.forEach(function (v, k) {
                var btn = "<span class='addrun" + k + "'>编辑" + v.name + "</span>";
                $('#ztjk_show').append(btn);
                var tmptext = "注入";
                if (v.isactive && v.isactive == 1) {
                    tmptext = "暂停";
                }
                var setbtn = "<span class='setaction" + k + "'>" + tmptext + v.name + "</span>";
                $('#ztjk_set').append(setbtn);
                var btn3 = "<span class='shareztjk" + k + "'>分享" + v.name + "</span>";
                $('#ztjk_show').append(btn3);
            });
            ztjk_item.forEach(function (v, k) {
                $(".addrun" + k).on("click", function () {
                    $('#ztjk_name').val(v.name);
                    $('#ztjk_type').val(v.type);
                    $('#ztjk_action').val(v.action);
                    $('#ztjk_keyword').val(v.keyword);
                    $('#ztjk_ishave').val(v.ishave);
                    $('#ztjk_send').val(v.send);
                    $('#ztjk_senduser').val(v.senduser);
                    $("#ztjk_maxcount").val(v.maxcount);
                    if (v.istip == null) {
                        $("#ztjk_istip").val(1);
                    } else {

                    } $("#ztjk_istip").val(v.istip);
                });
                $('.setaction' + k).on('click', function () {
                    if (this.textContent.indexOf("暂停") >= 0) {
                        ztjk_item[k].isactive = 0;
                    } else {
                        ztjk_item[k].isactive = 1;
                    }
                    GM_setValue(role + "_ztjk", ztjk_item);
                    WG.ztjk_func();
                    WG.ztjk_edit();
                });
                $('.shareztjk' + k).on('click', function () {
                    S.shareJson(G.id, v);
                });
            });

        },
        ztjk_hook: undefined,
        ztjk_func: function () {
            if (WG.ztjk_hook) {
                WG.remove_hook(WG.ztjk_hook);
            }
            WG.ztjk_hook = undefined;
            ztjk_item = GM_getValue(role + "_ztjk", ztjk_item);
            WG.ztjk_hook = WG.add_hook(["dispfm", "enapfm", "dialog", "room", "itemadd", "itemremove", "status", "text", "msg", "die", "combat", "sc"], function (data) {
                ztjk_item.forEach(function (v, k) {
                    if (v.isactive != 1) {
                        return;
                    }
                    if (data.type == v.type) {
                        let keywords = v.keyword.split("|");
                        switch (v.type) {
                            case "status":
                                if (!data.name) {
                                    if (v.action == data.action) {
                                        for (var keyworditem of keywords) {
                                            if (data.sid.indexOf(keyworditem) >= 0) {
                                                if (v.ishave == "0" && data.id != G.id) {
                                                    if (v.istip == "1") {
                                                        messageAppend("已触发" + v.name, 1);
                                                    }
                                                    if (data.id) {
                                                        let p = v.send.replace("{id}", data.id);
                                                        WG.SendCmd(p);
                                                    } else {
                                                        WG.SendCmd(v.send);
                                                    }
                                                } else if (v.ishave == "1" && data.id == G.id) {
                                                    if (data.count != undefined && v.maxcount) {
                                                        if (parseInt(data.count) < parseInt(v.maxcount)) {
                                                            if (v.istip != "0") {
                                                                messageAppend("已触发" + v.name, 1);
                                                            }
                                                            if (data.id) {
                                                                let p = v.send.replace("{id}", data.id);
                                                                WG.SendCmd(p);
                                                            } else {
                                                                WG.SendCmd(v.send);
                                                            }
                                                        }
                                                    } else {
                                                        if (v.istip != "0") {
                                                            messageAppend("已触发" + v.name, 1);
                                                        }
                                                        if (data.id) {
                                                            let p = v.send.replace("{id}", data.id);
                                                            WG.SendCmd(p);
                                                        } else {
                                                            WG.SendCmd(v.send);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    if (v.action == data.action) {
                                        for (var keyworditem of keywords) {
                                            if (data.sid.indexOf(keyworditem) >= 0 || data.name.indexOf(keyworditem) >= 0) {
                                                if (v.ishave == "0" && data.id != G.id) {
                                                    if (v.istip != "0") {
                                                        messageAppend("已触发" + v.name, 1);
                                                    }
                                                    if (data.id) {
                                                        let p = v.send.replace("{id}", data.id);
                                                        WG.SendCmd(p);
                                                    } else {
                                                        WG.SendCmd(v.send);
                                                    }
                                                } else if (v.ishave == "1" && data.id == G.id) {
                                                    if (data.count != undefined && v.maxcount) {
                                                        if (parseInt(data.count) < parseInt(v.maxcount)) {
                                                            messageAppend("当前层数" + data.count + ",已触发" + v.name, 1);
                                                            if (data.id) {
                                                                let p = v.send.replace("{id}", data.id);
                                                                WG.SendCmd(p);
                                                            } else {
                                                                WG.SendCmd(v.send);
                                                            }
                                                        }
                                                    } else {
                                                        if (v.istip != "0") {
                                                            messageAppend("已触发" + v.name, 1);
                                                        }
                                                        if (data.id) {
                                                            let p = v.send.replace("{id}", data.id);
                                                            WG.SendCmd(p);
                                                        } else {
                                                            WG.SendCmd(v.send);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                break;
                            case "text":
                                for (var keyworditem of keywords) {
                                    if (data.msg.indexOf(keyworditem) >= 0) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        if (data.msg) {
                                            let p = v.send.replace("{content}", data.msg.replaceAll("\n", "").replaceAll(",", "").replaceAll(";", ""));
                                            WG.SendCmd(p);
                                        } else {
                                            WG.SendCmd(v.send);
                                        }
                                    }
                                }
                                break;
                            case "msg":
                                if (!v.senduser || v.senduser == "" || v.senduser == null) {
                                    for (var keyworditem of keywords) {
                                        if (data.content.indexOf(keyworditem) >= 0) {
                                            if (v.istip != "0") {
                                                messageAppend("已触发" + v.name, 1);
                                            }
                                            if (data.content) {
                                                let p = v.send.replace("{content}", data.content.replaceAll("\n", "").replaceAll(",", "").replaceAll(";", ""));
                                                WG.SendCmd(p);
                                            } else {
                                                WG.SendCmd(v.send);
                                            }
                                        }
                                    }
                                    return;
                                }
                                let sendusers = v.senduser.split("|");
                                for (let item of sendusers) {
                                    if (data.name == item) {
                                        for (var keyworditem of keywords) {
                                            if (data.content.indexOf(keyworditem) >= 0) {
                                                if (v.istip != "0") {
                                                    messageAppend("已触发" + v.name, 1);
                                                }
                                                if (data.content) {
                                                    let p = v.send.replace("{content}", data.content);
                                                    WG.SendCmd(p);
                                                } else {
                                                    WG.SendCmd(v.send);
                                                }
                                            }
                                        }
                                    } else if ((item == "谣言" && data.ch == "rumor") ||
                                        (item == "系统" && data.ch == 'sys') ||
                                        (item == "门派" && data.ch == 'fam') ||
                                        (item == "帮派" && data.ch == 'pty')) {
                                        for (var keyworditem of keywords) {
                                            if (data.content.indexOf(keyworditem) >= 0) {
                                                if (v.istip != "0") {
                                                    messageAppend("已触发" + v.name, 1);
                                                }
                                                if (data.content) {
                                                    let p = v.send.replace("{content}", data.content);
                                                    WG.SendCmd(p);
                                                } else {
                                                    WG.SendCmd(v.send);
                                                }
                                            }
                                        }
                                    }
                                    // else if (item == "系统" && data.ch == 'sys') {
                                    //     for (var keyworditem of keywords) {
                                    //         if (data.content.indexOf(keyworditem) >= 0) {
                                    //             messageAppend("已触发" + v.name, 1);
                                    //             WG.SendCmd(v.send);
                                    //         }
                                    //     }
                                    // }
                                }
                                break;

                            case "die":
                                if (data.commands != null) {
                                    if (v.istip != "0") {
                                        messageAppend("已触发" + v.name, 1);
                                    }
                                    WG.SendCmd(v.send);
                                }
                                break;
                            case "itemadd":
                                for (var keyworditem of keywords) {

                                    if (data.name.indexOf(keyworditem) >= 0) {
                                        if (v.ishave == 2) {
                                            if (data.p != null) {
                                                break
                                            }
                                        }
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        if (data.id) {
                                            let p = v.send.replace("{id}", data.id);
                                            WG.SendCmd(p);
                                        } else {
                                            WG.SendCmd(v.send);
                                        }
                                    }
                                }
                                break;
                            case "room":
                                for (var keyworditem of keywords) {
                                    if (data.name.indexOf(keyworditem) >= 0) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        let p = v.send.replace("{name}", data.name);
                                        WG.SendCmd(p);
                                        return;
                                    }
                                    for (let roomItem of roomData) {
                                        if (roomItem == 0) { return; }
                                        if (roomItem.name.indexOf(keyworditem) >= 0 && roomItem.p == undefined) {
                                            if (v.istip != "0") {
                                                messageAppend("已触发" + v.name, 1);
                                            }
                                            let p = v.send.replace("{name}", data.name);
                                            WG.SendCmd(p);
                                            return;
                                        }
                                    }
                                }
                                break;
                            case "dialog":
                                if (data.dialog && data.dialog == "pack") {
                                    for (var keyworditem of keywords) {
                                        if (data.name && data.name.indexOf(keyworditem) >= 0) {
                                            if (v.istip != "0") {
                                                messageAppend("已触发" + v.name, 1);
                                            }
                                            let p = v.send.replace("{id}", data.id);
                                            WG.SendCmd(p);
                                        }
                                    }
                                }
                                break;
                            case "combat":
                                for (var keyworditem of keywords) {
                                    if (keyworditem == "start" && data.start == 1) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        WG.SendCmd(v.send);
                                    } else if (keyworditem == "end" && data.end == 1) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        WG.SendCmd(v.send);
                                    }
                                }
                                break;
                            case "sc":
                                let item = G.items.get(G.id);
                                if (v.ishave == "0") {
                                    //查找id
                                    if (!v.senduser) { }
                                    let pid = WG.find_item(v.senduser);
                                    item = G.items.get(pid);
                                }
                                if (item && item.hp) {
                                    if ((item.hp / item.max_hp) * 100 < (parseInt(keywords[0]))) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        WG.SendCmd(v.send);
                                    }
                                }
                                if (item && item.mp) {
                                    if ((item.mp / item.max_mp) * 100 < (parseInt(keywords[1]))) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        WG.SendCmd(v.send);
                                    }
                                }
                                break;
                            case "enapfm":
                                for (let item of keywords) {
                                    if (item == data.id) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        WG.SendCmd(v.send);
                                    }
                                }
                                break;
                            case "dispfm":
                                for (let item of keywords) {
                                    if (item == data.id) {
                                        if (v.istip != "0") {
                                            messageAppend("已触发" + v.name, 1);
                                        }
                                        WG.SendCmd(v.send);
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                    }

                });

            });
            messageAppend("已重新注入自动监控", 0, 1);
        },
        daily_hook: undefined,
        oneKeyDaily: async function () {
            messageAppend("本脚本会自动执行师门及自动进退小树林,请确保精力足够再执行,请不要点击任务菜单", 1);
            var fbnums = 0;
            WG.daily_hook = WG.add_hook("dialog", async function (data) {
                if (data.dialog == "tasks") {
                    if (data.items) {
                        let dailylog ="";
                        let dailystate="";
                        for(let item of data.items){
                            if(item.id == "signin"){
                                dailylog = item.desc;
                                dailystate = item.state;
                            }
                        }
                        if (dailystate == 3) {
                            messageAppend("日常已完成", 1);
                            //WG.zdwk();
                            setTimeout(() => {
                                WG.remove_hook(WG.daily_hook);
                                WG.daily_hook = undefined;
                            }, 1);

                            return;
                        } else {
                            let str = dailylog;
                            str = str.replace(/<(?!\/?p\b)[^>]+>/ig, '');
                            let str1 = str.split("副本");

                            let n = str1[0].match("：([^%]+)/20")[1];
                            let n1 = str1[1].match("：([^%]+)/20")[1];
                            n = 20 - parseInt(n);
                            fbnums = 20 - parseInt(n1);
                            messageAppend("还需要" + n + "次师门任务," + fbnums + "次副本,才可签到");
                            if (n != 0) {
                                //$(".sm_button").click();
                                $(".sm_button").text("停止(Q)");
                                WG.sm_state = 0;
                                setTimeout(WG.sm, 200);
                            } else {
                                WG.sm_state = -1;
                            }

                            //WG.remove_hook(WG.daily_hook);
                            //WG.daily_hook = undefined;
                        }

                    }
                }
            });
            WG.SendCmd("tasks");

            await WG.sleep(2000);
            while (WG.sm_state >= 0) {
                await WG.sleep(2000);
            }
            if (fbnums <= 0) {
                WG.Send("taskover signin");
                messageAppend("<hiy>任务完成</hiy>");
                WG.remove_hook(WG.daily_hook);
                WG.daily_hook = undefined;
                this.timer_close();
                //WG.zdwk();
                this.needGrove = 0;
                this.fbnum = 0;
            } else {
                WG.grove_auto(fbnums);
            }

            // var sxplace = sm_array[family].sxplace;
            // var sx = sm_array[family].sx;
            // if (sxplace.indexOf("-") == 0) {
            //     WG.Send(sxplace.replace('-', ''));
            // } else {
            //     WG.go(sxplace);
            // }
            // await WG.sleep(1000);
            // WG.SendCmd("ask2 $findPlayerByName(\"" + sx + "\")");
            // await WG.sleep(1000);

        },
        oneKeyQA: async function () {
            WG.Send("stopstate");
            WG.sm_state = -1;
            var sxplace = sm_array[family].sxplace;
            var sx = sm_array[family].sx;
            if (sxplace.indexOf("-") == 0) {
                WG.Send(sxplace.replace('-', ''));
            } else {
                WG.go(sxplace);
            }
            await WG.sleep(2000);
            WG.SendCmd("select $findPlayerByName(\"" + sx + "\");$wait 200;ask2 $findPlayerByName(\"" + sx + "\")");
            await WG.sleep(1000);

        },
        sd_hook: undefined,
        oneKeySD: function () {
            var n = 0;
            messageAppend("本脚本自动执行购买扫荡符,进行追捕扫荡,请确保元宝足够，请不要点击任务菜单\n注意! 超过上限会自动放弃", 1);
            WG.sd_hook = WG.add_hook(["dialog", "text"], async function (data) {
                var id = 0;
                var loop = 2;
                if (data.type == 'text' && data.msg) {
                    id = WG.getIdByName("程药发");
                    if (data.msg.indexOf("无法快速完") >= 0) {
                        WG.Send("select " + id);
                        await WG.sleep(200);
                        WG.Send("ask1 " + id);
                        await WG.sleep(200);
                        WG.Send("ask2 " + id);
                        await WG.sleep(200);
                        while (loop) {
                            loop--;
                            console.log("ask3 " + id);

                            WG.Send("ask3 " + id);
                            await WG.sleep(1000);
                        }

                        //messageAppend("追捕已完成", 1);
                        //WG.Send("ask3 " + id);
                        //WG.zdwk();
                        //WG.remove_hook(WG.sd_hook);
                        //WG.sd_hook = undefined;
                    }
                    //<hig>你的追捕任务完成了，目前完成20/20个，已连续完成40个。</hig>
                    if (data.msg.indexOf("追捕任务完成了") >= 0) {
                        let str = data.msg;
                        str = str.replace(/<(?!\/?p\b)[^>]+>/ig, '');
                        n = str.match("目前完成([^%]+)/20")[1];
                        if (n == "20") {
                            messageAppend("追捕已完成", 1);
                            await WG.sleep(2000);
                            WG.remove_hook(WG.sd_hook);
                            WG.sd_hook = undefined;
                        }
                    }
                    if (data.msg.indexOf("多历练一番") >= 0 || data.msg.indexOf("没有那么多元宝") >= 0) {
                        messageAppend("等级太低无法接取追捕,自动取消", 1);
                        WG.remove_hook(WG.sd_hook);
                        WG.sd_hook = undefined;
                    }
                    if (data.msg.indexOf("你的追捕任务已经完成了") >= 0) {
                        messageAppend("追捕已完成", 1);
                        WG.remove_hook(WG.sd_hook);
                        WG.sd_hook = undefined;
                    }
                    if (data.msg.indexOf("你的扫荡符不够。") >= 0) {
                        id = WG.getIdByName("程药发");

                        messageAppend("还需要" + n + "次扫荡,自动购入" + n + "张扫荡符");
                        WG.Send("shop 0 " + n);
                        await WG.sleep(1000);
                        while (loop) {
                            loop--;
                            console.log("ask3 " + id);
                            WG.Send("ask3 " + id);
                            await WG.sleep(1000);
                        }

                    }
                }
                if (data.dialog == "tasks") {
                    if (data.items) {
                        let dailylog = "";
                        for(let item of data.items){
                            if(item.id == "yamen"){
                                dailylog = item.desc;
                            }
                        }
                        let str = dailylog;
                        str = str.replace(/<(?!\/?p\b)[^>]+>/ig, '');

                        n = str.match("完成([^%]+)/20")[1];
                        n = 20 - parseInt(n);
                        if (n == 0) {
                            messageAppend("追捕已完成", 1);
                            //WG.zdwk();
                            WG.remove_hook(WG.sd_hook);
                            WG.sd_hook = undefined;
                            return;
                        } else {
                            do {
                                WG.go("扬州城-衙门正厅");
                                await WG.sleep(1000);
                            }
                            while (!WG.getIdByName("程药发"))
                            WG.SendCmd("ask3 $pname(\"程药发\")");
                        }

                    }
                }
            });
            WG.Send("stopstate");
            WG.SendCmd("tasks");
        },
        yj_hook: undefined,
        oneKeyyj: async function () {
            WG.SendCmd("stopstate;$to 扬州城-药铺;$wait 1000;list %药铺老板 平一指%;$wait 1000;buy 10 *养精丹* from %药铺老板 平一指%;$wait 1000");
            await WG.sleep(4000);
            let lyj = '';
            let byj = '';
            WG.yj_hook = WG.add_hook("dialog", function (data) {
                if (data.items) {
                    for (let item of data.items) {
                        if (item.name == '<hic>养精丹</hic>') {
                            byj = item.id;
                        }
                        if (item.name == "<hig>养精丹</hig>") {
                            lyj = item.id;
                        }
                    }
                    let send = '';
                    for (let i = 0; i < 10; i++) {
                        send += "$wait 500;use " + lyj + ";";
                        if (byj != '') {
                            send += "$wait 500;use " + byj + ";";
                        }
                    }
                    WG.SendCmd(send);
                }
                WG.remove_hook(WG.yj_hook);
            });
            WG.Send("pack");
            await WG.sleep(20000);
        },
        gpSkill_hook: undefined,
        getPlayerSkill: async function () {
            WG.gpSkill_hook = WG.add_hook("dialog", (data) => {
                if ((data.dialog && data.dialog == 'skills') && data.items && data.items != null) {
                    var html = `<div class="item-commands ">
                <span class = "copycha" data-clipboard-target = ".target1" >
                        技能详情复制到剪贴板 </span></div> `;
                    messageAppend(html);
                    $(".copycha").on('click', () => {
                        var dd = G.level.replace(/<\/?.+?>/g, "");
                        var dds = dd.replace(/ /g, "");
                        var copydata = {
                            player: role,
                            level: dds,
                            family: G.pfamily,
                            items: data.items
                        };
                        copyToClipboard(
