import {
    calculationIndex,
    initPointer
} from './depend'



export default function api(Swipe) {

    /**
     * 模拟完成状态调用
     * @return {[type]} [description]
     */
    Swipe.prototype.simulationComplete = function() {
        setTimeout(() => {
            this._restore()
            this._unlock()
        })
    }


    /**
     * 停止翻页
     * @return {[type]} [description]
     */
    Swipe.prototype.openSwipe = function() {
        this._initOperation();
    }


    /**
     * 启动翻页
     * @return {[type]} [description]
     */
    Swipe.prototype.closeSwipe = function() {
        this._evtDestroy();
    }


    /**
     * 是否为边界
     * @param  {[type]}  distance [description]
     * @return {Boolean}          [description]
     */
    Swipe.prototype.isBorder = function(...arg) {
        this._borderBounce(...arg)
    }


    /**
     * 检车是否还在移动中
     * @return {Boolean} [description]
     */
    Swipe.prototype.isMoveimg = function() {
        return this._fliplock;
    }


    /**
     * 前翻页接口
     * @return {[type]} [description]
     */
    Swipe.prototype.prev = function() {
        if (!this._borderBounce(1)) {
            this._slideTo('prev');
        } else {
            //边界反弹
            this._setRebound(this._hindex, 'next')
        }
    }


    /**
     * 后翻页接口
     * @return {Function} [description]
     */
    Swipe.prototype.next = function() {
        if (!this._borderBounce(-1)) {
            this._slideTo('next');
        } else {
            //边界反弹
            this._setRebound(this._hindex, 'prev')
        }
    }


    /**
     * 获取当前页码
     * @return {[type]} [description]
     */
    Swipe.prototype.getHindex = function() {
        return this._hindex
    }


    /**
     * 主动设置页码编号
     * 因为分栏的关系，内部修改外部
     * 页面需要拼接
     */
    Swipe.prototype.setPointer = function(target, pagetotal) {
        this.pagePointer = initPointer(target, pagetotal || this.pagetotal)
    }


    /**
     * 获取页面Pointer
     * @return {[type]} [description]
     */
    Swipe.prototype.getPointer = function() {
        return this.pagePointer
    }


    /**
     * 跳指定页面
     * @param  {[type]} targetIndex [description]
     * @param  {[type]} preMode     [description]
     * @param  {[type]} complete    [description]
     * @return {[type]}             [description]
     */
    Swipe.prototype.scrollToPage = function(targetIndex) { //目标页面

        //如果还在翻页中
        if (this._fliplock) return

        const currIndex = this._hindex //当前页面

        //相邻页
        switch (targetIndex) {
            //前一页
            case (currIndex - 1):
                if (this.multiplePages) {
                    return this.prev();
                }
                break
                //首页
            case currIndex:
                if (currIndex == 0) {
                    this.$emit('onDropApp');
                }
                return
                //后一页
            case (currIndex + 1):
                if (this.multiplePages) {
                    return this.next();
                }
                break
        }

        //算出是相关数据
        const data = calculationIndex(currIndex, targetIndex, this.pagetotal)

        //更新页码索引
        this._updataPointer(data)

        data.pagePointer = this.pagePointer

        this.$emit('onJumpPage', data)
    }


    /**
     * 销毁所有
     * @return {[type]} [description]
     */
    Swipe.prototype.destroy = function() {
        this._evtDestroy();
        this.$off();
        this._bubbleNode.page = null;
        this._bubbleNode.master = null;
        this.element = null;
    }


    /**
     * 调用动画完成
     * @param {[type]} element [description]
     */
    Swipe.prototype.transitionendComplete = function(...arg) {
        this._distributed(...arg)
    }


    /**
     * 目标元素
     * 找到li元素
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    Swipe.prototype.findRootElement = function(point, pageType) {
        let liNode, map
        let _hindex = this._hindex
        let sectionRang = this.sectionRang

        //找到对应的li
        let childNodes = this._bubbleNode[pageType].childNodes
        let numNodes = childNodes.length

        while (numNodes--) {
            liNode = childNodes[numNodes];
            map = liNode.getAttribute('data-map');
            if (sectionRang) {
                _hindex += sectionRang.start;
            }
            if (map == _hindex) {
                return liNode
            }
            _hindex = this._hindex;
        }
    }


}
