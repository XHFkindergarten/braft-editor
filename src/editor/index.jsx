import 'draft-js/dist/Draft.css'
import 'assets/scss/_base.scss'
import React from 'react'
import languages from 'languages'
import BraftFinder from 'braft-finder'
import { ColorUtils, ContentUtils } from 'braft-utils'
import { Editor, EditorState } from 'draft-js'
import { Map } from 'immutable'
import getKeyBindingFn from 'configs/keybindings'
import defaultProps from 'configs/props'
import { keyCommandHandlers, returnHandlers, beforeInputHandlers, dropHandlers, droppedFilesHandlers, copyHandlers, pastedFilesHandlers, pastedTextHandlers, compositionStartHandler } from 'configs/handlers'
import { getBlockRendererFn, getBlockRenderMap, getBlockStyleFn, getCustomStyleMap, getCustomStyleFn, getDecorators } from 'renderers'
import { compositeStyleImportFn, compositeStyleExportFn, compositeEntityImportFn, compositeEntityExportFn, compositeBlockImportFn, compositeBlockExportFn, getPropInterceptors } from 'helpers/extension'
import ControlBar from 'components/business/ControlBar'

// 拉取 合法的
const buildHooks= (hooks) => (hookName, defaultReturns = {}) => {
  return hooks[hookName] || (() => defaultReturns)
}

const filterColors = (colors, colors2) => {
  return colors.filter(item => {
    return !colors2.find(color => color.toLowerCase() === item.toLowerCase())
  }).filter((item, index, array) => array.indexOf(item) === index)
}

// 检查某项控件是否可用
const isControlEnabled = (props, controlName) => {
  return [...props.controls, ...props.extendControls].find(item => item === controlName || item.key === controlName) && props.excludeControls.indexOf(controlName) === -1
}

const getConvertOptions = (props) => {

  const editorId = props.editorId || props.id
  const convertOptions = { ...defaultProps.converts, ...props.converts, fontFamilies: props.fontFamilies }

  convertOptions.styleImportFn = compositeStyleImportFn(convertOptions.styleImportFn, editorId)
  convertOptions.styleExportFn = compositeStyleExportFn(convertOptions.styleExportFn, editorId)
  convertOptions.entityImportFn = compositeEntityImportFn(convertOptions.entityImportFn, editorId)
  convertOptions.entityExportFn = compositeEntityExportFn(convertOptions.entityExportFn, editorId)
  convertOptions.blockImportFn = compositeBlockImportFn(convertOptions.blockImportFn, editorId)
  convertOptions.blockExportFn = compositeBlockExportFn(convertOptions.blockExportFn, editorId)

  return convertOptions

}

export default class BraftEditor extends React.Component {

  static defaultProps = defaultProps

  constructor (props) {

    super(props)
    // 读取编辑器的参数项，拦截器筛选后的
    this.editorProps = this.getEditorProps(props)
    // @question 装饰器
    this.editorDecorators = getDecorators(this.editorProps.editorId || this.editorProps.id)
    console.log('editorDecorators', this.editorDecorators)
    this.isFocused = false
    this.isLiving = false
    this.braftFinder = null
    this.valueInitialized = !!(this.props.defaultValue || this.props.value)

    // draftjs 创建 state 对象
    const defaultEditorState = (this.props.defaultValue || this.props.value) instanceof EditorState
      ? (this.props.defaultValue || this.props.value)
      : EditorState.createEmpty(this.editorDecorators)
    

    // 挂载【转换配置】
    // 根据外部的传入生成转换规则
    defaultEditorState.setConvertOptions(getConvertOptions(this.editorProps))

    let tempColors = []

    if (ContentUtils.isEditorState(defaultEditorState)) {
      // 提取文档内容中使用的样式颜色
      const colors = ColorUtils.detectColorsFromDraftState(defaultEditorState.toRAW(true))

      // 将属性挂载到 State 实例上
      defaultEditorState.setConvertOptions(getConvertOptions(this.editorProps))

      tempColors = filterColors(colors, this.editorProps.colors)
    }

    this.state = {
      tempColors,
      editorState: defaultEditorState,
      isFullscreen: false,
      draftProps: {}
    }
    this.containerNode = null
  }

