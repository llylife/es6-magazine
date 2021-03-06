import { config } from '../config/index'

import MainBar from '../toolbar/main.sysbar'
import DeputyBar from '../toolbar/deputy.fnbar'
import BookBar from '../toolbar/bookbar/index'
import NumberBar from '../toolbar/page.number'
import { sceneController } from './controller'
import { Mediator } from '../manager/mediator'

import {
    getFlowCount,
    getFlowChpaterCount
} from '../component/flow/get'

import {
    home,
    scene
} from './layout'

import {
    pMainBar,
    pDeputyBar
} from './bar.config'


/**
 * 找到对应容器
 * @return {[type]}            [description]
 */
const findContainer = ($rootNode, scenarioId, isMain) => {
    return function(pane, parallax) {
        var node;
        if (isMain) {
            node = '#' + pane;
        } else {
            node = '#' + parallax + scenarioId;
        }
        return $rootNode.find(node)[0];
    }
}


/**
 * 如果启动了缓存记录
 * 加载新的场景
 * @return {[type]} [description]
 */
const checkHistory = (history) => {

    //直接启用快捷调试模式
    if (config.deBugHistory) {
        Xut.View.LoadScenario(config.deBugHistory)
        return true;
    }

    //如果有历史记录
    if (history) {
        var scenarioInfo = sceneController.seqReverse(history)
        if (scenarioInfo) {
            scenarioInfo = scenarioInfo.split('-');
            Xut.View.LoadScenario({
                'scenarioId': scenarioInfo[0],
                'chapterId': scenarioInfo[1],
                'pageIndex': scenarioInfo[2]
            })
            return true;
        } else {
            return false;
        }
    }
}


/**
 * 场景创建类
 * @param  {[type]} seasonId               [description]
 * @param  {[type]} chapterId              [description]
 * @param  {[type]} createCompleteCallback [创建完毕通知回调]
 * @param  {[type]} createMode             [创建模式]
 * @param  {[type]} sceneChainId           [场景ID链,用于后退按钮加载前一个场景]
 * @return {[type]}                        [description]
 */
export class SceneFactory {

    constructor(data) {

        //基本配置信息
        const seasonId = data.seasonId;
        const chapterId = data.chapterId;

        const options = _.extend(this, data, {
            'scenarioId': seasonId,
            'chapterId': chapterId,
            '$container': $('#xut-scene-container')
        })

        //创建主场景
        this._createHTML(options, () => {
            //配置工具栏行为
            if (!Xut.IBooks.Enabled) {
                _.extend(this, this._initToolBar())
            }
            //构建Mediator对象
            this._createMediator();
            //注入场景管理
            sceneController.add(seasonId, chapterId, this);
        })
    }

    /**
     * 创建场景
     * @return {[type]} [description]
     */
    _createHTML(options, callback) {

        //如果是静态文件执行期
        //支持Xut.IBooks模式
        //都不需要创建节点
        if (Xut.IBooks.runMode()) {
            this.$rootNode = $('#xut-main-scene')
            callback()
            return;
        }

        let str

        if (options.isMain) {
            str = home()
        } else {
            str = scene(this.scenarioId)
        }

        this.$rootNode = $(str)

        Xut.nextTick({
            'container': this.$container,
            'content': this.$rootNode
        }, callback)
    }


    /**
     * 初始化工具栏
     * 1 主场景，系统工具栏
     * 2 副场景，函数工具栏
     * 3 全场景，页码显示（右下角）
     * @return {[type]} [description]
     */
    _initToolBar() {
        const scenarioId = this.scenarioId
        const pageTotal = this.pageTotal
        const pageIndex = this.pageIndex
        const $rootNode = this.$rootNode
        const findControlBar = function() {
            return $rootNode.find('.xut-control-bar')
        }

        //主场景工具栏设置
        if (this.isMain) {

            const mainBarConfig = pMainBar(scenarioId, pageTotal)

            //主场工具栏设置
            if (_.isUndefined(config.toolType.mian)) {
                config.toolType.mian = mainBarConfig.toolType
            }
            //主场景模式
            if (_.isUndefined(config.pageMode)) {
                config.pageMode = mainBarConfig.pageMode
            }

            if (config.visualMode === 1) {
                //word模式,自动启动工具条
                this.mainToolbar = new BookBar({
                    container: $rootNode,
                    controlBar: findControlBar(),
                    pageMode: config.pageMode
                })
            }
            //如果工具拦提供可配置
            //或者config.pageMode 带翻页按钮
            else if (_.some(config.toolType.mian) || config.pageMode === 2) {
                //普通模式
                this.mainToolbar = new MainBar({
                    container: $rootNode,
                    controlBar: findControlBar(),
                    pageTotal: pageTotal,
                    currentPage: pageIndex + 1,
                    pageMode: config.pageMode,
                    toolType: config.toolType.mian
                })
            }
        }
        //副场景
        else {

            //副场工具栏配置
            const deputyBarConfig = pDeputyBar(this.barInfo, pageTotal)

            if (_.isUndefined(config.toolType.deputy)) {
                config.toolType.deputy = deputyBarConfig.toolType
            }
            if (_.isUndefined(config.pageMode)) {
                config.pageMode = deputyBarConfig.pageMode
            }

            if (_.some(config.toolType.deputy)) {
                this.deputyToolbar = new DeputyBar({
                    id: scenarioId,
                    container: $rootNode,
                    toolType: config.toolType.deputy,
                    pageTotal: pageTotal,
                    currentPage: pageIndex,
                    pageMode: config.pageMode
                })
            }
        }


        //2016.9.29
        //新增页码显示
        //如果有分栏
        const flowCounts = getFlowCount(this.seasonId)
        if (config.toolType.number && flowCounts) {
            //获取分栏的chapter数，总数需要减去
            const flowChpterCount = getFlowChpaterCount(this.seasonId)
            this.numberToolbar = new NumberBar({
                $rootNode: $rootNode,
                currentPage: pageIndex,
                pageTotal: pageTotal + flowCounts - flowChpterCount
            })
        }

    }

