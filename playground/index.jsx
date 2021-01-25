import React from 'react'
import ReactDOM from 'react-dom'
import BraftEditor from '../src'
// import ColorPicker from 'o2-extensions/dist/color-picker'
import Table from 'o2-extensions/dist/table'
// import CodeHighlighter from 'o2-extensions/dist/code-highlighter'
// import Emoticon, { defaultEmoticons } from 'o2-extensions/dist/emoticon'
import Markdown from 'o2-extensions/dist/markdown'
import CodeHighlighter from 'o2-extensions/dist/code-highlighter'

import 'o2-extensions/dist/emoticon.css'
import 'o2-extensions/dist/color-picker.css'
import 'o2-extensions/dist/table.css'
import 'o2-extensions/dist/code-highlighter.css'

import './index.css'

// const emoticons = defaultEmoticons.map(item => require(`o2-extensions/dist/assets/${item}`))
const options = {
  syntaxs: [
    {
      name: 'JavaScript',
      syntax: 'javascript'
    },
    {
      name: 'HTML',
      syntax: 'html'
    },
    {
      name: 'CSS',
      syntax: 'css'
    },
    {
      name: 'Java',
      syntax: 'java'
    },
    {
      name: 'PHP',
      syntax: 'php'
    }
  ]
}

const hooks = {
  // 设置图片 alignment
  // 'set-image-alignment': () => {
  //   return 'left'
  // },
  'toggle-link': ({ href, target }) => {
    href = href.indexOf('http') === 0 ? href : `http://${href}`
    return { href, target: '_blank' }
  },
  'set-image-link': link => {
    try {
      // 目前发现点击确认面板不会自动收起
      // dom query 查找 link 按钮的位置并人工点击来使面板收起
      const linkIndex = this.imageControls.indexOf('link')
      document
        .querySelector('div.bf-media-toolbar')
        .querySelectorAll('a')
        [linkIndex].click()
    } catch (e) {
      console.error('人工点击 link panel 失败', e)
    }
    return link
  }
}

BraftEditor.use(Markdown({}))
BraftEditor.use(Table({}))
BraftEditor.use(CodeHighlighter(options))

// BraftEditor.use([
//   Emoticon({
//     emoticons: emoticons
//   }),
//   // ColorPicker({
//   //   theme: 'dark'
//   // }),
//   Table(),
//   CodeHighlighter()
// ])

const ValidType = {
  PNG: 'image/png',
  GIF: 'image/gif',
  JPEG: 'image/jpeg',
  MP4: 'video/mp4'
}

class Demo extends React.Component {
  state = {
    count: 0,
    readOnly: false,
    editorState: BraftEditor.createEditorState(''),
    // editorState: BraftEditor.createEditorState(`
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // <p class="my-classname"><img src="https://www.baidu.com/img/bd_logo1.png?where=super" /><span style="color:#e25041;">红色文字</span>默认文字</p>
    // `)
    displayHtml: ''
  }

  handleChange = (editorState) => {
    this.setState({ editorState })
  }

  // toolbar
  controls = [
    'undo',
    'redo',
    'font-size',
    'text-color', 
    'underline',
    'bold',
    'italic',
    'underline',
    'strike-through',
    'text-align',
    'text-indent',
    'list-ol',
    'list-ul',
    'blockquote',
    'code',
    'link',
    'table',
    'fullscreen',
    'media'
  ]

  // 支持的文件类型
  validFileTypes = [ValidType.PNG, ValidType.GIF, ValidType.JPEG, ValidType.MP4]

  // 图片操作
  imageControls = [
    // 'float-left', // 设置图片左浮动
    // 'float-right', // 设置图片右浮动
    'align-left', // 设置图片居左
    'align-center', // 设置图片居中
    'align-right', // 设置图片居右
    'link', // 设置图片超链接
    'size', // 设置图片尺寸 // 暂时隐藏，用户交互比较复杂
    'remove' // 删除图片
  ]

  hooks = {
    'toggle-link': ({ href, target }) => {
      href = href.indexOf('http') === 0 ? href : `http://${href}`
      return { href, target: '_blank' }
    }
  }

  fontSizes = [12, 14, 16, 18, 20, 24, 28, 30, 32, 36, 40]

  logHTML = () => {
    console.log(this.state.editorState.toHTML())
    this.setState({ displayHtml: this.state.editorState.toHTML() })
  }

  logRAW = () => {
    console.log(this.state.editorState.toRAW())
  }

  render() {

    const { readOnly, editorState, displayHtml } = this.state

    return (
      <div>
        <div className="demo" id="demo">
          <BraftEditor
            controls={this.controls}
            // 拓展工具栏
            extendControls={[{
              key: 'log-raw',
              type: 'button',
              text: 'Log RAW',
              // disabled: true,
              onClick: this.logRAW,
            }, {
              key: 'log-html',
              type: 'button',
              text: 'Log HTML',
              // disabled: true,
              onClick: this.logHTML,
            }, {
              key: 'my-modal',
              type: 'modal',
              text: 'modal',
              // disabled: true,
              modal: {
                id: 'a',
                closeOnBlur: true,
                confirmable: true,
                closeOnConfirm: false,
                component: <div>123123</div>
              }
            }, {
              key: 'my-dropdown',
              type: 'dropdown',
              text: 'Hello',
              // disabled: true,
              component: <h1>Hello World!</h1>
            }]}
            fontSizes={this.fontSizes}
            placeholder="Hello World!"
            // fixPlaceholder={true}
            // allowInsertLinkText={true}
            // triggerChangeOnMount={false}
            value={editorState}
            onChange={this.handleChange}
            // readOnly={readOnly}
            hooks={hooks}
            // imageResizable={true}
            // imageEqualRatio={true}
            imageControls={this.imageControls}
            media={{
              uploadFn: (options) => {
                options.success('http://img13.360buyimg.com/ling/jfs/t1/154160/37/14457/122240/60015e80E47feca60/145ab0ad93ee054e.jpg')
              }
            }}
          />
        </div>
        <div className='display-block' dangerouslySetInnerHTML={{ __html: displayHtml }} />
      </div>
    )

  }

}

ReactDOM.render(<Demo />, document.querySelector('#root'))