  // 数据初始化处理
  // 1. 取出特殊参数 例如 value, onChange, defaultValue
  // 2. 根据 editorId 筛选器进行属性的筛选
  getEditorProps (props) {

    props = props || this.props

    const {value, defaultValue, onChange, ...restProps} = props// eslint-disable-line no-unused-vars
    
    const propInterceptors = getPropInterceptors(restProps.editorId || restProps.id)

    if (propInterceptors.length === 0) {
      return restProps
    }

    // 不可变数据化
    let porpsMap = Map(restProps)

    propInterceptors.forEach(interceptor => {
      porpsMap = porpsMap.merge(Map(interceptor(porpsMap.toJS(), this) || {}))
    })

    return porpsMap.toJS()

  }

  componentWillMount () {

    if (isControlEnabled(this.editorProps, 'media')) {

      const { language, media } = this.editorProps
      const { uploadFn, validateFn, items } = { ...defaultProps.media, ...media }

      this.braftFinder = new BraftFinder({
        items: items,
        language: language,
        uploader: uploadFn,
        validator: validateFn
      })

      this.forceUpdate()

    }

  }

  componentDidMount () {

    this.isLiving = true

  }

  componentDidUpdate (_, prevState) {

    if (prevState.editorState !== this.state.editorState) {
      this.state.editorState.setConvertOptions(getConvertOptions(this.editorProps))
    }

  }

  componentWillReceiveProps (props) {

    this.editorProps = this.getEditorProps(props)

    const { value: editorState } = props
    const { media, language } = this.editorProps
    const currentProps = this.getEditorProps()

    // 判断媒体组件是否可用
    if (!isControlEnabled(currentProps, 'media') && isControlEnabled(this.editorProps, 'media') && !this.braftFinder) {

      const { uploadFn, validateFn, items } = { ...defaultProps.media, ...media }

      this.braftFinder = new BraftFinder({
        items: items,
        language: language,
        uploader: uploadFn,
        validator: validateFn
      })

      this.forceUpdate()

    }

    if (media && media.items && this.braftFinder) {
      this.braftFinder.setItems(media.items)
    }

    let nextEditorState

    if (!this.valueInitialized && typeof this.props.defaultValue === 'undefined' && ContentUtils.isEditorState(props.defaultValue)) {
      nextEditorState = props.defaultValue
    } else if (ContentUtils.isEditorState(editorState)) {
      nextEditorState = editorState
    }

    if (nextEditorState) {

      if (nextEditorState && nextEditorState !== this.state.editorState) {

        const tempColors = ColorUtils.detectColorsFromDraftState(nextEditorState.toRAW(true))
        nextEditorState.setConvertOptions(getConvertOptions(this.editorProps))

        this.setState({
          tempColors: filterColors([...this.state.tempColors, ...tempColors], currentProps.colors),
          editorState: nextEditorState
        }, () => {
          this.props.onChange && this.props.onChange(nextEditorState)
        })

      } else {
        this.setState({
          editorState: nextEditorState
        })
      }

    }

  }

  componentWillUnmount () {
    this.isLiving = false
    this.controlBarInstance && this.controlBarInstance.closeBraftFinder()
  }

  /**
   * 
   * @param {*} editorState 新的 state
   * @param {*} callback 回调函数
   */
  onChange = (editorState, callback) => {

    if (!(editorState instanceof EditorState)) {
      editorState = EditorState.set(editorState, {
        decorator: this.editorDecorators
      })
    }

    if (!editorState.convertOptions) {
      editorState.setConvertOptions(getConvertOptions(this.editorProps))
    }

    this.setState({ editorState }, () => {
      this.props.onChange && this.props.onChange(editorState)
      callback && callback(editorState)
    })

  }

  getDraftInstance = () => {
    return this.draftInstance
  }

  getFinderInstance = () => {
    return this.braftFinder
  }

  getValue = () => {
    return this.state.editorState
  }

  setValue = (editorState, callback) => {
    return this.onChange(editorState, callback)
  }