    /**
     * 构建创建对象
     * @return {[type]} [description]
     */
    _createMediator() {

        var self = this;
        var scenarioId = this.scenarioId;
        var pageTotal = this.pageTotal;
        var pageIndex = this.pageIndex;
        var $rootNode = this.$rootNode;
        var isMain = this.isMain;
        var tempfind = findContainer($rootNode, scenarioId, isMain)

        //页面容器
        var scenarioPage = tempfind('xut-page-container', 'scenarioPage-');
        //视差容器
        var scenarioMaster = tempfind('xut-master-container', 'scenarioMaster-');


        //场景容器对象
        var vm = this.vm = new Mediator({
            'container': this.$rootNode[0],
            'multiScenario': !isMain,
            'rootPage': scenarioPage,
            'rootMaster': scenarioMaster,
            'initIndex': pageIndex, //保存索引从0开始
            'pagetotal': pageTotal,
            'sectionRang': this.sectionRang,
            'scenarioId': scenarioId,
            'chapterId': this.chapterId,
            'isInApp': this.isInApp //提示页面
        });

        /**
         * 配置选项
         * @type {[type]}
         */
        var isToolbar = this.isToolbar = this.deputyToolbar ? this.deputyToolbar : this.mainToolbar;


        /**
         * 监听翻页
         * 用于更新页码
         *   parentIndex  父索引
         *   subIndex     子索引
         * @return {[type]} [description]
         */
        vm.$bind('pageUpdate', (...arg) => {
            isToolbar && isToolbar.updatePointer(...arg)
            if (this.numberToolbar) {
                this.numberToolbar && this.numberToolbar.updatePointer(...arg)
            }
        })


        /**
         * 显示下一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('showNext', () => {
            isToolbar && isToolbar.showNext();
        })


        /**
         * 隐藏下一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('hideNext', () => {
            isToolbar && isToolbar.hideNext();
        })

        /**
         * 显示上一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('showPrev', () => {
            isToolbar && isToolbar.showPrev();
        })


        /**
         * 隐藏上一页按钮
         * @return {[type]} [description]
         */
        vm.$bind('hidePrev', () => {
            isToolbar && isToolbar.hidePrev();
        })

        /**
         * 切换工具栏
         * @return {[type]} [description]
         */
        vm.$bind('toggleToolbar', (state, pointer) => {
            isToolbar && isToolbar.toggle(state, pointer);
        })


        /**
         * 复位工具栏
         * @return {[type]} [description]
         */
        vm.$bind('resetToolbar', () => {
            self.mainToolbar && self.mainToolbar.reset();
        })


        /**
         * 监听创建完成
         * @return {[type]} [description]
         */
        vm.$bind('createComplete', (nextAction) => {
            self.complete && setTimeout(() => {
                if (isMain) {
                    self.complete(() => {
                        Xut.View.HideBusy()
                            //检测是不是有缓存加载
                        if (!checkHistory(self.history)) {
                            //指定自动运行的动作
                            nextAction && nextAction();
                        }
                        //全局接口,应用加载完毕
                        Xut.Application.AddEventListener();
                    })
                } else {
                    self.complete(nextAction)
                }
            }, 200);
        })


        //如果是读酷端加载
        if (window.DUKUCONFIG && isMain && window.DUKUCONFIG.success) {
            window.DUKUCONFIG.success();
            vm.$init();
            //如果是客户端加载
        } else if (window.CLIENTCONFIGT && isMain && window.CLIENTCONFIGT.success) {
            window.CLIENTCONFIGT.success();
            vm.$init();
        } else {
            //正常加载
            vm.$init();
        }

        /**
         * 绑定桌面调试
         */
        config.debugMode && Xut.plat.isBrowser && this._bindWatch();
    }

    /**
     * 为桌面测试
     * 绑定调试
     * @return {[type]} [description]
     */
    _bindWatch() {
        // for test
        if (Xut.plat.isBrowser) {
            var vm = this.vm;
            this.testWatch = $(".xut-control-pageindex").click(() => {
                console.log('主场景', vm)
                console.log('主场景容器', vm.$scheduler.pageMgr.Collections)
                console.log('主场景视觉差容器', vm.$scheduler.parallaxMgr && vm.$scheduler.parallaxMgr.Collections)
                console.log('多场景', sceneController.expose())
                console.log('数据库', Xut.data);
            })
        }
    }


    /**
     * 销毁场景对象
     * @return {[type]} [description]
     */
    destroy() {
        /**
         * 桌面调试
         */
        if (this.testWatch) {
            this.testWatch.off();
            this.testWatch = null;
        }

        /**
         * 销毁当前场景
         */
        this.vm.$destroy();

        /**
         * 销毁工具栏
         */
        if (this.isToolbar) {
            this.isToolbar.destroy();
            this.isToolbar = null;
        }

        this.$container = null;

        //销毁节点
        this.$rootNode.off();
        this.$rootNode.remove();
        this.$rootNode = null;

        //销毁引用
        sceneController.remove(this.scenarioId)
    }
}