  // 通过 setState 强制重新渲染
  forceRender = () => {

    const selectionState = this.state.editorState.getSelection()

    this.setValue(EditorState.set(this.state.editorState, {
      decorator: this.editorDecorators
    }), () => {
      this.setValue(EditorState.forceSelection(this.state.editorState, selectionState))
    })

  }

  // 处理键盘事件
  onTab = (event) => {
    // 如果在处理函数中已经被处理了，就取消默认事件
    if (keyCommandHandlers('tab', this.state.editorState, this) === 'handled') {
      event.preventDefault()
    }
    // 触发钩子
    this.editorProps.onTab && this.editorProps.onTab(event)
  }

  onFocus = () => {
    this.isFocused = true
    this.editorProps.onFocus && this.editorProps.onFocus(this.state.editorState)
  }

  onBlur = () => {
    this.isFocused = false
    this.editorProps.onBlur && this.editorProps.onBlur(this.state.editorState)
  }

  // 强制 focus
  requestFocus = () => {
    setTimeout(() => this.draftInstance.focus(), 0)
  }

  handleKeyCommand = (command, editorState) => keyCommandHandlers(command, editorState, this)

  handleReturn = (event, editorState) => returnHandlers(event, editorState, this)

  handleBeforeInput = (chars, editorState) => beforeInputHandlers(chars, editorState, this)

  handleDrop = (selectionState, dataTransfer) => dropHandlers(selectionState, dataTransfer, this)

  handleDroppedFiles = (selectionState, files) => droppedFilesHandlers(selectionState, files, this)

  handlePastedFiles = (files) => pastedFilesHandlers(files, this)

  handleCopyContent = (event) => copyHandlers(event, this)

  handlePastedText = (text, html, editorState) => pastedTextHandlers(text, html, editorState, this)

  handleCompositionStart = (event) => compositionStartHandler(event, this)

  undo = () => {
    this.setValue(ContentUtils.undo(this.state.editorState))
  }

  redo = () => {
    this.setValue(ContentUtils.redo(this.state.editorState))
  }

  // 移除选中区域的样式？
  removeSelectionInlineStyles = () => {
    this.setValue(ContentUtils.removeSelectionInlineStyles(this.state.editorState))
  }

  // 插入分割线?
  insertHorizontalLine = () => {
    this.setValue(ContentUtils.insertHorizontalLine(this.state.editorState))
  }

  // 清空编辑器内容，并且重置选中区域为空
  clearEditorContent = () => {
    this.setValue(ContentUtils.clear(this.state.editorState), (editorState) => {
      this.setValue(ContentUtils.toggleSelectionIndent(editorState, 0))
    })
  }

  // 切换全屏
  toggleFullscreen = (fullscreen) => {
    this.setState({
      isFullscreen: typeof fullscreen !== 'undefined' ? fullscreen : !this.state.isFullscreen
    }, () => {
      this.editorProps.onFullscreen && this.editorProps.onFullscreen(this.state.isFullscreen)
    })
  }

  // 是否锁定编辑器
  lockOrUnlockEditor (editorLocked) {
    this.setState({ editorLocked })
  }

  setEditorContainerNode = (containerNode) => {
    this.containerNode = containerNode
  }

  render () {

    let {
      id, editorId, controls, excludeControls, extendControls, readOnly, disabled, media, language, colors, colorPicker, colorPickerTheme, colorPickerAutoHide, hooks,
      fontSizes, fontFamilies, emojis, placeholder, fixPlaceholder, headings, imageControls, imageResizable, imageEqualRatio, lineHeights, letterSpacings, textAligns, textBackgroundColor, allowInsertLinkText, defaultLinkTarget,
      extendAtomics, className, style, controlBarClassName, controlBarStyle, contentClassName, contentStyle, stripPastedStyles, componentBelowControlBar
    } = this.editorProps

    const { isFullscreen, editorState } = this.state
    // 编辑器 id
    editorId = editorId || id
    // 外部 生命周期钩子
    hooks = buildHooks(hooks)
    // 筛选所有的控件名称
    controls = controls.filter(item => excludeControls.indexOf(item) === -1)
    // 语言设置
    language = (typeof language === 'function' ? language(languages, 'braft-editor') : languages[language]) || languages[defaultProps.language]

    // 
    /**
     * 支持的媒体
     * audio: true
     * embed: true
     * image: true
     * video: true
     */
    const externalMedias = media && media.externals ? {
      ...defaultProps.media.externals,
      ...media.externals
    } : defaultProps.media.externals
    const accepts = media && media.accepts ? {
      ...defaultProps.media.accepts,
      ...media.accepts
    } : defaultProps.media.accepts
    // 允许上传的媒体类型
    media = { ...defaultProps.media, ...media, externalMedias, accepts }

    // 如果没有上传函数, 那么类型为 false
    if (!media.uploadFn) {
      media.video = false
      media.audio = false
    }

    // 工具栏参数
    const controlBarProps = {
      editor: this,
      editorState: editorState,
      braftFinder: this.braftFinder,
      ref: instance => this.controlBarInstance = instance,
      getContainerNode: () => this.containerNode,
      className: controlBarClassName,
      style: controlBarStyle,
      colors: [...colors, ...this.state.tempColors],
      colorPicker, colorPickerTheme, colorPickerAutoHide, hooks, editorId, media, controls, language, extendControls, headings, fontSizes, fontFamilies,
      emojis, lineHeights, letterSpacings, textAligns, textBackgroundColor, allowInsertLinkText, defaultLinkTarget
    }

    const { unitExportFn } = editorState.convertOptions

    // 公共参数
    const commonProps = {
      editor: this,
      editorId,
      hooks,
      editorState: editorState,
      containerNode: this.containerNode,
      imageControls, imageResizable, language, extendAtomics, imageEqualRatio
    }

    const blockRendererFn = getBlockRendererFn(commonProps, this.editorProps.blockRendererFn)
    // 渲染各类 block 的 renderer
    const blockRenderMap = getBlockRenderMap(commonProps, this.editorProps.blockRenderMap)
    const blockStyleFn = getBlockStyleFn(this.editorProps.blockStyleFn)
    const customStyleMap = getCustomStyleMap(commonProps, this.editorProps.customStyleMap)
    const customStyleFn = getCustomStyleFn(commonProps, { fontFamilies, unitExportFn, customStyleFn: this.editorProps.customStyleFn })

    const keyBindingFn = getKeyBindingFn(this.editorProps.keyBindingFn)

    const mixedProps = {}

    if (this.state.editorLocked || this.editorProps.disabled || this.editorProps.readOnly || this.editorProps.draftProps.readOnly) {
      mixedProps.readOnly = true
    }

    // 如果内容为空，但是存在样式，则不显示 placeholder
    if (
      placeholder && fixPlaceholder && editorState.isEmpty() &&
      editorState.getCurrentContent().getFirstBlock().getType() !== 'unstyled'
    ) {
      placeholder = ''
    }

    // 生成 draft-js 格式的参数
    const draftProps = {
      ref: instance => { this.draftInstance = instance },
      editorState: editorState,
      handleKeyCommand: this.handleKeyCommand,
      handleReturn: this.handleReturn,
      handleBeforeInput: this.handleBeforeInput,
      handleDrop: this.handleDrop,
      handleDroppedFiles: this.handleDroppedFiles,
      handlePastedText: this.handlePastedText,
      handlePastedFiles: this.handlePastedFiles,
      onChange: this.onChange,
      onTab: this.onTab,
      onFocus: this.onFocus,
      onBlur: this.onBlur,
      blockRenderMap,
      blockRendererFn,
      blockStyleFn,
      customStyleMap,
      customStyleFn,
      keyBindingFn,
      placeholder,
      stripPastedStyles,
      ...this.editorProps.draftProps,
      ...mixedProps
    }

    return (
      <div
        style={style}
        ref={this.setEditorContainerNode}
        className={`bf-container ${className}${(disabled ? ' disabled' : '')}${(readOnly ? ' read-only' : '')}${isFullscreen ? ' fullscreen' : ''}`}
      >
        <ControlBar {...controlBarProps} />
        {componentBelowControlBar}
        <div
          onCompositionStart={this.handleCompositionStart}
          className={`bf-content ${contentClassName}`}
          onCopy={this.handleCopyContent}
          style={contentStyle}
        >
          <Editor {...draftProps} />
        </div>
      </div>
    )

  }

}

export { EditorState }
